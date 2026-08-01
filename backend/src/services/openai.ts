import { spawn } from 'child_process';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

function stripAnsi(str: string): string {
  return str
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\[\?[0-9]*[a-zA-Z]/g, '');
}

function cleanKiroOutput(raw: string): string {
  const lines = stripAnsi(raw)
    .split('\n')
    .filter((l) => l.trim() !== '')
    .filter((l) => !l.includes('▸ Time:'))
    .filter((l) => !l.startsWith('Error: '))
    .filter((l) => !l.startsWith('Searching the web for:'))
    .filter((l) => !l.includes('(using tool:'))
    .filter((l) => !l.startsWith('Reading webpage:'))
    .filter((l) => !l.startsWith('Fetching'));
  // Strip '> ' prefix from all lines (kiro-cli prompt marker)
  return lines.map((l) => l.startsWith('> ') ? l.slice(2) : l).join('\n').trim();
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const idx = raw.search(/[{[]/);
  if (idx !== -1) return raw.slice(idx).trim();
  return raw;
}

const CHUNK_SIZE = 15_000;

function chunkTranscript(transcript: string): string[] {
  if (transcript.length <= CHUNK_SIZE) return [transcript];
  const chunks: string[] = [];
  for (let i = 0; i < transcript.length; i += CHUNK_SIZE) {
    chunks.push(transcript.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function callKiro(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('kiro-cli', ['chat', '--no-interactive', '--trust-all-tools'], {
      timeout: 300_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code !== 0 && !stdout && !stderr) {
        return reject(new Error(`kiro-cli exited with code ${code}`));
      }
      resolve(cleanKiroOutput(stdout || stderr || ''));
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function callKiroWithTimeout(prompt: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('kiro-cli', ['chat', '--no-interactive', '--trust-all-tools'], {
      timeout: timeoutMs,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code !== 0 && !stdout && !stderr) {
        return reject(new Error('kiro-cli exited with code ' + code));
      }
      resolve(cleanKiroOutput(stdout || stderr || ''));
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

const FOCO_BASE = `[FUNÇÃO]: Você é um Professor universitário especialista em didática e técnicas de ensino, com vasta experiência em transformar conteúdos complexos em materiais claros e acessíveis. Domina métodos como Técnica Feynman, Active Recall, Repetição Espaçada, Chunking, Dual Coding e Mnemônicos.

[OBJETIVO]: Gerar materiais de estudo completos e autocontidos que permitam ao aluno aprender o conteúdo inteiramente por eles, sem precisar consultar o material original.

[CONTEXTO]: Você atua em uma plataforma de estudos onde alunos de ensino médio e graduação enviam videoaulas, documentos ou provas e precisam aprender o conteúdo de forma rápida e eficiente. O aluno não terá acesso ao material original — tudo que ele sabe virá do que você gerar. O tempo do aluno é escasso, então cada material precisa ser direto, visual e memorável.

[ORIENTAÇÃO]:
- Gere todo conteúdo em português brasileiro, independente do idioma original
- Priorize explicações simples com analogias do cotidiano — se uma criança não entenderia, simplifique mais
- Use recursos visuais: diagramas Mermaid, tabelas comparativas, emojis para scan rápido
- Inclua sempre mecanismos de autoavaliação (perguntas, active recall)
- Nunca faça referência à aula, vídeo, professor ou slides originais — o aluno estuda pelo seu material
- Cada conceito deve ter: o que é, por que importa, como funciona, exemplo prático
- Falhe para o lado de explicar demais do que de menos — o material deve ser autocontido`;

export async function generateSummary(
  transcript: string,
): Promise<{ content: string; keyTopics: string[] }> {
  try {
    const chunks = chunkTranscript(transcript);

    const feynmanPrompt = `${FOCO_BASE}

[TAREFA]: Gere um resumo usando a Técnica Feynman. Para cada conceito:
- 📌 **Conceito**: explicação ultra-simples, como se fosse para uma criança
- 🔗 **Analogia**: comparação com algo do dia-a-dia
- 💡 **Exemplo**: exemplo prático e concreto
- 🧠 **Para Memorizar**: mnemônico ou frase marcante para lembrar

Use Markdown rico com emojis, headers e formatação visual. Gere também a lista de tópicos-chave.

Responda APENAS em JSON válido, sem markdown ao redor: { "content": "markdown do resumo", "keyTopics": ["tópico1", "tópico2"] }`;

    if (chunks.length === 1) {
      const raw = await callKiro(
        `${feynmanPrompt}\n\nTranscrição: ${chunks[0]}`,
      );
      const parsed = JSON.parse(extractJson(raw));
      return { content: parsed.content, keyTopics: parsed.keyTopics };
    }

    const partials: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const raw = await callKiro(
        `${FOCO_BASE}\n\n[TAREFA]: Esta é a parte ${i + 1} de ${chunks.length} de uma transcrição. Para cada conceito, use: 📌 Conceito (explicação simples), 🔗 Analogia, 💡 Exemplo, 🧠 Para Memorizar. Gere um resumo parcial em Markdown.\n\nTranscrição (parte ${i + 1}/${chunks.length}): ${chunks[i]}\n\nResponda apenas com o Markdown do resumo parcial.`,
      );
      partials.push(`## Parte ${i + 1}\n${cleanKiroOutput(raw)}`);
    }

    const consolidated = await callKiro(
      `${feynmanPrompt}\n\nAbaixo estão resumos parciais de diferentes partes de uma aula. Consolide-os em um único resumo coeso.\n\nResumos parciais:\n${partials.join('\n\n')}`,
    );
    const parsed = JSON.parse(extractJson(consolidated));
    return { content: parsed.content, keyTopics: parsed.keyTopics };
  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    throw error;
  }
}

export async function generateStudyPlan(
  summaries: { title: string; content: string }[],
): Promise<string> {
  try {
    const summariesText = summaries
      .map((s) => `### ${s.title}\n${s.content}`)
      .join('\n\n');
    return await callKiro(
      `${FOCO_BASE}

[TAREFA]: Com base nos resumos das aulas abaixo, crie um plano de estudos usando repetição espaçada. O plano deve:

- Usar cronograma de repetição espaçada: 📅 Dia 1, Dia 3, Dia 7, Dia 14, Dia 30
- Cada módulo com: 🎯 Objetivo claro, ⏱ Tempo estimado, técnica de estudo recomendada
- Checkboxes em markdown (- [ ]) para o aluno marcar progresso
- 🔄 Dicas de active recall para cada tópico (perguntas para se testar)
- Organizar tópicos em ordem lógica com pré-requisitos indicados
- Usar emojis para facilitar scan visual: 📅 Cronograma, 🎯 Objetivo, ⏱ Tempo, 🔄 Revisão

Resumos das aulas:\n${summariesText}\n\nResponda apenas com o Markdown do plano, sem JSON.`,
    );
  } catch (error) {
    console.error('Erro ao gerar plano de estudos:', error);
    throw error;
  }
}

export async function generateQuizzes(
  transcript: string,
  count: number = 5,
): Promise<
  Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>
> {
  try {
    const chunks = chunkTranscript(transcript);
    // Para quizzes, usar os primeiros 2 chunks (cobre os tópicos principais sem explodir o prompt)
    const sample = chunks.slice(0, 2).join('\n\n[...]\n\n');
    const raw = await callKiro(
      `${FOCO_BASE}

[TAREFA]: Com base na transcrição da aula, gere exatamente ${count} perguntas de múltipla escolha.

REGRAS OBRIGATÓRIAS para as alternativas:
1. TODAS as 4 alternativas devem ter tamanho SIMILAR (mesma faixa de palavras)
2. O correctIndex DEVE ser distribuído aleatoriamente: varie entre 0, 1, 2 e 3 ao longo das questões. NUNCA coloque a resposta correta sempre na mesma posição
3. As alternativas incorretas devem ser PLAUSÍVEIS, não obviamente erradas
4. Varie a dificuldade: ~30% fácil, ~40% médio, ~30% difícil
5. Inclua perguntas conceituais, práticas e de aplicação
6. A explicação deve ensinar POR QUE a correta está certa E por que as outras estão erradas
7. Pergunte diretamente sobre o conceito, sem referenciar fontes externas. Exemplo bom: 'O que é recursão em programação?'

Transcrição: ${sample}

Responda APENAS em JSON válido, sem markdown ao redor: { "quizzes": [{ "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "...", "difficulty": "easy|medium|hard" }] }`,
    );
    return JSON.parse(extractJson(raw)).quizzes;
  } catch (error) {
    console.error('Erro ao gerar quizzes:', error);
    throw error;
  }
}

export async function generateExamRadar(
  transcript: string,
): Promise<
  Array<{
    topic: string;
    relevance: 'high' | 'medium' | 'low';
    professorQuote: string | null;
    reasoning: string;
  }>
> {
  try {
    const chunks = chunkTranscript(transcript);
    // Radar de prova: processar todos os chunks e consolidar
    if (chunks.length === 1) {
      const raw = await callKiro(
        `${FOCO_BASE}\n\n[TAREFA]: Analise a transcrição e identifique momentos em que o professor:\n- Disse explicitamente que algo cairá na prova\n- Repetiu um tópico várias vezes com ênfase\n- Usou frases como "prestem atenção", "isso é importante", "não esqueçam"\n- Deu exemplos que parecem ser do tipo cobrado em avaliação\n\nTranscrição: ${chunks[0]}\n\nResponda APENAS em JSON válido, sem markdown ao redor: { "items": [{ "topic": "...", "relevance": "high|medium|low", "professorQuote": "frase exata ou null", "reasoning": "por que isso provavelmente cai na prova" }] }`,
      );
      return JSON.parse(extractJson(raw)).items;
    }

    const allItems: Array<{ topic: string; relevance: string; professorQuote: string | null; reasoning: string }> = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const raw = await callKiro(
          `${FOCO_BASE}\n\n[TAREFA]: Analise esta parte da transcrição (parte ${i + 1}/${chunks.length}) e identifique momentos em que o professor enfatizou tópicos importantes para prova.\n\nTranscrição (parte ${i + 1}/${chunks.length}): ${chunks[i]}\n\nResponda APENAS em JSON válido: { "items": [{ "topic": "...", "relevance": "high|medium|low", "professorQuote": "frase exata ou null", "reasoning": "..." }] }`,
        );
        const parsed = JSON.parse(extractJson(raw));
        allItems.push(...parsed.items);
      } catch { /* continua com os outros chunks */ }
    }
    return allItems as Array<{ topic: string; relevance: 'high' | 'medium' | 'low'; professorQuote: string | null; reasoning: string }>;
  } catch (error) {
    console.error('Erro ao gerar radar de prova:', error);
    throw error;
  }
}

export async function transcribeAudio(_audioPath: string): Promise<string> {
  console.error('transcribeAudio: kiro-cli não suporta transcrição de áudio, retornando vazio');
  return '';
}

export async function generateStudyContent(
  transcript: string,
  previousTopics?: string[],
  sourceType?: 'youtube' | 'exam',
  researchTopics?: string,
): Promise<{ content: string }> {
  try {
    const chunks = chunkTranscript(transcript);
    const topicsContext = previousTopics && previousTopics.length > 0
      ? `\n\nIMPORTANTE: Os seguintes tópicos JÁ foram explicados em aulas/slides anteriores. NÃO repita explicações desses conceitos. Apenas referencie-os brevemente se necessário e foque no conteúdo NOVO deste material:\n- ${previousTopics.join('\n- ')}`
      : '';
    const examContext = sourceType === 'exam'
      ? `\n\nCONTEXTO IMPORTANTE: O texto abaixo vem de slides ou provas. O aluno NÃO terá acesso ao documento original e vai estudar INTEIRAMENTE por este material. Por isso: NÃO apenas reorganize o conteúdo - ENSINE cada conceito em profundidade. Para cada tópico dos slides: explique O QUE é, POR QUE é importante, COMO funciona, com exemplos práticos e analogias. Expanda fórmulas e definições com explicações passo-a-passo. O material deve ser autocontido - o aluno deve conseguir aprender tudo sem consultar outra fonte. Mantenha a estrutura de slides educativos (## por seção) mas priorize EXPLICAÇÕES COMPLETAS sobre mapas mentais.\n`
      : '';
    const prompt = `${FOCO_BASE}

[TAREFA]: Crie material didático formatado para SLIDES EDUCATIVOS. Cada seção ## será exibida como um slide individual na tela.

REGRAS DE FORMATAÇÃO PARA SLIDES:
- Cada seção ## deve caber em UMA TELA (máximo 400 palavras por seção)
- Comece com um slide ## Mapa Mental usando diagrama Mermaid (mindmap ou graph)
- Use MUITOS bullet points curtos em vez de parágrafos longos
- Use tabelas markdown para comparações e dados estruturados
- Use diagramas Mermaid para fluxogramas, árvores de decisão, relações entre conceitos
- Use blockquotes > para destaques e frases-chave
- Use **negrito** para termos importantes
- Use emojis para scan visual rápido
- Cada slide deve ter UM foco claro (não misture assuntos)
- Inclua slides de Active Recall com <details><summary>Pergunta</summary>Resposta</details>
- Último slide: resumo express com mnemônico

ESTRUTURA SUGERIDA DE SLIDES:
1. ## Mapa Mental (diagrama Mermaid com visão geral)
2-N. ## Conceito X (explicação curta + analogia + exemplo + tabela ou diagrama)
Penúltimo. ## Erros Comuns (tabela com erro | por que está errado | correto)
Último. ## Revisão Rápida (active recall com details/summary + mnemônico)

REGRAS PARA DIAGRAMAS MERMAID: Use graph TD (vertical) em vez de graph LR para diagramas com textos longos. Use textos CURTOS nas caixas (máximo 3-4 palavras por caixa). Se precisar de texto longo, coloque abaixo do diagrama como legenda. Sempre envolva o diagrama em \`\`\`mermaid. Use mindmap para mapas mentais e graph TD para fluxogramas. Exemplo: \`\`\`mermaid seguido de graph TD seguido de A[Conceito] --> B[Sub-conceito].${topicsContext}

Responda APENAS em JSON válido: { "content": "markdown completo" }`;

    const researchContext = researchTopics
      ? '\n\nESTRUTURA OBRIGATÓRIA PARA PESQUISA MULTI-TÓPICO: O conteúdo aborda os seguintes tópicos: ' + researchTopics + '. Organize os slides OBRIGATORIAMENTE assim:\n1. ## Visão Geral (mapa mental Mermaid mostrando todos os tópicos e como se relacionam)\nPara CADA tópico identificado:\n  - ## [Tópico]: O que é (definição + analogia + mapa mental Mermaid próprio)\n  - ## [Tópico]: Como Funciona (arquitetura + casos de uso + tabela comparativa)\nPenúltimo. ## Como se Complementam (diagrama Mermaid de integração + fluxo de dados)\nÚltimo. ## Revisão Rápida (active recall com <details><summary> para cada tópico + mnemônico)\n'
      : '';

    if (chunks.length === 1) {
      const raw = await callKiro(`${prompt}${examContext}${researchContext}\n\nTranscrição: ${chunks[0]}`);
      return { content: JSON.parse(extractJson(raw)).content };
    }

    // Agrupar chunks de 3 em 3 para reduzir número de slides gerados
    const GROUP_SIZE = 3;
    const groups: string[] = [];
    for (let i = 0; i < chunks.length; i += GROUP_SIZE) {
      groups.push(chunks.slice(i, i + GROUP_SIZE).join('\n\n'));
    }

    const partials: string[] = [];
    for (let i = 0; i < groups.length; i++) {
      const raw = await callKiro(
        `${FOCO_BASE}\n\n[TAREFA]: Crie material didático para esta parte (${i + 1}/${groups.length}) formatado para SLIDES EDUCATIVOS. Cada seção ## será um slide individual. Gere entre 8 e 12 slides por chamada. Regras: máximo 400 palavras por seção ##, use bullet points curtos, tabelas markdown, diagramas Mermaid (NUNCA ASCII art box-drawing), emojis, **negrito** para termos-chave, <details><summary>Pergunta</summary>Resposta</details> para active recall. Cada slide com UM foco claro.${topicsContext}${examContext}${researchContext}\n\nTranscrição (parte ${i + 1}/${groups.length}): ${groups[i]}\n\nResponda apenas com o Markdown.`,
      );
      partials.push(cleanKiroOutput(raw));
    }

    return { content: partials.join('\n\n') };
  } catch (error) {
    console.error('Erro ao gerar study content:', error);
    throw error;
  }
}

export async function generateFlashcards(
  transcript: string,
  count: number = 10,
): Promise<Array<{ front: string; back: string; category: string }>> {
  try {
    const chunks = chunkTranscript(transcript);
    const sample = chunks.slice(0, 2).join('\n\n[...]\n\n');
    const raw = await callKiro(
      `${FOCO_BASE}

[TAREFA]: Com base no conteúdo abaixo, gere exatamente ${count} flashcards para repetição espaçada.

REGRAS:
1. Frente: pergunta curta e direta (máximo 15 palavras)
2. Verso: resposta concisa e memorável (máximo 40 palavras)
3. Categorias: concept (definição), fact (dado/fato), process (etapa/procedimento), comparison (diferença entre conceitos)
4. Varie as categorias
5. Use linguagem simples e direta
6. Cada flashcard deve testar UM conceito específico

Conteúdo: ${sample}

Responda APENAS em JSON válido: { "flashcards": [{ "front": "...", "back": "...", "category": "concept|fact|process|comparison" }] }`,
    );
    return JSON.parse(extractJson(raw)).flashcards;
  } catch (error) {
    console.error('Erro ao gerar flashcards:', error);
    throw error;
  }
}

export async function generateResearchContent(topic: string): Promise<string> {
  const cleanTopic = topic.replace(/\n+/g, ', ').trim();
  const result = await callKiroWithTimeout(
    `${FOCO_BASE}\n\n[TAREFA]: Faça uma pesquisa profunda e abrangente na internet sobre o tema: "${cleanTopic}"\n\nGere um texto educativo completo e autocontido sobre o tema, como se fosse a transcrição de uma aula completa. Inclua:\n- Conceitos fundamentais e definições\n- Como funciona na prática\n- Casos de uso reais\n- Comparações com tecnologias relacionadas\n- Exemplos práticos\n- Boas práticas e armadilhas comuns\n\nO texto deve ser extenso (mínimo 2000 palavras), em português brasileiro, e cobrir o tema de forma completa para que um estudante consiga aprender sem consultar outras fontes.\n\nResponda apenas com o texto educativo, sem JSON.`,
    600_000
  );
  if (result.length < 500) {
    throw new Error('Conteúdo gerado insuficiente (possível timeout na pesquisa web)');
  }
  return result;
}

export async function chatWithTutor(params: {
  summary: string;
  history: ChatHistoryItem[];
  message: string;
}): Promise<string> {
  try {
    const historyText =
      params.history.length > 0
        ? params.history
            .map((h) => h.role === 'user' ? `Aluno: ${h.content}` : `Tutor: ${h.content}`)
            .join('\n')
        : 'Nenhum histórico ainda.';
    return await callKiro(
      `${FOCO_BASE}\n\n[TAREFA]: Atue como tutor especializado no conteúdo abaixo. Responda a pergunta do aluno de forma clara e didática, baseando-se no resumo.\n\nResumo da aula:\n${params.summary}\n\nHistórico da conversa:\n${historyText}\n\nPergunta do aluno: ${params.message}\n\nResponda de forma direta e educativa.`,
    );
  } catch (error) {
    console.error('Erro ao chamar tutor:', error);
    throw error;
  }
}

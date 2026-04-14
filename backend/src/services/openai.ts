import { execFile } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
    .filter((l) => !l.startsWith('Error: '));
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
  const tempFile = join(tmpdir(), `kiro-prompt-${Date.now()}.txt`);
  writeFileSync(tempFile, prompt, 'utf-8');

  return new Promise((resolve, reject) => {
    execFile(
      'kiro-cli',
      ['chat', '--no-interactive', prompt],
      { timeout: 300_000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        try { unlinkSync(tempFile); } catch {}
        if (error && error.killed) {
          return reject(new Error('kiro-cli timeout após 300s'));
        }
        resolve(cleanKiroOutput(stdout || stderr || ''));
      },
    );
  });
}

export async function generateSummary(
  transcript: string,
): Promise<{ content: string; keyTopics: string[] }> {
  try {
    const chunks = chunkTranscript(transcript);

    const feynmanPrompt = `Você é um assistente educacional que usa a Técnica Feynman. IMPORTANTE: A transcrição pode estar em qualquer idioma. Gere TODO o conteúdo em português brasileiro, independente do idioma original. Analise a transcrição e gere um resumo onde cada conceito tenha:
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
        `Você é um assistente educacional que usa a Técnica Feynman. IMPORTANTE: A transcrição pode estar em qualquer idioma. Gere TODO o conteúdo em português brasileiro, independente do idioma original. Esta é a parte ${i + 1} de ${chunks.length} de uma transcrição. Para cada conceito, use: 📌 Conceito (explicação simples), 🔗 Analogia, 💡 Exemplo, 🧠 Para Memorizar. Gere um resumo parcial em Markdown.\n\nTranscrição (parte ${i + 1}/${chunks.length}): ${chunks[i]}\n\nResponda apenas com o Markdown do resumo parcial.`,
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
      `Você é um assistente educacional especialista em técnicas de aprendizado. IMPORTANTE: A transcrição pode estar em qualquer idioma. Gere TODO o conteúdo em português brasileiro, independente do idioma original. Com base nos resumos das aulas abaixo, crie um plano de estudos usando repetição espaçada. O plano deve:

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
      `Você é um assistente educacional. IMPORTANTE: A transcrição pode estar em qualquer idioma. Gere TODO o conteúdo em português brasileiro, independente do idioma original.

Com base na transcrição da aula, gere exatamente ${count} perguntas de múltipla escolha.

REGRAS OBRIGATÓRIAS para as alternativas:
1. TODAS as 4 alternativas devem ter tamanho SIMILAR (mesma faixa de palavras)
2. O correctIndex DEVE ser distribuído aleatoriamente: varie entre 0, 1, 2 e 3 ao longo das questões. NUNCA coloque a resposta correta sempre na mesma posição
3. As alternativas incorretas devem ser PLAUSÍVEIS, não obviamente erradas
4. Varie a dificuldade: ~30% fácil, ~40% médio, ~30% difícil
5. Inclua perguntas conceituais, práticas e de aplicação
6. A explicação deve ensinar POR QUE a correta está certa E por que as outras estão erradas
7. NUNCA faça referência a aula, vídeo, professor, apresentação ou slides nas perguntas. O aluno estuda pelo material de estudo gerado, não pela aula original. Em vez de 'Segundo o professor...' ou 'Conforme mostrado na aula...', pergunte diretamente sobre o conceito. Exemplo ruim: 'O que o professor disse sobre recursão?' Exemplo bom: 'O que é recursão em programação?'

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
        `Você é um assistente educacional especializado em identificar o que cairá na prova. IMPORTANTE: A transcrição pode estar em qualquer idioma. Gere TODO o conteúdo em português brasileiro, independente do idioma original. Analise a transcrição e identifique momentos em que o professor:\n- Disse explicitamente que algo cairá na prova\n- Repetiu um tópico várias vezes com ênfase\n- Usou frases como "prestem atenção", "isso é importante", "não esqueçam"\n- Deu exemplos que parecem ser do tipo cobrado em avaliação\n\nTranscrição: ${chunks[0]}\n\nResponda APENAS em JSON válido, sem markdown ao redor: { "items": [{ "topic": "...", "relevance": "high|medium|low", "professorQuote": "frase exata ou null", "reasoning": "por que isso provavelmente cai na prova" }] }`,
      );
      return JSON.parse(extractJson(raw)).items;
    }

    const allItems: Array<{ topic: string; relevance: string; professorQuote: string | null; reasoning: string }> = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const raw = await callKiro(
          `Você é um assistente educacional especializado em identificar o que cairá na prova. IMPORTANTE: A transcrição pode estar em qualquer idioma. Gere TODO o conteúdo em português brasileiro, independente do idioma original. Analise esta parte da transcrição (parte ${i + 1}/${chunks.length}) e identifique momentos em que o professor enfatizou tópicos importantes para prova.\n\nTranscrição (parte ${i + 1}/${chunks.length}): ${chunks[i]}\n\nResponda APENAS em JSON válido: { "items": [{ "topic": "...", "relevance": "high|medium|low", "professorQuote": "frase exata ou null", "reasoning": "..." }] }`,
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
): Promise<{ content: string }> {
  try {
    const chunks = chunkTranscript(transcript);
    const topicsContext = previousTopics && previousTopics.length > 0
      ? `\n\nIMPORTANTE: Os seguintes tópicos JÁ foram explicados em aulas/slides anteriores. NÃO repita explicações desses conceitos. Apenas referencie-os brevemente se necessário e foque no conteúdo NOVO deste material:\n- ${previousTopics.join('\n- ')}`
      : '';
    const prompt = `Você é um assistente educacional. IMPORTANTE: A transcrição pode estar em qualquer idioma. Gere TODO o conteúdo em português brasileiro, independente do idioma original. Crie material didático formatado para SLIDES EDUCATIVOS. Cada seção ## será exibida como um slide individual na tela.

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

Técnicas de ensino a aplicar:
- Técnica Feynman: explicação ultra-simples
- Chunking: blocos pequenos e digeríveis
- Dual Coding: diagramas Mermaid e tabelas (NUNCA ASCII art com caracteres box-drawing)
- Mnemônicos: acrônimos e frases para memorizar
- Active Recall: perguntas com details/summary${topicsContext}

Responda APENAS em JSON válido: { "content": "markdown completo" }`;

    if (chunks.length === 1) {
      const raw = await callKiro(`${prompt}\n\nTranscrição: ${chunks[0]}`);
      return { content: JSON.parse(extractJson(raw)).content };
    }

    const partials: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const raw = await callKiro(
        `Você é um assistente educacional. IMPORTANTE: A transcrição pode estar em qualquer idioma. Gere TODO o conteúdo em português brasileiro, independente do idioma original. Crie material didático para esta parte (${i + 1}/${chunks.length}) formatado para SLIDES EDUCATIVOS. Cada seção ## será um slide individual. Regras: máximo 400 palavras por seção ##, use bullet points curtos, tabelas markdown, diagramas Mermaid (NUNCA ASCII art box-drawing), emojis, **negrito** para termos-chave, <details><summary>Pergunta</summary>Resposta</details> para active recall. Cada slide com UM foco claro. Use Técnica Feynman e mnemônicos.${topicsContext}\n\nTranscrição (parte ${i + 1}/${chunks.length}): ${chunks[i]}\n\nResponda apenas com o Markdown.`,
      );
      partials.push(cleanKiroOutput(raw));
    }

    const raw = await callKiro(
      `${prompt}\n\nAbaixo estão materiais parciais de diferentes partes de uma aula. Consolide em um único material coeso.\n\nMateriais parciais:\n${partials.join('\n\n---\n\n')}`,
    );
    return { content: JSON.parse(extractJson(raw)).content };
  } catch (error) {
    console.error('Erro ao gerar study content:', error);
    throw error;
  }
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
      `Você é um tutor especializado no conteúdo desta aula. IMPORTANTE: A transcrição pode estar em qualquer idioma. Gere TODO o conteúdo em português brasileiro, independente do idioma original. Responda perguntas do aluno de forma clara e didática, sempre baseando suas respostas no conteúdo do resumo abaixo.\n\nResumo da aula:\n${params.summary}\n\nHistórico da conversa:\n${historyText}\n\nPergunta do aluno: ${params.message}\n\nResponda de forma direta e educativa, em português.`,
    );
  } catch (error) {
    console.error('Erro ao chamar tutor:', error);
    throw error;
  }
}

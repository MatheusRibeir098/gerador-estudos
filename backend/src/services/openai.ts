import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSummary(
  transcript: string
): Promise<{ content: string; keyTopics: string[] }> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `Você é um assistente educacional. Analise a transcrição da aula abaixo e gere:
1. Um resumo claro e estruturado em Markdown
2. Uma lista dos tópicos-chave abordados

Transcrição: ${transcript}

Responda em JSON: { "content": "markdown do resumo", "keyTopics": ["tópico1", "tópico2"] }`,
        },
      ],
    });

    return JSON.parse(response.choices[0].message.content!);
  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    throw error;
  }
}

export async function generateStudyPlan(
  summaries: { title: string; content: string }[]
): Promise<string> {
  try {
    const summariesText = summaries
      .map((s) => `### ${s.title}\n${s.content}`)
      .join('\n\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `Você é um assistente educacional. Com base nos resumos de todas as aulas abaixo, crie um plano de estudos estruturado em Markdown. O plano deve:
- Organizar os tópicos em ordem lógica de aprendizado
- Sugerir tempo estimado por tópico
- Indicar pré-requisitos entre tópicos
- Dar dicas de estudo

Resumos das aulas:
${summariesText}

Responda apenas com o Markdown do plano.`,
        },
      ],
    });

    return response.choices[0].message.content!;
  } catch (error) {
    console.error('Erro ao gerar plano de estudos:', error);
    throw error;
  }
}

export async function generateQuizzes(
  transcript: string,
  count: number = 5
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `Você é um assistente educacional. Com base na transcrição da aula, gere ${count} perguntas de múltipla escolha (4 alternativas cada). Varie a dificuldade entre fácil, médio e difícil. Cada pergunta deve ter uma explicação da resposta correta.

Transcrição: ${transcript}

Responda em JSON: { "quizzes": [{ "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "...", "difficulty": "easy|medium|hard" }] }`,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content!);
    return parsed.quizzes;
  } catch (error) {
    console.error('Erro ao gerar quizzes:', error);
    throw error;
  }
}

export async function generateExamRadar(
  transcript: string
): Promise<
  Array<{
    topic: string;
    relevance: 'high' | 'medium' | 'low';
    professorQuote: string | null;
    reasoning: string;
  }>
> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `Você é um assistente educacional especializado em identificar o que cairá na prova. Analise a transcrição e identifique momentos em que o professor:
- Disse explicitamente que algo cairá na prova
- Repetiu um tópico várias vezes com ênfase
- Usou frases como "prestem atenção", "isso é importante", "não esqueçam"
- Deu exemplos que parecem ser do tipo cobrado em avaliação

Transcrição: ${transcript}

Responda em JSON: { "items": [{ "topic": "...", "relevance": "high|medium|low", "professorQuote": "frase exata ou aproximada", "reasoning": "por que isso provavelmente cai na prova" }] }`,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content!);
    return parsed.items;
  } catch (error) {
    console.error('Erro ao gerar radar de prova:', error);
    throw error;
  }
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: fs.createReadStream(audioPath),
      language: 'pt',
    });

    return response.text;
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error);
    throw error;
  }
}

# Contexto do Projeto: StudyGen — Gerador de Estudos via YouTube

## Visão Geral

**Nome:** StudyGen
**Objetivo:** Sistema que recebe links de aulas gravadas no YouTube, extrai transcrições, e usa IA (GPT-4o) para gerar materiais de estudo: plano de estudos, resumos, quizzes interativos e radar de prova.
**Tipo:** Monolito fullstack — SPA React + REST API Express + SQLite
**Idioma da interface:** Português (pt-BR)

## Stack

| Módulo | Tecnologias |
|---|---|
| Backend | Express, better-sqlite3, Zod, TypeScript, cors, helmet |
| Frontend | React 19, Vite, TanStack Query, Tailwind CSS, Lucide React, Axios, TypeScript |
| IA | OpenAI GPT-4o (geração de conteúdo), OpenAI Whisper API (fallback transcrição) |
| Transcrição | youtube-transcript (npm) para legendas nativas, yt-dlp + Whisper API como fallback |
| PDF | jsPDF + html2canvas (export no frontend) |

## Design System

### Paleta de Cores

| Token | HEX | Uso |
|---|---|---|
| primary | #3B82F6 | Botões, links, elementos de destaque |
| primary-dark | #2563EB | Hover de botões, bordas ativas |
| accent | #8B5CF6 | Badges, destaques secundários, radar de prova |
| background | #F8FAFC | Fundo da página |
| surface | #FFFFFF | Fundo de cards e containers |
| text | #0F172A | Texto principal |
| text-muted | #64748B | Texto secundário, placeholders |
| border | #E2E8F0 | Bordas de cards, inputs, divisórias |
| success | #10B981 | Resposta correta, feedback positivo |
| warning | #F59E0B | Alertas, radar de prova |
| error | #EF4444 | Resposta errada, erros |

### Estilo Visual

- Border radius: rounded-lg (8px)
- Sombras: shadow-sm para cards, shadow-md para modais
- Espaçamento: p-4 para cards, gap-4 para grids
- Fonte: font-sans (system fonts)
- Transições: transition-all duration-200

### Componentes

- Botão primário: `bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg px-4 py-2 transition-all duration-200`
- Botão secundário: `bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg px-4 py-2`
- Card: `bg-white border border-[#E2E8F0] rounded-lg shadow-sm p-4`
- Input: `border border-[#E2E8F0] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]`
- Badge success: `bg-[#10B981]/10 text-[#10B981] rounded-full px-2 py-0.5 text-xs font-medium`
- Badge warning: `bg-[#F59E0B]/10 text-[#F59E0B] rounded-full px-2 py-0.5 text-xs font-medium`
- Badge error: `bg-[#EF4444]/10 text-[#EF4444] rounded-full px-2 py-0.5 text-xs font-medium`
- Badge accent: `bg-[#8B5CF6]/10 text-[#8B5CF6] rounded-full px-2 py-0.5 text-xs font-medium`
- Progress bar: `bg-[#E2E8F0] rounded-full h-2` com inner `bg-[#3B82F6] rounded-full h-2 transition-all duration-500`

## Modelo de Dados

### Tabela: subjects (matérias)

```sql
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'error')),
  total_lessons INTEGER NOT NULL DEFAULT 0,
  processed_lessons INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Tabela: lessons (aulas)

```sql
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  youtube_title TEXT,
  duration_seconds INTEGER,
  transcript TEXT,
  transcript_method TEXT CHECK(transcript_method IN ('youtube', 'whisper')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'transcribing', 'transcribed', 'error')),
  error_message TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Tabela: study_plans (plano de estudos)

```sql
CREATE TABLE IF NOT EXISTS study_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Tabela: summaries (resumos por aula)

```sql
CREATE TABLE IF NOT EXISTS summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  key_topics TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Tabela: quizzes (perguntas do quiz)

```sql
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Tabela: exam_radar (radar de prova)

```sql
CREATE TABLE IF NOT EXISTS exam_radar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  relevance TEXT NOT NULL CHECK(relevance IN ('high', 'medium', 'low')),
  professor_quote TEXT,
  reasoning TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Tabela: quiz_attempts (tentativas do quiz)

```sql
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  answers TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Contratos da API

**Base URL:** `http://localhost:3001/api`

### Subjects (Matérias)

#### POST /api/subjects
Cria uma nova matéria e inicia processamento.
```json
// Body
{
  "title": "Cálculo II",
  "description": "Aulas do professor Silva",
  "youtubeUrls": [
    "https://www.youtube.com/watch?v=abc123",
    "https://www.youtube.com/watch?v=def456"
  ]
}
// Response 201
{
  "id": 1,
  "title": "Cálculo II",
  "description": "Aulas do professor Silva",
  "status": "processing",
  "totalLessons": 2,
  "processedLessons": 0,
  "createdAt": "2026-04-07T20:00:00.000Z"
}
```

#### GET /api/subjects
Lista todas as matérias.
```json
// Response 200
{
  "data": [
    {
      "id": 1,
      "title": "Cálculo II",
      "description": "Aulas do professor Silva",
      "status": "completed",
      "totalLessons": 2,
      "processedLessons": 2,
      "createdAt": "2026-04-07T20:00:00.000Z"
    }
  ]
}
```

#### GET /api/subjects/:id
Detalhes de uma matéria com todas as aulas.
```json
// Response 200
{
  "id": 1,
  "title": "Cálculo II",
  "description": "Aulas do professor Silva",
  "status": "completed",
  "totalLessons": 2,
  "processedLessons": 2,
  "createdAt": "2026-04-07T20:00:00.000Z",
  "lessons": [
    {
      "id": 1,
      "youtubeUrl": "https://...",
      "youtubeTitle": "Aula 1 - Integrais",
      "durationSeconds": 3600,
      "status": "transcribed",
      "transcriptMethod": "youtube",
      "orderIndex": 0
    }
  ]
}
// Response 404: { "error": "Matéria não encontrada" }
```

#### DELETE /api/subjects/:id
Remove matéria e todos os dados associados (cascade).
```json
// Response 204 (no body)
// Response 404: { "error": "Matéria não encontrada" }
```

### Processing (Progresso)

#### GET /api/subjects/:id/status
Retorna status de processamento em tempo real.
```json
// Response 200
{
  "subjectId": 1,
  "status": "processing",
  "totalLessons": 5,
  "processedLessons": 3,
  "currentStep": "transcribing",
  "lessons": [
    { "id": 1, "status": "transcribed", "youtubeTitle": "Aula 1" },
    { "id": 2, "status": "transcribing", "youtubeTitle": "Aula 2" },
    { "id": 3, "status": "pending", "youtubeTitle": null }
  ]
}
```

### Study Plan (Plano de Estudos)

#### GET /api/subjects/:id/study-plan
```json
// Response 200
{
  "id": 1,
  "subjectId": 1,
  "content": "# Plano de Estudos\n\n## Semana 1\n...",
  "createdAt": "2026-04-07T20:00:00.000Z"
}
// Response 404: { "error": "Plano de estudos não encontrado" }
```

### Summaries (Resumos)

#### GET /api/subjects/:id/summaries
```json
// Response 200
{
  "data": [
    {
      "id": 1,
      "lessonId": 1,
      "youtubeTitle": "Aula 1 - Integrais",
      "content": "## Resumo\n\nNesta aula...",
      "keyTopics": ["Integrais definidas", "Teorema fundamental"],
      "createdAt": "2026-04-07T20:00:00.000Z"
    }
  ]
}
```

### Quizzes

#### GET /api/subjects/:id/quizzes
```json
// Response 200
{
  "data": [
    {
      "id": 1,
      "lessonId": 1,
      "question": "Qual é o resultado da integral de x²?",
      "options": ["x³/3 + C", "2x + C", "x²/2 + C", "3x² + C"],
      "correctIndex": 0,
      "explanation": "Pela regra da potência, ∫x² dx = x³/3 + C",
      "difficulty": "medium"
    }
  ]
}
```

#### POST /api/subjects/:id/quiz-attempts
Salva resultado de uma tentativa de quiz.
```json
// Body
{
  "totalQuestions": 10,
  "correctAnswers": 7,
  "answers": [
    { "quizId": 1, "selectedIndex": 0, "correct": true },
    { "quizId": 2, "selectedIndex": 2, "correct": false }
  ]
}
// Response 201
{
  "id": 1,
  "subjectId": 1,
  "totalQuestions": 10,
  "correctAnswers": 7,
  "percentage": 70,
  "createdAt": "2026-04-07T20:00:00.000Z"
}
```

#### GET /api/subjects/:id/quiz-attempts
Histórico de tentativas.
```json
// Response 200
{
  "data": [
    {
      "id": 1,
      "totalQuestions": 10,
      "correctAnswers": 7,
      "percentage": 70,
      "createdAt": "2026-04-07T20:00:00.000Z"
    }
  ]
}
```

### Exam Radar (Radar de Prova)

#### GET /api/subjects/:id/exam-radar
```json
// Response 200
{
  "data": [
    {
      "id": 1,
      "lessonId": 1,
      "topic": "Integrais por substituição",
      "relevance": "high",
      "professorQuote": "Isso aqui cai na prova com certeza, prestem atenção",
      "reasoning": "O professor enfatizou repetidamente este tópico e mencionou explicitamente que será cobrado"
    }
  ]
}
```

### Processing (Interno — chamado pelo backend)

#### POST /api/subjects/:id/process
Dispara o processamento assíncrono (chamado internamente após criar subject).
```json
// Response 202
{ "message": "Processamento iniciado" }
```

O fluxo de processamento interno:
1. Para cada lesson: tentar extrair transcrição via youtube-transcript
2. Se falhar: baixar áudio com yt-dlp, enviar para Whisper API
3. Após todas as transcrições: enviar para GPT-4o gerar study_plan, summaries, quizzes e exam_radar
4. Atualizar status da subject para 'completed'

## Formato de Erro Padrão

```json
{
  "error": "Mensagem descritiva do erro"
}
```

Status codes: 400 (validação), 404 (não encontrado), 500 (erro interno)

## Prompts de IA (referência para o backend)

### Prompt: Resumo de Aula
```
Você é um assistente educacional. Analise a transcrição da aula abaixo e gere:
1. Um resumo claro e estruturado em Markdown
2. Uma lista dos tópicos-chave abordados

Transcrição: {transcript}

Responda em JSON: { "content": "markdown do resumo", "keyTopics": ["tópico1", "tópico2"] }
```

### Prompt: Plano de Estudos
```
Você é um assistente educacional. Com base nos resumos de todas as aulas abaixo, crie um plano de estudos estruturado em Markdown. O plano deve:
- Organizar os tópicos em ordem lógica de aprendizado
- Sugerir tempo estimado por tópico
- Indicar pré-requisitos entre tópicos
- Dar dicas de estudo

Resumos das aulas:
{summaries}

Responda apenas com o Markdown do plano.
```

### Prompt: Quiz
```
Você é um assistente educacional. Com base na transcrição da aula, gere {count} perguntas de múltipla escolha (4 alternativas cada). Varie a dificuldade entre fácil, médio e difícil. Cada pergunta deve ter uma explicação da resposta correta.

Transcrição: {transcript}

Responda em JSON: [{ "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "...", "difficulty": "easy|medium|hard" }]
```

### Prompt: Radar de Prova
```
Você é um assistente educacional especializado em identificar o que cairá na prova. Analise a transcrição e identifique momentos em que o professor:
- Disse explicitamente que algo cairá na prova
- Repetiu um tópico várias vezes com ênfase
- Usou frases como "prestem atenção", "isso é importante", "não esqueçam"
- Deu exemplos que parecem ser do tipo cobrado em avaliação

Transcrição: {transcript}

Responda em JSON: [{ "topic": "...", "relevance": "high|medium|low", "professorQuote": "frase exata ou aproximada", "reasoning": "por que isso provavelmente cai na prova" }]
```

## Páginas do Frontend

| Rota | Componente | Descrição |
|---|---|---|
| `/` | HomePage | Lista de matérias salvas + botão "Nova Matéria" que abre modal |
| `/subjects/:id/processing` | ProcessingPage | Tela de progresso do processamento com status de cada aula |
| `/subjects/:id` | ResultPage | Resultado completo: abas com Plano de Estudos, Resumos, Radar de Prova |
| `/subjects/:id/quiz` | QuizPage | Quiz interativo com feedback por questão + resultado final |

### HomePage
- Header com título "StudyGen" + subtítulo "Transforme aulas em material de estudo"
- Se não há matérias: empty state com ilustração e CTA
- Grid de cards das matérias: título, descrição, status (badge), nº de aulas, data
- Card clicável: se completed → ResultPage, se processing → ProcessingPage
- Botão "Nova Matéria" abre modal com: input título, textarea descrição (opcional), textarea links YouTube (um por linha)
- Validação: pelo menos 1 link válido do YouTube
- Botão deletar matéria (com confirmação)

### ProcessingPage
- Header com título da matéria + botão voltar
- Progress bar geral (processedLessons / totalLessons)
- Lista de aulas com status individual: ícone spinner (transcribing), check (transcribed), clock (pending), x (error)
- Polling a cada 3 segundos via GET /subjects/:id/status
- Quando status === 'completed': redirecionar automaticamente para ResultPage
- Se error: mostrar mensagem e botão "Tentar novamente"

### ResultPage
- Header com título da matéria + botões "Quiz" e "Exportar PDF"
- 3 abas: "Plano de Estudos", "Resumos", "Radar de Prova"
- Aba Plano: renderiza Markdown do study_plan (usar react-markdown ou dangerouslySetInnerHTML com sanitização simples)
- Aba Resumos: accordion/lista expansível, um card por aula com título + resumo + badges dos key_topics
- Aba Radar: cards ordenados por relevância (high primeiro), com badge de relevância colorido, citação do professor em itálico, reasoning
- Botão "Exportar PDF": usa jsPDF + html2canvas para capturar a aba ativa

### QuizPage
- Header com título da matéria + progresso "Questão X de Y"
- Uma questão por vez, com 4 opções em cards clicáveis
- Ao selecionar: destaca verde (correta) ou vermelho (errada) + mostra explicação
- Botão "Próxima" para avançar
- Ao final: tela de resultado com score, porcentagem, botão "Refazer" e "Voltar"
- Salva tentativa via POST /quiz-attempts

## Configurações

| Config | Valor |
|---|---|
| Backend port | 3001 |
| Frontend port | 5173 |
| Banco | data/studygen.db |
| OPENAI_API_KEY | variável de ambiente (process.env.OPENAI_API_KEY) |
| Modelo IA | gpt-4o |
| Modelo Whisper | whisper-1 |
| Max links por matéria | 20 |
| Quizzes por aula | 5 |

## Seed Data

Não há seed data pré-populado — o sistema começa vazio. O usuário cria matérias ao usar.

## Dependências Extras (npm)

### Backend
- `openai` — SDK oficial da OpenAI (GPT-4o + Whisper)
- `youtube-transcript` — extração de legendas do YouTube
- `child_process` (nativo) — para chamar yt-dlp como fallback
- `fs/promises` (nativo) — manipulação de arquivos temporários de áudio

### Frontend
- `react-markdown` — renderização de Markdown
- `jspdf` — geração de PDF
- `html2canvas` — captura de HTML para PDF

### Sistema (deve estar instalado)
- `yt-dlp` — CLI para download de áudio do YouTube (fallback)

# StudyGen v2 — Documentação de Desenvolvimento

- **Projeto:** StudyGen — Gerador de Material de Estudo a partir de aulas do YouTube
- **Stack:** TypeScript, Express + better-sqlite3 (backend), React + Vite + TailwindCSS + React Query (frontend)
- **IA:** kiro-cli (substitui OpenAI SDK) via `child_process.execFile`
- **Data:** 2026-04-10
- **Tempo total de build:** 158s (5 tarefas, 2 devs paralelos, 1 reviewer)
- **Arquivos fonte:** 24 (backend: 10, frontend: 14) | ~1931 linhas

---

## Tarefas Executadas

### T001 — Backend Core (pane 1, 14s)

**Arquivos criados:**
- `backend/src/server.ts` — Express app com helmet, cors (origin: localhost:5173), JSON 10mb
- `backend/src/db.ts` — Singleton getter/setter para instância better-sqlite3
- `backend/src/database.ts` — Schema SQLite: 7 tabelas (subjects, lessons, study_plans, summaries, quizzes, exam_radar, quiz_attempts), WAL mode, foreign keys
- `backend/src/services/openai.ts` — Wrapper kiro-cli para geração de resumos, planos, quizzes, radar de prova e chat tutor
- `backend/src/services/processor.ts` — Pipeline de processamento: transcrição → resumo → quizzes → radar → plano de estudos
- `backend/src/services/transcription.ts` — Transcrição YouTube (youtube-transcript lib, fallback yt-dlp + whisper)
- `backend/src/routes/subjects.ts` — CRUD de matérias + status de processamento
- `backend/src/routes/content.ts` — Endpoints de conteúdo gerado (study-plan, summaries, quizzes, exam-radar, quiz-attempts)
- `backend/src/validators/subject.ts` — Zod schema: título obrigatório, 1-20 URLs YouTube
- `backend/src/validators/quiz.ts` — Zod schema: tentativa de quiz com respostas

**Decisões técnicas:**
- better-sqlite3 com WAL mode para performance em leituras concorrentes
- Processamento assíncrono disparado via `import()` dinâmico após criação do subject
- Transcrição com fallback: youtube-transcript (legendas) → yt-dlp + whisper (áudio)
- Todas as tabelas com ON DELETE CASCADE a partir de subjects

### T002 — Chat Tutor Backend (pane 1, 23s)

**Arquivos criados/modificados:**
- `backend/src/validators/chat.ts` — **Novo.** Zod schema para mensagem de chat (message + history opcional)
- `backend/src/routes/content.ts` — **Modificado.** Adicionado endpoint `POST /content/:id/chat` que busca resumo por lesson_id e chama `chatWithTutor`
- `backend/src/services/openai.ts` — **Modificado.** Refatoração do `callKiro`: adicionado temp file para prompts, simplificado retorno de `generateStudyPlan` e `chatWithTutor` (removido variável intermediária `raw`)

**Decisões técnicas:**
- Chat baseado no resumo da aula (não na transcrição completa) para reduzir tamanho do prompt
- Histórico de conversa enviado pelo frontend a cada request (stateless no backend)

### T003 — Frontend Core (pane 2, 26s)

**Arquivos criados:**
- `frontend/src/main.tsx` — Entry point React com StrictMode
- `frontend/src/App.tsx` — Router com 4 rotas (home, result, processing, quiz), React Query provider
- `frontend/src/index.css` — TailwindCSS + animações customizadas (fadeIn, slideUp, scaleIn)
- `frontend/src/api/client.ts` — Axios instance apontando para localhost:3001/api
- `frontend/src/api/subjects.ts` — Funções API: CRUD subjects + processing status
- `frontend/src/api/content.ts` — Funções API: study-plan, summaries, quizzes, exam-radar, quiz-attempts, chat
- `frontend/src/types/subject.ts` — Tipos: Subject, Lesson, SubjectDetail, CreateSubjectInput, ProcessingStatus
- `frontend/src/types/content.ts` — Tipos: StudyPlan, Summary, QuizQuestion, ExamRadarItem, QuizAttempt, ChatMessage
- `frontend/src/hooks/useSubjects.ts` — React Query hooks: useSubjects, useSubject, useCreateSubject, useDeleteSubject, useProcessingStatus (polling 3s)
- `frontend/src/hooks/useContent.ts` — React Query hooks: useStudyPlan, useSummaries, useQuizzes, useExamRadar, useSubmitQuizAttempt, useQuizAttempts
- `frontend/src/utils/format.ts` — Formatação: data pt-BR, duração, percentual, truncamento
- `frontend/src/utils/youtube.ts` — Validação e parsing de URLs YouTube
- `frontend/src/components/layout/Header.tsx` — Header com logo e título
- `frontend/src/components/ui/` — 7 componentes UI: Card, Button, Input, Textarea, Badge, Modal, ProgressBar, EmptyState
- `frontend/src/pages/HomePage.tsx` — Lista de matérias, modal de criação, confirmação de exclusão
- `frontend/src/pages/ProcessingPage.tsx` — Acompanhamento em tempo real com polling, redirect automático ao concluir
- `frontend/src/pages/ResultPage.tsx` — Tabs: Plano de Estudos, Resumos, Radar de Prova. Exportação PDF via html2canvas + jsPDF
- `frontend/src/pages/QuizPage.tsx` — Quiz interativo com feedback por questão, resultado final com percentual

**Decisões técnicas:**
- Design system com cores fixas (hex) em vez de Tailwind tokens para consistência visual
- Polling de 3s no ProcessingPage para acompanhar progresso
- PDF gerado client-side via screenshot do DOM (html2canvas)
- Markdown renderizado inicialmente com `dangerouslySetInnerHTML` + função `markdownToHtml` customizada

### T004 — Chat Tutor Frontend (pane 2, 17s)

**Arquivos criados/modificados:**
- `frontend/src/components/ChatTutor.tsx` — **Novo.** Componente de chat com bolhas de mensagem, loading animado, auto-scroll, envio por Enter
- `frontend/src/pages/ResultPage.tsx` — **Modificado.** Adicionada tab "Chat Tutor" com ícone MessageCircle, state `chatLessonIndex`, import do ChatTutor

**Decisões técnicas:**
- Chat stateless: histórico mantido no state do componente e enviado a cada request
- `key` prop no ChatTutor vinculada ao lessonId para resetar ao trocar de aula
- Componente não integrado ao JSX nesta tarefa (tab existia mas sem bloco de renderização)

### T005 — Build/Verificação Frontend (pane 2, 92s)

**Resultado:** Nenhum arquivo fonte modificado. Tarefa provavelmente envolveu build, instalação de dependências ou verificação de compilação.

---

## Arquitetura Atual

### Substituição OpenAI → kiro-cli

O projeto não usa o SDK da OpenAI. Toda geração de conteúdo IA passa pelo `kiro-cli`:

```
Frontend → API Express → services/openai.ts → callKiro() → kiro-cli (child_process.execFile)
```

**`callKiro(prompt)`:**
1. Escreve prompt em arquivo temporário
2. Executa `kiro-cli chat --no-interactive <prompt>` com timeout de 300s e buffer de 10MB
3. Limpa output: remove ANSI codes, linhas vazias, timestamps do kiro
4. Retorna texto limpo

**`extractJson(raw)`:** Extrai JSON de respostas que podem vir com fencing markdown ou texto extra.

Funções exportadas: `generateSummary`, `generateStudyPlan`, `generateQuizzes`, `generateExamRadar`, `chatWithTutor`, `transcribeAudio` (stub vazio).

### Chat Tutor — Fluxo End-to-End

```
1. Frontend (ResultPage) → tab "Chat Tutor" → seleciona aula via dropdown
2. ChatTutor component → input do usuário → sendChatMessage(lessonId, message, history)
3. API: POST /content/:id/chat → busca resumo da aula em summaries (por lesson_id)
4. Backend: chatWithTutor({ summary, history, message }) → callKiro() com prompt contextualizado
5. kiro-cli processa e retorna resposta
6. Frontend: adiciona resposta ao state de mensagens, auto-scroll
```

O chat é stateless no backend — o histórico completo é enviado pelo frontend a cada mensagem.

### Fluxo de Dados Principal

```
1. Usuário cola links YouTube → POST /api/subjects (cria subject + lessons)
2. processSubject() dispara em background:
   a. Para cada lesson: getYoutubeTranscript() → transcrição
   b. Para cada transcrita: generateSummary() → INSERT summaries
   c. Para cada transcrita: generateQuizzes() → INSERT quizzes
   d. Para cada transcrita: generateExamRadar() → INSERT exam_radar
   e. generateStudyPlan(todos resumos) → INSERT study_plans
   f. UPDATE subjects SET status = 'completed'
3. Frontend faz polling em GET /subjects/:id/status (3s)
4. Ao completar: redirect para ResultPage com tabs de conteúdo
```

### Schema do Banco (SQLite)

```
subjects ──┬── lessons ──┬── summaries
            │             ├── quizzes
            │             └── exam_radar
            ├── study_plans
            ├── quizzes (sem lesson_id)
            ├── exam_radar (sem lesson_id)
            └── quiz_attempts
```

Todas as relações com ON DELETE CASCADE. WAL mode habilitado.

---

## Métricas

| Métrica | Valor |
|---|---|
| Tempo total | 158s |
| Tarefas | 5 (3 backend, 2 frontend) |
| Devs paralelos | 2 |
| Reviewers | 1 |
| Arquivos fonte | 24 |
| Linhas totais | ~1931 |
| Tabelas SQLite | 7 |
| Endpoints API | 10 |
| Páginas React | 4 |
| Componentes UI | 8 |

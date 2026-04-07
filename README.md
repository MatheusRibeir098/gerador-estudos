# StudyGen — Gerador de Estudos via YouTube

Sistema que transforma aulas do YouTube em material de estudo usando IA.

## Stack
- **Backend:** Express + better-sqlite3 + OpenAI (GPT-4o + Whisper)
- **Frontend:** React 19 + Vite + TanStack Query + Tailwind CSS

## Grafo de Dependências

```
Wave 1 (paralelo):
  T001 [back-1] Database/Schema
  T002 [back-2] Validators + OpenAI service
  T003 [front-1] Types + API client
  T004 [front-2] UI components
  T005 [front-3] Hooks + utils

Wave 2 (paralelo):
  T006 [back-1] Server Express        ← T001
  T007 [back-2] Transcription service  ← T002
  T011 [front-1] HomePage             ← T003, T005
  T012 [front-2] ProcessingPage       ← T004, T005
  T013 [front-3] ResultPage           ← T005, T004

Wave 3 (paralelo):
  T008 [back-1] Subject routes         ← T006, T002
  T009 [back-2] Processor service      ← T007, T006
  T014 [front-2] QuizPage             ← T012

Wave 4 (paralelo):
  T010 [back-1] Content routes + integração ← T008
  T015 [front-1] App.tsx + rotas            ← T011, T012, T013, T014
```

## Panes e Skills

| Pane | Domínio | Skills |
|------|---------|--------|
| pane-1 (back-1) | backend | clean-code, seguranca, git-conventions, rest-api |
| pane-2 (back-2) | backend | clean-code, seguranca, git-conventions, rest-api |
| pane-3 (front-1) | frontend | clean-code, seguranca, git-conventions, tailwind, typescript, node |
| pane-4 (front-2) | frontend | clean-code, seguranca, git-conventions, tailwind, typescript, node |
| pane-5 (front-3) | frontend | clean-code, seguranca, git-conventions, tailwind, typescript, node |
| reviewer (x4) | review | clean-code, seguranca |
| tester | test | integridade → API → E2E |

## Comandos

```bash
# 1. Criar sessão tmux
bash setup.sh

# 2. (Opcional) Ver os agents
tmux attach -t gerador-estudos

# 3. Em OUTRO terminal, fora do tmux
bash run.sh
```

## Reset

```bash
git checkout estado-limpo -- .
git clean -fd backend/src frontend/src backend/data orchestration/run.log
mkdir -p backend/data orchestration/signals
```

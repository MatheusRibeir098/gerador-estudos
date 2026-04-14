# StudyGen — Estado Atual do Projeto

**Última atualização:** 2026-04-14
**Último commit:** `9510823` (fix: renderização de diagramas Mermaid como SVG)
**Pendente de commit:** 22 arquivos (features: leitura voz alta, flashcards SM-2, gamificação, dashboard, flashcards backend)

---

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Backend | Express 4 + better-sqlite3 + Zod + Multer + pdf-parse + mammoth + tesseract.js |
| Frontend | React 19 + Vite 6 + TanStack Query + Tailwind CSS 3 + Mermaid.js + supermemo (SM-2) |
| IA | kiro-cli (chat --no-interactive) como processo filho |
| Testes | Playwright (E2E) |
| Banco | SQLite (data/studygen.db) |

## Repositório GitHub

- **URL:** https://github.com/MatheusRibeir098/gerador-estudos (público)
- **Branch:** master
- **Template fix-loop:** https://github.com/MatheusRibeir098/multi-agents-framework (privado)

## Sessão tmux

- `servers:0.0` — Backend (porta 3001)
- `servers:0.1` — Frontend Vite (porta 5173)
- `fix-gerador:0.0` — Agent tester-fix
- `fix-gerador:0.1` — Agent monitor-fix (este chat)
- `fix-gerador:0.2` — Agent dev-fix

## Banco de Dados (10 tabelas)

| Tabela | Rows | Descrição |
|--------|------|-----------|
| subjects | 7 | Matérias (youtube + exam) com content_options e source_type |
| lessons | 33 | Aulas/fontes (transcrições, status) |
| exam_sources | 10 | Fontes de prova (PDFs, texto extraído) |
| summaries | 31 | Resumos Feynman com keyTopics |
| study_content | 22 | Material de estudo completo (slides) |
| study_plans | 5 | Planos de estudo com repetição espaçada |
| quizzes | 372 | Perguntas múltipla escolha |
| exam_radar | 667 | Tópicos com probabilidade de cair na prova |
| quiz_attempts | 6 | Histórico de tentativas |
| flashcards | 0 | Flashcards gerados pela IA (tabela nova, ainda sem dados) |

## Matérias Existentes

| ID | Título | Tipo | Aulas | Status |
|----|--------|------|-------|--------|
| 6 | 100 Palavras em Inglês | youtube | 1 | completed |
| 8 | Trigonometria | youtube | 1 | completed |
| 14 | Trabalho Matemática | exam | 1 | completed |
| 24 | AWS Glue Tutorial | youtube | 7 | completed |
| 25 | Estatística | youtube | 12 | completed (10/12 IA, 2 falharam) |
| 26 | Slides Estatística | exam | 9 | completed |
| 27 | Estudos Databricks | youtube | 2 | completed |

## Features Implementadas

### Core
- [x] Criar matéria via links YouTube (individuais ou playlist)
- [x] Criar matéria via upload (PDF, DOCX, imagens com OCR, texto colado)
- [x] Transcrição automática de vídeos (youtube-transcript + whisper fallback)
- [x] Extração de texto de PDFs (pdf-parse), DOCX (mammoth), imagens (tesseract.js OCR)
- [x] Resolução automática de playlists YouTube (youtube-search-api)
- [x] Processamento assíncrono com polling de status
- [x] Estimativa de tempo restante na ProcessingPage

### Geração de Conteúdo IA
- [x] Resumos com Técnica Feynman + keyTopics
- [x] Material de estudo completo (otimizado para slides)
- [x] Quizzes múltipla escolha (sem referência a aula/professor)
- [x] Radar de prova (tópicos com relevância alta/média/baixa)
- [x] Plano de estudos com repetição espaçada
- [x] Chat Tutor por aula + opção "Todas as aulas"
- [x] Flashcards dedicados via IA (front/back/category) — NOVO, sem dados ainda
- [x] Anti-repetição: contexto de tópicos anteriores entre slides
- [x] Diagramas Mermaid em vez de ASCII art
- [x] Checkboxes para escolher o que gerar (study, summary, radar, quiz, plan)

### Frontend — UX
- [x] Design system completo (Card, Button, Badge, Modal, Input, etc.)
- [x] Dark mode com toggle e persistência
- [x] Área de Estudo em slides com modo foco (cards minimizados → expand)
- [x] Progresso de leitura persistente (localStorage por subject)
- [x] Auto-marcar como lido ao navegar entre slides
- [x] Leitura em voz alta (Web Speech API) — Ouvir/Pausar/Parar
- [x] Flashcards com repetição espaçada (algoritmo SM-2 via supermemo)
- [x] Gamificação: XP, streaks, conquistas, níveis
- [x] Dashboard de desempenho (XP, streak, conquistas, histórico)
- [x] Quiz com escolha de quantidade + embaralhamento
- [x] Diagramas Mermaid renderizados como SVG (com tema customizado)
- [x] preprocessMarkdown: auto-detecta mermaid sem fences e ASCII art
- [x] Títulos descritivos (cleanTitle com fallback keyTopic → H2 → filename)
- [x] Botão scroll-to-top flutuante
- [x] Responsivo + acessível

### Backend — Otimizações
- [x] Try/catch isolados por geração de IA
- [x] Fix cleanKiroOutput (preserva JSON em vez de descartar)
- [x] Migration automática para bancos existentes (source_type, content_options)
- [x] content_options: pula gerações desmarcadas pelo usuário

## Bugs Conhecidos / Limitações

- **Velocidade:** Processamento sequencial via kiro-cli (~4 min por aula). Paralelização não funciona com kiro-cli (output garbled).
- **kiro-cli como dependência:** Qualquer pessoa que clonar precisa ter kiro-cli instalado e autenticado.
- **Flashcards backend:** Tabela criada mas ainda sem dados (matérias existentes foram geradas antes da feature).
- **Matérias antigas:** Conteúdo gerado antes das melhorias (anti-repetição, Mermaid, prompts otimizados) pode ter repetição e ASCII art.
- **yt-dlp não instalado:** Fallback de transcrição via Whisper não funciona. Títulos de vídeos YouTube podem vir null.

## Pendente de Commit

Arquivos modificados não commitados (22 arquivos):
- Feature: Leitura em voz alta (useSpeech hook + botões na ResultPage)
- Feature: Flashcards SM-2 (FlashcardsPage + supermemo + rota)
- Feature: Gamificação (useGamification + XPBar + integração em todas as páginas)
- Feature: Dashboard de desempenho (DashboardPage + rota)
- Feature: Flashcards backend (tabela + generateFlashcards + rota API)
- Melhoria: Prompts Mermaid com regras de formatação

## Skills (12 no template fix-loop)

### Frontend (8)
- ui-design.md, responsive.md, animations.md, react-patterns.md
- tailwind.md, typescript.md, dark-mode.md, content-ux.md

### Shared (4)
- clean-code.md, seguranca.md, lessons-learned.md, file-upload.md

## Ideias Futuras

- [ ] Trocar kiro-cli pela API da OpenAI diretamente (paralelização real, structured outputs, streaming)
- [ ] Exportar flashcards para Anki (.apkg)
- [ ] Notificações de revisão pendente (flashcards due)
- [ ] Mapa de calor de dias estudados (estilo GitHub contributions)
- [ ] Gráfico de evolução nos quizzes ao longo do tempo
- [ ] KaTeX para fórmulas matemáticas renderizadas
- [ ] PWA (Progressive Web App) para uso offline

# Estado Atual do Projeto — gerador-estudos

> Última atualização: 2026-04-08
> Localização: `~/multi-agents-framework/gerador-estudos/`

---

## Visão Geral

O projeto tem **duas versões**:

1. **Interface Web (v1 — abandonada):** backend Express + frontend React gerados por multi-agents. Funcional mas depende de API key da OpenAI que o usuário não possui.
2. **Script CLI (v2 — ativa):** `estudar.sh` que usa `youtube-transcript` para transcrever vídeos e `kiro-cli --no-interactive` como motor de IA para gerar material de estudo. Sem custo de API.

A versão ativa é o **script CLI (`estudar.sh`)**.

---

## Estrutura de Arquivos

```
gerador-estudos/
├── estudar.sh                    ← 🟢 SCRIPT PRINCIPAL (v2 ativa)
│
├── backend/                      ← 🟡 Interface web (v1, não usada)
│   ├── src/
│   │   ├── server.ts             ← Express API (porta 3001)
│   │   ├── database.ts           ← SQLite init (better-sqlite3)
│   │   ├── db.ts                 ← DB singleton
│   │   ├── routes/
│   │   │   ├── subjects.ts       ← CRUD de matérias
│   │   │   └── content.ts        ← Processamento de conteúdo
│   │   ├── services/
│   │   │   ├── openai.ts         ← ⚠️ REQUER OPENAI_API_KEY (bloqueante)
│   │   │   ├── processor.ts      ← Orquestra processamento
│   │   │   └── transcription.ts  ← Transcrição via youtube-transcript
│   │   └── validators/
│   │       ├── subject.ts        ← Zod schemas
│   │       └── quiz.ts           ← Zod schemas
│   ├── data/studygen.db          ← SQLite database
│   ├── transcriber.ts            ← Helper de transcrição (não usado)
│   ├── transcriber.mjs           ← Helper de transcrição (não usado)
│   ├── package.json              ← Deps: express, better-sqlite3, openai, youtube-transcript, zod
│   └── node_modules/             ← ✅ Instalado (youtube-transcript usado pelo estudar.sh)
│
├── frontend/                     ← 🟡 Interface web (v1, não usada)
│   ├── src/
│   │   ├── App.tsx               ← Router principal
│   │   ├── main.tsx              ← Entry point
│   │   ├── pages/                ← HomePage, QuizPage, ResultPage, ProcessingPage
│   │   ├── components/           ← UI components (Button, Card, Modal, etc.)
│   │   ├── hooks/                ← useContent, useSubjects
│   │   ├── api/                  ← client.ts (axios → localhost:3001), subjects.ts, content.ts
│   │   ├── types/                ← content.ts, subject.ts
│   │   └── utils/                ← format.ts, youtube.ts
│   ├── vite.config.ts            ← Porta 5173
│   ├── tailwind.config.js
│   ├── package.json              ← Deps: react, vite, tailwind, tanstack-query, axios
│   └── node_modules/             ← ✅ Instalado
│
├── e2e/                          ← Playwright (não usado)
│   ├── package.json
│   └── playwright.config.ts
│
├── orchestration/                ← Artefatos do multi-agents framework
│   ├── context.md                ← Spec do projeto (gerada pelo spec agent)
│   ├── tasks.json                ← 15 tarefas em waves (executadas com sucesso)
│   ├── run.log                   ← Log da execução (15/15 tarefas ✅, timeout no tester)
│   ├── logs/                     ← Logs por pane (pane-0 a pane-9)
│   └── signals/                  ← Sinais de coordenação entre agents
│
├── .kiro/
│   ├── agents/                   ← Agents JSON (pane-1..5, reviewer, tester)
│   │   └── prompts/              ← Prompts dos agents (dev.md, reviewer.md, etc.)
│   └── skills/                   ← Skills por domínio (_shared, backend, frontend)
│
├── setup.sh                      ← Cria sessão tmux (multi-agents, v1)
├── run.sh                        ← Orquestra agents via tmux (multi-agents, v1)
├── clean-logs.sh                 ← Limpa logs de execução
├── README.md                     ← Docs do projeto (v1)
└── .gitignore
```

---

## Script Principal: `estudar.sh`

### O que faz
1. Lê links de YouTube de um arquivo `.txt`
2. Transcreve cada vídeo usando `youtube-transcript` (sem API, grátis)
3. Para cada vídeo, chama `kiro-cli --no-interactive` para gerar:
   - `resumo.md` — resumo estruturado da aula
   - `quiz.md` — 10 perguntas de múltipla escolha
   - `radar-prova.md` — tópicos que o professor enfatizou
4. Gera `plano-de-estudos.md` consolidando todas as aulas

### Como rodar
```bash
cd ~/multi-agents-framework/gerador-estudos
bash estudar.sh "/mnt/c/Users/Dati - 166/Desktop/videosAulaEADestatistica.txt"
```

### Saída
```
/mnt/c/Users/Dati - 166/Documents/estudos/
├── video-1/
│   ├── resumo.md
│   ├── quiz.md
│   └── radar-prova.md
├── video-2/
│   ├── ...
├── ...
├── video-12/
│   ├── ...
└── plano-de-estudos.md
```

### Cache
- Transcrições ficam em `/tmp/studygen/trans_N.txt`
- Se o arquivo de saída já existe, o script pula (idempotente)
- Para regenerar um material, delete o `.md` correspondente e rode de novo

### Configurações importantes
| Variável | Valor | Onde mudar |
|---|---|---|
| `OUTPUT_DIR` | `/mnt/c/Users/Dati - 166/Documents/estudos` | Linha 4 do `estudar.sh` |
| `MAX_CHARS` | 40000 | Linha 7 — limite de chars por prompt (transcrições longas são truncadas) |
| `TEMP_DIR` | `/tmp/studygen` | Linha 6 — cache de transcrições |
| Timeout kiro-cli | 300s | Dentro da função `ask_kiro` |

### Dependências do script
- `node` + `npx tsx` — para rodar o transcriber
- `youtube-transcript` — pacote npm (instalado em `backend/node_modules/`)
- `kiro-cli` — motor de IA (usa `--no-interactive`)
- `sed`, `tr`, `grep` — utilitários bash padrão

### Bugs conhecidos / Limitações
- Transcrições truncadas em 40k chars — vídeos muito longos perdem conteúdo do final
- Arquivo de links do Windows precisa ter `\r` removido (já tratado no script com `tr -d '\r'`)
- `kiro-cli` pode dar timeout em prompts muito grandes (300s limit)
- Sem suporte a vídeos sem legenda/transcrição automática

---

## Interface Web (v1 — não usada)

### Por que foi abandonada
O backend usa `openai` SDK que requer `OPENAI_API_KEY`. O usuário não tem chave da OpenAI. Foi considerado migrar para Amazon Bedrock (o usuário tem acesso AWS via Daticloud SSO), mas o custo seria na fatura da empresa. Optou-se pelo script CLI usando kiro-cli como motor de IA (sem custo adicional).

### Se quiser reativar
1. Obter uma `OPENAI_API_KEY`
2. Subir backend: `cd backend && OPENAI_API_KEY=sk-... pnpm dev` (porta 3001)
3. Subir frontend: `cd frontend && pnpm dev` (porta 5173)
4. Ou via tmux:
```bash
tmux new-session -d -s studygen -n backend -c backend
tmux send-keys -t studygen:backend 'OPENAI_API_KEY=sk-... pnpm dev' Enter
tmux new-window -t studygen -n frontend -c frontend
tmux send-keys -t studygen:frontend 'pnpm dev' Enter
```

### Alternativa Bedrock (não implementada)
O usuário tem acesso ao Bedrock (conta `396287094730`, user `matheus-cli`). Modelos Claude disponíveis em `us-east-1`. Para migrar:
- Instalar `@aws-sdk/client-bedrock-runtime` no backend
- Reescrever `backend/src/services/openai.ts` para usar Bedrock
- Modelo sugerido: `anthropic.claude-3-haiku-20240307-v1:0` (mais barato)

---

## Execução Multi-Agents (histórico)

A interface web foi gerada pelo framework multi-agents em 2026-04-07:
- 15 tarefas executadas com 5 dev panes + 4 reviewers
- Tempo total: ~167 minutos
- Todas as tarefas concluídas ✅
- Timeout no tester (não chegou a executar testes)
- 35 arquivos gerados (10 backend + 25 frontend)

---

## Resultado da Execução do `estudar.sh`

Executado em 2026-04-08 com 12 vídeos de Estatística EAD:

| Vídeo | ID YouTube | Transcrição | Resumo | Quiz | Radar |
|-------|-----------|-------------|--------|------|-------|
| 1 | EImDZektREM | 71.326 chars | ✅ 5.362 | ✅ 6.520 | ✅ 6.291 |
| 2 | ZbLwNGrRHdw | 45.994 chars | ✅ 6.334 | ✅ 5.168 | ✅ 6.620 |
| 3 | oJ_zyIZWCXM | 66.105 chars | ✅ 5.278 | ✅ 5.156 | ✅ 9.848 |
| 4 | WEbaLrk4SuQ | 49.864 chars | ✅ 5.076 | ✅ 5.558 | ✅ 6.213 |
| 5 | P0guFp7MMIU | 70.783 chars | ✅ 6.419 | ✅ 7.367 | ✅ 7.973 |
| 6 | _4qKaMvzCj0 | 52.756 chars | ✅ 3.875 | ✅ 5.743 | ✅ 6.939 |
| 7 | ayUo4EPRLPc | 66.858 chars | ✅ 5.111 | ✅ 7.662 | ✅ 7.108 |
| 8 | MOZmiXUJZR4 | 62.997 chars | ✅ 5.530 | ✅ 6.470 | ✅ 6.982 |
| 9 | dlatyb9EJ8w | 64.322 chars | ✅ 6.233 | ✅ 7.363 | ✅ 6.558 |
| 10 | KvF11VdlNSg | 68.007 chars | ✅ 5.714 | ✅ 6.846 | ✅ 8.252 |
| 11 | foypPNrxo-k | 59.658 chars | ✅ 5.255 | ✅ 6.095 | ✅ 6.172 |
| 12 | mZobdcvnIZ0 | 40.303 chars | ✅ 4.403 | ✅ 5.985 | ✅ 6.179 |

Plano de estudos consolidado: ✅ 10.348 chars

---

## Próximos Passos Possíveis

1. **V2 com análise visual:** instalar `yt-dlp` + `ffmpeg`, extrair frames dos vídeos, descrever slides/quadro do professor
2. **Migrar para Bedrock:** reescrever `openai.ts` para usar AWS Bedrock (sem custo pessoal)
3. **Melhorar truncamento:** dividir transcrições longas em chunks e processar cada um, depois consolidar
4. **Adicionar flashcards:** gerar cards Anki-style para revisão espaçada
5. **Interface web funcional:** reativar frontend com Bedrock no backend

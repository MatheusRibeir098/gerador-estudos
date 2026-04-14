# 📚 StudyGen — Gerador de Estudos com IA

<div align="center">

**Transforme aulas do YouTube, PDFs e slides em material de estudo completo usando Inteligência Artificial.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 🎯 O que é?

O StudyGen é uma plataforma que recebe conteúdo educativo (vídeos do YouTube, PDFs, slides, documentos Word ou imagens) e gera automaticamente:

- 📖 **Área de Estudo** — Material didático completo com Técnica Feynman, analogias, exemplos e mnemônicos
- 📝 **Resumos** — Resumos inteligentes com tópicos-chave
- 🧠 **Quizzes** — Perguntas de múltipla escolha com explicações detalhadas
- 🎯 **Radar de Prova** — Identifica o que provavelmente cairá na prova
- 📅 **Plano de Estudos** — Cronograma com repetição espaçada
- 💬 **Chat Tutor** — Tire dúvidas com um tutor IA sobre o conteúdo

---

## ✨ Features

### Fontes de Conteúdo
- 🎥 **YouTube** — Cole links individuais ou uma playlist inteira (expansão automática)
- 📄 **PDF/DOCX** — Upload de slides, provas, trabalhos
- 🖼️ **Imagens** — OCR automático para extrair texto de fotos de provas
- ✏️ **Texto** — Cole o conteúdo diretamente

### Experiência de Estudo
- 🎴 **Navegação em Slides** — Conteúdo dividido em seções navegáveis (anterior/próximo)
- 📊 **Progresso Persistente** — Marca seções como lidas, salva onde você parou
- 🔍 **Modo Foco** — Cards minimizados que expandem para estudo imersivo
- ✅ **Checkboxes de Conteúdo** — Escolha o que gerar (resumo, quiz, radar, etc.)
- ⏱️ **Estimativa de Tempo** — Saiba quanto falta para o processamento terminar

### Visual
- 🌙 **Dark Mode** — Toggle claro/escuro com persistência
- 📐 **Diagramas Mermaid** — Fluxogramas e mapas mentais renderizados como SVG
- 🎨 **Design Moderno** — Glassmorphism, micro-interações, animações suaves
- 📱 **Responsivo** — Funciona em desktop, tablet e mobile

### Quiz
- 🎮 **Escolha a Quantidade** — Selecione quantas perguntas quer responder
- 🔀 **Perguntas Embaralhadas** — Ordem aleatória a cada tentativa
- 📈 **Histórico** — Acompanhe sua evolução nos quizzes

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 19, Vite, TanStack Query, Tailwind CSS, Lucide Icons, Mermaid.js |
| **Backend** | Express, better-sqlite3, Zod, Multer |
| **IA** | Kiro CLI (interface para LLMs) |
| **Extração** | youtube-transcript, pdf-parse, mammoth (DOCX), tesseract.js (OCR) |
| **Testes** | Playwright (E2E) |

---

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 20+
- pnpm

### 1. Instalar dependências

```bash
# Backend
cd backend
pnpm install

# Frontend
cd ../frontend
pnpm install
```

### 2. Iniciar os servidores

```bash
# Terminal 1 — Backend (porta 3001)
cd backend
pnpm dev

# Terminal 2 — Frontend (porta 5173)
cd frontend
pnpm dev
```

### 3. Acessar

Abra **http://localhost:5173** no navegador.

---

## 📁 Estrutura do Projeto

```
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express server
│   │   ├── database.ts            # Schema SQLite + migrations
│   │   ├── routes/
│   │   │   ├── subjects.ts        # CRUD de matérias + status
│   │   │   ├── content.ts         # Resumos, quizzes, radar, plano, chat
│   │   │   ├── exam.ts            # Upload de provas/trabalhos
│   │   │   └── playlist.ts        # Resolver playlists YouTube
│   │   ├── services/
│   │   │   ├── openai.ts          # Geração de conteúdo via IA
│   │   │   ├── processor.ts       # Pipeline de processamento
│   │   │   ├── transcription.ts   # Transcrição de vídeos
│   │   │   └── extractor.ts       # Extração de texto (PDF/DOCX/OCR)
│   │   └── validators/            # Schemas Zod
│   └── data/                      # Banco SQLite
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.tsx        # Lista de matérias + criação
│   │   │   ├── ProcessingPage.tsx  # Acompanhamento do processamento
│   │   │   ├── ResultPage.tsx      # Área de estudo, resumos, radar, chat
│   │   │   └── QuizPage.tsx        # Quiz interativo
│   │   ├── components/
│   │   │   ├── ui/                 # Design system (Card, Button, Badge, etc.)
│   │   │   ├── layout/Header.tsx   # Header com toggle dark mode
│   │   │   ├── ChatTutor.tsx       # Chat com tutor IA
│   │   │   └── MermaidBlock.tsx    # Renderização de diagramas
│   │   ├── hooks/                  # useSubjects, useContent, useTheme
│   │   ├── api/                    # Chamadas HTTP ao backend
│   │   └── types/                  # Interfaces TypeScript
│   └── tailwind.config.js          # Tema customizado + dark mode
│
└── e2e/                            # Testes E2E com Playwright
```

---

## 🔄 Como Funciona

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   YouTube    │     │  PDF / DOCX  │     │    Imagem/OCR   │
│   Playlist   │     │   Slides     │     │    Texto puro   │
└──────┬───────┘     └──────┬───────┘     └────────┬────────┘
       │                    │                      │
       ▼                    ▼                      ▼
┌──────────────────────────────────────────────────────────┐
│                    Extração de Texto                      │
│  youtube-transcript │ pdf-parse │ mammoth │ tesseract.js  │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   Geração de Conteúdo IA                  │
│                                                           │
│  📖 Resumo Feynman    🧠 Quizzes    🎯 Radar de Prova   │
│  📚 Área de Estudo    📅 Plano      💬 Chat Tutor        │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                    Interface do Aluno                      │
│                                                           │
│  🎴 Slides navegáveis    📊 Progresso    🌙 Dark mode    │
│  📐 Diagramas Mermaid    ✅ Leitura      🎮 Quiz config  │
└──────────────────────────────────────────────────────────┘
```

---

## 📸 Screenshots

> *Adicione screenshots do projeto aqui*

| Home | Área de Estudo | Quiz |
|------|---------------|------|
| Lista de matérias | Slides com modo foco | Quiz interativo |

---

## 🧪 Testes

```bash
# E2E com Playwright
cd e2e
npx playwright install chromium
npx playwright test
```

---

## 📝 Banco de Dados

O projeto usa **SQLite** com 9 tabelas:

| Tabela | Descrição |
|--------|-----------|
| `subjects` | Matérias (título, status, tipo, opções de conteúdo) |
| `lessons` | Aulas/fontes (URL, transcrição, status) |
| `exam_sources` | Fontes de prova (arquivo, texto extraído) |
| `summaries` | Resumos gerados pela IA |
| `study_content` | Material de estudo completo |
| `study_plans` | Planos de estudo com repetição espaçada |
| `quizzes` | Perguntas de múltipla escolha |
| `exam_radar` | Tópicos com probabilidade de cair na prova |
| `quiz_attempts` | Histórico de tentativas nos quizzes |

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b minha-feature`
3. Commit: `git commit -m "feat: minha feature"`
4. Push: `git push origin minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é open source sob a licença MIT.

---

<div align="center">

Feito com ❤️ e muita IA

</div>

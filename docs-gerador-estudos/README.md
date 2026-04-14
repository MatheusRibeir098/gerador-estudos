# StudyGen v2 — README

Gerador de material de estudo a partir de aulas do YouTube. Transcreve vídeos, gera resumos, planos de estudo, quizzes, radar de prova e chat tutor com IA.

---

## Visão Geral das Mudanças (v2)

O StudyGen v2 substituiu o SDK da OpenAI por chamadas ao `kiro-cli` via `child_process` e adicionou o Chat Tutor como nova funcionalidade principal.

**Novas funcionalidades:**
- Chat Tutor: conversa contextualizada por aula com IA
- Seletor de aula no chat (dropdown quando há múltiplas aulas)
- Renderização Markdown segura via `react-markdown` (substituiu `dangerouslySetInnerHTML`)
- Citações do professor com markup semântico (`<blockquote>`)

**Stack:** TypeScript | Express + better-sqlite3 | React + Vite + TailwindCSS + React Query

---

## Arquitetura

```
frontend (React)  →  backend (Express)  →  kiro-cli (IA)
     ↕                    ↕
  React Query         SQLite (WAL)
```

**Backend:** `localhost:3001` — 10 endpoints REST
**Frontend:** `localhost:5173` — 4 páginas (Home, Processing, Result, Quiz)
**Banco:** `data/studygen.db` — 7 tabelas com CASCADE

---

## Como Adicionar Novas Funcionalidades de IA

Toda geração de conteúdo IA segue o mesmo padrão em `backend/src/services/openai.ts`:

### Padrão para chamar kiro-cli

```typescript
// 1. Crie a função exportada em services/openai.ts
export async function generateNovaFuncao(input: string): Promise<TipoRetorno> {
  const raw = await callKiro(
    `Prompt em português descrevendo a tarefa.\n\nDados: ${input}\n\nResponda APENAS em JSON válido: { "campo": "valor" }`
  );
  return JSON.parse(extractJson(raw));
}
```

**Regras do padrão:**
- `callKiro(prompt)` executa `kiro-cli chat --no-interactive` com timeout de 300s
- Para respostas JSON: peça "APENAS em JSON válido, sem markdown ao redor" no prompt
- Use `extractJson(raw)` para extrair JSON de respostas que podem vir com fencing
- Para respostas texto (Markdown): retorne `raw` diretamente (como `generateStudyPlan`)
- Trate erros com try/catch e `console.error`

### Integrar no pipeline de processamento

Para gerar conteúdo automaticamente ao processar uma matéria, adicione a chamada em `services/processor.ts` dentro do loop `for (const lesson of transcribedLessons)`.

---

## Como Adicionar Novas Rotas de Chat

### Backend

1. **Validator** — Crie em `backend/src/validators/` com Zod:
```typescript
import { z } from 'zod';
export const meuSchema = z.object({
  message: z.string().min(1),
  // campos adicionais
});
```

2. **Rota** — Adicione em `backend/src/routes/content.ts`:
```typescript
router.post('/novo-endpoint/:id', async (req, res) => {
  const parsed = meuSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  // buscar contexto no banco (getDb())
  // chamar função IA (services/openai.ts)
  // retornar resposta
});
```

3. **Registrar** — A rota já estará disponível sob `/api/` (content router montado em `app.use('/api', contentRouter)`)

### Frontend

1. **Tipo** — Adicione em `frontend/src/types/content.ts`
2. **API** — Adicione função em `frontend/src/api/content.ts`
3. **Componente** — Siga o padrão do `ChatTutor.tsx`: state local para mensagens, `sendChatMessage` para API, auto-scroll

---

## Como Adicionar Novos Componentes de UI

### Design System

Componentes base em `frontend/src/components/ui/`:

| Componente | Props principais |
|---|---|
| `Button` | `variant` (primary/secondary/danger), `size`, `loading` |
| `Card` | `onClick` (torna clicável), `className` |
| `Badge` | `variant` (success/warning/error/accent/default) |
| `Modal` | `isOpen`, `onClose`, `title`, `size` |
| `Input` | `label`, `error` |
| `Textarea` | `label`, `error`, `rows` |
| `ProgressBar` | `value` (0-100), `showLabel` |
| `EmptyState` | `icon`, `title`, `description`, `action` |

### Paleta de cores (hex fixo)

- Primária: `#3B82F6` (azul)
- Texto: `#0F172A` (escuro), `#64748B` (cinza)
- Sucesso: `#10B981`, Alerta: `#F59E0B`, Erro: `#EF4444`, Accent: `#8B5CF6`
- Fundo: `#F8FAFC`, Borda: `#E2E8F0`

### Adicionar nova página

1. Crie em `frontend/src/pages/NovaPagina.tsx`
2. Adicione rota em `App.tsx`: `<Route path="/nova-rota" element={<NovaPagina />} />`
3. Use `<Header />` no topo e `max-w-5xl mx-auto px-6 py-8` para layout

### Adicionar nova tab na ResultPage

1. Adicione entrada no array `tabs` com `key`, `label` e `icon` (lucide-react)
2. Adicione o tipo ao union `Tab`
3. Adicione bloco `{activeTab === 'nova-tab' && (...)}` no JSX

---

## Pontos de Extensão Identificados

### Alta prioridade
- **Novas funções IA em `services/openai.ts`** — Adicionar flashcards, mapas mentais, exercícios práticos seguindo o padrão `callKiro`
- **Novas tabs na ResultPage** — Estrutura de tabs é extensível (array + union type)
- **Novos endpoints em `routes/content.ts`** — Router já montado, basta adicionar handlers

### Média prioridade
- **Novas tabelas no banco** — Adicionar em `database.ts` com `CREATE TABLE IF NOT EXISTS` e FK para subjects
- **Novos hooks React Query** — Seguir padrão de `hooks/useContent.ts` (queryKey + queryFn + enabled)
- **Novos validators Zod** — Criar em `validators/` e importar na rota

### Baixa prioridade
- **Novos componentes UI** — Biblioteca base cobre os casos comuns, estender conforme necessidade
- **Novas rotas de página** — Adicionar em `App.tsx`

---

## Limitações Conhecidas

### IA / kiro-cli
- **Latência:** Cada chamada ao kiro-cli leva 5-10s (processo externo com cold start)
- **Sem streaming:** Respostas são síncronas — o usuário espera a resposta completa
- **Transcrição de áudio:** `transcribeAudio` é um stub vazio — fallback whisper não funciona
- **Tamanho do prompt:** Transcrições longas podem exceder limites do kiro-cli (sem truncamento implementado)

### Chat Tutor
- **Stateless:** Histórico mantido apenas no state React — recarregar a página perde a conversa
- **Contexto limitado:** Chat usa apenas o resumo da aula, não a transcrição completa
- **Sem rate limiting:** Endpoint de chat não tem throttling

### Frontend
- **PDF via screenshot:** Exportação PDF usa html2canvas — qualidade limitada, não suporta paginação
- **Sem responsividade mobile:** Layout otimizado para desktop
- **Cores hardcoded:** Hex fixo em vez de Tailwind tokens dificulta temas

### Backend
- **SQLite single-file:** Não escala para múltiplos processos/servidores
- **Sem autenticação:** Todos os endpoints são públicos
- **Processamento em memória:** Se o servidor reiniciar durante processamento, o subject fica em estado "processing" permanentemente

---

## Métricas do Build

| Métrica | Valor |
|---|---|
| Tempo de build | 158s |
| Tempo de testes | ~4m 49s |
| Tarefas | 5 |
| Reviews | 5 (3 com correções) |
| Testes | 6 (3 API + 3 E2E) — todos passaram |
| Arquivos fonte | 24 |
| Linhas de código | ~1931 |
| Endpoints API | 10 |
| Tabelas SQLite | 7 |
| Páginas React | 4 |
| Componentes UI | 8 |

---

Documentação detalhada: [dev.md](dev.md) | [reviews.md](reviews.md) | [testes.md](testes.md)

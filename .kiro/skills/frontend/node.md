---
name: node
description: Guia para usar PNPM como gerenciador de pacotes. Usar em projetos Node.js.
---

# Gerenciador de Pacotes — Apenas PNPM

## Regra

O ÚNICO gerenciador de pacotes permitido é **pnpm**.

## Proibido

- `npm install`, `npm run`, `npx` (para scripts do projeto)
- `yarn add`, `yarn run`

## Comandos Corretos

```bash
# Instalar dependências
pnpm install

# Adicionar pacote
pnpm add <pacote>
pnpm add -D <pacote>  # devDependency

# Rodar scripts
pnpm run dev
pnpm run test
pnpm run build

# Executar binários
pnpm dlx <pacote>
```

## Workspace (Monorepo)

```yaml
# pnpm-workspace.yaml
packages:
  - "frontend"
  - "backend"
  - "infra"
```

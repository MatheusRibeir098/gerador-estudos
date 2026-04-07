---
name: git-conventions
description: Convenções Git para commits, branches e PRs. OBRIGATÓRIO para TODOS os agentes.
---

# Convenções Git — Skill Obrigatória

---

## Conventional Commits

Formato: `<tipo>(<escopo>): <descrição>`

| Tipo | Descrição |
|---|---|
| feat | Nova funcionalidade |
| fix | Correção de bug |
| docs | Documentação |
| style | Formatação (sem mudança de lógica) |
| refactor | Reestruturação de código |
| perf | Melhoria de performance |
| test | Adição/correção de testes |
| build | Sistema de build / dependências |
| ci | Configuração de CI |
| chore | Tarefas de manutenção |

Regras:
- Modo imperativo: "adiciona", não "adicionado"
- Um tipo por commit
- Descrição concisa

```
# ❌ Ruim
git commit -m "arrumei coisas"
git commit -m "mudanças"

# ✅ Bom
git commit -m "feat(auth): adiciona refresh de token JWT"
git commit -m "fix(cart): corrige cálculo de desconto para itens vazios"
```

## Nomenclatura de Branches

Formato: `<tipo>/<descrição>`

- `feature/` — novas funcionalidades
- `bugfix/` — correções de bugs
- `hotfix/` — correções urgentes em produção
- `chore/` — manutenção

Regras:
- Apenas minúsculas
- Hífens para espaços
- Incluir número do ticket quando disponível

```
# ❌ Ruim
git checkout -b minhaFeature
git checkout -b fix_bug

# ✅ Bom
git checkout -b feature/autenticacao-usuario
git checkout -b bugfix/calculo-total-carrinho
```

## Convenção de Branches Multi-Agente

No sistema orquestrado de multi-agentes:

Formato: `<tipo>/<slug-tarefa>/<nome-agente>`

```
feature/auth-usuario/dev-front
feature/auth-usuario/dev-back
feature/auth-usuario/dev-infra
feature/auth-usuario/dev-docs
```

- Cada agente trabalha na sua própria branch
- O arquiteto cria as branches a partir de `main` ou `develop`
- Agentes NÃO DEVEM fazer push em branches de outros agentes
- Merge acontece apenas após revisão do arquiteto

## Footer de Commit (Kiro CLI)

```
👻 Generated with [Kiro](https://kiro.dev/)

Co-Authored-By: Kiro <noreply@kiro.dev>
```

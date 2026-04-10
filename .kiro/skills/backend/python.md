---
name: python
description: Boas práticas Python. Usar ao escrever código Python no backend.
---

# Boas Práticas Python

## Estilo (PEP 8)

- 4 espaços para indentação
- Linhas com máximo 88 caracteres (black) ou 79 (PEP 8)
- snake_case para funções e variáveis
- PascalCase para classes
- UPPER_CASE para constantes

## Type Hints

```python
# ❌ Ruim
def calcular_total(itens, desconto):
    pass

# ✅ Bom
def calcular_total(itens: list[Item], desconto: float = 0.0) -> float:
    pass
```

## Tratamento de Erros

```python
# ❌ Ruim
try:
    resultado = processar(dados)
except:
    pass

# ✅ Bom
try:
    resultado = processar(dados)
except ValidationError as e:
    logger.error("Erro de validação: %s", e)
    raise
except Exception as e:
    logger.exception("Erro inesperado ao processar dados")
    raise ProcessamentoError(f"Falha ao processar: {e}") from e
```

## Estrutura de Projeto

```
backend/
  src/
    domain/          ← Entidades e regras de negócio
    services/        ← Casos de uso
    api/             ← Handlers/controllers
    infra/           ← Repositórios, clients externos
  tests/
    unit/
    integration/
  pyproject.toml
```

## Testes

- Use `pytest` como framework
- Fixtures para setup reutilizável
- `hypothesis` para property-based testing
- Cobertura mínima: 80%

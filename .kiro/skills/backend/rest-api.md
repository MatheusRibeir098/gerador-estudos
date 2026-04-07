---
name: rest-api
description: Boas práticas para APIs REST. Usar ao desenvolver endpoints no backend.
---

# Boas Práticas REST API

## Nomenclatura de Recursos

```
# ❌ Ruim
GET /getUsers
POST /createUser
GET /user-list

# ✅ Bom
GET /users
POST /users
GET /users/{id}
GET /users/{id}/orders
```

- Substantivos no plural para coleções
- Hierarquia para relacionamentos
- Sem verbos na URL — o método HTTP é o verbo

## Métodos HTTP

| Método | Uso | Idempotente |
|---|---|---|
| GET | Buscar recurso | Sim |
| POST | Criar recurso | Não |
| PUT | Atualizar completo | Sim |
| PATCH | Atualizar parcial | Não |
| DELETE | Remover recurso | Sim |

## Status Codes

| Código | Quando usar |
|---|---|
| 200 | Sucesso |
| 201 | Recurso criado |
| 204 | Sucesso sem corpo |
| 400 | Erro de validação |
| 401 | Não autenticado |
| 403 | Não autorizado |
| 404 | Não encontrado |
| 409 | Conflito |
| 422 | Entidade não processável |
| 500 | Erro interno |

## Respostas de Erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Campo email é obrigatório",
    "details": [
      { "field": "email", "message": "não pode ser vazio" }
    ]
  }
}
```

## Paginação

```
GET /users?page=1&limit=20

{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Versionamento

- Prefira versionamento por header: `Accept: application/vnd.api.v1+json`
- Alternativa: prefixo na URL `/v1/users`

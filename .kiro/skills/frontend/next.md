---
name: next
description: Boas práticas com Next.js. Usar ao desenvolver aplicações frontend.
---

# Boas Práticas Next.js

## App Router

- Use App Router (`app/`) como padrão
- Server Components por padrão — use `"use client"` apenas quando necessário
- Layouts para UI compartilhada entre rotas
- Loading states com `loading.tsx`
- Error boundaries com `error.tsx`

## Estrutura de Pastas

```
app/
  layout.tsx
  page.tsx
  (auth)/
    login/page.tsx
    register/page.tsx
  api/
    users/route.ts
src/
  components/
  lib/
  services/
  hooks/
  types/
```

## Data Fetching

```tsx
// ❌ Ruim — useEffect para dados iniciais
"use client";
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch("/api/data").then(...) }, []);
}

// ✅ Bom — Server Component com fetch direto
export default async function Page() {
  const data = await fetch("https://api.example.com/data");
  return <div>{data}</div>;
}
```

## API Routes

- Use Route Handlers em `app/api/`
- Valide input sempre
- Retorne status codes corretos
- Frontend NUNCA chama APIs externas diretamente

## Performance

- Use `next/image` para imagens
- Use `next/font` para fontes
- Lazy load componentes pesados com `dynamic()`
- Prefetch links com `<Link>`

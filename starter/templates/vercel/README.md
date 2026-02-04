# CodeGuard + Vercel Integration

Template para integrar LGPD/GDPR compliance em apps Vercel/Next.js.

## 🚀 Quick Start

### 1. Clone e instale

```bash
cd my-codeguard-vercel
npm install
```

### 2. Configure variáveis de ambiente

Crie `.env.local`:

```env
CODEGUARD_API_KEY=sua_api_key
```

### 3. Rode localmente

```bash
npm run dev
```

### 4. Deploy

```bash
vercel --prod
```

## 📁 Estrutura

```
app/
├── api/
│   └── codeguard/
│       ├── scan/route.ts    # API de scan
│       └── patch/route.ts   # API de patch
└── dashboard/
    └── page.tsx             # Dashboard exemplo

components/
└── CodeGuardPanel.tsx       # Componente principal
```

## 🔧 Uso

### API Routes

```typescript
// POST /api/codeguard/scan
const response = await fetch('/api/codeguard/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'const user = { cpf: "123" };',
    filename: 'user.ts',
    frameworks: ['lgpd', 'gdpr']
  })
});
```

### Componente React

```tsx
import { CodeGuardPanel } from '@/components/CodeGuardPanel';

export default function Page() {
  return (
    <CodeGuardPanel 
      defaultCode="// seu código aqui"
      defaultFilename="example.ts"
      onViolationFound={(count) => console.log(`${count} violações!`)}
    />
  );
}
```

## 💳 Preços

- **Free:** 100 créditos/mês
- **Pro:** €29/mês (1.000 créditos)

## 🆘 Suporte

- **Docs:** [docs.codeguard.ai](https://docs.codeguard.ai)
- **Discord:** [discord.gg/codeguard](https://discord.gg/codeguard)

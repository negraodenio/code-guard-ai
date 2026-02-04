# CodeGuard + Bolt Integration

Template para integrar LGPD/GDPR compliance em apps Bolt (WebContainer).

## 🚀 Quick Start

### 1. Configure a API Key

Edite seu `.env`:

```env
VITE_CODEGUARD_API_KEY=sua_api_key
```

### 2. Rode o app

```bash
npm run dev
```

## 📁 Estrutura

```
src/
├── app.tsx      # App principal com editor
└── client.ts    # SDK cliente CodeGuard
```

## ⚡ Features

- **Auto-Scan:** Escaneia código no Save
- **Sidebar:** Lista de arquivos com status
- **Results Panel:** Violações detalhadas
- **Credits:** Mostra saldo de créditos

## 🔧 Uso do SDK

```typescript
import { CodeGuardClient } from './client';

const client = new CodeGuardClient({
  apiKey: 'sua_api_key'
});

// Scan
const result = await client.scan({
  content: 'const cpf = "123.456.789-00";',
  filename: 'user.ts',
  frameworks: ['lgpd', 'gdpr']
});

console.log(result.report.summary.total); // 1 violação

// Check credits
const credits = await client.getCredits();
console.log(`${credits} créditos restantes`);
```

## ⚠️ Limitações do Bolt

- Bolt roda no browser (WebContainer)
- Não tem acesso a Node.js nativo
- Chamadas de API são via fetch (client-side)
- Sua API key fica exposta no browser (use apenas para dev/demos)

Para produção, use o template Vercel com API Routes.

## 💳 Preços

- **Free:** 100 créditos/mês
- **Pro:** €19/mês (Bolt usa menos recursos)

## 🆘 Suporte

- **Docs:** [docs.codeguard.ai/bolt](https://docs.codeguard.ai/bolt)
- **Discord:** [discord.gg/codeguard](https://discord.gg/codeguard)

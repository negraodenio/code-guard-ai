# CodeGuard + Lovable Integration

Template para integrar LGPD/GDPR compliance em apps Lovable.

## 🚀 Quick Start

### 1. Obtenha sua API Key

1. Vá para [codeguard.ai](https://codeguard.ai)
2. Crie uma conta e obtenha sua API key
3. Copie a key (começa com `cg_...`)

### 2. Deploy da Edge Function

```bash
# Instale o Supabase CLI
npm install -g supabase

# Login
supabase login

# Link seu projeto
supabase link --project-ref <seu-project-ref>

# Defina o secret
supabase secrets set CODEGUARD_API_KEY=<sua-api-key>

# Deploy da função
supabase functions deploy codeguard-scan
```

### 3. Adicione o Componente

Copie o componente `ComplianceBadge.tsx` para seu projeto Lovable.

Configure seu `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
```

### 4. Use no seu App

```tsx
import { ComplianceBadge } from './components/ComplianceBadge';

function App() {
  return (
    <div>
      <header>
        <h1>Meu App</h1>
        <ComplianceBadge />
      </header>
      {/* resto do app */}
    </div>
  );
}
```

## 📋 Como Funciona

1. Usuário clica em "Check Compliance"
2. Edge Function envia código para Antigravity Cloud
3. IA escaneia por violações LGPD/GDPR
4. Resultados exibidos instantaneamente
5. Créditos deduzidos da conta

## 💳 Preços

- **Free:** 100 créditos/mês
- **Pro:** €29/mês (1.000 créditos)
- **Pay-as-you-go:** €0.05 por crédito

## 🆘 Suporte

- **Docs:** [docs.codeguard.ai/lovable](https://docs.codeguard.ai/lovable)
- **Discord:** [discord.gg/codeguard](https://discord.gg/codeguard)
- **Email:** support@codeguard.ai

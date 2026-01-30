# @codeguard/mcp-wrapper

> 🔌 **Cabo Adaptador Stdio ↹ HTTP para CodeGuard AI**

Este pacote permite que clientes MCP que se comunicam apenas via `stdio` (como o **Claude Desktop**, **Zed** e **Raycast**) se conectem à API centralizada do CodeGuard AI hospedada no Vercel.

## 🚀 Como Usar (Claude Desktop)

Adicione o seguinte ao seu arquivo `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codeguard": {
      "command": "npx",
      "args": [
        "-y",
        "@codeguard/mcp-wrapper@latest"
      ],
      "env": {
        "CODEGUARD_API_KEY": "SUA_CHAVE_CG_LIVE_AQUI",
        "CODEGUARD_API_URL": "https://code-guard.eu/api/mcp"
      }
    }
  }
}
```

## 🛠️ Por que usar este Wrapper?

1. **Billing Centralizado**: Suas requisições batem no servidor do Vercel, onde sua licença do Stripe é validada.
2. **Atualização Instantânea**: Quando adicionamos novas ferramentas ao CodeGuard, elas aparecem no seu Claude sem você precisar atualizar o wrapper.
3. **Segurança**: Sua API Key nunca é exposta publicamente, apenas no seu processo local.

## 🆘 Suporte

Para problemas de conexão, contate `hello@code-guard.eu`.

---

&copy; 2026 CodeGuard AI. Todos os direitos reservados.

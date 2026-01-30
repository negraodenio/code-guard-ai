# 🔌 CodeGuard MCP: Connectivity Guide

Conecte o cérebro de compliance do **CodeGuard AI** diretamente ao seu LLM favorito (Claude, Cursor, etc.).

## 🚀 Como Conectar

### 1. Obtenha sua API Key
Após a assinatura no portal [code-guard.eu](https://code-guard.eu), você receberá uma chave no formato `cg_live_...`.

### 2. Configuração no Claude Desktop
Adicione o seguinte ao seu arquivo de configuração (`config.json` do Claude):

```json
{
  "mcpServers": {
    "codeguard": {
      "url": "https://code-guard.eu/api/mcp",
      "headers": {
        "x-api-key": "SUA_CHAVE_AQUI"
      }
    }
  }
}
```

### 3. Configuração no Cursor
1. Vá em **Settings > Cursor Settings > MCP**.
2. Clique em **+ Add New MCP Server**.
3. Preencha os campos:
   - **Name**: CodeGuard
   - **Type**: SSE
   - **URL**: `https://code-guard.eu/api/mcp?apiKey=SUA_CHAVE_AQUI`
   - *Nota: O Cursor prefere a chave via query param for SSE.*

---

## 🛠️ Ferramentas Disponíveis

Uma vez conectado, você terá acesso às seguintes ferramentas:

| Nome | Descrição |
| :--- | :--- |
| `scan_compliance` | Auditoria profunda para LGPD, BACEN e FAPI-BR. |
| `estimate_infra_cost` | Estimativa de custos AWS e detecção de padrões FinOps. |
| `analyze_data_lineage` | Linhagem de dados PII (Source to Sink). |
| `check_accessibility` | Varredura WCAG 2.2 AA. |
| `generate_ctf_challenge` | Gerador de desafios de segurança (Gamification). |

---

## 🆘 Suporte
Se encontrar problemas de conexão, verifique se seu firewall permite conexões de saída para `code-guard.eu` na porta 443. Para suporte premium, contate `ciso@code-guard.eu`.

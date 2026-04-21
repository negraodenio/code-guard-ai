# 🛡️ CodeGuard AI

**Stop Shadow APIs from reaching production. Automate LGPD/GDPR compliance in your CI/CD.**

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=codeguard.codeguard-ai)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey.svg)](LICENSE)
<a href="https://glama.ai/mcp/servers/@negraodenio/code-guard-ai"><img src="https://glama.ai/mcp/servers/@negraodenio/code-guard-ai/badge" /></a>
[![Smithery Badge](https://smithery.ai/badge/@negraodenio/code-guard-ai)](https://smithery.ai/server/@negraodenio/code-guard-ai)

> **Stop wasting hours in code reviews hunting for PII leaks.**
> CodeGuard scans your code in seconds and **auto-fixes** compliance risks — so you ship faster and avoid €20M GDPR fines.

---

## 🚀 Works Everywhere You Code

CodeGuard runs where you need it:

### 1. 💻 **VS Code / Cursor**
Instant feedback while you type.
```bash
Ctrl+Shift+P → "CodeGuard: Scan for Compliance"
```
[Install Extension](https://marketplace.visualstudio.com/items?itemName=codeguard.codeguard-ai)

### 2. 🤖 **Claude Desktop (MCP)**
Give your AI Agent a "Compliance Brain".
```bash
npx -y codeguard-ai start:mcp
```

### 3. 🔄 **CI/CD (GitHub Actions / GitLab)**
Block non-compliant PRs automatically.
```yaml
# .github/workflows/security.yml
- run: npx codeguard-ai scan . --fail-on-violation
```

### 4. ⚡ **CLI (Terminal)**
```bash
npm install -g codeguard-ai
codeguard scan .
```

### 5. 🌐 **REST API**
Integrate compliance scanning into your applications.
```bash
# Start API server (development)
npm run start:mcp

# Deploy to Vercel (production)
npm run vercel:deploy

# Use the API
curl -X POST https://your-app.vercel.app/api/scan \
  -H "x-api-key: your-api-key" \
  -d '{"region": "BR", "frameworks": ["gdpr", "lgpd"]}'
```

---

## ⚡ Why Developers Love CodeGuard

| ❌ Without CodeGuard | ✅ With CodeGuard |
|:---|:---|
| Manual review for PII leaks | Instant detection in milliseconds |
| Guess if code is compliant | Clear risk score + fine estimates |
| Fix issues yourself | **AI auto-fix** applied with one click |
| Risk €20M GDPR fines | Ship with confidence |

---

## 🧠 Multi-LLM Orchestrator
We don't just wrap ChatGPT. We orchestrate a team of experts:

*   **🧠 Security Specialist**: Uses **GPT-4o** for vulnerability detection.
*   **⚖️ Legal Expert**: Uses **Claude 3.5 Sonnet** for nuanced compliance (GDPR/LGPD).
*   **⚡ High-Speed Linter**: Uses **DeepSeek** for instant regex pres-canning.

---

## 💰 Pricing & Plans

| Feature | **Free (Local)** | **Pro (€79/mo)** | **Enterprise** |
| :--- | :---: | :---: | :---: |
| **Persona** | Indie Dev / Junior | Tech Lead / Teams | CTO / DPO |
| **Goal** | Fix my own code | Fix the team's PRs | Pass the Audit |
| **Shadow API Scan** | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **Deep Compliance Audit** | ❌ | ✅ LGPD/GDPR | ✅ All Frameworks |
| **CI/CD Blocking** | ⚠️ Manual (No Exit Code) | ✅ **Automated (Exit 1)** | ✅ **Automated (Exit 1)** |
| **Auto-Fix** | ❌ | ✅ Included | ✅ Included |
| **Reports (PDF)** | ❌ | ❌ | ✅ Included |
| **Support** | Community | Priority Email | Dedicated Slack |

> **BYOK (Bring Your Own Key):** You can use the Pro AI features for free if you bring your own OpenAI/Anthropic API Key. (Manual setup required).

[Start Pro Trial](https://code-guard.eu/pricing) | [Contact Enterprise Sales](https://code-guard.eu/enterprise)

---

## 🏢 CodeGuard Enterprise

For companies with 20+ developers or regulated industries (Finance, Health, Fintech).

✅ **Everything in Pro, plus:**
*   **Custom Frameworks:** PCI-DSS, HIPAA, SOC2, ISO 27001.
*   **Governance Dashboard:** See risk posture across all repos.
*   **Single Sign-On (SSO):** Okta, Azure AD, Google Workspace.
*   **On-Premise:** Run CodeGuard inside your VPC (Air-gapped).

---

## 🌐 REST API

CodeGuard provides a secure REST API for integrating compliance scanning into your applications and workflows.

### Quick Start

```bash
# 1. Set environment variables
export CODEGUARD_API_KEYS="your-api-key-1,your-api-key-2"
export TRANSPORT_MODE=sse
export CODEGUARD_REQUEST_BODY_LIMIT=256kb
export CODEGUARD_WORKSPACE_ROOT=.
export CODEGUARD_CORS_ORIGINS="https://your-admin-ui.example.com"

# 2. Start the API server
npm run start:mcp

# 3. Test the API
curl -X POST http://localhost:3000/api/scan \
  -H "x-api-key: your-api-key-1" \
  -H "Content-Type: application/json" \
  -d '{"region": "BR", "frameworks": ["gdpr", "lgpd"]}'
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Run compliance audit |
| `POST` | `/api/graph` | Generate dependency graph |
| `POST` | `/api/shadow-apis` | Detect shadow APIs |
| `GET` | `/api/docs` | API documentation |
| `GET` | `/api/openapi.yaml` | OpenAPI specification |

### Authentication

All API requests require an API key in the `x-api-key` header:

```bash
curl -H "x-api-key: your-api-key" http://localhost:3000/api/scan
```

### API v1 (SDK) Authentication (Fail-Closed)

The `/api/v1/*` endpoints require `Authorization: Bearer <CODEGUARD_API_SECRET>` and will return `503` if `CODEGUARD_API_SECRET` is not configured.

### SDK

Use our official SDK for easier integration:

```bash
npm install codeguard-sdk
```

```typescript
import CodeGuardClient from 'codeguard-sdk';

const client = new CodeGuardClient({
    apiKey: 'your-api-key'
});

const result = await client.scan({
    region: 'BR',
    frameworks: ['gdpr', 'lgpd']
});
```

### Security Features

- **API Key Authentication**: Secure access control
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive parameter validation
- **Audit Logging**: All API calls are logged for compliance
- **HTTPS**: Always use HTTPS in production

### Dashboard

Access the API dashboard at `http://localhost:3000/web/api-dashboard.html` to:
- Manage API keys
- View usage statistics
- Test endpoints interactively

---

## 🚀 **Deploy to Vercel**

Deploy your CodeGuard API to production in minutes:

### 1. Install Vercel CLI
```bash
npm i -g vercel
vercel login
```

### 2. Deploy
```bash
npm run vercel:deploy
```

### 3. Configure Environment Variables
Set these in your Vercel dashboard:
- `CODEGUARD_API_KEYS` - Your production API keys
- `CODEGUARD_LICENSE_KEY` - Your license key
- `OPENAI_API_KEY` - For AI features (optional)

### 4. Test Production APIs
```bash
node test-production.js https://your-app.vercel.app your-api-key
```

### Production URLs
- API: `https://your-app.vercel.app/api/scan`
- Docs: `https://your-app.vercel.app/api/docs`
- OpenAPI: `https://your-app.vercel.app/api/openapi`

---

## ❓ FAQ

**Q: Is it free?**
A: **Yes!** The basic Shadow API scanner is **free forever**. You can identify risks locally without paying anything.

**Q: What is the difference between Free and Pro?**
A: Free is for **Discovery** (finding problems). Pro is for **Action** (blocking problems in CI/CD and auto-fixing them).

**Q: Can I use my own API Keys (BYOK)?**
A: Yes! If you want to use the Deep Audit features without a Pro subscription, you can configure your own OpenAI/Anthropic keys. However, CI/CD blocking features require a Pro license.

---

## 📧 Support

*   **Email:** support@code-guard.eu
*   **Docs:** [code-guard.eu/docs](https://code-guard.eu/docs)

Made with ❤️ by **CodeGuard** — Protect your code. Avoid fines. Ship with confidence.

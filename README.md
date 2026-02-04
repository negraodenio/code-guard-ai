# 🛡️ CodeGuard AI

**Stop Shadow APIs from reaching production. Automate LGPD/GDPR compliance in your CI/CD.**

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=codeguard.codeguard-ai)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey.svg)](LICENSE)

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
npx codeguard-ai install:mcp
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

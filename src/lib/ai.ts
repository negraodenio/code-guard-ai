import { getModelForFrameworks, ModelConfig } from './ai-config';

export async function analyzeCompliance(code: string, frameworks: any[]) {
  const sfKey = process.env.SILICONFLOW_API_KEY?.trim();
  const orKey = process.env.OPENROUTER_API_KEY?.trim();

  // 🎯 Get specialized model based on frameworks
  const frameworkIds = frameworks.map(f => f.id || f);
  const config = getModelForFrameworks(frameworkIds);

  const sfModel = config.primaryModel;
  const orModel = config.fallbackModel;

  let sfError = "";
  let orError = "";

  // 🧠 REPO INTELLIGENCE LAYER (v2.0.0-PRO)
  const isOpenAPI = /openapi|swagger|paths:|components:|securitySchemes:/i.test(code);
  const isLibrary = /module\.exports|export\s+|package\.json|keywords:|@typedef/i.test(code);
  const isExample = /example|demo|sample|usage:|__tests__|tutorial/i.test(code);
  const isConfig = /config|process\.env|dotenv|\.env/i.test(code);

  const mockPatterns = {
    cpf: /123\.456\.789-00|111\.222\.333-44/i.test(code),
    card: /4111.?1111.?1111.?1111|4242.?4242.?4242.?4242/i.test(code),
    credentials: /password123|senha123|admin123|secret-token-123/i.test(code)
  };

  const hasMocks = Object.values(mockPatterns).some(v => v);

  const repoContext = {
    type: isOpenAPI ? 'API_SPECIFICATION' : (isLibrary ? 'UTILITY_LIBRARY' : 'PRODUCTION_APPLICATION'),
    surface: isExample ? 'EDUCATIONAL_EXAMPLE' : (isConfig ? 'CONFIGURATION' : 'CORE_IMPLEMENTATION'),
    trustZone: isExample ? 'SANDBOX (Low Risk)' : 'PRODUCTION_SURFACE (High Risk)',
    memorySignals: [
      isOpenAPI && "Ignore functional execution rules (logs/DB)",
      isLibrary && "Focus on export sanitization and input validation",
      isExample && "Downgrade severity: educational content",
      hasMocks && "Confirmed dummy data in code (Mock Patterns detected)"
    ].filter(Boolean)
  };

  const prompt = `### AUDITORIA ESTRATÉGICA DE COMPLIANCE (v4.0.0-ULTRA - Executive Insights)
Você é um Arquiteto de Governança e CISO Virtual Consultivo. Sua missão é analisar o código e fornecer um veredito de alto nível para a diretoria.

BLUEPRINTS DE SOLUÇÃO (MASTER REFERENCE):
1. LGPD: file:///src/lib/infrastructure/LGPDLogger.ts (Wrapper 'safeInfo' com Redação de PII).
2. FAPI-BR: file:///src/lib/infrastructure/fapiAuth.ts (Validação mTLS/PS256/Scopes).

ESTADO ATUAL DO REPOSITÓRIO:
- Tipo: ${repoContext.type}
- Superfície: ${repoContext.surface}
- Zona de Risco: ${repoContext.trustZone}
- Sinais: ${repoContext.memorySignals.join(' | ')}

DIRETRIZES DE AUDITORIA:
1. FOCO NO NEGÓCIO: Além dos erros técnicos, forneça uma visão executiva do risco financeiro e regulatório.
2. VEREDITO DE CONFIANÇA: Se o código for educativo, seja tolerante. Se for Produção, seja rigoroso.
3. FLUXO DE DADOS: Identifique sank/sources de PII. 'console.log(var)' em produção é CRÍTICO.

Responda EXCLUSIVAMENTE em JSON válido:
{
  "score": 0-100,
  "intelligence": {
    "detectedContext": "${repoContext.type}",
    "trustLevel": "${repoContext.trustZone}",
    "confidence": "low|medium|high",
    "reasoning": "Resumo técnico da análise."
  },
  "executiveSummary": {
    "overview": "Veredito de 1 frase para o CEO (ex: 'Sistema vulnerável a multas BACEN').",
    "riskAssessment": "Análise de impacto financeiro (multas LGPD, multas BACEN, reputação).",
    "actionableVerdict": "Ação imediata recomendada (ex: 'Implementar mTLS nas próximas 24h')."
  },
  "violations": [
    {
      "severity": "critical|high|medium|low|info",
      "framework": "LGPD|FAPI-BR|PCI-DSS|BACEN",
      "code": "ID_CURTO",
      "message": "Descrição amigável",
      "fix": "O que fazer",
      "remediationSnippet": "Código de correção",
      "financialRisk": "Estimativa (ex: 'Alto - Risco de sanção')",
      "remediationCost": "Estimativa (ex: 'Baixo (30 min)')",
      "businessImpact": "Dano ao negócio",
      "mitigationEffort": "baixo|medio|alto"
    }
  ],
  "summary": "Resumo executivo curto"
}`;

  // Tentar primeiro SiliconFlow
  if (sfKey && sfKey.length > 20) {
    try {
      const baseUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.com/v1';
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sfKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: sfModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: config.temperature,
          max_tokens: 3000
        })
      });

      if (response.ok) {
        const data = await response.json();
        return parseAIResponse(data.choices[0].message.content, frameworks, 'SiliconFlow', sfModel);
      }
      sfError = await response.text();
    } catch (e: any) {
      sfError = e.message;
    }
  }

  // 2️⃣ Tentar OpenRouter (Fallback)
  if (orKey && orKey.length > 20) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${orKey}`,
          'HTTP-Referer': 'https://compliance-scanner.vercel.app',
          'X-Title': 'CodeGuard AI',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: orModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: config.temperature,
          max_tokens: 3000
        })
      });

      if (response.ok) {
        const data = await response.json();
        return parseAIResponse(data.choices[0].message.content, frameworks, 'OpenRouter', orModel);
      }
      orError = await response.text();
    } catch (e: any) {
      orError = e.message;
    }
  }

  // 3️⃣ Último Recurso: REGEX
  return analyzeWithRegex(code, frameworks, `SF: ${sfError.substring(0, 30)} | OR: ${orError.substring(0, 30)}`);
}

function parseAIResponse(content: string, frameworks: any[], method: string, details: string) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON não encontrado na resposta da IA');

  const result = JSON.parse(jsonMatch[0]);
  const intel = result.intelligence || {};

  return {
    score: result.score || 50,
    grade: result.score >= 90 ? 'A' : result.score >= 80 ? 'B' : result.score >= 70 ? 'C' : 'F',
    violations: result.violations || [],
    summary: result.summary || 'Análise completada',
    executiveSummary: result.executiveSummary || {
      overview: "Análise realizada com limitações.",
      riskAssessment: "Risco não pôde ser quantificado integralmente.",
      actionableVerdict: "Revisão manual necessária."
    },
    context: intel.detectedContext || result.contextType || result.context || 'Não identificado',
    trustLevel: intel.trustLevel || 'N/A',
    confidence: intel.confidence || result.confidence || 'medium',
    reasoning: intel.reasoning || 'N/A',
    mitigationStrategy: result.mitigationStrategy || result.executiveSummary?.actionableVerdict || 'Não fornecida',
    analysisMethod: 'AI',
    analysisDetails: `${method} - ${details}`,
    frameworks: frameworks.map((f: any) => ({
      id: f.id || f.name || f,
      name: f.name || f,
      tier: ((f.id || f)?.includes('LGPD') || (f.id || f)?.includes('BACEN') || (f.id || f)?.includes('FAPI-BR')) ? 1 : 2,
      country: ((f.id || f)?.includes('LGPD') || (f.id || f)?.includes('BACEN') || (f.id || f)?.includes('FAPI-BR')) ? 'BR' : 'Global',
      violations: (result.violations || []).filter((v: any) =>
        v.framework?.includes(f.id || f) || v.framework?.includes(f.name || f)
      ).length,
      passed: !(result.violations || []).some((v: any) =>
        v.framework?.includes(f.id || f) || v.framework?.includes(f.name || f)
      )
    }))
  };
}

function analyzeWithRegex(code: string, frameworks: any[], apiError?: string) {
  const violations: any[] = [];

  if (/console\.log.*(password|senha|cpf|email|creditCard|cartao)/i.test(code)) {
    violations.push({
      severity: 'critical',
      framework: 'LGPD',
      code: 'LGPD-LOG-001',
      message: 'Dados sensíveis sendo logados no console',
      fix: 'Remover console.log ou usar logger com mascaramento'
    });
  }

  if (/password.*=.*(req\.body|data\.|user\.)/i.test(code) && !/hash|bcrypt|encrypt/i.test(code)) {
    violations.push({
      severity: 'critical',
      framework: 'LGPD',
      code: 'LGPD-PASS-001',
      message: 'Senha manipulada em texto plano',
      fix: 'Usar bcrypt.hash() antes de armazenar'
    });
  }

  const score = Math.max(0, 100 - (violations.length * 10));

  return {
    score,
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'F',
    violations,
    summary: violations.length === 0 ? 'Código limpo' : `${violations.length} violações críticas`,
    executiveSummary: {
      overview: "Análise de fallback (Regex) concluída.",
      riskAssessment: violations.length > 0 ? "Riscos críticos detectados via padrões conhecidos." : "Nenhum risco óbvio detectado.",
      actionableVerdict: "Verificar APIs de Inteligência Artificial para análise profunda."
    },
    context: 'Análise Estática Local',
    mitigationStrategy: 'Revisar violações individuais apontadas pelas regras locais.',
    analysisMethod: 'REGEX',
    analysisDetails: apiError ? `Fallback (Erro API: ${apiError})` : 'Regras locais (Fallback)',
    frameworks: frameworks.map((f: any) => ({
      id: f.id || f,
      name: f.name || f,
      tier: 2,
      country: 'N/A',
      violations: violations.filter((v: any) => v.framework === (f.id || f)).length,
      passed: !violations.some((v: any) => v.framework === (f.id || f))
    }))
  };
}

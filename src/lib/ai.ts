// FORÇAR USO DA API - Modo Inteligente (Gasta 1 crédito por análise)
export async function analyzeCompliance(code: string, frameworks: any[]) {
  const sfKey = process.env.SILICONFLOW_API_KEY?.trim();
  const orKey = process.env.OPENROUTER_API_KEY?.trim();
  const sfModel = process.env.SILICONFLOW_MODEL?.trim() || 'deepseek-ai/DeepSeek-V3';
  let sfError = "";
  let orError = "";

  // LOG DE DEBUG SEGURO
  console.log(`[DEBUG] Keys check: SF:${sfKey ? 'OK' : 'MISSING'}, OR:${orKey ? 'OK' : 'MISSING'}`);

  const prompt = `Analise este código (JavaScript, Node.js ou Especificação API) como um CTO e Especialista em Compliance.
Sua missão é dar um veredito real de risco de negócio, distinguindo entre código produtivo e exemplos/documentação.

DIRETRIZES DE JULGAMENTO:
1. Identifique a Natureza do Código: (Core Lib, App Produtivo, Exemplo/Demo, Teste, Especificação OpenAPI).
2. Se for Exemplo ou Documentação (ex: pasta /examples, mock-servers): Reduza a severidade. O risco é real apenas se o desenvolvedor copiar o exemplo para produção. Flag como "LOW" ou "INFO" se for apenas falha em exemplo.
3. Se for Especificação (YAML/JSON): Analise falhas de DESIGN de segurança no contrato (ex: falta de autenticação no endpoint), não procure bugs de execução como "MongoDB Injection".

REGRAS ABSOLUTAS PARA DETECTAR:
1. console.log com dados sensíveis (senha, cpf, etc) = LGPD VIOLATION
2. Armazenamento de password sem hash/bcrypt = LGPD VIOLATION
3. Query MongoDB direto sem sanitização = NoSQL Injection
4. Endpoint admin sem verificação de role = Broken Access Control
5. No caso de OpenAPI: Falta de esquema de segurança (securityScheme) ou endpoints sensíveis sem "security".

Código para analisar:
${code}

Responda APENAS em JSON válido:
{
  "score": número 0-100,
  "context": "Natureza detectada do código (ex: Core Production, OpenAPI Spec, Example)",
  "mitigationStrategy": "Estratégia executiva recomendada (ex: Isolar componente, Corrigir Escopo, Refatorar Core)",
  "violations": [
    {
      "severity": "critical|high|medium|low|info",
      "framework": "LGPD|GDPR|PCI-DSS|OWASP|FAPI-BR|BACEN",
      "code": "CÓDIGO-ID",
      "message": "descrição do problema",
      "fix": "como corrigir"
    }
  ],
  "summary": "resumo executivo focado em risco de negócio"
}`;

  // Tentar primeiro SiliconFlow
  if (sfKey && sfKey.length > 20) {
    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sfKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: sfModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000
        })
      });

      if (response.ok) {
        const data = await response.json();
        return parseAIResponse(data.choices[0].message.content, frameworks, 'AI (SiliconFlow)', sfModel);
      }
      const errorText = await response.text();
      console.error(`[CRITICAL] SiliconFlow Error: ${response.status} - ${errorText.substring(0, 100)}`);
      sfError = `SF:${response.status}(${errorText.substring(0, 40).replace(/[^a-zA-Z0-9 ]/g, '')})`;
    } catch (e: any) {
      console.error('Erro SiliconFlow:', e);
      sfError = e.name === 'ReferenceError' ? 'SF:CODE_ERR' : `SF:FAIL`;
    }
  }

  // Tentar fallback para OpenRouter
  if (orKey && orKey.length > 20) {
    try {
      console.log("[DEBUG] Tentando Fallback OpenRouter...");
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${orKey}`,
          'HTTP-Referer': 'https://compliance-scanner-eight.vercel.app',
          'X-Title': 'Compliance Scanner',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000
        })
      });

      if (response.ok) {
        const data = await response.json();
        return parseAIResponse(data.choices[0].message.content, frameworks, 'AI (OpenRouter)', 'deepseek-v3');
      }
      const errorText = await response.text();
      console.error(`[CRITICAL] OpenRouter Error: ${response.status} - ${errorText.substring(0, 100)}`);
      orError = `OR:${response.status}(${errorText.substring(0, 40).replace(/[^a-zA-Z0-9 ]/g, '')})`;
    } catch (e: any) {
      console.error('Erro OpenRouter:', e);
      orError = e.name === 'ReferenceError' ? 'OR:CODE_ERR' : `OR:FAIL`;
    }
  }

  // Se tudo falhar, Regex
  const missingKeys = [];
  if (!sfKey) missingKeys.push('SF_KEY');
  if (!orKey) missingKeys.push('OR_KEY');

  const errorMsg = missingKeys.length > 0
    ? `Config Error: Missing ${missingKeys.join(', ')}`
    : `AI Failure (${sfError || '?'}, ${orError || '?'})`;

  return analyzeWithRegex(code, frameworks, errorMsg);
}

function parseAIResponse(content: string, frameworks: any[], method: string, details: string) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON não encontrado na resposta da IA');

  const result = JSON.parse(jsonMatch[0]);

  return {
    score: result.score || 50,
    grade: result.score >= 90 ? 'A' : result.score >= 80 ? 'B' : result.score >= 70 ? 'C' : 'F',
    violations: result.violations || [],
    summary: result.summary || 'Análise completada',
    context: result.context || 'Não identificado',
    mitigationStrategy: result.mitigationStrategy || 'Não fornecida',
    analysisMethod: 'AI',
    analysisDetails: `${method} - ${details}`,
    frameworks: frameworks.map((f: any) => ({
      ...f,
      violations: (result.violations || []).filter((v: any) =>
        v.framework?.includes(f.id) || v.framework?.includes(f.name)
      ).length,
      passed: !(result.violations || []).some((v: any) =>
        v.framework?.includes(f.id) || v.framework?.includes(f.name)
      )
    }))
  };
}

// Fallback regex (corrigido e mais abrangente)
function analyzeWithRegex(code: string, frameworks: any[], apiError?: string) {
  const violations: any[] = [];

  // Padrões mais abrangentes
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

  if (/creditCard|cartao.*=.*(req\.body|["'])/i.test(code)) {
    violations.push({
      severity: 'critical',
      framework: 'PCI-DSS',
      code: 'PCI-001',
      message: 'Dados de cartão não mascarados',
      fix: 'Mascarar todos os dígitos exceto os 4 últimos'
    });
  }

  // GDPR (Similar to LGPD)
  if (/cookie.*consent|gdpr|privacy.*policy/i.test(code) && !/accept|agree|valid/i.test(code)) {
    violations.push({
      severity: 'medium',
      framework: 'GDPR',
      code: 'GDPR-CONS-001',
      message: 'Ausência de política de consentimento de cookies/privacidade',
      fix: 'Implementar banner de consentimento e política de privacidade'
    });
  }

  // Pix/BACEN
  if (/pix|transferencia/i.test(code) && !/idempotency|idempotencia/i.test(code)) {
    violations.push({
      severity: 'high',
      framework: 'PIX-BACEN',
      code: 'PIX-001',
      message: 'Operação Pix sem chave de idempotência',
      fix: 'Adicionar header x-idempotency-key'
    });
  }

  // FAPI-BR
  if (/jwt|token/i.test(code) && !/PS256/i.test(code) && /RS256|HS256/i.test(code)) {
    violations.push({
      severity: 'medium',
      framework: 'FAPI-BR',
      code: 'FAPI-001',
      message: 'Algoritmo JWT não conforme (deve ser PS256)',
      fix: 'Alterar para PS256 em conformidade com Open Banking/Finance'
    });
  }

  // HIPAA/Health Data
  if (/patient|medical|health|paciente/i.test(code) && !/encrypt|tls|ssl/i.test(code)) {
    violations.push({
      severity: 'critical',
      framework: 'HIPAA',
      code: 'HIPAA-001',
      message: 'Dados de saúde transmitidos ou armazenados sem criptografia',
      fix: 'Garantir criptografia de ponta a ponta e em repouso'
    });
  }

  // AI-ACT
  if (/ai|model|deepseek|gpt|openai/i.test(code) && !/logging|audit|explanation/i.test(code)) {
    violations.push({
      severity: 'low',
      framework: 'AI-ACT',
      code: 'AI-ACT-001',
      message: 'Falta de logs de transparência no uso de IA',
      fix: 'Registrar entradas/saídas do modelo para fins de auditoria'
    });
  }

  // CCPA (California)
  if (/california|ccpa|do.*not.*sell/i.test(code) && !/link|button|opt-out/i.test(code)) {
    violations.push({
      severity: 'medium',
      framework: 'CCPA',
      code: 'CCPA-001',
      message: 'Ausência de link "Do Not Sell My Personal Information"',
      fix: 'Adicionar mecanismo de opt-out para venda de dados'
    });
  }

  // ISO27001/Information Security
  if (/access.*control|auth|permission/i.test(code) && !/verify|check|guard/i.test(code)) {
    violations.push({
      severity: 'high',
      framework: 'ISO27001',
      code: 'ISO-SEC-001',
      message: 'Controle de acesso fraco ou inexistente',
      fix: 'Implementar Middleware de autorização robusto'
    });
  }

  const score = Math.max(0, 100 - (violations.length * 10));

  return {
    score,
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'F',
    violations,
    summary: violations.length === 0 ? 'Código limpo' : `${violations.length} violações críticas`,
    context: 'Análise Estática Local',
    mitigationStrategy: 'Revisar violações individuais apontadas pelas regras locais.',
    analysisMethod: 'REGEX',
    analysisDetails: apiError ? `Fallback (Erro API: ${apiError})` : 'Regras locais (Fallback)',
    frameworks: frameworks.map((f: any) => ({
      ...f,
      violations: violations.filter((v: any) => v.framework === f.id).length,
      passed: !violations.some((v: any) => v.framework === f.id)
    }))
  };
}

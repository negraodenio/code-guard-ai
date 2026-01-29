// FORÇAR USO DA API - Modo Inteligente (Gasta 1 crédito por análise)
export async function analyzeCompliance(code: string, frameworks: any[]) {
  const apiKey = process.env.SILICONFLOW_API_KEY?.trim();

  // Se não tiver API key, retorna erro claro
  if (!apiKey) {
    return {
      score: 0,
      error: "API Key não configurada",
      violations: [{
        severity: 'critical',
        framework: 'CONFIG',
        message: 'Configure SILICONFLOW_API_KEY no Vercel'
      }]
    };
  }

  const prompt = `Analise este código JavaScript/Node.js como um especialista em compliance e segurança.

REGRAS ABSOLUTAS PARA DETECTAR:
1. console.log com dados sensíveis (senha, password, cpf, email, creditCard) = LGPD VIOLATION
2. Armazenamento de password sem hash/bcrypt = LGPD VIOLATION  
3. Armazenamento de creditCard em texto plano = PCI-DSS VIOLATION
4. Query MongoDB direto sem sanitização (req.body direto no findOne) = NoSQL Injection
5. Retorno de dados completos do usuário sem filtro = Data Exposure
6. Endpoint admin sem verificação de role = Broken Access Control

Código para analisar:
${code}

Responda APENAS em JSON válido:
{
  "score": número entre 0-100,
  "violations": [
    {
      "severity": "critical|high|medium",
      "framework": "LGPD|GDPR|PCI-DSS|OWASP|FAPI-BR",
      "code": "CÓDIGO-001",
      "message": "descrição clara do problema",
      "fix": "como corrigir"
    }
  ],
  "summary": "resumo executivo"
}`;

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.SILICONFLOW_MODEL?.trim() || 'deepseek-ai/DeepSeek-V3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extrai JSON da resposta (às vezes vem com markdown ```json)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON não encontrado na resposta');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validação básica
    return {
      score: result.score || 50,
      grade: result.score >= 90 ? 'A' : result.score >= 80 ? 'B' : result.score >= 70 ? 'C' : 'F',
      violations: result.violations || [],
      summary: result.summary || 'Análise completada',
      analysisMethod: 'AI',
      analysisDetails: 'DeepSeek-V3 via SiliconFlow',
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

  } catch (error) {
    console.error('SiliconFlow Error:', error);
    // Fallback para regex se API falhar
    return analyzeWithRegex(code, frameworks);
  }
}

// Fallback regex (corrigido e mais abrangente)
function analyzeWithRegex(code: string, frameworks: any[]) {
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
    analysisMethod: 'REGEX',
    analysisDetails: 'Regras locais (Fallback)',
    frameworks: frameworks.map((f: any) => ({
      ...f,
      violations: violations.filter((v: any) => v.framework === f.id).length,
      passed: !violations.some((v: any) => v.framework === f.id)
    }))
  };
}

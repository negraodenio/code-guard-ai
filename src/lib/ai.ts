// FORÇAR USO DA API - Modo Inteligente (Gasta 1 crédito por análise)
export async function analyzeCompliance(code: string, frameworks: any[]) {
  const apiKey = process.env.SILICONFLOW_API_KEY;

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
        model: 'deepseek-ai/DeepSeek-V3',
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

  if (/findOne.*\{.*username.*req\.body|password.*req\.body/i.test(code)) {
    violations.push({
      severity: 'high',
      framework: 'OWASP',
      code: 'OWASP-INJ-001',
      message: 'Possível NoSQL Injection (direto do req.body)',
      fix: 'Validar e sanitizar inputs antes da query'
    });
  }

  const score = Math.max(0, 100 - (violations.length * 15));

  return {
    score,
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'F',
    violations,
    summary: violations.length === 0 ? 'Código limpo' : `${violations.length} violações críticas`,
    frameworks: frameworks.map((f: any) => ({
      ...f,
      violations: violations.filter((v: any) => v.framework === f.id).length,
      passed: !violations.some((v: any) => v.framework === f.id)
    }))
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { SiliconFlowClient } from '@/lib/ai';

export async function POST(req: NextRequest) {
    const { code, url } = await req.json();

    let content = code;

    // Se veio URL, busca o código (simplificado)
    if (url && !code) {
        // Para MVP, apenas demonstração - em produção usaria GitHub API
        content = `// Código do repositório: ${url}\n// Análise baseada em arquivos principais...`;
    }

    // Frameworks de compliance (suas 10 regras)
    const frameworks = [
        { id: 'LGPD', name: 'Lei Geral de Proteção de Dados (Brasil)', weight: 10 },
        { id: 'GDPR', name: 'General Data Protection Regulation (EU)', weight: 10 },
        { id: 'PCI-DSS', name: 'Payment Card Industry Data Security Standard', weight: 9 },
        { id: 'FAPI-BR', name: 'Financial-grade API Brasil', weight: 9 },
        { id: 'PIX-BACEN', name: 'Pix Security (BACEN)', weight: 10 },
        { id: 'OWASP', name: 'OWASP Top 10', weight: 8 },
        { id: 'ISO27001', name: 'ISO/IEC 27001', weight: 7 },
        { id: 'HIPAA', name: 'Health Insurance Portability', weight: 6 },
        { id: 'CCPA', name: 'California Consumer Privacy Act', weight: 6 },
        { id: 'AI-ACT', name: 'EU AI Act', weight: 5 }
    ];

    // Análise local (regex patterns) - Rápido e gratuito
    const localIssues = analyzeLocally(content);

    // Análise com SiliconFlow (Inteligente) - Se tiver API key
    let aiInsights = [];
    try {
        const ai = new SiliconFlowClient(process.env.SILICONFLOW_API_KEY || '');
        aiInsights = await ai.analyzeCompliance(content, frameworks);
    } catch (e) {
        // Sem AI, usa apenas análise local
        aiInsights = generateBasicInsights(localIssues, frameworks);
    }

    // Gera score
    const totalIssues = localIssues.length + aiInsights.length;
    const score = Math.max(0, 100 - (totalIssues * 2));

    const report = {
        timestamp: new Date().toISOString(),
        content: content.substring(0, 1000) + '...',
        score,
        grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'F',
        frameworks: frameworks.map(f => ({
            ...f,
            violations: countViolations(localIssues, aiInsights, f.id),
            passed: countViolations(localIssues, aiInsights, f.id) === 0
        })),
        issues: [...localIssues, ...aiInsights],
        summary: generateSummary(score, totalIssues)
    };

    return NextResponse.json(report);
}

function analyzeLocally(code: string) {
    const issues = [];

    // LGPD/GDPR Patterns
    if (code.match(/console\.log.*(cpf|email|password|senha)/i)) {
        issues.push({
            severity: 'critical',
            framework: 'LGPD/GDPR',
            code: 'PII-LOG-001',
            message: 'Dados pessoais sendo logados (console.log)',
            line: findLine(code, /console\.log.*(cpf|email)/i),
            fix: 'Remover console.log ou mascarar dados antes de logar'
        });
    }

    if (code.match(/(cpf|email|phone).*=\s*["\'][\d\w@]/i) && !code.includes('hash')) {
        issues.push({
            severity: 'high',
            framework: 'LGPD/GDPR',
            code: 'PII-PLAIN-001',
            message: 'PII armazenado em texto plano (sem hash/criptografia)',
            fix: 'Utilizar hash (SHA-256) ou criptografia (AES) para dados sensíveis'
        });
    }

    // PCI-DSS Patterns
    if (code.match(/cartao|card.*number|cvv/i) && !code.match(/encrypt|hash|mask/)) {
        issues.push({
            severity: 'critical',
            framework: 'PCI-DSS',
            code: 'PCI-DATA-001',
            message: 'Dados de cartão não estão mascarados/criptografados',
            fix: 'Aplicar mascarada (****1234) e criptografia AES-256'
        });
    }

    // Pix/BACEN Patterns
    if (code.includes('pix') || code.includes('transfer')) {
        if (!code.includes('idempotency') && !code.includes('idempotencia')) {
            issues.push({
                severity: 'high',
                framework: 'PIX-BACEN',
                code: 'PIX-IDEMP-001',
                message: 'Operações Pix sem mecanismo de idempotência',
                fix: 'Adicionar header x-idempotency-key em todas as requisições de transferência'
            });
        }
    }

    // FAPI-BR Patterns
    if (code.match(/jwt|token/i)) {
        if (code.match(/RS256|HS256/) && !code.includes('PS256')) {
            issues.push({
                severity: 'medium',
                framework: 'FAPI-BR',
                code: 'FAPI-ALG-001',
                message: 'Algoritmo JWT não conforme FAPI-BR (deve ser PS256)',
                fix: 'Alterar configuração para usar PS256 no lugar de RS256/HS256'
            });
        }
    }

    // OWASP Patterns
    if (code.match(/eval\(|exec\(/)) {
        issues.push({
            severity: 'critical',
            framework: 'OWASP',
            code: 'OWASP-INJ-001',
            message: 'Uso de eval() ou exec() detectado (vulnerável a injection)',
            fix: 'Substituir por métodos seguros de parsing'
        });
    }

    if (!code.match(/validate|sanitize|escape/i) && code.includes('req.body')) {
        issues.push({
            severity: 'medium',
            framework: 'OWASP',
            code: 'OWASP-INPUT-001',
            message: 'Entrada de usuário sem validação/sanitização',
            fix: 'Implementar validação Joi/Zod ou sanitização com DOMPurify'
        });
    }

    return issues;
}

function findLine(code: string, pattern: RegExp): number {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) return i + 1;
    }
    return 0;
}

function countViolations(local: any[], ai: any[], frameworkId: string) {
    const all = [...local, ...ai];
    return all.filter(i => i.framework && i.framework.includes(frameworkId)).length;
}

function generateBasicInsights(localIssues: any[], frameworks: any[]) {
    // Quando não tem AI, gera insights básicos baseado nos padrões encontrados
    return localIssues.map(issue => ({
        ...issue,
        aiExplanation: `Violação detectada em análise estática: ${issue.message}`,
        recommendation: issue.fix
    }));
}

function generateSummary(score: number, issues: number) {
    if (score >= 90) return 'Excelente! Código está bem protegido e compliant.';
    if (score >= 80) return 'Bom, mas precisa de ajustes menores antes da produção.';
    if (score >= 70) return 'Atenção: Várias violações que podem gerar multas.';
    return 'Crítico: Não recomendado para produção sem correções imediatas.';
}

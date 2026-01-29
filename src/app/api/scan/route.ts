import { NextRequest, NextResponse } from 'next/server';
import { analyzeCompliance } from '@/lib/ai';

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

    try {
        const analysisResult = await analyzeCompliance(content, frameworks);

        const report = {
            timestamp: new Date().toISOString(),
            content: content.substring(0, 1000) + '...',
            ...analysisResult,
            issues: analysisResult.violations // Maqueia violations para issues para compatibilidade com o frontend
        };

        return NextResponse.json(report);
    } catch (error) {
        console.error('Scan API Error:', error);
        return NextResponse.json({ error: 'Erro ao processar análise' }, { status: 500 });
    }
}

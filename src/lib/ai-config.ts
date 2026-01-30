export type Provider = 'siliconflow' | 'openrouter';

export interface ModelConfig {
    primaryModel: string;
    fallbackModel: string;
    temperature: number;
}

// Configuração Baseada na Matriz de Tiers do Usuário
export const COMPLIANCE_MODEL_MAP: Record<string, ModelConfig> = {
    // Tier 1: Data Sovereignty (Jurídico-Complexo)
    'LGPD': {
        primaryModel: 'deepseek-ai/DeepSeek-V3', // BR (LGPD/BACEN)
        fallbackModel: 'deepseek/deepseek-chat',
        temperature: 0.1
    },
    'BACEN': {
        primaryModel: 'deepseek-ai/DeepSeek-V3', // BR (LGPD/BACEN)
        fallbackModel: 'meta-llama/llama-3.1-70b-instruct',
        temperature: 0.1
    },
    'PIPL': {
        primaryModel: 'Qwen/Qwen2.5-72B-Instruct', // CN (Nativo Mandarim)
        fallbackModel: 'qwen/qwen-2.5-72b-instruct',
        temperature: 0.1
    },
    'GDPR': {
        primaryModel: 'deepseek-ai/DeepSeek-V3', // EU (Contexto Longo)
        fallbackModel: 'deepseek/deepseek-chat',
        temperature: 0.1
    },

    // Tier 2: Industry Frameworks (Técnico-Estruturado)
    'PCI-DSS': {
        primaryModel: 'deepseek-ai/DeepSeek-Coder-V2', // Especialista em Security/Infra
        fallbackModel: 'deepseek/deepseek-coder',
        temperature: 0.0
    },
    'OWASP': {
        primaryModel: 'deepseek-ai/DeepSeek-Coder-V2',
        fallbackModel: 'anthropic/claude-3.5-sonnet',
        temperature: 0.0
    },
    'WCAG': {
        primaryModel: 'deepseek-ai/DeepSeek-Coder-V2', // HTML/ARIA Parsing
        fallbackModel: 'deepseek/deepseek-coder',
        temperature: 0.0
    },

    // Tier 3: Governance by Design (Abstrato)
    'default': {
        primaryModel: 'deepseek-ai/DeepSeek-V3', // Governance/Abstract Reasoning
        fallbackModel: 'deepseek/deepseek-chat',
        temperature: 0.1
    }
};

export function getModelForFrameworks(frameworks: string[]): ModelConfig {
    // 1. Tier 2 (Technical/Code) has priority for Code Analysis
    if (frameworks.some(f => ['PCI-DSS', 'OWASP', 'WCAG', 'HIPAA'].includes(f))) {
        return COMPLIANCE_MODEL_MAP['PCI-DSS'];
    }

    // 2. Tier 1 (Sovereignty)
    if (frameworks.includes('PIPL')) return COMPLIANCE_MODEL_MAP['PIPL'];
    if (frameworks.includes('LGPD') || frameworks.includes('BACEN')) return COMPLIANCE_MODEL_MAP['LGPD'];

    // 3. Default (Governance)
    return COMPLIANCE_MODEL_MAP['default'];
}

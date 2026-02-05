import type * as vscodeTypes from 'vscode';
import { vscode } from '../utils/vscode-compat';

/**
 * LLM API Configuration - CodeGuard AI
 * 
 * ESTRATÉGIA DE CUSTO OTIMIZADA(v2.0)
    * =====================================
 * 
 * DECISÕES CRÍTICAS:
 * 
 * 1. SCAN: Kimi K2.5
    * - Custo: $0.15 / M input, $2.50 / M output
        * - Contexto: 262k tokens(2x maior que GPT - 4o)
            * - Ideal para análise de arquivos inteiros
                * 
 * 2. PATCH: GPT - 4o - mini
    * - Custo: $0.15 / M input, $0.60 / M output
        * - 85 % mais barato que Claude Haiku($4.00 / M output)
            * - Qualidade suficiente para geração de código
                * 
 * 3. EMBEDDINGS: SiliconFlow
    * - Custo: ~$0.01 / M tokens
        * - 10x mais barato que OpenAI($0.10 / M)
            * - Performance 2.3x mais rápida
                * 
 * 4. EXPLAIN: Kimi K2.5
    * - Contexto 262k permite análise de projetos inteiros
        * - Melhor para explicações detalhadas
            * 
 * 5. FALLBACK: OpenRouter
    * - Markup de 5.5 % sobre APIs diretas
        * - Usar APENAS quando APIs diretas falharem
            * 
 * ECONOMIA MENSAL(1M scans):
 * - Config anterior: $3, 650 / mês
    * - Config otimizada: $580 / mês
        * - Economia: 84 % ($3,070 / mês)
            * 
 * @see https://docs.codeguard.ai/llm-strategy
 */

export interface LLMProviderConfig {
    name: string;
    apiKey: string;
    baseUrl: string;
    models: {
        scan: string;
        patch: string;
        embeddings: string;
        explain: string;
    };
    pricing: {
        inputPer1M: number;  // USD per 1M tokens
        outputPer1M: number; // USD per 1M tokens
    };
    contextWindow: number;
    maxRetries: number;
    priority: number; // Lower = higher priority
}

/**
 * Provider configurations with real pricing data (Jan 2026)
 */
export const PROVIDERS: Record<string, LLMProviderConfig> = {
    /**
     * 🥇 PRIMÁRIO: Kimi K2.5 (Moonshot AI)
     * Melhor custo-benefício para scan e explain
     * Contexto gigante: 262k tokens
     */
    kimi: {
        name: 'Kimi K2.5',
        apiKey: process.env.KIMI_API_KEY || '',
        baseUrl: 'https://api.moonshot.cn/v1',
        models: {
            scan: 'kimi-k2-5',
            patch: 'kimi-k2-5',
            embeddings: 'text-embedding-v1', // Fallback se SiliconFlow indisponível
            explain: 'kimi-k2-5',
        },
        pricing: {
            inputPer1M: 0.15,   // $0.15 per 1M input
            outputPer1M: 2.50,  // $2.50 per 1M output
        },
        contextWindow: 262_144, // 262k tokens
        maxRetries: 3,
        priority: 1,
    },

    /**
     * 🥈 PATCH: GPT-4o-mini (OpenAI)
     * 85% mais barato que Claude Haiku para output
     * Qualidade excelente para geração de código
     */
    openai: {
        name: 'GPT-4o-mini',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: 'https://api.openai.com/v1',
        models: {
            scan: 'gpt-4o-mini',
            patch: 'gpt-4o-mini',      // $0.60/M output vs Haiku $4.00/M
            embeddings: 'text-embedding-3-small',
            explain: 'gpt-4o-mini',
        },
        pricing: {
            inputPer1M: 0.15,
            outputPer1M: 0.60,
        },
        contextWindow: 128_000,
        maxRetries: 3,
        priority: 2,
    },

    /**
     * 🥉 EMBEDDINGS: SiliconFlow
     * 10x mais barato que OpenAI para embeddings
     * Performance 2.3x mais rápida, 32% menos latência
     */
    siliconflow: {
        name: 'SiliconFlow',
        apiKey: process.env.SILICONFLOW_API_KEY || '',
        baseUrl: 'https://api.siliconflow.cn/v1',
        models: {
            scan: 'deepseek-v3',
            patch: 'deepseek-v3',
            embeddings: 'BAAI/bge-large-zh-v1.5', // ~$0.01/M
            explain: 'deepseek-v3',
        },
        pricing: {
            inputPer1M: 0.01,
            outputPer1M: 0.02,
        },
        contextWindow: 128_000,
        maxRetries: 3,
        priority: 3,
    },

    /**
     * 🔄 FALLBACK: OpenRouter (Multi-provider gateway)
     * Adiciona 5.5% markup - usar apenas como último recurso
     * Roteia automaticamente se providers diretos falharem
     */
    openrouter: {
        name: 'OpenRouter',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: {
            scan: 'moonshotai/kimi-k2-5',
            patch: 'openai/gpt-4o-mini',
            embeddings: 'openai/text-embedding-3-small',
            explain: 'moonshotai/kimi-k2-5',
        },
        pricing: {
            inputPer1M: 0.20,   // +5.5% markup
            outputPer1M: 3.00,
        },
        contextWindow: 262_144,
        maxRetries: 3,
        priority: 99, // Último recurso
    },
};

/**
 * Task-specific routing configuration
 * 
 * REGRAS DE ROTEAMENTO:
 * - Scan: Kimi (contexto 262k para arquivos grandes)
 * - Patch: GPT-4o-mini (85% mais barato que alternativas)
 * - Embeddings: SiliconFlow (10x mais barato)
 * - Explain: Kimi (contexto longo para análise completa)
 */
export const ROUTING_CONFIG = {
    // Provider primário por tarefa
    primary: {
        scan: 'kimi',
        patch: 'openai',
        embeddings: 'siliconflow',
        explain: 'kimi',
    } as const,

    // Fallbacks ordenados por custo
    fallbacks: {
        scan: ['openai', 'siliconflow', 'openrouter'],
        patch: ['kimi', 'siliconflow', 'openrouter'],
        embeddings: ['openai', 'openrouter'],
        explain: ['openai', 'siliconflow', 'openrouter'],
    } as const,

    // Limites de custo (alertas)
    costLimits: {
        maxPerScan: 0.01,      // $0.01 máximo por scan
        maxPerPatch: 0.05,     // $0.05 máximo por patch
        maxPerEmbed: 0.001,    // $0.001 máximo por embedding
        maxPerExplain: 0.02,   // $0.02 máximo por explicação
        maxMonthly: 1000,      // $1000/mês (trigger alerta)
    },

    // Estimativas de tokens por operação
    tokenEstimates: {
        scan: { input: 2000, output: 500 },
        patch: { input: 1500, output: 800 },
        embeddings: { input: 1000, output: 0 },
        explain: { input: 3000, output: 1500 },
    },
};

export type TaskType = 'scan' | 'patch' | 'embeddings' | 'explain';
export type ProviderName = keyof typeof PROVIDERS;

/**
 * Alias for compatibility with SmartRouter
 */
export const ACTIVE_CONFIG = {
    routing: ROUTING_CONFIG.primary,
    fallbacks: ROUTING_CONFIG.fallbacks,
    costLimits: ROUTING_CONFIG.costLimits,
};

/**
 * Get the best provider for a task
 */
export function getProviderForTask(task: TaskType): LLMProviderConfig {
    let configuredProvider = 'openrouter';

    // SYNC: Read latest keys from VS Code Settings
    try {
        if (vscode && vscode.workspace) {
            const config = vscode.workspace.getConfiguration('codeguard');
            configuredProvider = config.get('aiProvider') || 'openrouter';
            const configuredKey = config.get('userApiKey');

            // Update OpenRouter key if configured
            if (configuredKey && (configuredProvider === 'openrouter' || configuredProvider === 'openai')) {
                if (PROVIDERS[configuredProvider]) {
                    PROVIDERS[configuredProvider].apiKey = configuredKey;
                }
            }
        } catch (e) {
            // Ignore if not in VS Code context
        }

        // Check if primary is configured, considering User Preference first
        if ((configuredProvider === 'openrouter' || configuredProvider === 'openai') && PROVIDERS[configuredProvider].apiKey) {
            const provider = PROVIDERS[configuredProvider];
            if (provider.apiKey.length > 10) return provider;
        }

        const primaryName = ROUTING_CONFIG.primary[task];
        const primary = PROVIDERS[primaryName];

        // Check if primary is configured
        if (primary.apiKey && primary.apiKey.length > 10) {
            return primary;
        }

        // Try fallbacks
        for (const fallbackName of ROUTING_CONFIG.fallbacks[task]) {
            const fallback = PROVIDERS[fallbackName];
            if (fallback.apiKey && fallback.apiKey.length > 10) {
                console.warn(`⚠️ ${primaryName} não configurado, usando ${fallbackName} para ${task}`);
                return fallback;
            }
        }

        // If explicit OpenRouter didn't work above, try it as final resort
        // (This handles the case where it wasn't selected in settings but key is present in env)
        if (PROVIDERS.openrouter.apiKey && PROVIDERS.openrouter.apiKey.length > 10) {
            return PROVIDERS.openrouter;
        }

        throw new Error(`Nenhum provider configurado para ${task}. Configure KIMI_API_KEY ou alternativas.`);
    }

/**
 * Estimate cost for an operation
 */
export function estimateCost(
        task: TaskType,
        provider: LLMProviderConfig,
        customTokens?: { input?: number; output?: number }
    ): number {
        const estimates = customTokens || ROUTING_CONFIG.tokenEstimates[task];
        const inputCost = ((estimates.input || 0) / 1_000_000) * provider.pricing.inputPer1M;
        const outputCost = ((estimates.output || 0) / 1_000_000) * provider.pricing.outputPer1M;
        return inputCost + outputCost;
    }

    /**
     * Check if cost is within limits
     */
    export function checkCostLimit(task: TaskType, estimatedCost: number): boolean {
        const limitKey = `maxPer${task.charAt(0).toUpperCase() + task.slice(1)}` as keyof typeof ROUTING_CONFIG.costLimits;
        const limit = ROUTING_CONFIG.costLimits[limitKey];
        return estimatedCost <= (limit || Infinity);
    }

    /**
     * Reload configurations from process.env
     * Useful after loading .env file in extension activation
     */
    export function reloadEnvConfig() {
        if (process.env.KIMI_API_KEY) PROVIDERS.kimi.apiKey = process.env.KIMI_API_KEY;
        if (process.env.OPENAI_API_KEY) PROVIDERS.openai.apiKey = process.env.OPENAI_API_KEY;
        if (process.env.SILICONFLOW_API_KEY) PROVIDERS.siliconflow.apiKey = process.env.SILICONFLOW_API_KEY;
        if (process.env.OPENROUTER_API_KEY) PROVIDERS.openrouter.apiKey = process.env.OPENROUTER_API_KEY;
        console.log('[CodeGuard] Environment configurations reloaded.');
    }

// Universal SDK for all platforms
// @codeguard/universal-sdk

export interface CodeGuardConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
}

export interface ScanOptions {
    content: string;
    filename: string;
    language?: string;
    frameworks?: ('lgpd' | 'gdpr' | 'nis2' | 'pci-dss' | 'hipaa' | 'soc2' | 'owasp' | 'iso27001')[];
    useAI?: boolean;
    callbackUrl?: string;
}

export interface Violation {
    id: string;
    line: number;
    column?: number;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    ruleId: string;
    message: string;
    article?: string;
    suggestion: string;
    codeSnippet: string;
    fixable: boolean;
}

export interface ScanResult {
    success: boolean;
    scan_id: string;
    credits_used: number;
    credits_remaining: number;
    duration_ms: number;
    report: {
        file: string;
        summary: {
            total: number;
            critical: number;
            high: number;
            medium: number;
            low: number;
            fixable: number;
        };
        violations: Violation[];
    };
    patches?: Patch[];
}

export interface Patch {
    id: string;
    violation_id: string;
    diff: string;
    explanation: string;
    risks?: string[];
}

export interface CreditsInfo {
    balance: number;
    plan: 'free' | 'pro' | 'team' | 'enterprise';
    api_key_prefix: string;
}

export class CodeGuardClient {
    private config: Required<CodeGuardConfig>;

    constructor(config: CodeGuardConfig) {
        this.config = {
            baseUrl: 'https://api.codeguard.ai/v1',
            timeout: 30000,
            ...config,
        };
    }

    /**
     * Scan code for compliance violations
     */
    async scan(options: ScanOptions): Promise<ScanResult> {
        const response = await this.request('/scan', {
            method: 'POST',
            body: JSON.stringify({
                content: this.encodeContent(options.content),
                filename: options.filename,
                language: options.language,
                frameworks: options.frameworks || ['lgpd', 'gdpr'],
                useAI: options.useAI ?? true,
                callback_url: options.callbackUrl,
            }),
        });

        return response;
    }

    /**
     * Generate a patch for a violation
     */
    async generatePatch(params: {
        violationId: string;
        fileContent: string;
        framework: string;
        strategy?: 'minimal' | 'refactor' | 'secure-by-design';
    }): Promise<Patch> {
        const response = await this.request('/patch', {
            method: 'POST',
            body: JSON.stringify({
                violation_id: params.violationId,
                file_content: this.encodeContent(params.fileContent),
                framework: params.framework,
                strategy: params.strategy || 'minimal',
            }),
        });

        return response.patch;
    }

    /**
     * Apply a patch to code
     */
    async applyPatch(params: {
        patchId: string;
        originalCode: string;
        dryRun?: boolean;
    }): Promise<{ success: boolean; patched_code: string; changes_applied: number }> {
        return this.request('/patch/apply', {
            method: 'POST',
            body: JSON.stringify({
                patch_id: params.patchId,
                original_code: this.encodeContent(params.originalCode),
                dry_run: params.dryRun ?? true,
            }),
        });
    }

    /**
     * Get remaining credits and plan info
     */
    async getCredits(): Promise<CreditsInfo> {
        return this.request('/credits');
    }

    /**
     * Check API health
     */
    async health(): Promise<{ status: string; version: string; timestamp: string }> {
        return this.request('/health', { auth: false });
    }

    /**
     * Internal request method
     */
    private async request(
        path: string,
        options: { method?: string; body?: string; auth?: boolean } = {}
    ): Promise<any> {
        const { method = 'GET', body, auth = true } = options;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (auth) {
            headers['x-api-key'] = this.config.apiKey;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}${path}`, {
                method,
                headers,
                body,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                throw new CodeGuardError(
                    data.error || `Request failed: ${response.status}`,
                    response.status,
                    data
                );
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof CodeGuardError) {
                throw error;
            }

            if (error instanceof Error && error.name === 'AbortError') {
                throw new CodeGuardError('Request timed out', 408);
            }

            throw new CodeGuardError(
                error instanceof Error ? error.message : 'Unknown error',
                500
            );
        }
    }

    /**
     * Encode content to base64 (works in Node.js and browser)
     */
    private encodeContent(content: string): string {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(content).toString('base64');
        }
        return btoa(unescape(encodeURIComponent(content)));
    }
}

/**
 * Custom error class for CodeGuard API errors
 */
export class CodeGuardError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public data?: any
    ) {
        super(message);
        this.name = 'CodeGuardError';
    }
}

// React Hook
export function useCodeGuard(apiKey: string) {
    const client = new CodeGuardClient({ apiKey });

    return {
        scan: (file: { content: string; name: string }) =>
            client.scan({ content: file.content, filename: file.name }),
        generatePatch: client.generatePatch.bind(client),
        applyPatch: client.applyPatch.bind(client),
        getCredits: client.getCredits.bind(client),
        health: client.health.bind(client),
    };
}

export default CodeGuardClient;

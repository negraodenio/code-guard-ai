// @codeguard/bolt-client - SDK cliente para Bolt/WebContainer

export interface BoltClientConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
}

export interface ScanOptions {
    content: string;
    filename: string;
    language?: string;
    frameworks?: string[];
}

export interface ScanResult {
    success: boolean;
    scan_id: string;
    credits_used: number;
    credits_remaining: number;
    duration_ms: number;
    report: {
        summary: {
            total: number;
            critical: number;
            high: number;
            medium: number;
            low: number;
            fixable: number;
        };
        violations: Array<{
            id: string;
            line: number;
            severity: string;
            ruleId: string;
            message: string;
            suggestion: string;
            fixable: boolean;
        }>;
    };
}

export class CodeGuardClient {
    private config: Required<BoltClientConfig>;

    constructor(config: BoltClientConfig) {
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(`${this.config.baseUrl}/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.config.apiKey,
                },
                body: JSON.stringify({
                    content: this.encodeContent(options.content),
                    filename: options.filename,
                    language: options.language,
                    frameworks: options.frameworks || ['lgpd', 'gdpr'],
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Scan failed: ${response.status}`);
            }

            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Scan timed out');
            }
            throw error;
        }
    }

    /**
     * Get remaining credits
     */
    async getCredits(): Promise<number> {
        try {
            const response = await fetch(`${this.config.baseUrl}/credits`, {
                headers: { 'x-api-key': this.config.apiKey },
            });

            if (!response.ok) {
                return 0;
            }

            const data = await response.json();
            return data.balance || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Get health status
     */
    async health(): Promise<{ status: string; version: string }> {
        const response = await fetch(`${this.config.baseUrl}/health`);
        return response.json();
    }

    /**
     * Render compliance badge HTML
     */
    renderBadge(violations: number): string {
        if (violations === 0) {
            return `<span style="color: #22c55e; font-weight: 500;">✅ LGPD Compliant</span>`;
        }
        return `<span style="color: #ef4444; font-weight: 500;">⚠️ ${violations} issues found</span>`;
    }

    /**
     * Encode content for API (base64)
     */
    private encodeContent(content: string): string {
        // Works in both Node.js and Browser
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(content).toString('base64');
        }
        return btoa(unescape(encodeURIComponent(content)));
    }
}

// React Hook for easy integration
export function useCodeGuard(apiKey: string) {
    const client = new CodeGuardClient({ apiKey });

    return {
        scan: (file: { content: string; name: string }) =>
            client.scan({ content: file.content, filename: file.name }),
        getCredits: () => client.getCredits(),
        renderBadge: (violations: number) => client.renderBadge(violations),
    };
}

export default CodeGuardClient;

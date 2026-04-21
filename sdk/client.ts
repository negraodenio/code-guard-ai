/**
 * CodeGuard AI SDK
 * Simple client library for CodeGuard API
 */

export interface CodeGuardConfig {
    apiKey: string;
    baseUrl?: string;
}

export interface ScanOptions {
    region: 'BR' | 'EU';
    frameworks?: string[];
}

export interface ScanResult {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}

export class CodeGuardClient {
    private config: CodeGuardConfig;

    constructor(config: CodeGuardConfig) {
        this.config = {
            baseUrl: 'https://api.code-guard.eu',
            ...config
        };
    }

    private async request(endpoint: string, data: any): Promise<any> {
        const url = `${this.config.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Run compliance audit
     */
    async scan(options: ScanOptions): Promise<ScanResult> {
        return this.request('/api/scan', options);
    }

    /**
     * Generate dependency graph
     */
    async generateGraph(): Promise<ScanResult> {
        return this.request('/api/graph', {});
    }

    /**
     * Detect shadow APIs
     */
    async detectShadowAPIs(options: { content?: string; filePath?: string }): Promise<ScanResult> {
        return this.request('/api/shadow-apis', options);
    }
}

// Default export
export default CodeGuardClient;

// Example usage:
/*
import CodeGuardClient from 'codeguard-sdk';

const client = new CodeGuardClient({
    apiKey: 'your-api-key-here'
});

// Scan for compliance
const result = await client.scan({
    region: 'BR',
    frameworks: ['gdpr', 'lgpd']
});

console.log(result);
*/
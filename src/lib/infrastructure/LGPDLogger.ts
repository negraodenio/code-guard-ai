import pino from 'pino';

/**
 * 🛡️ LGPDLogger: Infrastructure class for production-ready, 
 * compliant logging. Features automatic PII Redaction.
 */

// 1. Comprehensive list of sensitive fields (LGPD + PCI + Banking)
const SENSITIVE_FIELDS = [
    'cpf', 'cnpj', 'rg', 'senha', 'password', 'creditCard',
    'cartao_credito', 'cvv', 'numero_cartao', 'token',
    'refresh_token', 'authorization', 'api_key', 'apiKey',
    'condicao_medica', 'face_id', 'biometria'
];

// 2. Default Masking Patterns
const SENSITIVE_PATTERNS = [
    { pattern: /\d{3}\.\d{3}\.\d{3}-\d{2}/g, mask: '***.***.***-**' }, // CPF
    { pattern: /\b4[0-9]{12}(?:[0-9]{3})?\b/g, mask: '****-****-****-****' }, // Visa
];

export interface LoggerConfig {
    level: string;
    redactList?: string[];
}

export class LGPDLogger {
    public logger: pino.Logger;

    constructor(config: LoggerConfig = { level: 'info' }) {
        this.logger = pino({
            level: config.level,
            redact: {
                paths: [...SENSITIVE_FIELDS, ...(config.redactList || [])],
                censor: '[REDACTED-LGPD]',
                remove: false
            },
            formatters: {
                level: (label) => ({ level: label.toUpperCase() }),
                bindings: (bindings) => ({
                    pid: bindings.pid,
                    env: process.env.NODE_ENV
                }),
                log: (obj) => this.deepSanitize(obj)
            },
            timestamp: pino.stdTimeFunctions.isoTime,
        });
    }

    /**
     * Deep recursive sanitization for objects that might 
     * bypass the 'redact' config or for edge cases.
     */
    private deepSanitize(obj: any): any {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.deepSanitize(item));

        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
                sanitized[key] = '[REDACTED-LGPD]';
            } else if (typeof value === 'string') {
                // Apply pattern masking
                sanitized[key] = SENSITIVE_PATTERNS.reduce(
                    (acc, { pattern, mask }) => acc.replace(pattern, mask),
                    value
                );
            } else if (typeof value === 'object') {
                sanitized[key] = this.deepSanitize(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    /**
     * 🛡️ safeInfo: Ensures that req.body or sensitive objects are 
     * sanitized BEFORE hitting the redact layer.
     */
    safeInfo(obj: any, msg?: string) {
        let internalObj = obj;
        if (obj && obj.req && typeof obj.req === 'object') {
            const safeReq = {
                method: obj.req.method,
                url: obj.req.url,
                contentType: obj.req.headers ? obj.req.headers['content-type'] : 'unknown',
                userAgent: obj.req.headers ? obj.req.headers['user-agent']?.substring(0, 50) : 'unknown'
            };
            internalObj = { ...obj, req: safeReq };
        }
        this.logger.info(this.deepSanitize(internalObj), msg);
    }

    info(obj: any, msg?: string) { this.logger.info(this.deepSanitize(obj), msg); }
    error(obj: any, msg?: string) { this.logger.error(this.deepSanitize(obj), msg); }
    warn(obj: any, msg?: string) { this.logger.warn(this.deepSanitize(obj), msg); }
}

export const logger = new LGPDLogger();

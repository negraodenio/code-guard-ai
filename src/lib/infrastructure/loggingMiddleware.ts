import { Request, Response, NextFunction } from 'express';
import { logger } from './LGPDLogger';

/**
 * 🛡️ loggingMiddleware: Automatically logs requests and responses 
 * ensuring no PII or sensitive data leaks to the log storage.
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Log Request (Redacted automatically)
    logger.info({
        type: 'http-request',
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        headers: { ...req.headers, authorization: '[REDACTED]', cookie: '[REDACTED]' }
    }, `HTTP ${req.method} ${req.url}`);

    // Intercept Response to log execution time
    const originalJson = res.json;
    res.json = function (body) {
        const duration = Date.now() - start;
        logger.info({
            type: 'http-response',
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            body: body
        }, `HTTP Response ${res.statusCode} (${duration}ms)`);
        return originalJson.call(this, body);
    };

    next();
};

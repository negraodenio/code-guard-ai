import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { logger } from './LGPDLogger';

/**
 * 🛡️ FAPIValidator: Enterprise-grade OAuth2 validator for FAPI-BR (Open Banking Brasil).
 * Enforces algorithm restrictions and scope verification.
 */
class FAPIValidator {
    private client: jwksClient.JwksClient;
    private issuer: string;
    private audience: string;

    constructor() {
        this.client = jwksClient({
            jwksUri: process.env.OB_JWKS_URI || 'https://auth.sandbox.openbankingbrasil.org.br/.well-known/jwks.json',
            cache: true,
            cacheMaxEntries: 5,
            rateLimit: true
        });

        this.issuer = process.env.OB_ISSUER || 'https://auth.sandbox.openbankingbrasil.org.br';
        this.audience = process.env.OB_AUDIENCE || 'compliance-scanner';
    }

    /**
     * Express/Connect Middleware for FAPI validation
     */
    middleware(requiredScopes: string[] = []) {
        return async (req: any, res: any, next: any) => {
            try {
                const authHeader = req.headers.authorization;

                if (!authHeader?.startsWith('Bearer ')) {
                    return res.status(401).json({
                        error: 'invalid_token',
                        error_description: 'Token missing or malformed'
                    });
                }

                const token = authHeader.substring(7);
                const decoded: any = jwt.decode(token, { complete: true });

                if (!decoded?.header?.kid) {
                    throw new Error('Token missing Key ID (kid)');
                }

                const key = await this.getSigningKey(decoded.header.kid);
                const publicKey = key.getPublicKey();

                // FAPI 2.0 requires PS256 or ES256
                const verified: any = jwt.verify(token, publicKey, {
                    algorithms: ['PS256', 'ES256'],
                    issuer: this.issuer,
                    audience: this.audience
                });

                // Scope Validation
                if (requiredScopes.length > 0) {
                    const tokenScopes = (verified.scope || '').split(' ');
                    const hasScopes = requiredScopes.every(s => tokenScopes.includes(s));

                    if (!hasScopes) {
                        logger.warn({ sub: verified.sub, required: requiredScopes }, 'Insufficient scope');
                        return res.status(403).json({
                            error: 'insufficient_scope',
                            error_description: `Required: ${requiredScopes.join(', ')}`
                        });
                    }
                }

                req.fapi = {
                    subject: verified.sub,
                    clientId: verified.client_id,
                    scopes: verified.scope?.split(' ') || [],
                    jti: verified.jti
                };

                logger.info({ type: 'fapi-access', jti: verified.jti, sub: verified.sub }, 'Authorized access');
                next();

            } catch (error: any) {
                logger.warn({ error: error.message }, 'FAPI Validation failed');
                return res.status(401).json({
                    error: 'invalid_token',
                    error_description: error.message
                });
            }
        };
    }

    private getSigningKey(kid: string): Promise<jwksClient.SigningKey> {
        return new Promise((resolve, reject) => {
            this.client.getSigningKey(kid, (err, key) => {
                if (err || !key) reject(err || new Error('Key not found'));
                else resolve(key);
            });
        });
    }
}

export const fapiAuth = new FAPIValidator();

/**
 * CodeGuard AI v1.2.0 - Root API Entry Point
 * This handler provide metadata and resolves the "Cannot GET /" error.
 */

export default function handler(req, res) {
  res.status(200).json({
    status: 'Operational',
    version: '1.2.0',
    service: 'CodeGuard AI Platform',
    official_site: 'https://code-guard.eu',
    endpoints: {
      scan: '/api/scan',
      graph: '/api/graph',
      shadow_apis: '/api/shadow-apis',
      openapi: '/api/openapi',
      docs: '/api/docs'
    },
    message: 'CodeGuard AI v1.2.0 is now live. For the full landing page, visit https://code-guard.eu'
  });
}

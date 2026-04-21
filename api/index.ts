export default function handler(req: any, res: any) {
  res.status(200).json({
    name: 'CodeGuard AI v1.2.0',
    status: 'Operational',
    version: '1.2.0',
    official_site: 'https://code-guard.eu',
    endpoints: {
      scan: '/api/scan',
      graph: '/api/graph',
      shadow_apis: '/api/shadow-apis',
      openapi: '/api/openapi',
      docs: '/api/docs'
    }
  });
}

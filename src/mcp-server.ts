#!/usr/bin/env node

/**
 * CodeGuard AI - Universal MCP Server
 * Supports:
 * 1. Stdio (Local Desktop: Cursor, VS Code)
 * 2. SSE (Web: Replit, Lovable, Remote)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';
import { ComplianceOrchestrator } from './intelligence/orchestrator';
import { RepoIntelligence } from './intelligence/ril';
import { ShadowAPIScanner } from './scanner/shadowApi';
import * as fs from 'fs';
import * as path from 'path';
import { LicenseManager } from './license/LicenseManager';

// --- SERVER CONFIG ---
const PORT = process.env.PORT || 3000;
const TRANSPORT_MODE = process.env.TRANSPORT_MODE || 'stdio';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// --- JSON RPC TYPES ---
interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: number | string;
    method: string;
    params?: any;
}

interface McpTool {
    name: string;
    description: string;
    inputSchema: any;
}

const TOOLS: McpTool[] = [
    {
        name: "codeguard_audit",
        description: "Runs deep compliance audit (GDPR/LGPD/PCI) on the current repository",
        inputSchema: {
            type: "object",
            properties: {
                region: { type: "string", enum: ["BR", "EU"], description: "Regulatory Region" },
                frameworks: { type: "array", items: { type: "string" }, description: "Framework IDs (e.g., gdpr_art_32)" }
            },
            required: ["region"]
        }
    },
    {
        name: "codeguard_graph",
        description: "Generates Dependency & Sensitivity Graph (Repo Intelligence)",
        inputSchema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "detect_shadow_apis",
        description: "Detects undocumented API endpoints (Shadow APIs) and security risks",
        inputSchema: {
            type: "object",
            properties: {
                content: { type: "string", description: "File content to analyze (optional, defaults to reading files)" },
                filePath: { type: "string", description: "Path to specific file or directory" }
            }
        }
    }
];

// --- TOOL HANDLERS ---

async function handleToolCall(name: string, args: any) {
    if (!args) throw new Error('Missing arguments for tool call');

    // 0. LICENSE CHECK
    // In future versions, the `key` would come from the RCP context headers
    const license = LicenseManager.validate(process.env.CODEGUARD_LICENSE_KEY);
    const isAllowed = LicenseManager.checkGate(name, license.plan);

    // ANALYTICS LOG: Tracking usage & gating hits
    LicenseManager.logAnalytics('TOOL_CALL_ATTEMPT', name, license.plan, isAllowed);

    if (!isAllowed) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    error: "PREMIUM_FEATURE_LOCKED",
                    message: `The tool '${name}' requires a PRO license.`,
                    upgrade_url: "https://code-guard.eu/enterprise",
                    current_plan: license.plan
                }, null, 2)
            }],
            isError: true
        };
    }

    // 1. SHADOW API DETECTOR
    if (name === 'detect_shadow_apis') {
        const violations = [];

        // Mode A: Analyze provided content string
        if (args.content) {
            violations.push(...ShadowAPIScanner.scan(args.content));
        }
        // Mode B: Scan file/directory (Mock implementation for now)
        else if (args.filePath) {
            const stat = fs.statSync(args.filePath);
            if (stat.isFile()) {
                const content = fs.readFileSync(args.filePath, 'utf-8');
                violations.push(...ShadowAPIScanner.scan(content));
            } else {
                // Simple recursive scan (shallow for demo)
                const files = fs.readdirSync(args.filePath).filter(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.py'));
                for (const file of files) {
                    const content = fs.readFileSync(path.join(args.filePath, file), 'utf-8');
                    violations.push(...ShadowAPIScanner.scan(content));
                }
            }
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    summary: {
                        total_violations: violations.length,
                        critical: violations.filter(v => v.severity === 'CRITICAL').length,
                        license_tier: license.plan,
                        analytics_tracked: true
                    },
                    findings: violations
                }, null, 2)
            }]
        };
    }

    // 2. COMPLIANCE AUDIT
    if (name === 'codeguard_audit') {
        const orchestrator = new ComplianceOrchestrator();
        const result = await orchestrator.runAudit(
            args.region || 'BR',
            args.frameworks
        );
        return {
            content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
            }]
        };
    }

    // 3. GRAPH GEN
    if (name === 'codeguard_graph') {
        const ril = new RepoIntelligence();
        const context = await ril.indexRepository(process.cwd());
        const graph = await ril.buildDependencyGraph(context);
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    nodes: context.files.length,
                    edges: graph.edges.size,
                    sensitive_files: graph.sensitiveFiles
                }, null, 2)
            }]
        };
    }

    throw new Error(`Unknown tool: ${name}`);
}

async function handleRequest(request: JsonRpcRequest) {
    console.error(`[RPC] Received: ${request.method}`);
    try {
        switch (request.method) {
            case 'tools/list':
                return { tools: TOOLS };
            case 'tools/call':
                return await handleToolCall(request.params.name, request.params.arguments);
            default:
                throw new Error(`Method not supported: ${request.method}`);
        }
    } catch (err) {
        return {
            error: {
                code: -32603,
                message: (err as Error).message
            }
        };
    }
}

// --- TRANSPORT IMPLEMENTATIONS ---

// 1. STDIO MODE (Desktop)
function startStdioServer() {
    console.error("CodeGuard Universal MCP Server running in STDIO mode...");

    process.stdin.setEncoding('utf8');
    let buffer = '';

    process.stdin.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const request = JSON.parse(line);
                handleRequest(request).then(result => {
                    const response = {
                        jsonrpc: '2.0',
                        id: request.id,
                        result
                    };
                    process.stdout.write(JSON.stringify(response) + '\n');
                });
            } catch (e) {
                console.error("JSON Parse Error:", e);
            }
        }
    });
}

// 2. SSE MODE (Web/Replit)
function startSseServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Basic Health Check
    app.get('/', (req: Request, res: Response) => {
        res.send(`CodeGuard MCP Server is running via SSE on port ${PORT}`);
    });

    // SSE Endpoint
    app.get('/sse', (req: Request, res: Response) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Initial endpoint metadata
        const metadata = {
            type: 'endpoint',
            endpoint: '/messages'
        };
        res.write(`event: endpoint\ndata: ${JSON.stringify(metadata)}\n\n`);

        console.error(`[SSE] Client connected`);

        req.on('close', () => {
            console.error(`[SSE] Client disconnected`);
        });
    });

    // Message Endpoint (POST)
    app.post('/messages', async (req: Request, res: Response) => {
        const message = req.body;
        // In a real SSE implementation, we would route this to the specific SSE connection
        // For simplicity in this demo, we just process and return result directly, 
        // as proper bi-directional SSE requires session management.
        // HOWEVER, standard MCP over SSE uses POST for requests.

        // This is a simplified implementation. Real SSE would push the result back to the /sse stream.
        // Here we just handle the RPC logic.

        try {
            // Adapt MCP JSON-RPC to Express
            // Note: This needs a proper SSE adapter in production.
            // For now, let's assume the tool call comes in body.

            // Allow testing via simple POST
            if (message.method) {
                try {
                    const result = await handleRequest(message);
                    res.json(result);
                } catch (e) {
                    res.status(500).json({ error: (e as Error).message });
                }
            } else {
                res.status(400).send("Invalid JSON-RPC");
            }

        } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    });

    app.listen(PORT, () => {
        console.error(`CodeGuard Universal MCP Server running in SSE mode on port ${PORT}`);
    });
}

// --- SMITHERY SANDBOX SUPPORT ---

export function createServer(config: any = {}) {
    const server = new McpServer({
        name: "codeguard-ai",
        version: "1.2.1"
    }, {
        capabilities: {
            tools: {},
            resources: {},
            prompts: {}
        }
    });

    for (const tool of TOOLS) {
        server.tool(tool.name, tool.description, tool.inputSchema, async (args: any) => {
            const result = await handleToolCall(tool.name, args);
            return {
                content: result.content.map((c: any) => ({ type: "text" as const, text: c.text })),
                isError: result.isError
            };
        });
    }

    return server;
}

export function createSandboxServer() {
    return createServer({
        apiKey: "sandbox-key",
        transport: "std"
    });
}

// --- BOOTSTRAP ---
async function main() {
    if (require.main === module) {
        const server = createServer();

        if (TRANSPORT_MODE === 'sse') {
            const app = express();
            app.use(cors());
            app.use(express.json());

            app.get('/sse', async (req, res) => {
                const transport = new SSEServerTransport('/message', res);
                await server.connect(transport);
            });

            app.post('/message', async (req, res) => {
                // message handling logic would go here if using full SDK transport
                // For now, we keep the simple manual implementation for SSE as placeholder
                // But properly we should use server.connect with transport
                res.status(501).send("SSE Message handling requires full transport adapter implementation");
            });
        }
        const transport = process.env.TRANSPORT_MODE || 'stdio';
        // Use console.error purely for logs to keep stdout clean for JSON-RPC
        console.error(`CodeGuard Universal MCP Server running in ${transport.toUpperCase()} mode...`);
        runServer(transport as 'stdio' | 'sse').catch(console.error);
    }

    main().catch(console.error);

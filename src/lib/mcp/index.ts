#!/usr/bin/env node
// @ts-ignore
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// @ts-ignore
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setupMcpServer } from './setup';

async function main() {
    const server = new McpServer({
        name: 'code-guard-pro-stdio',
        version: '5.0.0'
    });

    setupMcpServer(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Code Guard MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error in MCP Server:', error);
    process.exit(1);
});

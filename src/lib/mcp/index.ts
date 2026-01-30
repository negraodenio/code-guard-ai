#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server } from './server';

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Code Guard MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error in MCP Server:', error);
    process.exit(1);
});

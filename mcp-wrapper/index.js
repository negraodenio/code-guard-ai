#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { getConfig } = require('./config.js');
const { logger } = require('./logger.js');

async function run() {
    const config = getConfig();

    if (!config.apiKey) {
        logger.error('CODEGUARD_API_KEY is not set. Get one at code-guard.eu');
        process.exit(1);
    }

    logger.info(`Starting CodeGuard Wrapper -> ${config.apiUrl}`);

    // 1. Create a client to connect to the REMOTE server
    const remoteTransport = new SSEClientTransport(new URL(config.apiUrl), {
        eventSourceInitDict: {
            headers: {
                'x-api-key': config.apiKey
            }
        }
    });

    const remoteClient = new Client({
        name: 'codeguard-wrapper-client',
        version: '1.0.0'
    });

    // 2. Create a LOCAL server for Claude Desktop/Zed
    const localServer = new Server({
        name: 'CodeGuard',
        version: '1.0.0'
    }, {
        capabilities: {
            tools: {},
            resources: {},
            prompts: {}
        }
    });

    // 3. Connect to remote first to get capabilities
    try {
        await remoteClient.connect(remoteTransport);
        logger.info('Connected to remote CodeGuard server.');
    } catch (err) {
        logger.error('Failed to connect to remote server:', err.message);
        process.exit(1);
    }

    // 4. Proxy Handlers

    // Tools Proxy
    localServer.setRequestHandler('listTools', async () => {
        return await remoteClient.listTools();
    });

    localServer.setRequestHandler('callTool', async (request) => {
        return await remoteClient.callTool(request.params.name, request.params.arguments);
    });

    // Resources Proxy
    localServer.setRequestHandler('listResources', async () => {
        return await remoteClient.listResources();
    });

    localServer.setRequestHandler('readResource', async (request) => {
        return await remoteClient.readResource(request.params.uri);
    });

    // Prompts Proxy
    localServer.setRequestHandler('listPrompts', async () => {
        return await remoteClient.listPrompts();
    });

    localServer.setRequestHandler('getPrompt', async (request) => {
        return await remoteClient.getPrompt(request.params.name, request.params.arguments);
    });

    // 5. Start Local Stdio Transport
    const localTransport = new StdioServerTransport();
    await localServer.connect(localTransport);

    logger.info('CodeGuard Wrapper is ready and listening on stdio.');
}

run().catch(err => {
    logger.error('Fatal error in wrapper:', err);
    process.exit(1);
});

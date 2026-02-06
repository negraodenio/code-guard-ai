// server.js - CRIE ESTE ARQUIVO NA RAIZ DO SEU PROJETO
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. Servir arquivos estáticos
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.use(express.json());

// 2. Rota OBRIGATÓRIA para o Smithery
app.get('/.well-known/mcp/server-card.json', (req, res) => {
    const filePath = path.join(__dirname, '.well-known/mcp/server-card.json');

    if (fs.existsSync(filePath)) {
        console.log('📄 Servindo server-card.json do arquivo');
        res.sendFile(filePath);
    } else {
        console.log('⚠️  Arquivo não encontrado, servindo JSON direto');
        res.json({
            "name": "codeguardAImc",
            "version": "1.0.0",
            "description": "CodeGuard AI MCP Server",
            "capabilities": {},
            "configSchema": {
                "type": "object",
                "properties": {
                    "apiKey": {
                        "type": "string",
                        "description": "Your API key for CodeGuard AI"
                    }
                },
                "required": ["apiKey"]
            }
        });
    }
});

// 3. Health check (obrigatório)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'mcp-discovery',
        timestamp: new Date().toISOString()
    });
});

// 4. Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando em http://0.0.0.0:${PORT}`);
    console.log(`📄 Endpoint MCP: http://localhost:${PORT}/.well-known/mcp/server-card.json`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// 5. Tratamento de erros
process.on('uncaughtException', (err) => {
    console.error('❌ Erro não tratado:', err);
});

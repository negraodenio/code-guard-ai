module.exports = {
    getConfig: () => ({
        apiKey: process.env.CODEGUARD_API_KEY,
        apiUrl: process.env.CODEGUARD_API_URL || 'https://code-guard.eu/api/mcp'
    })
};

const path = require('path');
const types = require(path.join(__dirname, 'node_modules/@modelcontextprotocol/sdk/dist/cjs/types.js'));
console.log('Exports:', Object.keys(types));
console.log('CallToolRequestSchema:', !!types.CallToolRequestSchema);
console.log('ReadResourceRequestSchema:', !!types.ReadResourceRequestSchema);

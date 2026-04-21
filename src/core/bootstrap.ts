// Use require to bypass TypeScript typing issues with module-alias
const moduleAlias = require('module-alias');
const path = require('path');

// Register Alias
// This redirects any attempt to require('vscode') to our local shim
moduleAlias.addAlias('vscode', path.join(__dirname, 'vscode-shim'));

console.log('[CodeGuard Bootstrap]: VS Code Shim Registered.');

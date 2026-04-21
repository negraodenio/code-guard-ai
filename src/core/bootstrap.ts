import moduleAlias from 'module-alias';
import { join } from 'path';

// Register Alias
// This redirects any attempt to require('vscode') to our local shim
moduleAlias.addAlias('vscode', join(__dirname, 'vscode-shim'));

console.log('[CodeGuard Bootstrap]: VS Code Shim Registered.');

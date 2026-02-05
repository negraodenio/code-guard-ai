/**
 * VS Code Compatibility Shim
 * Allows code to run in both VS Code (Extension) and Node.js (CLI/MCP) environments.
 */

let vscodeInstance: any = null;

try {
    // Dynamic require to avoid bundler resolution (trick esbuild/webpack)
    // Using eval('require') or similar can sometimes trick bundlers, 
    // but a simple try-catch block is usually enough if 'vscode' is marked external or strictly optional.
    // However, since Smithery failed even with external config, we use a safer pattern.
    const req = require;
    vscodeInstance = req('vscode');
} catch (e) {
    // Ignore in non-VS Code environments
    vscodeInstance = null;
}

export const vscode = vscodeInstance;
export const isVsCode = !!vscodeInstance;

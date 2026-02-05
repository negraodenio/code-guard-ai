/**
 * Context Batcher
 * Aggregates workspace files into optimized chunks for LLM processing
 */

import { vscode } from '../utils/vscode-compat';
import * as path from 'path';
import * as fs from 'fs';

export interface FileContext {
    path: string;
    relativePath: string;
    content: string;
    language: string;
    tokenEstimate: number;
}

export interface BatchedContext {
    files: FileContext[];
    totalTokens: number;
    batchIndex: number;
}

/**
 * Supported file extensions for compliance scanning
 */
const SUPPORTED_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx',  // JavaScript/TypeScript
    '.py',                          // Python
    '.java',                        // Java
    '.cs',                          // C#
    '.go',                          // Go
    '.rb',                          // Ruby
    '.php',                         // PHP
    '.swift',                       // Swift
    '.kt', '.kts',                  // Kotlin
    '.rs',                          // Rust
    '.sql',                         // SQL
    '.yaml', '.yml',                // Config files
    '.json',                        // JSON configs
    '.env', '.env.example'          // Environment files (critical for secrets)
];

/**
 * Files/folders to always ignore
 */
const IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    '.next',
    '.nuxt',
    'coverage',
    '__pycache__',
    '.pytest_cache',
    'vendor',
    'packages',
    '.vscode',
    '*.min.js',
    '*.bundle.js',
    '*.map',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml'
];

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Get language identifier from file extension
 */
function getLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.py': 'python',
        '.java': 'java',
        '.cs': 'csharp',
        '.go': 'go',
        '.rb': 'ruby',
        '.php': 'php',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.kts': 'kotlin',
        '.rs': 'rust',
        '.sql': 'sql',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.json': 'json',
        '.env': 'env'
    };
    return langMap[ext] || 'text';
}

/**
 * Check if file should be ignored
 */
function shouldIgnore(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    return IGNORE_PATTERNS.some(pattern => {
        if (pattern.startsWith('*')) {
            return normalized.endsWith(pattern.slice(1));
        }
        return normalized.includes(pattern.toLowerCase());
    });
}

export class ContextBatcher {
    private maxTokensPerBatch: number;

    constructor(maxTokensPerBatch: number = 80000) {
        // Default to 80k tokens to leave room for system prompt and response
        this.maxTokensPerBatch = maxTokensPerBatch;
    }

    /**
     * Collect all relevant files from the workspace or specific path
     */
    async collectWorkspaceFiles(rootPath?: string): Promise<FileContext[]> {
        const files: FileContext[] = [];

        // Use provided path or fallback to workspace
        const targetPath = rootPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!targetPath) {
            return [];
        }

        // Strategy 1: External Path (Use FS)
        const isExternal = rootPath && (!vscode.workspace.workspaceFolders || !rootPath.startsWith(vscode.workspace.workspaceFolders[0].uri.fsPath));

        if (isExternal) {
            try {
                const filePaths = await this.scanDirectory(targetPath);
                for (const filePath of filePaths) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    // Skip very large files
                    if (content.length > 50000) continue;

                    const relativePath = path.relative(targetPath, filePath).replace(/\\/g, '/');

                    files.push({
                        path: filePath,
                        relativePath,
                        content,
                        language: getLanguage(filePath),
                        tokenEstimate: estimateTokens(content)
                    });
                }
            } catch (err) {
                console.error('Error scanning external directory:', err);
            }
        } else {
            // Strategy 2: Internal Workspace (Use VS Code API)
            try {
                // Build glob pattern for supported extensions
                const extensionPattern = `**/*{${SUPPORTED_EXTENSIONS.join(',')}}`;

                const uris = await vscode.workspace.findFiles(
                    extensionPattern,
                    '**/node_modules/**'
                );

                for (const uri of uris) {
                    // Logic from before
                    const filePath = uri.fsPath;
                    if (shouldIgnore(filePath)) continue;

                    try {
                        const document = await vscode.workspace.openTextDocument(uri);
                        const content = document.getText();
                        if (content.length > 50000 || content.trim().length === 0) continue;

                        const relativePath = path.relative(targetPath, filePath);
                        files.push({
                            path: filePath,
                            relativePath: relativePath.replace(/\\/g, '/'),
                            content,
                            language: getLanguage(filePath),
                            tokenEstimate: estimateTokens(content)
                        });
                    } catch (e) { console.warn('Failed to read file:', e); }
                }
            } catch (err) {
                console.error('Error using workspace.findFiles:', err);
            }
        }

        return files;
    }

    private async scanDirectory(dir: string): Promise<string[]> {
        const files: string[] = [];
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (shouldIgnore(fullPath)) continue;
                if (entry.isDirectory()) {
                    files.push(...await this.scanDirectory(fullPath));
                } else if (entry.isFile()) {
                    const ext = path.extname(fullPath).toLowerCase();
                    if (SUPPORTED_EXTENSIONS.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (e) {
            console.warn(`Skipping dir ${dir}:`, e);
        }
        return files;
    }

    /**
     * Batch files into chunks that fit within token limits
     */
    batchFiles(files: FileContext[]): BatchedContext[] {
        const batches: BatchedContext[] = [];
        let currentBatch: FileContext[] = [];
        let currentTokens = 0;
        let batchIndex = 0;

        // Sort files by importance (env files first, then by size)
        const sortedFiles = [...files].sort((a, b) => {
            // Prioritize sensitive files
            const aIsSensitive = a.relativePath.includes('.env') || a.relativePath.includes('config');
            const bIsSensitive = b.relativePath.includes('.env') || b.relativePath.includes('config');
            if (aIsSensitive && !bIsSensitive) return -1;
            if (!aIsSensitive && bIsSensitive) return 1;
            // Then by token count (smaller first)
            return a.tokenEstimate - b.tokenEstimate;
        });

        for (const file of sortedFiles) {
            // If adding this file would exceed the limit, start a new batch
            if (currentTokens + file.tokenEstimate > this.maxTokensPerBatch && currentBatch.length > 0) {
                batches.push({
                    files: currentBatch,
                    totalTokens: currentTokens,
                    batchIndex: batchIndex++
                });
                currentBatch = [];
                currentTokens = 0;
            }

            // If a single file is too large, it gets its own batch
            if (file.tokenEstimate > this.maxTokensPerBatch) {
                // Truncate content to fit
                const maxChars = this.maxTokensPerBatch * 4;
                const truncatedContent = file.content.substring(0, maxChars) + '\n// ... [TRUNCATED]';

                batches.push({
                    files: [{
                        ...file,
                        content: truncatedContent,
                        tokenEstimate: this.maxTokensPerBatch
                    }],
                    totalTokens: this.maxTokensPerBatch,
                    batchIndex: batchIndex++
                });
                continue;
            }

            currentBatch.push(file);
            currentTokens += file.tokenEstimate;
        }

        // Don't forget the last batch
        if (currentBatch.length > 0) {
            batches.push({
                files: currentBatch,
                totalTokens: currentTokens,
                batchIndex: batchIndex
            });
        }

        return batches;
    }

    /**
     * Format batch for LLM prompt
     */
    formatBatchForPrompt(batch: BatchedContext): string {
        const parts: string[] = [];

        for (const file of batch.files) {
            parts.push(`
### File: ${file.relativePath}
\`\`\`${file.language}
${file.content}
\`\`\`
`);
        }

        return parts.join('\n---\n');
    }

    /**
     * Get summary stats for logging
     */
    getStats(files: FileContext[], batches: BatchedContext[]): string {
        const totalFiles = files.length;
        const totalTokens = files.reduce((sum, f) => sum + f.tokenEstimate, 0);
        const totalBatches = batches.length;

        return `📊 Batcher Stats: ${totalFiles} files, ~${totalTokens.toLocaleString()} tokens, ${totalBatches} batch(es)`;
    }
}

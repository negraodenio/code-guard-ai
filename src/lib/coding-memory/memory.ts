import { createClient } from '@supabase/supabase-js';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs/promises';

export class CodingMemory {
    private get db() {
        return createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );
    }

    /**
     * Index a file by chunking it semantically (Functions/Classes)
     */
    async indexFile(repoId: string, filePath: string, content: string) {
        const chunks = this.semanticChunk(filePath, content);

        for (const chunk of chunks) {
            // Note: In production, we'd call an embedding API (OpenAI/SiliconFlow)
            // For now, we'll store the content and a placeholder embedding if not available
            await this.db.from('code_memory').insert({
                repo_id: repoId,
                file_path: filePath,
                chunk_type: chunk.type,
                content: chunk.content,
                metadata: {
                    start_line: chunk.startLine,
                    end_line: chunk.endLine,
                    name: chunk.name
                }
            });
        }
    }

    private semanticChunk(filePath: string, content: string) {
        const chunks: any[] = [];
        try {
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx', 'decorators-legacy']
            });

            const lines = content.split('\n');

            traverse(ast, {
                FunctionDeclaration: (path: any) => {
                    this.addChunk(chunks, 'function', path.node, lines, path.node.id?.name);
                },
                ClassDeclaration: (path: any) => {
                    this.addChunk(chunks, 'class', path.node, lines, path.node.id?.name);
                },
                ExportNamedDeclaration: (path: any) => {
                    if (path.node.declaration?.type === 'FunctionDeclaration') {
                        this.addChunk(chunks, 'function', path.node.declaration, lines, path.node.declaration.id?.name);
                    }
                }
            });
        } catch (e) {
            // Fallback: simple line-based chunking if AST fails
            const linesFallback = content.split('\n');
            chunks.push({
                type: 'config',
                content,
                startLine: 1,
                endLine: linesFallback.length
            });
        }
        return chunks;
    }

    private addChunk(chunks: any[], type: string, node: any, lines: string[], name?: string) {
        if (!node.loc) return;
        const start = node.loc.start.line;
        const end = node.loc.end.line;
        chunks.push({
            type,
            name,
            content: lines.slice(start - 1, end).join('\n'),
            startLine: start,
            endLine: end
        });
    }

    async querySimilar(repoId: string, codeSnippet: string) {
        // Search for existing similar patterns in memory to identify false positives
        const { data } = await this.db
            .from('code_memory')
            .select('content, metadata, file_path')
            .eq('repo_id', repoId)
            .limit(5); // In prod, use rpc('match_code_chunks')

        return data || [];
    }
}

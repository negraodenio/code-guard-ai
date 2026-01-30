import { createClient } from '@supabase/supabase-js';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

export interface RepoContext {
    type: 'library' | 'application' | 'api_spec' | 'cli';
    surface: 'core' | 'example' | 'test' | 'config';
    trustZone: 'production' | 'sandbox' | 'test';
    entryPoints: string[];
}

export class RepoIntelligence {
    private supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );

    /**
     * Deep analysis of the repository context
     */
    async analyzeContext(repoPath: string): Promise<RepoContext> {
        const type = await this.detectType(repoPath);
        const entryPoints = await this.findEntryPoints(repoPath, type);

        // Heuristic for the whole repo (can be overridden per file)
        return {
            type,
            surface: 'core',
            trustZone: 'production',
            entryPoints
        };
    }

    private async detectType(repoPath: string): Promise<RepoContext['type']> {
        try {
            const pkgPath = path.join(repoPath, 'package.json');
            const hasPkg = await fs.access(pkgPath).then(() => true).catch(() => false);

            if (hasPkg) {
                const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
                if (pkg.bin) return 'cli';
            }

            const swaggerFiles = await glob('**/*swagger*.{yaml,json}', { cwd: repoPath }) as any;
            const openApiFiles = await glob('**/*openapi*.{yaml,json}', { cwd: repoPath }) as any;
            if (swaggerFiles.length > 0 || openApiFiles.length > 0) return 'api_spec';

            const srcDir = path.join(repoPath, 'src');
            const libDir = path.join(repoPath, 'lib');
            const examplesDir = path.join(repoPath, 'examples');

            const hasSrc = await fs.access(srcDir).then(() => true).catch(() => false);
            const hasLib = await fs.access(libDir).then(() => true).catch(() => false);
            const hasExamples = await fs.access(examplesDir).then(() => true).catch(() => false);

            if (hasExamples && (hasSrc || hasLib)) return 'library';

            return 'application';
        } catch (e) {
            return 'application';
        }
    }

    async findEntryPoints(repoPath: string, type: string): Promise<string[]> {
        if (type === 'api_spec') return await glob('**/*openapi*.{yaml,json}', { cwd: repoPath });

        const commonEntries = [
            'src/index.ts', 'src/main.ts', 'src/app.ts',
            'index.js', 'main.js', 'app.js',
            'src/app/page.tsx', 'src/pages/index.tsx'
        ];

        const found = [];
        for (const entry of commonEntries) {
            if (await fs.access(path.join(repoPath, entry)).then(() => true).catch(() => false)) {
                found.push(entry);
            }
        }
        return found;
    }

    /**
     * Determine trust zone for a specific file
     */
    getTrustZone(filePath: string): RepoContext['trustZone'] {
        const normalized = filePath.toLowerCase();
        if (normalized.includes('test') || normalized.includes('spec')) return 'test';
        if (normalized.includes('example') || normalized.includes('demo') || normalized.includes('sample')) return 'sandbox';
        return 'production';
    }
}

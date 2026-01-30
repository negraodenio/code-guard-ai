import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export interface DataFlow {
    source: string;
    sinks: string[];
    transformations: string[];
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

export class DataLineageTracker {
    async trackLineage(code: string): Promise<DataFlow[]> {
        const flows: DataFlow[] = [];
        let currentSource: string | null = null;
        let sinks: string[] = [];
        let transformations: string[] = [];

        try {
            const ast = parse(code, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript']
            });

            const self = this;
            traverse(ast, {
                VariableDeclarator(path: any) {
                    const { id, init } = path.node;
                    if (id.type === 'Identifier' && init && self.isSensitiveSource(init)) {
                        currentSource = id.name;
                    }
                },
                CallExpression(path: any) {
                    const { callee } = path.node;
                    if (callee.type === 'Identifier' && ['mask', 'encrypt', 'hash', 'redact'].includes(callee.name)) {
                        transformations.push(callee.name);
                    }

                    if (self.isSink(path.node)) {
                        const sinkName = self.getSinkName(path.node);
                        sinks.push(sinkName);
                        if (currentSource) {
                            flows.push({
                                source: currentSource,
                                sinks: [...sinks],
                                transformations: [...transformations],
                                riskLevel: transformations.length > 0 ? 'low' : 'critical'
                            });
                            sinks = [];
                        }
                    }
                }
            });
        } catch (e) { }

        return flows;
    }

    private isSensitiveSource(node: any): boolean {
        const raw = JSON.stringify(node).toLowerCase();
        return raw.includes('cpf') || raw.includes('email') || raw.includes('password') || raw.includes('db.');
    }

    private isSink(node: any): boolean {
        const raw = JSON.stringify(node).toLowerCase();
        return raw.includes('console.log') || raw.includes('res.send') || raw.includes('fetch');
    }

    private getSinkName(node: any): string {
        const raw = JSON.stringify(node).toLowerCase();
        if (raw.includes('console.log')) return 'console.log';
        if (raw.includes('res.send')) return 'api.response';
        return 'external.http';
    }
}

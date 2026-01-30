import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export interface CostEstimate {
    service: string;
    resource: string;
    monthlyCostUSD: number;
    confidence: 'high' | 'medium' | 'low';
    optimization: string;
}

export class FinOpsAnalyzer {
    async analyzeCosts(code: string, traffic: number = 100000): Promise<{
        totalMonthlyEstimate: number;
        breakdown: CostEstimate[];
        alerts: string[];
    }> {
        const costs: CostEstimate[] = [];
        try {
            const ast = parse(code, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript']
            });

            const self = this;
            traverse(ast, {
                ForStatement(path: any) {
                    if (self.hasDatabaseCall(path.node.body)) {
                        costs.push({
                            service: 'RDS',
                            resource: 'db.t3.medium',
                            monthlyCostUSD: 450 * (traffic / 10000),
                            confidence: 'high',
                            optimization: 'Use DataLoader or JOIN to avoid N+1 queries in loops'
                        });
                    }
                },
                CallExpression(path: any) {
                    const { callee } = path.node;
                    if (callee.type === 'Identifier' && callee.name === 'handler' && !self.hasTimeout(path.node)) {
                        costs.push({
                            service: 'Lambda',
                            resource: 'Execution Time',
                            monthlyCostUSD: 50,
                            confidence: 'medium',
                            optimization: 'Configure explicit timeouts to prevent runaway costs'
                        });
                    }
                },
                MemberExpression(path: any) {
                    if (path.node.property.type === 'Identifier' && path.node.property.name === 'scan') {
                        costs.push({
                            service: 'DynamoDB',
                            resource: 'Read Capacity Units',
                            monthlyCostUSD: 120,
                            confidence: 'medium',
                            optimization: 'Use .query() with an Index instead of .scan()'
                        });
                    }
                }
            });
        } catch (e) { }

        const total = costs.reduce((acc, c) => acc + c.monthlyCostUSD, 0);
        return {
            totalMonthlyEstimate: total,
            breakdown: costs,
            alerts: total > 500 ? ['High infrastructure cost risk detected'] : []
        };
    }

    private hasDatabaseCall(node: any): boolean {
        const str = JSON.stringify(node);
        return /find|query|select|get|db\./i.test(str);
    }

    private hasTimeout(node: any): boolean {
        return JSON.stringify(node).includes('timeout');
    }
}

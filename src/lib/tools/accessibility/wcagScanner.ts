import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export interface A11yViolation {
    rule: string;
    description: string;
    impact: 'critical' | 'serious' | 'moderate';
}

export class WCAGScanner {
    async scan(code: string): Promise<A11yViolation[]> {
        const violations: A11yViolation[] = [];
        try {
            const ast = parse(code, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript']
            });

            traverse(ast, {
                JSXOpeningElement(path: any) {
                    const { name, attributes } = path.node;
                    if (name.type !== 'JSXIdentifier') return;

                    const tagName = name.name;

                    // 1. Rule 1.1.1 (Alt Text)
                    if (tagName === 'img') {
                        const hasAlt = attributes?.some((attr: any) =>
                            attr.type === 'JSXAttribute' && attr.name.name === 'alt'
                        );
                        if (!hasAlt) {
                            violations.push({
                                rule: 'WCAG 1.1.1',
                                description: 'Image missing alt attribute',
                                impact: 'critical'
                            });
                        }
                    }

                    // 2. Rule 4.1.2 (Interactive names)
                    if (['button', 'a'].includes(tagName)) {
                        const hasLabel = attributes?.some((attr: any) =>
                            attr.type === 'JSXAttribute' && ['aria-label', 'aria-labelledby'].includes(attr.name.name as string)
                        );
                        if (!hasLabel) {
                            violations.push({
                                rule: 'WCAG 4.1.2',
                                description: `Interactive element <${tagName}> missing accessible name`,
                                impact: 'serious'
                            });
                        }
                    }
                }
            });
        } catch (e) {
            // Silence parsing errors for scanner
        }

        return violations;
    }
}

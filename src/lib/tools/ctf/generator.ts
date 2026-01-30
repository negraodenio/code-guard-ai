export interface CTFChallenge {
    code: string;
    hints: string[];
    correctAnswers: any[];
    rewards: {
        badge: string;
        proCredits: number;
    };
}

export class ComplianceCTFGenerator {
    async generateChallenge(difficulty: 'junior' | 'senior'): Promise<CTFChallenge> {
        // In a real implementation, this would pull from a template library or use AI to generate.
        // We'll simulate the randomized behavior.
        const frameworks = ['LGPD', 'GDPR', 'PCI-DSS', 'FAPI-BR'];
        const vulnerabilities = ['shadow_api', 'pii_leak_logs', 'weak_encryption', 'missing_consent'];

        const selectedFramework = frameworks[Math.floor(Math.random() * frameworks.length)];
        const selectedVulnerability = vulnerabilities[Math.floor(Math.random() * vulnerabilities.length)];

        return {
            code: this.generateVulnerableCode(selectedFramework, selectedVulnerability),
            hints: [
                `Check how ${selectedFramework} handles data flow.`,
                `The vulnerability is related to ${selectedVulnerability}.`
            ],
            correctAnswers: [
                { type: selectedVulnerability, line: 10, framework: selectedFramework }
            ],
            rewards: {
                badge: difficulty === 'senior' ? 'Compliance Master' : 'Compliance Cadet',
                proCredits: difficulty === 'senior' ? 50 : 20
            }
        };
    }

    private generateVulnerableCode(framework: string, vulnerability: string): string {
        // Return a mock code snippet based on the vulnerability
        if (vulnerability === 'pii_leak_logs') {
            return `
function processUser(user) {
  // Processing user data
  console.log("Processing user: " + user.email); // Compliance Error!
  saveToDb(user);
}
      `;
        }
        return `// Code for ${framework} - ${vulnerability} scan...`;
    }
}

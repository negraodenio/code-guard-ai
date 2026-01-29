export class SiliconFlowClient {
  private apiKey: string;
  private baseUrl = 'https://api.siliconflow.cn/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async analyzeCompliance(code: string, frameworks: any[]) {
    if (!this.apiKey) return [];
    
    const prompt = `
Analise este código como um especialista em compliance. Identifique violações específicas para: ${frameworks.map(f => f.name).join(', ')}.

Código:
${code.substring(0, 3000)}

Responda APENAS em formato JSON array:
[
  {
    "severity": "critical|high|medium|low",
    "framework": "Nome do framework",
    "code": "Código da violação (ex: LGPD-ART-7)",
    "message": "Descrição técnica",
    "line": número_da_linha_ou_0,
    "fix": "Como corrigir"
  }
]
`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Extrai JSON da resposta
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (e) {
      console.error('AI analysis failed:', e);
      return [];
    }
  }
}

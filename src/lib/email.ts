import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, apiKey: string) {
    // Carregar o guia para anexo (opcional, mas profissional)
    let attachments = [];
    try {
        const guidePath = path.join(process.cwd(), 'MCP_GUIDE.md');
        if (fs.existsSync(guidePath)) {
            const content = fs.readFileSync(guidePath, 'utf8');
            attachments.push({
                filename: 'CodeGuard_MCP_Guide.md',
                content: content,
            });
        }
    } catch (e) {
        console.error('Erro ao anexar guia:', e);
    }

    const { data, error } = await resend.emails.send({
        from: 'CodeGuard AI <noreply@code-guard.eu>',
        to: email,
        replyTo: 'hello@code-guard.eu', // Respostas vão para o seu canal de suporte
        subject: 'Sua Chave CodeGuard Pro Chegou! 🛡️💎',
        attachments: attachments,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; background-color: #0f172a; color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                    .container { max-width: 600px; margin: 40px auto; background: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 20px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .content { padding: 40px 30px; line-height: 1.6; }
                    .welcome-text { font-size: 18px; color: #94a3b8; margin-bottom: 30px; text-align: center; }
                    .key-card { background: #0f172a; padding: 25px; border-radius: 12px; border: 1px dashed #3b82f6; margin: 20px 0; position: relative; }
                    .key-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #3b82f6; font-weight: 700; margin-bottom: 10px; display: block; }
                    .key-code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 16px; color: #60a5fa; word-break: break-all; margin: 0; }
                    
                    /* Tabela de Ferramentas */
                    .tools-table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #0f172a; border-radius: 8px; overflow: hidden; font-size: 13px; }
                    .tools-table th { background: #334155; padding: 12px; text-align: left; color: #3b82f6; }
                    .tools-table td { padding: 12px; border-bottom: 1px solid #334155; color: #cbd5e1; }

                    .steps { background: #334155; border-radius: 12px; padding: 25px; margin-top: 30px; }
                    .steps h3 { margin-top: 0; color: #f8fafc; font-size: 16px; }
                    .step-item { margin-bottom: 15px; display: flex; align-items: flex-start; }
                    .step-number { background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0; }
                    .step-text { color: #cbd5e1; font-size: 14px; margin: 0; }
                    .footer { padding: 30px; text-align: center; border-top: 1px solid #334155; color: #64748b; font-size: 12px; }
                    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; transition: all 0.2s; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>CodeGuard AI <span style="font-weight: 300;">PRO</span></h1>
                    </div>
                    <div class="content">
                        <p class="welcome-text">Sua infraestrutura agora está protegida pelo cérebro de compliance mais avançado do mercado.</p>
                        
                        <div class="key-card">
                            <span class="key-label">Sua Chave de Acesso Exclusiva</span>
                            <p class="key-code">${apiKey}</p>
                        </div>

                        <div class="steps">
                            <h3>🚀 Configuração Rápida (Cursor/Claude):</h3>
                            <div class="step-item">
                                <span class="step-number">1</span>
                                <p class="step-text">Adicione um novo servidor <b>SSE</b> nas configurações de MCP.</p>
                            </div>
                            <div class="step-item">
                                <span class="step-number">2</span>
                                <p class="step-text">Use o endpoint personalizado:<br><code style="color: #60a5fa;">https://code-guard.eu/api/mcp?apiKey=${apiKey}</code></p>
                            </div>
                        </div>

                        <h3 style="color: #f8fafc; font-size: 16px; margin-top: 30px;">🛠️ Ferramentas que você acaba de desbloquear:</h3>
                        <table class="tools-table">
                            <thead>
                                <tr><th>Ferramenta</th><th>Capacidade</th></tr>
                            </thead>
                            <tbody>
                                <tr><td><code>scan_compliance</code></td><td>Auditoria LGPD/BACEN/FAPI profundo.</td></tr>
                                <tr><td><code>estimate_infra_cost</code></td><td>FinOps: Previsão de custos AWS/N+1.</td></tr>
                                <tr><td><code>analyze_data_lineage</code></td><td>Mapeamento Source-to-Sink de PII.</td></tr>
                                <tr><td><code>check_accessibility</code></td><td>Varredura WCAG 2.2 AA.</td></tr>
                            </tbody>
                        </table>

                        <p style="color: #94a3b8; font-size: 13px; margin-top: 20px; font-style: italic;">
                            *Anexamos o guia completo <b>CodeGuard_MCP_Guide.md</b> a este email para sua referência.
                        </p>

                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://code-guard.eu/docs" class="btn">Centro de Documentação</a>
                        </div>
                    </div>
                    <div class="footer">
                        Responda a este email para suporte direto em <b>hello@code-guard.eu</b>.<br>
                        &copy; 2026 CodeGuard AI. Todos os direitos reservados.
                    </div>
                </div>
            </body>
            </html>
        `
    });

    if (error) {
        console.error('Failed to send welcome email:', error);
        throw error;
    }

    return data;
}

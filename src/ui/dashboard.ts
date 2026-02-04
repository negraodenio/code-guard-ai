
import { ComplianceReport } from '../report/types';

/**
 * SECURITY: HTML escaping utility to prevent XSS attacks
 * Escapes user-controlled data before inserting into HTML
 */
function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function getWebviewContent(report: ComplianceReport): string {
    const isPaid = report.plan !== 'FREE';
    const isTopTier = report.plan === 'PROFESSIONAL' || report.plan === 'ENTERPRISE';

    const effectivePlan = (report.plan === 'PROFESSIONAL' && (report as any).creditBalance > 0) ? 'CREDIT' : report.plan;
    const creditBalance = (report as any).creditBalance || 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>CodeGuard AI Compliance</title>
    <style>
        :root {
            --code-font: 'Consolas', 'Monaco', 'Courier New', monospace;
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); line-height: 1.6; }
        
        /* Banners */
        .banner { padding: 12px; border-radius: 6px; margin-bottom: 25px; text-align: center; font-weight: 500; }
        .banner.free { background-color: #e65100; color: white; border: 1px solid #ff9800; }
        .banner.paid { background-color: #2e7d32; color: white; }
        .banner.credit { background-color: #1565c0; color: white; border: 1px solid #42a5f5; }
        
        /* ... existing styles ... */
        .card { background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h2 { margin-top: 0; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 10px; font-size: 1.2em; }
        
        /* Compliance Grid */
        .compliance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; }
        .compliance-item { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); padding: 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
        .status-icon { font-size: 1.2em; }
        
        /* Table */
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.95em; }
        th { text-align: left; padding: 12px 8px; border-bottom: 2px solid var(--vscode-panel-border); color: var(--vscode-descriptionForeground); font-weight: 600; }
        td { padding: 10px 8px; border-bottom: 1px solid var(--vscode-panel-border); vertical-align: middle; }
        tr:nth-child(even) { background-color: var(--vscode-list-hoverBackground); }
        tr:hover { background-color: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
        
        /* Severity Badges */
        .badge { padding: 3px 8px; border-radius: 12px; font-size: 0.85em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge.CRITICAL { background-color: #d32f2f; color: white; }
        .badge.HIGH { background-color: #ef6c00; color: white; }
        .badge.MEDIUM { background-color: #fdd835; color: black; }
        .badge.LOW { background-color: #4caf50; color: white; }
        
        /* Buttons */
        button { border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 0.9em; transition: opacity 0.2s; }
        button:hover { opacity: 0.9; }
        .btn-fix { background-color: #007acc; color: white; }
        .btn-upgrade { background-color: #9c27b0; color: white; font-weight: bold; }
        .btn-primary { background-color: #007acc; color: white; padding: 10px 20px; font-size: 1em; }
        .btn-outline { background-color: transparent; border: 1px solid var(--vscode-button-background); color: var(--vscode-button-foreground); }

        /* Premium Card */
        .premium-card { background: linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(33, 150, 243, 0.1) 100%); border: 1px solid #9c27b0; }
        .premium-features { list-style: none; padding: 0; margin: 15px 0; }
        .premium-features li { margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
        
        /* Modern Premium Card */
        .premium-card-modern {
            background: linear-gradient(135deg, rgba(19, 55, 236, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%);
            border: 2px solid rgba(19, 55, 236, 0.3);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 8px 24px rgba(19, 55, 236, 0.15);
        }
        
        .premium-header { text-align: center; margin-bottom: 25px; }
        
        .premium-badge {
            display: inline-block;
            background: linear-gradient(135deg, #1337ec, #7c3aed);
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.75em;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        
        .comparison-table { margin: 25px 0; }
        
        .pricing-table { border: 1px solid var(--vscode-panel-border); border-radius: 8px; overflow: hidden; }
        .pricing-table th { background: var(--vscode-sideBar-background); padding: 12px; font-weight: 600; }
        .pricing-table td { padding: 12px; border-bottom: 1px solid var(--vscode-panel-border); }
        .pricing-table tr:last-child td { border-bottom: none; }
        
        .pricing-cta { text-align: center; margin-top: 30px; }
        
        .price-display { margin-bottom: 10px; }
        .price-amount {
            font-size: 3em;
            font-weight: 900;
            background: linear-gradient(135deg, #1337ec, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .price-period { font-size: 1em; color: var(--vscode-descriptionForeground); }
        
        .price-subtitle { 
            color: var(--vscode-descriptionForeground); 
            font-size: 0.9em; 
            margin: 5px 0 20px 0;
        }
        
        .btn-upgrade-modern {
            background: linear-gradient(135deg, #1337ec, #7c3aed);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 1.1em;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 16px rgba(19, 55, 236, 0.3);
        }
        
        .btn-upgrade-modern:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(19, 55, 236, 0.5);
        }
        
        .btn-icon { font-size: 1.2em; }
        .btn-text { letter-spacing: 0.5px; }
        
        .trust-badge {
            color: #4caf50;
            font-size: 0.85em;
            margin-top: 12px;
            font-weight: 600;
        }
        
        .urgency-message {
            background: rgba(255, 152, 0, 0.1);
            border: 1px solid rgba(255, 152, 0, 0.3);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            margin-top: 20px;
            font-size: 0.9em;
        }
        
        .hidden-count { text-align: center; color: var(--vscode-textLink-foreground); margin-top: 15px; font-style: italic; }
        a { color: var(--vscode-textLink-foreground); text-decoration: none; cursor: pointer; }
        a:hover { text-decoration: underline; }
        
        /* Code Preview */
        .preview-box { background: #1e1e1e; color: #d4d4d4; padding: 10px; border-radius: 4px; font-family: var(--code-font); margin-top: 5px; white-space: pre-wrap; font-size: 0.9em; border: 1px solid #333; display: none; }
        .preview-box.visible { display: block; animation: fadeIn 0.3s; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        
        .blurred { filter: blur(4px); user-select: none; opacity: 0.6; transition: filter 0.3s; }
        .blurred:hover { filter: blur(2px); cursor: pointer; }
        
        .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; color: #888; font-size: 0.8em; text-transform: uppercase; }
        .diff-add { color: #4caf50; }
        .diff-rem { color: #f44336; text-decoration: line-through; opacity: 0.7; }
    </style>
</head>
<body>

    <div class="banner ${isPaid ? (effectivePlan === 'CREDIT' ? 'credit' : 'paid') : 'free'}">
        Plan: <strong>${effectivePlan === 'CREDIT' ? 'PAY-PER-USE' : report.plan}</strong> 
        ${effectivePlan === 'CREDIT' ? `(Balance: ${creditBalance} credits)` : ''}
        ${!isPaid ? `<br><small>Showing max 5 violations. <a href="#" onclick="upgrade()">Upgrade for full coverage</a></small>` : ''}
    </div>

    <div class="card">
        <h2>📊 Executive Summary</h2>
        <p>${report.executiveSummary}</p>
        <div class="compliance-grid">
            ${renderComplianceItem('GDPR', report.complianceMapping.GDPR)}
            ${renderComplianceItem('LGPD', report.complianceMapping.LGPD)}
            ${renderComplianceItem('CCPA', report.complianceMapping.CCPA || '⚪ N/A')}
            ${renderComplianceItem('AI Act', report.complianceMapping.AI_ACT)}
        </div>
    </div>

    <div class="card">
        <h2>🔍 Detected Violations</h2>
        ${report.violations.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>SEVERITY</th>
                        <th>RULE</th>
                        <th>LINE</th>
                        <th>MESSAGE</th>
                        <th style="width: 140px;">ACTION</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.violations.map((v, i) => `
                        <tr>
                            <td><span class="badge ${v.severity}">${v.severity}</span></td>
                            <td><small>${escapeHtml(v.rule)}</small></td>
                            <td>${v.line}</td>
                            <td>${escapeHtml(v.message)}</td>
                            <td>
                                ${v.suggestedFix ?
            `<button class="btn-outline" onclick="togglePreview(${i})">👁️ Preview</button>` :
            (isPaid ? `<button class="btn-fix" onclick="fix('${v.message}')">Auto-Fix</button>` : `<button class="btn-upgrade" onclick="upgrade()">Upgrade</button>`)
        }
                            </td>
                        </tr>
                        ${v.suggestedFix ? `
                        <tr id="preview-row-${i}" style="display: none; background: rgba(0,0,0,0.2);">
                            <td colspan="5" style="padding: 15px;">
                                <div class="preview-header">
                                    <strong>Smart Fix Preview</strong>
                                    ${!isPaid ? '<span style="color: #ff9800;">🔒 LOCKED (UPGRADE TO APPLY)</span>' : '<span style="color: #4caf50;">✅ READY TO APPLY</span>'}
                                </div>
                                <div class="preview-box visible ${!isPaid ? 'blurred' : ''}" onclick="${!isPaid ? 'upgrade()' : ''}">
                                    <div class="diff-rem">- ${v.match}</div>
                                    <div class="diff-add">+ ${v.suggestedFix}</div>
                                </div>
                                ${!isPaid ? `
                                    <div style="text-align: center; margin-top: 10px;">
                                        <button class="btn-upgrade" onclick="upgrade()">🔓 Unlock Smart Fixes</button>
                                    </div>
                                ` : `
                                    <div style="text-align: right; margin-top: 10px;">
                                        <button class="btn-fix" onclick="applyFix('${v.suggestedFix}')">Apply Fix Now</button>
                                    </div>
                                `}
                            </td>
                        </tr>
                        ` : ''}
                    `).join('')}
                </tbody>
            </table>
            
           ${report.summaryCounts.total > report.violations.length ? `
                <div class="hidden-count">
                    ⚠️ <strong>${report.summaryCounts.total - report.violations.length} more violations hidden.</strong><br>
                    Upgrade to Professional to see all.
                </div>
            ` : ''}

        ` : '<p style="text-align: center; color: var(--vscode-disabledForeground);">✅ No obvious violations detected.</p>'}
    </div>

    ${!isPaid ? `
    <div class="premium-card-modern">
        <div class="premium-header">
            <div class="premium-badge">🚀 UPGRADE</div>
            <h2 style="margin: 15px 0 10px 0; font-size: 1.8em; font-weight: 900;">Unlock Full Compliance Power</h2>
            <p style="color: var(--vscode-descriptionForeground); font-size: 0.95em;">You're using the Free plan. Unlock enterprise-grade compliance scanning.</p>
        </div>

        <div class="comparison-table">
            <table class="pricing-table">
                <thead>
                    <tr>
                        <th style="text-align: left;">Feature</th>
                        <th style="text-align: center; color: #ff9800;">Free</th>
                        <th style="text-align: center; background: linear-gradient(135deg, #1337ec, #7c3aed); color: white; border-radius: 8px 8px 0 0;">Pro</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>GDPR Scans</strong></td>
                        <td style="text-align: center;">Max 5 results</td>
                        <td style="text-align: center; font-weight: bold; color: #4caf50;">✓ Unlimited</td>
                    </tr>
                    <tr>
                        <td><strong>Global Compliance (GDPR, LGPD, CCPA, AI Act)</strong></td>
                        <td style="text-align: center; color: #ef4444;">✗</td>
                        <td style="text-align: center; font-weight: bold; color: #4caf50;">✓ Full Support</td>
                    </tr>
                    <tr>
                        <td><strong>AI-Powered Deep Analysis</strong></td>
                        <td style="text-align: center; color: #ef4444;">✗</td>
                        <td style="text-align: center; font-weight: bold; color: #4caf50;">✓ Included</td>
                    </tr>
                    <tr>
                        <td><strong>Auto-Fix Violations</strong></td>
                        <td style="text-align: center; color: #ef4444;">✗</td>
                        <td style="text-align: center; font-weight: bold; color: #4caf50;">✓ One-Click</td>
                    </tr>
                    <tr>
                        <td><strong>Audit Reports (PDF)</strong></td>
                        <td style="text-align: center; color: #ef4444;">✗</td>
                        <td style="text-align: center; font-weight: bold; color: #4caf50;">✓ Export Ready</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="pricing-cta">
            <div class="price-display">
                <span class="price-amount">$49</span>
                <span class="price-period">/user/month</span>
            </div>
            <p class="price-subtitle">First 14 days free • Cancel anytime</p>
            <button class="btn-upgrade-modern" onclick="upgrade()">
                <span class="btn-icon">🔓</span>
                <span class="btn-text">Start Free Trial</span>
            </button>
            <p class="trust-badge">✓ No credit card required</p>
        </div>

        <div class="urgency-message">
            <span style="color: #ff9800; font-weight: 600;">⚡ Limited Offer:</span>
            First 100 beta testers get <strong>30% off</strong> for life.
        </div>
    </div>
    ` : ''}

    <script>
        const vscode = acquireVsCodeApi();
        
        function upgrade() { vscode.postMessage({ command: 'upgrade' }); }
        
        function fix(id) { vscode.postMessage({ command: 'fixViolation', id: id }); }
        
        function applyFix(code) { vscode.postMessage({ command: 'fixViolation', id: code }); }

        function togglePreview(index) {
            const row = document.getElementById('preview-row-' + index);
            if (row.style.display === 'none') {
                row.style.display = 'table-row';
            } else {
                row.style.display = 'none';
            }
        }
    </script>
</body>
</html>`;
}

function renderComplianceItem(name: string, status: string): string {
    const isRisk = status.includes('risk');
    const isAligned = status.includes('aligned');

    let icon = '⚪'; // Default/Not Applicable
    if (isRisk) icon = '⚠️';
    if (isAligned) icon = '✅';

    // Clean up status text
    const cleanStatus = status.replace('risk detected', 'Risk').replace('aligned', 'Aligned').replace('not applicable', 'N/A');

    return `
        <div class="compliance-item" style="border-left: 4px solid ${isRisk ? '#d32f2f' : (isAligned ? '#4caf50' : '#bdbdbd')}">
            <strong>${name}</strong>
            <span class="status-icon" title="${status}">${icon} <small>${cleanStatus}</small></span>
        </div>
    `;
}

/**
 * Generate webview content for Deep Compliance Audit results
 */
export function getComplianceAuditWebviewContent(result: any): string {
    const statusColors: Record<string, string> = {
        'pass': '#4caf50',
        'warn': '#ff9800',
        'fail': '#d32f2f'
    };

    const statusEmojis: Record<string, string> = {
        'pass': '✅',
        'warn': '⚠️',
        'fail': '❌'
    };

    const severityColors: Record<string, string> = {
        'High': '#d32f2f',
        'Alta': '#d32f2f',
        'Medium': '#ff9800',
        'Média': '#ff9800',
        'Low': '#4caf50',
        'Baixa': '#4caf50'
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>CodeGuard Compliance Audit Report</title>
    <style>
        :root {
            --primary: #007acc;
            --success: #4caf50;
            --warning: #ff9800;
            --danger: #d32f2f;
            --bg-dark: #1e1e1e;
            --bg-card: #252526;
            --border: #3c3c3c;
            --text: #cccccc;
            --text-muted: #888888;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-dark);
            color: var(--text);
            padding: 20px;
            line-height: 1.6;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid var(--border);
        }
        
        .header h1 {
            font-size: 1.5em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .header .logo {
            font-size: 1.8em;
        }
        
        .status-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.9em;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: var(--primary);
        }
        
        .stat-label {
            color: var(--text-muted);
            font-size: 0.85em;
            margin-top: 5px;
        }
        
        .framework-section {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        
        .framework-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: rgba(255,255,255,0.03);
            border-bottom: 1px solid var(--border);
            cursor: pointer;
        }
        
        .framework-header:hover {
            background: rgba(255,255,255,0.05);
        }
        
        .framework-name {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .framework-stats {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .issue-count {
            background: var(--danger);
            color: white;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 0.85em;
        }
        
        .issue-count.zero {
            background: var(--success);
        }
        
        .framework-body {
            padding: 15px 20px;
        }
        
        .issue-item {
            background: rgba(0,0,0,0.2);
            border-left: 3px solid var(--danger);
            padding: 12px 15px;
            margin-bottom: 10px;
            border-radius: 0 6px 6px 0;
        }
        
        .issue-item.medium {
            border-color: var(--warning);
        }
        
        .issue-item.low {
            border-color: var(--success);
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        
        .issue-title {
            font-weight: 500;
            flex: 1;
        }
        
        .severity-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75em;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .issue-meta {
            color: var(--text-muted);
            font-size: 0.85em;
            display: flex;
            gap: 15px;
            margin-bottom: 8px;
        }
        
        .issue-recommendation {
            background: rgba(0,122,204,0.1);
            border: 1px solid rgba(0,122,204,0.3);
            padding: 10px;
            border-radius: 4px;
            font-size: 0.9em;
            margin-top: 10px;
        }
        
        .issue-recommendation strong {
            color: var(--primary);
        }
        
        .code-fix {
            background: var(--bg-dark);
            border: 1px solid var(--border);
            padding: 10px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.85em;
            margin-top: 10px;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        
        .btn {
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            transition: opacity 0.2s;
        }
        
        .btn:hover { opacity: 0.8; }
        
        .btn-primary {
            background: var(--primary);
            color: white;
        }
        
        .btn-success {
            background: var(--success);
            color: white;
        }
        
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .summary-box {
            background: rgba(0,122,204,0.1);
            border: 1px solid var(--primary);
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
        }
        
        .timestamp {
            color: var(--text-muted);
            font-size: 0.85em;
            text-align: right;
            margin-top: 20px;
        }
        
    <style>
        /* ... existing styles ... */
        
        .certificate-container {
            background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(33, 150, 243, 0.1) 100%);
            border: 2px solid #4caf50;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            text-align: center;
            position: relative;
            overflow: hidden;
            animation: slideDown 0.5s ease-out;
        }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .cert-badge-icon {
            font-size: 3em;
            margin-bottom: 10px;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(76, 175, 80, 0.5));
        }

        .cert-title {
            font-size: 1.8em;
            font-weight: 800;
            background: linear-gradient(to right, #4caf50, #2196f3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .cert-desc {
            color: var(--text);
            margin-bottom: 20px;
            font-size: 1.1em;
        }

        .share-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn-social {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            color: white;
            font-size: 0.95em;
            text-decoration: none;
        }

        .btn-social:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            text-decoration: none;
        }

        .btn-linkedin { background: #0077b5; }
        .btn-twitter { background: #000000; border: 1px solid #333; }
        .btn-copy { background: #424242; border: 1px solid #666; }
        // ... existing styles ...
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); }
        .modal-content { background-color: var(--bg-card); margin: 10% auto; padding: 20px; border: 1px solid var(--border); width: 80%; max-width: 600px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); animation: slideDown 0.3s; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border); }
        .loader { border: 4px solid var(--bg-dark); border-top: 4px solid var(--primary); border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            background-color: #f00;
            animation: fall 3s linear infinite;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
</head>
<body>
    <div class="header">
        <div>
            <h1>
                <span class="logo">🛡️</span>
                CodeGuard Compliance Audit
            </h1>
            ${result.metadata?.clientName ? `<div style="color: var(--text-muted); font-size: 0.9em; margin-top: 5px;">Prepared for: <strong>${result.metadata.clientName}</strong> ${result.metadata.repoUrl ? `• ${result.metadata.repoUrl}` : ''}</div>` : ''}
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <button class="btn btn-primary" onclick="exportReport()">📥 Export Report</button>
            <span class="status-badge" style="background: ${statusColors[result.overall_status] || statusColors.fail}; color: white;">
                ${statusEmojis[result.overall_status] || '❌'} ${result.overall_status.toUpperCase()}
            </span>
        </div>
    </div>
    
    <!-- FIX PREVIEW MODAL -->
    <div id="fixModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>🔮 Fix Preview</h2>
                <span style="cursor: pointer; font-size: 1.5em;" onclick="closeModal()">×</span>
            </div>
            <div id="modalBody">
                <div class="loader"></div>
                <p style="text-align: center;">Generating intelligent fix with GPT-4o...</p>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="closeModal()">Cancel</button>
                <button id="btnConfirmFix" class="btn btn-success" style="display: none;" onclick="confirmFix()">✅ Apply Fix</button>
            </div>
        </div>
    </div>

    ${result.overall_status === 'pass' ? `
    <div class="certificate-container" id="successBanner">
        <div class="cert-badge-icon">🏆</div>
        <div class="cert-title">CERTIFIED COMPLIANT</div>
        <p class="cert-desc">This repository has passed all CodeGuard AI compliance & security checks.</p>
        
        <div class="share-actions">
            <a href="https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent('Just verified my code compliance with CodeGuard AI! 🛡️\n\nCertified secure and GDPR/LGPD compliant.\n\n#CodeGuard #DevSecOps #Compliance #CleanCode')}" target="_blank" class="btn-social btn-linkedin">
                <span>🔗</span> Share on LinkedIn
            </a>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('Just verified my code compliance with CodeGuard AI! 🛡️ Certified secure and GDPR/LGPD compliant. #CodeGuard #DevSecOps')}" target="_blank" class="btn-social btn-twitter">
                <span>𝕏</span> Share on X
            </a>
            <button class="btn-social btn-copy" onclick="copyBadge()">
                <span>📋</span> Copy Badge Markdown
            </button>
        </div>
    </div>
    ` : ''}
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${result.files_analyzed}</div>
            <div class="stat-label">Arquivos Analisados</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${result.frameworks_audited.length}</div>
            <div class="stat-label">Frameworks</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: ${result.total_issues > 0 ? 'var(--danger)' : 'var(--success)'}">${result.total_issues}</div>
            <div class="stat-label">Total Issues</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: ${result.critical_issues > 0 ? 'var(--danger)' : 'var(--success)'}">${result.critical_issues}</div>
            <div class="stat-label">Issues Críticas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${(result.execution_time_ms / 1000).toFixed(1)}s</div>
            <div class="stat-label">Tempo de Execução</div>
        </div>
    </div>
    
    ${result.results.map((fw: any) => `
        <div class="framework-section">
            <div class="framework-header" onclick="this.classList.toggle('collapsed')">
                <div class="framework-name">
                    <span class="expand-icon">▼</span>
                    ${statusEmojis[fw.status_overall] || '❌'} ${fw.frameworkName || fw.framework}
                </div>
                <div class="framework-stats">
                    <span class="issue-count ${fw.issues.length === 0 ? 'zero' : ''}">${fw.issues.length} issues</span>
                    <small style="color: var(--text-muted)">${fw.llm_used}</small>
                </div>
            </div>
            <div class="framework-body">
                ${fw.issues.length === 0 ? `
                    <div class="no-issues">✅ Nenhum problema detectado para este framework.</div>
                ` : fw.issues.map((issue: any) => {
        const severityClass = (issue.severity === 'High' || issue.severity === 'Alta') ? '' :
            (issue.severity === 'Medium' || issue.severity === 'Média') ? 'medium' : 'low';
        return `
                        <div class="issue-item ${severityClass}">
                            <div class="issue-header">
                                <div class="issue-title">${issue.issue}</div>
                                <span class="severity-badge" style="background: ${severityColors[issue.severity] || severityColors.Low}; color: white;">
                                    ${issue.severity}
                                </span>
                            </div>
                            <div class="issue-meta">
                                <span>📁 ${issue.file_path}</span>
                                ${issue.line_start ? `<span>📍 Linha ${issue.line_start}${issue.line_end && issue.line_end !== issue.line_start ? '-' + issue.line_end : ''}</span>` : ''}
                                ${issue.article || issue.control || issue.regulation ? `<span>📜 ${issue.article || issue.control || issue.regulation}</span>` : ''}
                            </div>
                            ${issue.recommendation ? `
                                <div class="issue-recommendation">
                                    <strong>💡 Recomendação:</strong> ${issue.recommendation}
                                </div>
                            ` : ''}
                            ${issue.code_fix ? `
                                <div class="code-fix">${issue.code_fix}</div>
                                <div class="actions">
                                    <button class="btn btn-success" onclick="applyFix('${encodeURIComponent(issue.code_fix)}', '${issue.file_path}')">✨ Aplicar Correção</button>
                                </div>
                            ` : ''}
                        </div>
                    `;
    }).join('')}
                
                ${fw.summary ? `
                    <div class="summary-box">
                        <strong>📋 Resumo:</strong> ${fw.summary}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('')}
    
    <div class="timestamp">
        Região: ${result.region} | Gerado em: ${new Date(result.timestamp).toLocaleString('pt-BR')}
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function applyFix(code, filePath) {
            vscode.postMessage({ 
                command: 'applyFix', 
                code: decodeURIComponent(code),
                filePath: filePath 
            });
        }
        
        function exportReport() {
            vscode.postMessage({ command: 'exportReport' });
        }

        function copyBadge() {
            const badgeMarkdown = '[![CodeGuard Compliance](https://img.shields.io/badge/CodeGuard-Certified-success?style=for-the-badge&logo=shield)](https://codeguard.ai)';
            navigator.clipboard.writeText(badgeMarkdown).then(() => {
                const btn = document.querySelector('.btn-copy');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span>✅</span> Copied!';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            });
        }
    </script>
</body>
</html>`;
}


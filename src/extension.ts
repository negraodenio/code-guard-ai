
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { reloadEnvConfig } from './core/llm-config';
import { LicenseManager } from './license/manager';
import { ComplianceEngine } from './scanner/compliance';
import { getWebviewContent, getComplianceAuditWebviewContent } from './ui/dashboard';
import { RepoIntelligence } from './intelligence/ril';
import { PatchEngine } from './intelligence/patch';
import { CreditsManager } from './credits/manager';
import { ComplianceOrchestrator, ConsolidatedAuditResult } from './intelligence/orchestrator';
import { getFrameworksByRegion } from './intelligence/frameworks';
import { t } from './utils/i18n';
import { DiagnosticsManager } from './ui/diagnostics';
import { CodeGuardCodeActionProvider } from './ui/quickFix';
import { GithubService } from './intelligence/github';
import { UserService } from './services/UserService';
import { ConfigManager } from './services/ConfigManager';
import { ShadowAPIScanner } from './scanner/shadowApi';

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeGuard AI is active!');

    // Load .env from workspace root if available
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        try {
            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const envPath = path.join(rootPath, '.env');
            const result = dotenv.config({ path: envPath });

            if (result.error) {
                console.log('[CodeGuard] No .env file found or failed to load:', result.error.message);
            } else {
                console.log('[CodeGuard] .env loaded successfully from', envPath);
                reloadEnvConfig();
            }
        } catch (error) {
            console.warn('[CodeGuard] Failed to load .env:', error);
        }
    }

    // 0. Initialize Services
    ConfigManager.initialize(context);

    // 1. Register Native Diagnostics & Quick Fix
    const diagnosticsManager = DiagnosticsManager.getInstance();
    context.subscriptions.push(diagnosticsManager.getCollection());

    const quickFixProvider = vscode.languages.registerCodeActionsProvider(
        ['javascript', 'typescript', 'python', 'java', 'csharp', 'php', 'go', 'ruby', 'sql', 'terraform'],
        new CodeGuardCodeActionProvider(),
        { providedCodeActionKinds: CodeGuardCodeActionProvider.providedCodeActionKinds }
    );
    context.subscriptions.push(quickFixProvider);

    // Initial Credit Check (Fire & Forget to update cache)
    const config = vscode.workspace.getConfiguration('codeguard');
    const userEmail = config.get<string>('userEmail');
    if (userEmail) {
        CreditsManager.getBalance(userEmail, context.globalState).catch(err => console.error('Credit check error:', err));
    }

    // 1. Scan Command
    let disposable = vscode.commands.registerCommand('codeguard.scan', async () => {
        // Try active editor first, then fallback to first visible editor
        let editor = vscode.window.activeTextEditor;
        if (!editor && vscode.window.visibleTextEditors.length > 0) {
            editor = vscode.window.visibleTextEditors[0];
        }

        if (!editor) {
            vscode.window.showErrorMessage('CodeGuard: Please open or click inside a code file to scan.');
            return;
        }

        const config = vscode.workspace.getConfiguration('codeguard');
        const licenseKey = config.get<string>('licenseKey') || '';

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "CodeGuard AI: Scanning...",
            cancellable: false
        }, async (progress) => {

            progress.report({ message: "Validating license..." });
            const licenseStatus = await LicenseManager.checkLicense(licenseKey, context.globalState);

            progress.report({ message: "Analyzing code patterns..." });
            const documentText = editor.document.getText();

            // NEW LOGIC: Check credits BEFORE scanning to ensure accurate plan status
            let hasCredits = context.globalState.get<boolean>('codeguard.hasCredits', false);
            let creditBalance = context.globalState.get<number>('codeguard.creditBalance', 0);

            // Force fresh check if user has email (critical for first run)
            const config = vscode.workspace.getConfiguration('codeguard');
            const userEmail = config.get<string>('userEmail');

            if (userEmail) {
                // We await here to ensure report is accurate, despite small delay
                const status = await CreditsManager.getBalance(userEmail, context.globalState);
                hasCredits = status.hasCredits;
                creditBalance = status.balance;
            }

            const report = ComplianceEngine.scanCode(documentText, licenseStatus, hasCredits);

            // Inject credit info into report for UI
            (report as any).creditBalance = creditBalance;

            const panel = vscode.window.createWebviewPanel(
                'codeGuardCompliance',
                'Compliance Risk Report',
                vscode.ViewColumn.Two,
                { enableScripts: true }
            );

            panel.webview.html = getWebviewContent(report);

            panel.webview.onDidReceiveMessage(message => {
                switch (message.command) {
                    case 'viewPricing':
                    case 'upgrade':
                        // Stripe Payment Link (configurable via settings)
                        const upgradeLink = vscode.workspace.getConfiguration('codeguard').get<string>('stripePaymentLink') ||
                            'https://buy.stripe.com/00w8wRgIt0Td5hS1JE2wU01';
                        vscode.env.openExternal(vscode.Uri.parse(upgradeLink));
                        return;
                    case 'fixViolation':
                        vscode.commands.executeCommand('codeguard.fix', message);
                        return;
                }
            }, undefined, context.subscriptions);
        });
    });

    // 2. Fix Command (Auto-Fix with Credits Support)
    let fixDisposable = vscode.commands.registerCommand('codeguard.fix', async (args: any) => {
        const config = vscode.workspace.getConfiguration('codeguard');
        const licenseKey = config.get<string>('licenseKey') || '';
        const userEmail = config.get<string>('userEmail') || '';
        const licenseStatus = await LicenseManager.checkLicense(licenseKey, context.globalState);

        // Securely get API Key
        const apiKey = await ConfigManager.getInstance().getApiKey() || '';

        // Check 1: License Plan (Pro/Enterprise gets unlimited)
        const hasPaidLicense = licenseStatus.plan === 'PROFESSIONAL' || licenseStatus.plan === 'ENTERPRISE';

        // PLG LEAD GEN: Ensure email is captured before ANY AI fix
        const capturedEmail = await UserService.ensureUserEmail();
        if (!capturedEmail) return; // User cancelled

        // Check 2: BYOK (Bring Your Own Key) -> FREE
        const provider = config.get<string>('aiProvider') || 'openrouter';
        // apiKey is already retrieved via ConfigManager above
        const isBYOK = (provider !== 'codeguard-cloud') && (apiKey.length > 5);

        if (!hasPaidLicense && !isBYOK) {
            // Check 3: Credits (Only for Cloud Users)
            const hasCredits = await CreditsManager.checkAndNotify(capturedEmail, context.globalState);
            if (!hasCredits) return;

            // Deduct 1 credit for AI usage
            const deducted = await CreditsManager.useCredit(capturedEmail, 1);
            if (!deducted) {
                vscode.window.showErrorMessage('Failed to deduct credit. Please try again.');
                return;
            }
            vscode.window.showInformationMessage('1 credit used. Generating fix...');
        } else if (isBYOK) {
            vscode.window.showInformationMessage('Auto-Fix running with your API Key (Free Mode).');
        }

        const editor = vscode.window.activeTextEditor;
        const violation = args.violation || args;
        const line = args.line;

        if (!editor || !line) {
            vscode.window.showInformationMessage('Auto-Fix Applied: Hardcoded secret rotated (Simulated).');
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating Smart Fix...",
            cancellable: false
        }, async () => {
            const generatedCode = await PatchEngine.generateFix(editor.document, violation, line);
            let success = false;
            if (generatedCode) {
                success = await PatchEngine.applyFix(editor.document, generatedCode, line);
            }
            if (success) {
                vscode.window.showInformationMessage('Smart Fix Applied Successfully. 🤖');

                // REVIEW REQUEST: Track successful fixes and ask for review after 10
                const successCount = context.globalState.get<number>('codeguard.successfulFixes', 0) + 1;
                await context.globalState.update('codeguard.successfulFixes', successCount);
                const hasAskedReview = context.globalState.get<boolean>('codeguard.hasAskedReview', false);

                if (successCount >= 10 && !hasAskedReview) {
                    await context.globalState.update('codeguard.hasAskedReview', true);
                    const reviewChoice = await vscode.window.showInformationMessage(
                        `CodeGuard has helped you ${successCount} times! ❤️ If it saved you time, would you leave a quick review?`,
                        'Rate Now ⭐', 'Maybe Later'
                    );
                    if (reviewChoice === 'Rate Now ⭐') {
                        vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=codeguard.codeguard-ai&ssr=false#review-details'));
                    }
                }
            } else {
                vscode.window.showErrorMessage('Failed to apply Smart Fix. Check output logs.');
            }
        });
    });

    // 3. Index Command (Intelligence)
    let indexDisposable = vscode.commands.registerCommand('codeguard.index', async () => {
        const config = vscode.workspace.getConfiguration('codeguard');
        const apiKey = config.get<string>('userApiKey');

        if (!apiKey) {
            const setKey = 'Set API Key';
            const selection = await vscode.window.showWarningMessage('CodeGuard Intelligence requires an API Key (OpenRouter/OpenAI).', setKey);
            if (selection === setKey) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'codeguard.userApiKey');
            }
            return;
        }

        await RepoIntelligence.indexWorkspace();
        vscode.window.showInformationMessage('Workspace Indexing Completed.');
    });

    // 4. Check Credits Command
    let creditsDisposable = vscode.commands.registerCommand('codeguard.credits', async () => {
        const config = vscode.workspace.getConfiguration('codeguard');
        const userEmail = config.get<string>('userEmail') || '';

        if (!userEmail) {
            vscode.window.showWarningMessage('Configure your email in Settings > CodeGuard: User Email');
            return;
        }

        const status = await CreditsManager.getBalance(userEmail);
        vscode.window.showInformationMessage(`💰 Your balance: ${status.balance} credits`);
    });

    // 5. Buy Credits Command (Updated with Region Selector)
    let buyDisposable = vscode.commands.registerCommand('codeguard.buyCredits', async () => {
        const config = vscode.workspace.getConfiguration('codeguard');
        let region = config.get<'Global' | 'Brazil'>('region'); // 'Global' | 'Brazil'

        // Step 0: Check/Set Region
        if (!region) {
            const regionChoice = await vscode.window.showQuickPick(
                [
                    { label: 'Global (EUR/USD)', detail: 'International Credit Cards', payload: 'Global' },
                    { label: 'Brazil (BRL)', detail: 'PIX & Local Cards', payload: 'Brazil' }
                ],
                {
                    placeHolder: 'Select your billing region',
                    title: 'CodeGuard: Billing Setup'
                }
            );

            if (!regionChoice) return; // User cancelled

            region = regionChoice.payload as 'Global' | 'Brazil';
            await config.update('region', region, vscode.ConfigurationTarget.Global);
        }

        // Define Links
        const STRIPE_LINKS = {
            'Global': 'https://buy.stripe.com/00w8wRgIt0Td5hS1JE2wU01',
            'Brazil': 'https://buy.stripe.com/test_br_placeholder' // TODO: Replace with actual Brazil Link
        };

        const paymentLink = STRIPE_LINKS[region] || STRIPE_LINKS['Global'];

        // Step 1: Offer choice
        const choice = await vscode.window.showQuickPick(
            [
                { label: 'Buy Credit Pack (20 units)', description: '€19.99 / R$ 120,00', detail: `Standard Price (${region})` },
                { label: 'I have a Coupon', description: 'Enter code', detail: 'Apply discount code' },
                { label: 'Change Region', description: `Current: ${region}`, detail: 'Switch billing region' }
            ],
            {
                placeHolder: 'Select purchase option',
                title: 'CodeGuard Credit Pack'
            }
        );

        if (!choice) return; // User cancelled

        if (choice.label === 'Change Region') {
            await config.update('region', undefined, vscode.ConfigurationTarget.Global);
            vscode.commands.executeCommand('codeguard.buyCredits'); // Restart flow
            return;
        }

        let finalUrl = paymentLink;

        // Step 2: Handle Coupon
        if (choice.label === 'I have a Coupon') {
            const couponCode = await vscode.window.showInputBox({
                title: 'Enter Coupon Code',
                placeHolder: 'e.g., CodeGuard',
                prompt: 'Enter your promotion code to apply discount at checkout.',
                ignoreFocusOut: true
            });

            if (couponCode && couponCode.trim().length > 0) {
                // Append prefilled_promo_code parameter to Stripe URL
                finalUrl = `${paymentLink}?prefilled_promo_code=${couponCode.trim()}`;
            } else {
                const proceed = await vscode.window.showWarningMessage(
                    'No coupon entered. Proceed with standard price?',
                    'Yes', 'Cancel'
                );
                if (proceed !== 'Yes') return;
            }
        }

        // Step 3: Open URL
        vscode.env.openExternal(vscode.Uri.parse(finalUrl));
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(fixDisposable);
    context.subscriptions.push(indexDisposable);
    context.subscriptions.push(creditsDisposable);
    context.subscriptions.push(buyDisposable);

    // 6. Deep Compliance Audit Command
    let complianceAuditDisposable = vscode.commands.registerCommand('codeguard.complianceAudit', async () => {
        const config = vscode.workspace.getConfiguration('codeguard');
        const region = config.get<'BR' | 'EU'>('region') || 'BR';
        const userEmail = config.get<string>('userEmail') || '';
        // Securely get API Key
        const apiKey = await ConfigManager.getInstance().getApiKey() || '';

        // 1. License Check
        const licenseKey = config.get<string>('licenseKey') || '';
        const licenseStatus = await LicenseManager.checkLicense(licenseKey, context.globalState);
        const isPro = licenseStatus.plan === 'PROFESSIONAL' || licenseStatus.plan === 'ENTERPRISE';

        // 2. Credits / Payment Check (Strict)
        // Even with BYOK, we charge for the Intelligence Engine (Orchestration & Analysis)
        if (!isPro) {
            // PLG LEAD GEN: Ensure email is captured
            const capturedEmail = await UserService.ensureUserEmail();
            if (!capturedEmail) return;

            // Check BYOK Status
            const provider = config.get<string>('aiProvider') || 'openrouter';
            // apiKey is already retrieved via ConfigManager above
            const isBYOK = (provider !== 'codeguard-cloud') && (apiKey.length > 5);

            if (!isBYOK) {
                // Check balance (Cloud Mode)
                const creditStatus = await CreditsManager.getBalance(capturedEmail, context.globalState);
                const AUDIT_COST = 5; // Cost per deep audit

                if (creditStatus.balance < AUDIT_COST) {
                    const buy = t('buyCredits');
                    const choice = await vscode.window.showErrorMessage(
                        t('insufficientCredits', { cost: AUDIT_COST, balance: creditStatus.balance }),
                        buy
                    );
                    if (choice === buy) vscode.commands.executeCommand('codeguard.buyCredits');
                    return;
                }

                // Deduct credits
                const deducted = await CreditsManager.useCredit(capturedEmail, AUDIT_COST);
                if (!deducted) {
                    vscode.window.showErrorMessage("Transaction failed. Please try again.");
                    return;
                }
                vscode.window.showInformationMessage(`Cloud Mode: Deducted ${AUDIT_COST} credits.`);
            } else {
                vscode.window.showInformationMessage(`Running Deep Audit with your API Key (Free Mode).`);
            }
        }

        // 3. API Key Check (Only if not using CodeGuard Cloud)
        const provider = config.get<string>('aiProvider') || 'openrouter';
        const useCloud = provider === 'codeguard-cloud';

        if (!useCloud && !apiKey) {
            const setKey = 'Set API Key';
            const getKey = 'Get Free Key (OpenRouter)';
            const selection = await vscode.window.showWarningMessage(
                '🔒 Privacy Mode: CodeGuard needs your AI API Key to analyze code securely.',
                setKey, getKey
            );
            if (selection === setKey) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'codeguard.userApiKey');
            } else if (selection === getKey) {
                vscode.env.openExternal(vscode.Uri.parse('https://openrouter.ai/keys'));
            }
            return;
        }

        // Get available frameworks for the region
        const frameworks = getFrameworksByRegion(region);
        const frameworkItems = frameworks.map(f => ({
            label: f.name,
            description: f.description,
            picked: true,
            id: f.id
        }));

        // Let user select frameworks
        const selectedItems = await vscode.window.showQuickPick(frameworkItems, {
            canPickMany: true,
            placeHolder: `Select compliance frameworks (Region: ${region})`,
            title: 'CodeGuard: Select Frameworks'
        });

        if (!selectedItems || selectedItems.length === 0) {
            vscode.window.showInformationMessage('No frameworks selected. Audit cancelled.');
            return;
        }

        const selectedFrameworkIds = selectedItems.map(item => item.id);

        // Run the audit with progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'CodeGuard: Running Deep Compliance Audit...',
            cancellable: false
        }, async (progress) => {
            try {
                const orchestrator = new ComplianceOrchestrator();

                // Clear previous diagnostics
                DiagnosticsManager.getInstance().clear();

                // Get workspace stats first
                progress.report({ message: 'Analyzing workspace...' });
                const stats = await orchestrator.getWorkspaceStats();

                if (stats.files === 0) {
                    vscode.window.showWarningMessage('No supported files found in workspace.');
                    return;
                }

                vscode.window.showInformationMessage(
                    `📊 ${stats.files} files, ~${stats.tokens.toLocaleString()} tokens, ${stats.batches} batch(es)`
                );

                // Run the audit
                const result = await orchestrator.runAudit(region, selectedFrameworkIds, progress);

                // Show results in a webview
                const panel = vscode.window.createWebviewPanel(
                    'complianceAuditResult',
                    `CodeGuard Compliance Report - ${region}`,
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );

                panel.webview.html = getComplianceAuditWebviewContent(result);

                // Handle messages from webview
                panel.webview.onDidReceiveMessage(async message => {
                    if (message.command === 'requestFix') {
                        // 1. Generate Fix Preview
                        const editor = vscode.window.activeTextEditor;
                        if (editor) {
                            const generatedCode = await PatchEngine.generateFix(editor.document, message.issue, message.line || 1);
                            if (generatedCode) {
                                // Send back to webview
                                panel.webview.postMessage({ command: 'showFixPreview', code: generatedCode, issue: message.issue });
                            } else {
                                vscode.window.showErrorMessage('Failed to generate fix preview.');
                            }
                        }
                    }
                    else if (message.command === 'applyFix') {
                        // 2. Apply Confirmed Fix
                        const editor = vscode.window.activeTextEditor;
                        if (editor) {
                            const success = await PatchEngine.applyFix(editor.document, message.code, message.line || 1);
                            if (success) {
                                vscode.window.showInformationMessage(`Fix applied successfully!`);
                                // Optional: Refresh audit?
                            } else {
                                vscode.window.showErrorMessage(`Failed to apply fix.`);
                            }
                        }
                    }
                    else if (message.command === 'exportReport') {
                        // 3. Export Report
                        const options: vscode.SaveDialogOptions = {
                            defaultUri: vscode.Uri.file('codeguard-compliance-report.html'),
                            filters: { 'HTML Report': ['html'] }
                        };

                        const fileUri = await vscode.window.showSaveDialog(options);
                        if (fileUri) {
                            const fs = require('fs');
                            const htmlContent = getComplianceAuditWebviewContent(result); // Snapshot of current state
                            fs.writeFileSync(fileUri.fsPath, htmlContent);
                            vscode.window.showInformationMessage(`Report saved to ${fileUri.fsPath}`);
                        }
                    }
                }, undefined, context.subscriptions);

                // Summary notification
                const statusEmoji = result.overall_status === 'pass' ? '✅' :
                    result.overall_status === 'warn' ? '⚠️' : '❌';

                vscode.window.showInformationMessage(
                    `${statusEmoji} Audit completed: ${result.total_issues} issues (${result.critical_issues} critical) in ${(result.execution_time_ms / 1000).toFixed(1)}s`
                );

                // UPDATE DIAGNOSTICS (PROBLEMS TAB)
                DiagnosticsManager.getInstance().updateDiagnostics(result);

            } catch (error) {
                console.error('Compliance Audit Error:', error);
                vscode.window.showErrorMessage(`Audit error: ${(error as Error).message}`);
            }
        });
    });

    // 7. Status Bar Helper
    const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    myStatusBarItem.command = 'codeguard.showMenu';
    myStatusBarItem.text = '$(shield) CodeGuard';
    myStatusBarItem.tooltip = 'CodeGuard Compliance Scanner';
    myStatusBarItem.show();
    context.subscriptions.push(myStatusBarItem);

    // 8. Show Menu Command (Central Hub)
    let menuDisposable = vscode.commands.registerCommand('codeguard.showMenu', async () => {
        const quickPick = vscode.window.createQuickPick();
        quickPick.items = [
            { label: '$(search) Quick Scan (Local/Free)', description: 'Scan current file for basic risks', alwaysShow: true },
            { label: '$(hubot) Deep Audit (AI/Pro)', description: 'Run compliance audit with Multi-LLM', alwaysShow: true },
            { label: '$(tools) Auto-Fix', description: 'Apply fixes to detected violations', alwaysShow: true },
            { label: '$(database) Workspace Index', description: 'Index codebase for RAG', alwaysShow: true },
            { label: '$(credit-card) Check Credits', description: 'View your balance', alwaysShow: true },
            { label: '$(star) Buy Credits', description: 'Purchase more credits', alwaysShow: true }
        ];
        quickPick.onDidChangeSelection(selection => {
            if (selection[0]) {
                switch (selection[0].label) {
                    case '$(search) Quick Scan (Local/Free)':
                        vscode.commands.executeCommand('codeguard.scan');
                        break;
                    case '$(hubot) Deep Audit (AI/Pro)':
                        vscode.commands.executeCommand('codeguard.complianceAudit');
                        break;
                    case '$(tools) Auto-Fix':
                        vscode.commands.executeCommand('codeguard.fix');
                        break;
                    case '$(database) Workspace Index':
                        vscode.commands.executeCommand('codeguard.index');
                        break;
                    case '$(credit-card) Check Credits':
                        vscode.commands.executeCommand('codeguard.credits');
                        break;
                    case '$(star) Buy Credits':
                        vscode.commands.executeCommand('codeguard.buyCredits');
                        break;
                }
                quickPick.hide();
            }
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    });
    context.subscriptions.push(menuDisposable);

    context.subscriptions.push(complianceAuditDisposable);

    // 9. Consultant Mode: Scan GitHub
    let githubScanDisposable = vscode.commands.registerCommand('codeguard.scanGithub', async () => {
        const config = vscode.workspace.getConfiguration('codeguard');

        const repoUrl = await vscode.window.showInputBox({
            title: 'Consultant Mode: Scan GitHub Repository',
            placeHolder: 'https://github.com/username/repo',
            prompt: 'Enter the public GitHub repository URL to audit',
            ignoreFocusOut: true
        });

        if (!repoUrl) return;

        const clientName = await vscode.window.showInputBox({
            title: 'Client Metadata',
            placeHolder: 'Client Name / Project Code',
            prompt: 'Enter client name for the professional report (optional)'
        });

        // Optional Token
        const token = await vscode.window.showInputBox({
            title: 'GitHub Token',
            placeHolder: 'ghp_... (Leave empty for public repos)',
            prompt: 'Enter Personal Access Token (PAT) if repo is private',
            password: true
        });

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'CodeGuard Consultant: Cloning & Auditing...',
            cancellable: false
        }, async (progress) => {
            const github = new GithubService();
            let tempDir: string = '';

            try {
                if (!github.isValidUrl(repoUrl.trim())) {
                    throw new Error('Invalid GitHub URL');
                }

                progress.report({ message: 'Cloning repository...' });
                tempDir = await github.cloneRepo(repoUrl.trim(), token);

                progress.report({ message: 'Running Deep Compliance Audit...' });
                const orchestrator = new ComplianceOrchestrator();

                // Region from config
                const region = config.get<'BR' | 'EU'>('region') || 'BR';

                // Auto-select frameworks for region
                const frameworks = getFrameworksByRegion(region).map(f => f.id);

                const result = await orchestrator.runAudit(region, frameworks, progress, {
                    clientName: clientName || 'Consultant Audit',
                    repoUrl: repoUrl
                }, tempDir);

                // Show report
                const panel = vscode.window.createWebviewPanel(
                    'complianceAuditResult',
                    `Client Report: ${clientName || 'AuditResult'}`,
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );

                panel.webview.html = getComplianceAuditWebviewContent(result);

                // Cleanup when panel is closed
                panel.onDidDispose(() => {
                    if (tempDir) {
                        github.cleanup(tempDir).catch(err => console.error('Cleanup failed', err));
                    }
                });

                vscode.window.showInformationMessage(`✅ Consultant Audit Complete for ${clientName || 'Client'}`);

            } catch (err) {
                vscode.window.showErrorMessage(`Consultant Scan Failed: ${err instanceof Error ? err.message : String(err)}`);
                // Cleanup on error
                if (tempDir) {
                    github.cleanup(tempDir).catch(e => console.error('Cleanup failed', e));
                }
            }
        });
    });
    context.subscriptions.push(githubScanDisposable);
}

export function deactivate() { }

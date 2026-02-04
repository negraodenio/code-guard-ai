import * as vscode from 'vscode';
import * as https from 'https';

export class UserService {
    private static readonly CONFIG_SECTION = 'codeguard';
    private static readonly EMAIL_CONFIG = 'userEmail';
    private static readonly LEADS_ENDPOINT = 'https://api.code-guard.eu/leads'; // Mock endpoint

    /**
     * Ensures the user has provided an email address.
     * If not, prompts the user to enter it.
     * Returns the email if available, or undefined if the user cancelled.
     */
    public static async ensureUserEmail(): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        let email = config.get<string>(this.EMAIL_CONFIG);

        if (email && email.trim().length > 0) {
            return email;
        }

        // Prompt user
        const input = await vscode.window.showInputBox({
            title: 'CodeGuard AI: Unlock Auto-Fix',
            prompt: 'Please enter your work email to unlock AI Auto-Fix & Deep Audit features (Free / BYOK).',
            placeHolder: 'name@company.com',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value.includes('@')) {
                    return 'Please enter a valid email address';
                }
                return null;
            }
        });

        if (input) {
            // Save to config
            await config.update(this.EMAIL_CONFIG, input, vscode.ConfigurationTarget.Global);

            // Send to backend (Fire and forget)
            this.sendLead(input).catch(err => console.error('Failed to send lead:', err));

            vscode.window.showInformationMessage(`CodeGuard: AI features unlocked for ${input}!`);
            return input;
        }

        return undefined;
    }

    private static async sendLead(email: string): Promise<void> {
        // Hardcoded credentials for the EXTENSION (Client-side)
        // This allows any user of the plugin to insert into YOUR leads table
        // These are public/anon keys, safe for client-side use with RLS enabled
        const SUPABASE_URL = 'https://pslkphlxfpvbvybbekee.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbGtwaGx4ZnB2YnZ5YmJla2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjE2NzcsImV4cCI6MjA4NDM5NzY3N30.02RjG3--VHqI4yVv9RfMsu1OrjF4KakcQZ1cpKTYFe0';

        return new Promise(async (resolve) => {
            try {
                // Dynamic import to avoid strict dependency issues if not bundled perfectly
                const { createClient } = require('@supabase/supabase-js');

                const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                const { error } = await supabase
                    .from('leads')
                    .insert({
                        email: email,
                        source: 'vscode-extension-plg',
                        version: vscode.extensions.getExtension('codeguard.codeguard-ai')?.packageJSON.version || '1.0.0'
                    });

                if (error) {
                    console.error('[LeadGen] Supabase Insert Error:', error);
                } else {
                    console.log('[LeadGen] Lead saved to Supabase!');
                }
                resolve();
            } catch (error) {
                console.error('[LeadGen] Failed to initialize Supabase:', error);
                resolve();
            }
        });
    }
}

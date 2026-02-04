// Bolt App - Full example with auto-save scan
import { useState, useEffect, useCallback } from 'react';
import { CodeGuardClient, ScanResult } from './client';

// Initialize client
const CODEGUARD_API_KEY = import.meta.env.VITE_CODEGUARD_API_KEY || '';
const codeguard = new CodeGuardClient({ apiKey: CODEGUARD_API_KEY });

interface File {
    id: string;
    name: string;
    content: string;
    lastScanned?: Date;
    scanResult?: ScanResult;
}

const DEFAULT_CODE = `// User controller with LGPD compliance issues
import { Request, Response } from 'express';
import { db } from './database';

export async function createUser(req: Request, res: Response) {
  const { name, email, cpf, password } = req.body;
  
  // ISSUE: Storing plain text password (LGPD violation)
  // ISSUE: No consent tracking for data processing
  // ISSUE: CPF stored without encryption
  
  const user = await db.users.create({
    data: {
      name,
      email,
      cpf, // Sensitive data - should be encrypted
      password, // Critical - must be hashed
      createdAt: new Date()
    }
  });
  
  res.json(user);
}`;

export default function App() {
    const [files, setFiles] = useState<File[]>([
        { id: '1', name: 'userController.ts', content: DEFAULT_CODE }
    ]);
    const [activeFileId, setActiveFileId] = useState('1');
    const [saving, setSaving] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [credits, setCredits] = useState(0);
    const [showSettings, setShowSettings] = useState(false);

    const activeFile = files.find(f => f.id === activeFileId)!;

    // Load credits on mount
    useEffect(() => {
        loadCredits();
    }, []);

    const loadCredits = async () => {
        const balance = await codeguard.getCredits();
        setCredits(balance);
    };

    // Scan file
    const scanFile = async (file: File) => {
        if (scanning) return;

        setScanning(true);

        try {
            const result = await codeguard.scan({
                content: file.content,
                filename: file.name,
            });

            setFiles(prev => prev.map(f =>
                f.id === file.id
                    ? { ...f, lastScanned: new Date(), scanResult: result }
                    : f
            ));

            await loadCredits();
        } catch (error) {
            console.error('Scan failed:', error);
        } finally {
            setScanning(false);
        }
    };

    // Save & Scan
    const handleSave = useCallback(async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 500)); // Simulate save
        setSaving(false);
        await scanFile(activeFile);
    }, [activeFile]);

    const updateFileContent = (content: string) => {
        setFiles(prev => prev.map(f =>
            f.id === activeFileId ? { ...f, content } : f
        ));
    };

    const getStatusIcon = (file: File) => {
        if (!file.scanResult) return '🔘';
        if (file.scanResult.report.summary.total === 0) return '✅';
        return '⚠️';
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1a1a2e',
            color: 'white',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            {/* Header */}
            <header style={{
                height: '56px',
                backgroundColor: '#16213e',
                borderBottom: '1px solid #0f3460',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>🛡️</span>
                    <h1 style={{ fontSize: '18px', fontWeight: 'bold' }}>Bolt + CodeGuard</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                        💳 {credits} credits
                    </span>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        style={{
                            padding: '8px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px'
                        }}
                    >
                        ⚙️
                    </button>
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex' }}>
                {/* Sidebar */}
                <aside style={{
                    width: '256px',
                    backgroundColor: '#16213e',
                    borderRight: '1px solid #0f3460'
                }}>
                    <div style={{ padding: '12px' }}>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#64748b',
                            textTransform: 'uppercase',
                            marginBottom: '8px'
                        }}>
                            Files
                        </div>
                        {files.map(file => (
                            <button
                                key={file.id}
                                onClick={() => setActiveFileId(file.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: activeFileId === file.id ? '#3b82f6' : 'transparent',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    textAlign: 'left'
                                }}
                            >
                                <span>📄</span>
                                <span style={{ flex: 1 }}>{file.name}</span>
                                <span>{getStatusIcon(file)}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Editor */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Toolbar */}
                    <div style={{
                        height: '40px',
                        backgroundColor: '#16213e',
                        borderBottom: '1px solid #0f3460',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94a3b8' }}>
                            {saving && <span>💾 Saving...</span>}
                            {scanning && <span style={{ color: '#3b82f6' }}>🔍 Scanning...</span>}
                            {activeFile.lastScanned && !scanning && (
                                <span style={{ color: '#22c55e' }}>
                                    ✓ Scanned {activeFile.lastScanned.toLocaleTimeString()}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving || scanning}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: '#3b82f6',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                opacity: saving || scanning ? 0.5 : 1
                            }}
                        >
                            Save & Scan
                        </button>
                    </div>

                    {/* Editor + Results */}
                    <div style={{ flex: 1, display: 'flex' }}>
                        {/* Code Editor */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            <textarea
                                value={activeFile.content}
                                onChange={(e) => updateFileContent(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: '#1a1a2e',
                                    color: '#e2e8f0',
                                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                    fontSize: '14px',
                                    padding: '16px',
                                    border: 'none',
                                    resize: 'none',
                                    outline: 'none'
                                }}
                                spellCheck={false}
                            />
                        </div>

                        {/* Scan Results Panel */}
                        {activeFile.scanResult && (
                            <div style={{
                                width: '320px',
                                backgroundColor: '#16213e',
                                borderLeft: '1px solid #0f3460',
                                overflowY: 'auto'
                            }}>
                                <div style={{ padding: '16px' }}>
                                    <h3 style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        {activeFile.scanResult.report.summary.total === 0 ? (
                                            <><span style={{ color: '#22c55e' }}>✅</span> Compliant</>
                                        ) : (
                                            <><span style={{ color: '#ef4444' }}>⚠️</span> {activeFile.scanResult.report.summary.total} Issues</>
                                        )}
                                    </h3>

                                    {activeFile.scanResult.report.violations.map((v, i) => (
                                        <div key={i} style={{
                                            marginBottom: '12px',
                                            padding: '12px',
                                            backgroundColor: '#1a1a2e',
                                            borderRadius: '8px',
                                            fontSize: '14px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: v.severity === 'critical' ? '#dc2626' :
                                                        v.severity === 'high' ? '#ea580c' : '#ca8a04'
                                                }}>
                                                    {v.severity}
                                                </span>
                                                <span style={{ color: '#94a3b8' }}>Line {v.line}</span>
                                            </div>
                                            <p style={{ color: '#e2e8f0', marginBottom: '8px' }}>{v.message}</p>
                                            <p style={{ color: '#22c55e', fontSize: '12px' }}>{v.suggestion}</p>
                                        </div>
                                    ))}

                                    <div style={{
                                        marginTop: '16px',
                                        paddingTop: '16px',
                                        borderTop: '1px solid #0f3460',
                                        fontSize: '12px',
                                        color: '#64748b'
                                    }}>
                                        Used {activeFile.scanResult.credits_used} credits
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#16213e',
                        borderRadius: '12px',
                        padding: '24px',
                        width: '384px'
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Settings</h2>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '4px' }}>
                                CodeGuard API Key
                            </label>
                            <input
                                type="password"
                                value={CODEGUARD_API_KEY}
                                readOnly
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: '#1a1a2e',
                                    border: '1px solid #0f3460',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <button
                            onClick={() => setShowSettings(false)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                backgroundColor: '#3b82f6',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// CodeGuardPanel.tsx - Full compliance panel for v0/Vercel
'use client';

import { useState, useCallback } from 'react';

interface Violation {
    id: string;
    line: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    ruleId: string;
    message: string;
    article?: string;
    suggestion: string;
    codeSnippet: string;
    fixable: boolean;
}

interface ScanResult {
    success: boolean;
    scan_id: string;
    credits_used: number;
    credits_remaining: number;
    duration_ms: number;
    report: {
        file: string;
        summary: {
            total: number;
            critical: number;
            high: number;
            medium: number;
            low: number;
            fixable: number;
        };
        violations: Violation[];
    };
    patches?: Array<{
        id: string;
        violation_id: string;
        diff: string;
        explanation: string;
    }>;
}

interface CodeGuardPanelProps {
    defaultCode?: string;
    defaultFilename?: string;
    onViolationFound?: (count: number) => void;
    onCompliant?: () => void;
}

export function CodeGuardPanel({
    defaultCode = '',
    defaultFilename = 'example.ts',
    onViolationFound,
    onCompliant
}: CodeGuardPanelProps) {
    const [code, setCode] = useState(defaultCode);
    const [filename, setFilename] = useState(defaultFilename);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedViolation, setExpandedViolation] = useState<string | null>(null);
    const [applyingPatch, setApplyingPatch] = useState<string | null>(null);

    const scan = useCallback(async () => {
        if (!code.trim()) {
            setError('Please enter some code to scan');
            return;
        }

        setScanning(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/codeguard/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    filename,
                    frameworks: ['lgpd', 'gdpr', 'owasp'],
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Scan failed');
            }

            setResult(data);

            if (data.report.summary.total > 0) {
                onViolationFound?.(data.report.summary.total);
            } else {
                onCompliant?.();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setScanning(false);
        }
    }, [code, filename, onViolationFound, onCompliant]);

    const applyPatch = async (patchId: string) => {
        setApplyingPatch(patchId);

        try {
            const response = await fetch('/api/codeguard/patch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patch_id: patchId,
                    original_code: code,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setCode(data.patched_code);
                await scan();
            }
        } catch (err) {
            setError(`Failed to apply patch: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setApplyingPatch(null);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h2 className="text-xl font-bold text-white">CodeGuard Compliance</h2>
                    </div>
                    {result && (
                        <div className="text-sm text-white/90">
                            {result.credits_used} credits used • {result.credits_remaining} remaining
                        </div>
                    )}
                </div>
            </div>

            {/* Input Section */}
            <div className="p-6 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Filename
                        </label>
                        <input
                            type="text"
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="example.ts"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={scan}
                            disabled={scanning || !code.trim()}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {scanning ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Scan Code
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code
                    </label>
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        rows={12}
                        className="w-full px-4 py-3 font-mono text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                        placeholder="// Paste your code here..."
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="border-t border-gray-200">
                    {/* Summary */}
                    <div className="p-6 bg-gray-50">
                        {result.report.summary.total === 0 ? (
                            <div className="flex items-center justify-center gap-3 py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-green-700">All Clear!</h3>
                                    <p className="text-green-600">No compliance violations found.</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Scanned in {result.duration_ms}ms
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {result.report.summary.total} Violations Found
                                            </h3>
                                            <p className="text-gray-600">
                                                {result.report.summary.critical} critical, {result.report.summary.high} high priority
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Fixable</div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {result.report.summary.fixable}
                                        </div>
                                    </div>
                                </div>

                                {/* Severity Breakdown */}
                                <div className="grid grid-cols-4 gap-3">
                                    {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
                                        <div
                                            key={sev}
                                            className={`p-3 rounded-lg border ${getSeverityColor(sev)}`}
                                        >
                                            <div className="text-2xl font-bold">
                                                {result.report.summary[sev]}
                                            </div>
                                            <div className="text-xs uppercase font-medium opacity-75">
                                                {sev}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Violations List */}
                    {result.report.violations.length > 0 && (
                        <div className="p-6 space-y-3">
                            <h4 className="font-semibold text-gray-900">Details</h4>

                            {result.report.violations.map((violation) => (
                                <div
                                    key={violation.id}
                                    className="border border-gray-200 rounded-lg overflow-hidden"
                                >
                                    <button
                                        onClick={() => setExpandedViolation(
                                            expandedViolation === violation.id ? null : violation.id
                                        )}
                                        className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition"
                                    >
                                        <div className="flex items-center gap-3 text-left">
                                            <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(violation.severity)}`}>
                                                {violation.severity}
                                            </span>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {violation.message}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Line {violation.line} • {violation.ruleId}
                                                    {violation.article && ` • ${violation.article}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {violation.fixable && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                    Auto-fix
                                                </span>
                                            )}
                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform ${expandedViolation === violation.id ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {expandedViolation === violation.id && (
                                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-3">
                                            {/* Code Snippet */}
                                            <div>
                                                <div className="text-xs font-medium text-gray-500 mb-1">Code</div>
                                                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
                                                    <code>{violation.codeSnippet}</code>
                                                </pre>
                                            </div>

                                            {/* Suggestion */}
                                            <div>
                                                <div className="text-xs font-medium text-gray-500 mb-1">Suggestion</div>
                                                <p className="text-green-700 bg-green-50 p-3 rounded-lg text-sm">
                                                    {violation.suggestion}
                                                </p>
                                            </div>

                                            {/* Auto-fix */}
                                            {violation.fixable && result.patches?.find(p => p.violation_id === violation.id) && (
                                                <button
                                                    onClick={() => applyPatch(
                                                        result.patches!.find(p => p.violation_id === violation.id)!.id
                                                    )}
                                                    disabled={applyingPatch === violation.id}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    {applyingPatch === violation.id ? (
                                                        <>
                                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                            </svg>
                                                            Applying...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Apply Fix
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

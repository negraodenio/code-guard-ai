// ComplianceBadge.tsx - Componente React para Lovable
'use client';

import { useState } from 'react';

interface ScanResult {
    success: boolean;
    credits_used: number;
    report: {
        summary: {
            total: number;
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        violations: Array<{
            line: number;
            severity: string;
            message: string;
            suggestion: string;
        }>;
    };
}

export function ComplianceBadge() {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const scanCurrentFile = async () => {
        setScanning(true);
        setError(null);

        try {
            // Get code from editor (adjust selector for your app)
            const editor = document.querySelector('[data-lovable-editor]');
            const content = editor?.textContent || '';
            const filename = window.location.pathname.split('/').pop() || 'untitled.ts';

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/codeguard-scan`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        file_content: content,
                        filename,
                        frameworks: ['lgpd', 'gdpr'],
                    }),
                }
            );

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Scan failed');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setScanning(false);
        }
    };

    // Loading state
    if (scanning) {
        return (
            <div className="flex items-center gap-2 text-blue-600">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm">Scanning...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center gap-2 text-red-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm">Error: {error}</span>
            </div>
        );
    }

    // Initial state - show scan button
    if (!result) {
        return (
            <button
                onClick={scanCurrentFile}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Check Compliance
            </button>
        );
    }

    const { total, critical, high } = result.report.summary;

    // Compliant state
    if (total === 0) {
        return (
            <div className="flex items-center gap-2 text-green-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-medium">LGPD Compliant</span>
                <span className="text-xs text-gray-500">
                    ({result.credits_used} credits)
                </span>
            </div>
        );
    }

    // Violations found
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-red-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                </svg>
                <span className="font-medium">
                    {total} violations found
                    {critical > 0 && ` (${critical} critical)`}
                </span>
            </div>

            <div className="max-h-48 overflow-y-auto bg-gray-50 rounded p-2 text-sm">
                {result.report.violations.slice(0, 5).map((v, i) => (
                    <div key={i} className="mb-2 p-2 bg-white rounded border">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${v.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                    v.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                        'bg-yellow-100 text-yellow-700'
                                }`}>
                                {v.severity}
                            </span>
                            <span className="text-gray-500">Line {v.line}</span>
                        </div>
                        <p className="mt-1 text-gray-700">{v.message}</p>
                        <p className="mt-1 text-green-600 text-xs">{v.suggestion}</p>
                    </div>
                ))}
                {result.report.violations.length > 5 && (
                    <p className="text-center text-gray-500 text-xs">
                        +{result.report.violations.length - 5} more...
                    </p>
                )}
            </div>

            <button
                onClick={() => setResult(null)}
                className="text-xs text-blue-600 hover:underline"
            >
                Scan again
            </button>
        </div>
    );
}

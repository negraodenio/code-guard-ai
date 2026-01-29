'use client';

import { useEffect, useState } from 'react';

export default function ReportPage() {
    const [report, setReport] = useState<any>(null);

    useEffect(() => {
        const data = localStorage.getItem('lastReport');
        if (data) setReport(JSON.parse(data));
    }, []);

    if (!report) return <div className="p-8 text-white">Carregando...</div>;

    const exportPDF = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-white text-black p-8 print:p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header Profissional */}
                <div className="border-b-2 border-blue-600 pb-4 mb-6 relative">
                    <div className="absolute top-0 right-0 text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        v1.0.7-PRO
                    </div>
                    <h1 className="text-3xl font-bold text-blue-900">Relatório de Auditoria de Compliance</h1>
                    <p className="text-gray-600 mt-2">Gerado em: {report?.timestamp ? new Date(report.timestamp).toLocaleString('pt-BR') : 'N/A'}</p>
                    <p className="text-sm text-gray-500">Ferramenta: Compliance Scanner Professional</p>
                </div>

                {/* ScoreCard */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className={`p-6 rounded-lg text-center ${report.score >= 80 ? 'bg-green-100' : report.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                        <div className="text-4xl font-bold mb-2">{report.score}/100</div>
                        <div className="text-sm uppercase tracking-wide">Score de Compliance</div>
                    </div>
                    <div className={`p-6 rounded-lg text-center border-4 ${report.grade === 'A' ? 'border-green-500 text-green-700' : report.grade === 'F' ? 'border-red-500 text-red-700' : 'border-yellow-500 text-yellow-700'}`}>
                        <div className="text-4xl font-bold mb-2">Nota {report?.grade || 'N/A'}</div>
                        <div className="text-sm uppercase tracking-wide">Classificação</div>
                    </div>
                </div>

                {/* Resumo Executivo */}
                <div className="bg-gray-50 p-4 rounded mb-6">
                    <h2 className="font-bold text-lg mb-2">Resumo Executivo</h2>
                    <p className="text-gray-700">{report.summary}</p>
                    <p className="mt-2 text-sm text-gray-600">
                        Total de violações encontradas: <strong>{(report.issues || []).length}</strong>
                    </p>
                </div>

                {/* Indicador do Método de Análise */}
                <div className={`p-3 rounded-lg mb-6 border ${report.analysisMethod === 'AI'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}>
                    <div className="flex items-center gap-2 font-semibold">
                        {report.analysisMethod === 'AI' ? (
                            <>
                                <span className="text-xl">🤖</span>
                                <span>Análise por Inteligência Artificial</span>
                            </>
                        ) : (
                            <>
                                <span className="text-xl">⚡</span>
                                <span>Análise por Regras Locais (Regex)</span>
                            </>
                        )}
                    </div>
                    <div className="text-sm mt-1 opacity-80">
                        {report.analysisDetails || (
                            report.analysisMethod === 'AI'
                                ? 'DeepSeek-V3 via SiliconFlow API'
                                : 'Modo offline - sem custo'
                        )}
                    </div>
                    {report.analysisMethod === 'AI' && (
                        <div className="text-xs mt-2 text-blue-600 font-mono">
                            💰 Custo desta análise: ~$0.002 USD
                        </div>
                    )}
                </div>

                {/* Frameworks */}
                <div className="mb-8">
                    <h2 className="font-bold text-lg mb-4">Conformidade por Framework</h2>
                    <div className="space-y-2">
                        {(report?.frameworks || []).map((fw: any) => (
                            <div key={fw.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div>
                                    <div className="font-semibold">{fw.name}</div>
                                    <div className="text-sm text-gray-500">{fw.id}</div>
                                </div>
                                <div className={`px-3 py-1 rounded text-white text-sm ${fw.passed ? 'bg-green-500' : 'bg-red-500'}`}>
                                    {fw.passed ? '✓ OK' : `${fw.violations} violações`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Issues Detalhadas */}
                <div className="mb-8">
                    <h2 className="font-bold text-lg mb-4">Violações Detalhadas</h2>
                    {(!report?.issues || report.issues.length === 0) ? (
                        <p className="text-green-600 font-semibold">Nenhuma violação crítica encontrada!</p>
                    ) : (
                        <div className="space-y-4">
                            {(report.issues || []).map((issue: any, idx: number) => (
                                <div key={idx} className={`p-4 rounded border-l-4 ${issue.severity === 'critical' ? 'bg-red-50 border-red-500' :
                                    issue.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                                        'bg-yellow-50 border-yellow-500'
                                    }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-1 rounded text-xs text-white ${issue.severity === 'critical' ? 'bg-red-600' :
                                            issue.severity === 'high' ? 'bg-orange-600' :
                                                'bg-yellow-600'
                                            }`}>
                                            {issue.severity.toUpperCase()}
                                        </span>
                                        <span className="text-sm text-gray-500 font-mono">{issue.code}</span>
                                    </div>
                                    <div className="font-semibold mb-1">{issue.framework}</div>
                                    <div className="text-gray-700 mb-2">{issue.message}</div>
                                    {issue.line > 0 && (
                                        <div className="text-sm text-gray-500 mb-2">Linha: {issue.line}</div>
                                    )}
                                    <div className="bg-blue-50 p-2 rounded text-sm">
                                        <strong>Correção sugerida:</strong> {issue.fix || issue.recommendation}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-gray-400 text-sm mt-8 pt-4 border-t">
                    <p>Relatório gerado automaticamente por Compliance Scanner</p>
                    <p>Este relatório serve como base para auditoria preliminar. Consulte um advogado especialista para validação jurídica final.</p>
                </div>

                {/* Botão Exportar */}
                <div className="mt-8 text-center print:hidden">
                    <button
                        onClick={exportPDF}
                        className="px-6 py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
                    >
                        📄 Exportar PDF / Imprimir
                    </button>
                    <p className="mt-2 text-sm text-gray-500">Salve como PDF para enviar ao cliente</p>
                </div>
            </div>
        </div>
    );
}

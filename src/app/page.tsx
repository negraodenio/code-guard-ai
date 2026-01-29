'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const [code, setCode] = useState('');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const analyze = async () => {
        setLoading(true);

        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code || null,
                url: url || null
            }),
        });

        const data = await response.json();
        localStorage.setItem('lastReport', JSON.stringify(data));
        router.push('/report');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Compliance Scanner</h1>
                <p className="text-gray-400 mb-8">Análise LGPD, GDPR, PCI-DSS, Pix, FAPI-BR</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm mb-2">URL do GitHub (opcional):</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://github.com/usuario/repo"
                            className="w-full p-3 bg-gray-800 rounded border border-gray-700"
                        />
                    </div>

                    <div className="text-center text-gray-500">OU</div>

                    <div>
                        <label className="block text-sm mb-2">Cole o código aqui:</label>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="// Cole seu código TypeScript/JavaScript aqui..."
                            className="w-full h-64 p-3 bg-gray-800 rounded border border-gray-700 font-mono text-sm"
                        />
                    </div>

                    <button
                        onClick={analyze}
                        disabled={loading || (!code && !url)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold disabled:opacity-50"
                    >
                        {loading ? 'Analisando...' : 'GERAR RELATÓRIO DE COMPLIANCE'}
                    </button>
                </div>
            </div>
        </div>
    );
}

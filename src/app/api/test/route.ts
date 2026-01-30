import { NextResponse } from 'next/server';
import { orchestrator } from '@/lib/core/ComplianceOrchestrator';

export async function GET() {
    const VULNERABLE_CODE = `
  const express = require('express');
  const db_password = "master_key_99";
  app.post('/api/user/data', (req, res) => {
    console.log("CPF:", req.body.cpf);
  });
  `;

    try {
        const scan = await orchestrator.fullAudit(
            VULNERABLE_CODE,
            'src/server.js',
            'test-repo',
            '.',
            ['LGPD', 'FAPI-BR'] // Explicitly requesting these frameworks
        );
        const ctf = await orchestrator.ctf.generateChallenge('junior');

        return NextResponse.json({
            status: 'success',
            engine: 'CodeGuard v10.0.0-ULTRA',
            results: {
                scan,
                educationalMode: {
                    active: true,
                    ctf
                }
            }
        });
    } catch (error: any) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}

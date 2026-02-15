import { NextResponse } from 'next/server';

/**
 * Vercel Cron Job for Cache Warming
 * Runs daily at 6am to warm cache with top symbols
 * 
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/warm-cache",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */

export async function GET(req: Request) {
    // Security: verify cron secret
    const authHeader = req.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
        console.error('❌ CRON_SECRET not configured');
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        );
    }

    if (authHeader !== expectedAuth) {
        console.error('❌ Unauthorized cron request');
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        console.log('🔥 Starting scheduled cache warming...');

        // Import and run cache warming
        // Note: In production, you might want to use a background job queue
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        // Run the cache warming script
        const { stdout, stderr } = await execAsync('npx tsx src/scripts/warm-cache.ts', {
            cwd: process.cwd(),
            timeout: 3600000 // 1 hour timeout
        });

        console.log('✅ Cache warming completed');
        console.log('Output:', stdout);

        if (stderr) {
            console.warn('Warnings:', stderr);
        }

        return NextResponse.json({
            success: true,
            message: 'Cache warming completed',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Cache warming error:', error);

        return NextResponse.json(
            {
                error: 'Cache warming failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

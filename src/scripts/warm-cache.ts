#!/usr/bin/env node

/**
 * Cache Warming Script
 * Analyzes top 400 symbols and caches results
 * Run: node src/scripts/warm-cache.ts
 * 
 * Expected: ~40 minutes, cost ~$0.075
 */

import { getTopSymbols } from '../lib/market/topSymbols';
import { analyzeStockForCache } from '../lib/ai/cacheAnalyzer';

interface WarmingResults {
    success: number;
    failed: number;
    skipped: number;
    errors: Array<{ symbol: string; error: string }>;
}

async function warmCache() {
    console.log('🔥 Starting cache warming...');
    console.log('═'.repeat(60));

    const symbols = getTopSymbols();
    console.log(`📊 Total symbols to warm: ${symbols.length}`);

    const batchSize = 10; // Stay under 15 RPM limit
    const batchDelay = 60000; // 60 seconds between batches

    let completed = 0;
    const results: WarmingResults = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };

    const startTime = Date.now();

    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(symbols.length / batchSize);

        console.log(`\n🔄 Batch ${batchNumber}/${totalBatches}: ${batch.join(', ')}`);
        console.log('─'.repeat(60));

        // Process batch in parallel
        const batchResults = await Promise.allSettled(
            batch.map(symbol => analyzeStockForCache(symbol))
        );

        // Process results
        batchResults.forEach((result, idx) => {
            const symbol = batch[idx];

            if (result.status === 'fulfilled') {
                results.success++;
                console.log(`  ✅ ${symbol} - ${result.value.recommendation} (${result.value.confidence}% confidence)`);
            } else {
                results.failed++;
                const errorMsg = result.reason?.message || 'Unknown error';
                results.errors.push({ symbol, error: errorMsg });
                console.log(`  ❌ ${symbol} - ${errorMsg}`);
            }
        });

        completed += batch.length;
        const progress = ((completed / symbols.length) * 100).toFixed(1);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const estimatedTotal = Math.floor((elapsed / completed) * symbols.length);
        const remaining = estimatedTotal - elapsed;

        console.log('─'.repeat(60));
        console.log(`📈 Progress: ${completed}/${symbols.length} (${progress}%)`);
        console.log(`⏱️  Elapsed: ${formatTime(elapsed)} | Remaining: ~${formatTime(remaining)}`);
        console.log(`✅ Success: ${results.success} | ❌ Failed: ${results.failed}`);

        // Wait between batches (except for last batch)
        if (i + batchSize < symbols.length) {
            console.log(`\n⏳ Waiting ${batchDelay / 1000}s before next batch...`);
            await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
    }

    // Final summary
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const successRate = ((results.success / symbols.length) * 100).toFixed(1);
    const estimatedCost = (symbols.length * 0.0001875).toFixed(3);

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 Cache warming complete!');
    console.log('═'.repeat(60));
    console.log(`✅ Success: ${results.success}/${symbols.length} (${successRate}%)`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`⏱️  Total time: ${formatTime(totalTime)}`);
    console.log(`💰 Estimated cost: ~$${estimatedCost}`);

    if (results.errors.length > 0) {
        console.log('\n❌ Failed symbols:');
        results.errors.forEach(({ symbol, error }) => {
            console.log(`  - ${symbol}: ${error}`);
        });
    }

    console.log('═'.repeat(60));
}

/**
 * Format seconds into human-readable time
 */
function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Run the script
warmCache()
    .then(() => {
        console.log('\n✨ Cache warming completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Cache warming failed:', error);
        process.exit(1);
    });

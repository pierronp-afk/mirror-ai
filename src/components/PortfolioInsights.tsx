interface PortfolioInsightsProps {
    analysis: {
        metrics: {
            totalValue: number;
            avgConfidence: number;
            signals: {
                buy: number;
                hold: number;
                sell: number;
            };
            concentration: number;
        };
        insights: {
            healthScore: number;
            diversificationScore: number;
            riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
            topRecommendations: string[];
            rebalancing: Array<{
                action: 'REDUCE' | 'INCREASE' | 'ADD' | 'REMOVE';
                symbol: string;
                currentWeight: number;
                targetWeight: number;
                reasoning: string;
            }>;
            hedgingOpportunities: string;
            nextSteps: string;
        };
    };
}

/**
 * Component to display portfolio-level insights and recommendations
 */
export function PortfolioInsights({ analysis }: PortfolioInsightsProps) {
    const { metrics, insights } = analysis;

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'LOW': return 'text-green-600 bg-green-50';
            case 'MODERATE': return 'text-yellow-600 bg-yellow-50';
            case 'HIGH': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'REDUCE': return 'text-orange-600 bg-orange-50';
            case 'INCREASE': return 'text-green-600 bg-green-50';
            case 'ADD': return 'text-blue-600 bg-blue-50';
            case 'REMOVE': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="portfolio-insights bg-white rounded-2xl shadow-lg p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900">Portfolio Analysis</h2>
                <div className="flex gap-3">
                    <div className="text-center">
                        <div className="text-3xl font-black text-blue-600">{insights.healthScore}</div>
                        <div className="text-xs text-gray-500">Health Score</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-purple-600">{insights.diversificationScore}</div>
                        <div className="text-xs text-gray-500">Diversification</div>
                    </div>
                </div>
            </div>

            {/* Risk Level */}
            <div className={`px-4 py-3 rounded-lg ${getRiskColor(insights.riskLevel)}`}>
                <div className="flex items-center justify-between">
                    <span className="font-bold">Risk Level</span>
                    <span className="text-lg font-black">{insights.riskLevel}</span>
                </div>
            </div>

            {/* Metrics Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Total Value</div>
                    <div className="text-xl font-bold text-gray-900">€{metrics.totalValue.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Avg Confidence</div>
                    <div className="text-xl font-bold text-gray-900">{metrics.avgConfidence.toFixed(1)}%</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Concentration</div>
                    <div className="text-xl font-bold text-gray-900">{metrics.concentration.toFixed(1)}%</div>
                </div>
            </div>

            {/* Signals */}
            <div className="flex gap-2">
                <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-green-600">{metrics.signals.buy}</div>
                    <div className="text-xs text-green-700">BUY</div>
                </div>
                <div className="flex-1 bg-yellow-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-yellow-600">{metrics.signals.hold}</div>
                    <div className="text-xs text-yellow-700">HOLD</div>
                </div>
                <div className="flex-1 bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-black text-red-600">{metrics.signals.sell}</div>
                    <div className="text-xs text-red-700">SELL</div>
                </div>
            </div>

            {/* Top Recommendations */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Top Recommendations</h3>
                <ul className="space-y-2">
                    {insights.topRecommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                            </span>
                            <span className="text-sm text-gray-700">{rec}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Rebalancing */}
            {insights.rebalancing && insights.rebalancing.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Rebalancing Suggestions</h3>
                    <div className="space-y-3">
                        {insights.rebalancing.map((item, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900">{item.symbol}</span>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(item.action)}`}>
                                            {item.action}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {item.currentWeight}% → {item.targetWeight}%
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600">{item.reasoning}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hedging */}
            {insights.hedgingOpportunities && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-purple-900 mb-2">Hedging Opportunities</h3>
                    <p className="text-sm text-purple-700">{insights.hedgingOpportunities}</p>
                </div>
            )}

            {/* Next Steps */}
            {insights.nextSteps && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-blue-900 mb-2">Next Steps</h3>
                    <p className="text-sm text-blue-700">{insights.nextSteps}</p>
                </div>
            )}
        </div>
    );
}

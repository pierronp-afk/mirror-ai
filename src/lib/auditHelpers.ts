import { Stock, AISignal } from '@/types';

interface AuditResult {
    healthScore: number;
    healthDescription: string;
    priorityActions: PriorityAction[];
    shortSummary: string;
}

interface PriorityAction {
    symbol: string;
    name: string;
    urgency: 'high' | 'medium';
    recommendation: string; // "Vendre", "Alléger", etc.
    action: string; // The precise action text
    reason: string; // Simple reasoning
    impact?: string;
}

/**
 * Calculate portfolio health score (0-100)
 */
export function calculateHealthScore(
    portfolio: Stock[],
    signals: AISignal[]
): number {
    if (portfolio.length === 0) return 50; // Neutral start

    let score = 100;

    // 1. Diversification Check (Simplified)
    // Basic penalty for concentration
    portfolio.forEach(stock => {
        const signal = signals.find(s => s.symbol === stock.symbol);
        const weight = signal?.weight || 0;

        if (weight > 30) score -= 15;
        else if (weight > 20) score -= 10;
        else if (weight > 15) score -= 5;
    });

    // 2. Asset Quality (Signal based) (max -40)
    let sellSignals = 0;
    let highRiskCount = 0;

    signals.forEach(signal => {
        if (signal.advice === 'Vendre') {
            score -= 10;
            sellSignals++;
        }
        if (signal.advice === 'Alléger') {
            score -= 5;
        }
        if (signal.rsi && signal.rsi > 75) { // Overbought
            score -= 5;
            highRiskCount++;
        }
    });

    // Penalize if too many sell signals or high risk
    if (sellSignals > 2) score -= 10;
    if (highRiskCount > 2) score -= 10;

    // Cap score
    return Math.max(0, Math.min(100, score));
}

/**
 * Get description for health score
 */
export function getHealthDescription(score: number): string {
    if (score >= 80) return "Excellente santé. Votre portefeuille est bien équilibré.";
    if (score >= 60) return "Santé correcte. Quelques ajustements sont nécessaires.";
    if (score >= 40) return "Attention requise. Plusieurs déséquilibres identifiés.";
    return "Action urgente requise. Risque de capital élevé.";
}

/**
 * Filter and generate priority actions
 */
export function getPriorityActions(
    signals: AISignal[]
): PriorityAction[] {
    return signals
        .filter(signal => {
            const isSell = signal.advice === 'Vendre' || signal.advice === 'Alléger';
            const isOverweight = (signal.weight || 0) > 20;
            const isHighRisk = (signal.rsi || 0) > 75; // Approx risk proxy
            const strongBuyOpportunity = signal.advice === 'Acheter' && (signal.weight || 0) < 5;

            return isSell || isOverweight || isHighRisk || strongBuyOpportunity;
        })
        .map(signal => ({
            symbol: signal.symbol,
            name: signal.name,
            urgency: ((signal.advice === 'Vendre' || (signal.weight || 0) > 25) ? 'high' : 'medium') as 'high' | 'medium',
            recommendation: signal.advice || 'Conserver',
            action: signal.scenarioSuggestion?.action || `Consultez la fiche ${signal.symbol}`,
            reason: signal.justification || signal.reason || "Déséquilibre détecté",
            impact: signal.scenarioSuggestion?.impact
        }))
        .sort((a, b) => (a.urgency === 'high' ? -1 : 1)) // High urgency first
        .slice(0, 5); // Max 5 items
}

/**
 * Generate short summary
 */
export function generateAuditSummary(
    score: number,
    actionCount: number
): string {
    if (score > 80) {
        return `Votre portfolio est en bonne santé (${score}/100). ${actionCount > 0 ? `${actionCount} ajustements mineurs suggérés pour optimiser.` : 'Aucune action urgente.'} Continuez la diversification.`;
    }

    if (score > 60) {
        return `Votre portfolio nécessite quelques ajustements (${score}/100). ${actionCount} actions prioritaires identifiées pour réduire les risques et améliorer l'équilibre.`;
    }

    return `Votre portfolio présente des déséquilibres importants (${score}/100). ${actionCount} actions urgentes recommandées pour limiter les risques de perte.`;
}

/**
 * Main function to generate full audit
 */
export function generateAudit(
    portfolio: Stock[],
    signals: AISignal[],
    _totalValue: number // Kept for interface consistency but unused currently
): AuditResult {
    const healthScore = calculateHealthScore(portfolio, signals);
    const priorityActions = getPriorityActions(signals);

    return {
        healthScore,
        healthDescription: getHealthDescription(healthScore),
        priorityActions,
        shortSummary: generateAuditSummary(healthScore, priorityActions.length)
    };
}

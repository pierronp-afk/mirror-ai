export const getCurrencyFromSymbol = (symbol: string) => {
    if (!symbol) return { code: 'USD', symbol: '$' };
    const s = symbol.toUpperCase();

    if (s.endsWith('.PA') || s.endsWith('.DE') || s.endsWith('.AS') || s.endsWith('.MI') || s.endsWith('.MC')) return { code: 'EUR', symbol: '€' };
    if (s.endsWith('.L')) return { code: 'GBP', symbol: '£' };
    if (s.endsWith('.T')) return { code: 'JPY', symbol: '¥' };
    if (s.endsWith('.HK')) return { code: 'HKD', symbol: 'HK$' };
    if (s.endsWith('.SW')) return { code: 'CHF', symbol: 'CHF' };
    if (s.endsWith('.NS') || s.endsWith('.BO')) return { code: 'INR', symbol: '₹' };
    if (s.endsWith('.KS')) return { code: 'KRW', symbol: '₩' };
    if (s.includes('EURUSD')) return { code: 'USD', symbol: '$' }; // Special case for FX pair return type? Usually FX is a rate.

    // Default US
    return { code: 'USD', symbol: '$' };
};

export const formatCurrency = (amount: number, currencyCode: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode
    }).format(amount);
};

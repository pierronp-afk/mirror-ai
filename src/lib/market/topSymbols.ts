/**
 * Top 400 symbols for cache warming
 * Covers 80-90% of typical user holdings across global markets
 */

export function getTopSymbols(): string[] {
    return [
        // US Top 100 - Tech Giants & Blue Chips
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B',
        'UNH', 'JNJ', 'JPM', 'V', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV',
        'PEP', 'KO', 'COST', 'AVGO', 'LLY', 'WMT', 'MCD', 'DIS', 'CSCO',
        'ADBE', 'CRM', 'NFLX', 'ORCL', 'INTC', 'AMD', 'QCOM', 'TXN', 'IBM',
        'BA', 'CAT', 'HON', 'UPS', 'RTX', 'LMT', 'GE', 'DE', 'MMM', 'EMR',
        'XOM', 'COP', 'SLB', 'PSX', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK',
        'AXP', 'SCHW', 'TMO', 'ABT', 'DHR', 'PFE', 'BMY', 'NKE', 'SBUX',
        'TGT', 'LOW', 'TJX', 'CL', 'PM', 'MO', 'T', 'VZ', 'CMCSA',
        'NOW', 'UBER', 'SHOP', 'SQ', 'PYPL', 'SNOW', 'COIN', 'RBLX',
        'ZM', 'DOCU', 'CRWD', 'NET', 'DDOG', 'MDB', 'OKTA', 'TWLO',
        'PLTR', 'U', 'DASH', 'ABNB', 'RIVN', 'LCID', 'F', 'GM',
        'NIO', 'XPEV', 'LI', 'BABA', 'JD', 'PDD', 'BIDU', 'TCEHY',

        // France CAC 40 + Next 20 (60 total)
        'MC.PA', 'OR.PA', 'SAN.PA', 'TTE.PA', 'AIR.PA', 'BNP.PA', 'AI.PA',
        'SU.PA', 'RMS.PA', 'DG.PA', 'BN.PA', 'CS.PA', 'ORA.PA', 'SAF.PA',
        'CAP.PA', 'SGO.PA', 'ATO.PA', 'EN.PA', 'VIE.PA', 'ML.PA', 'RI.PA',
        'KER.PA', 'PUB.PA', 'RNO.PA', 'ENGI.PA', 'WLN.PA', 'CA.PA', 'GLE.PA',
        'DSY.PA', 'UG.PA', 'URW.PA', 'STM.PA', 'EL.PA', 'FP.PA', 'STLA.PA',
        'ACA.PA', 'ADP.PA', 'ERF.PA', 'COV.PA', 'NK.PA', 'HO.PA', 'EDF.PA',
        'TEP.PA', 'ALO.PA', 'SW.PA', 'GFC.PA', 'BVI.PA', 'EDEN.PA', 'GET.PA',
        'MTU.PA', 'IPN.PA', 'PERP.PA', 'ALT.PA', 'FNAC.PA', 'NEX.PA', 'SOI.PA',
        'RXL.PA', 'EUCAR.PA', 'SESG.PA', 'TFI.PA',

        // UK FTSE 100 (60 symbols)
        'SHEL.L', 'HSBA.L', 'AZN.L', 'BP.L', 'DGE.L', 'ULVR.L', 'GSK.L',
        'RIO.L', 'NG.L', 'REL.L', 'LSEG.L', 'BATS.L', 'PRU.L', 'BARC.L',
        'VOD.L', 'LLOY.L', 'GLEN.L', 'IMB.L', 'BA.L', 'AAL.L', 'RKT.L',
        'CRH.L', 'EXPN.L', 'AHT.L', 'III.L', 'ANTO.L', 'FERG.L', 'LGEN.L',
        'LAND.L', 'SMDS.L', 'BRBY.L', 'FLTR.L', 'PSON.L', 'SGRO.L', 'OCDO.L',
        'MNDI.L', 'CRDA.L', 'AUTO.L', 'SMIN.L', 'WTB.L', 'HLMA.L', 'SPX.L',
        'JMAT.L', 'WEIR.L', 'HWDN.L', 'DCC.L', 'BNZL.L', 'EDV.L', 'INF.L',
        'STAN.L', 'AVV.L', 'NWG.L', 'SSE.L', 'CPG.L', 'RR.L', 'BT.L',
        'IHG.L', 'WPP.L', 'TSCO.L', 'MNG.L',

        // Germany DAX + MDAX (60 symbols)
        'SAP.DE', 'SIE.DE', 'ALV.DE', 'DTE.DE', 'VOW3.DE', 'MBG.DE', 'BMW.DE',
        'MUV2.DE', 'BAS.DE', 'ADS.DE', 'DB1.DE', 'DBK.DE', 'PAH3.DE', 'HEN3.DE',
        'BEI.DE', 'FRE.DE', 'SHL.DE', 'IFX.DE', 'HFG.DE', 'RWE.DE',
        'VNA.DE', 'EOAN.DE', 'CON.DE', 'LIN.DE', 'AIR.DE', 'ZAL.DE', 'PUM.DE',
        'MTX.DE', 'SY1.DE', '1COV.DE', 'HNR1.DE', 'BAYN.DE', 'FME.DE', 'DHL.DE',
        'QIA.DE', 'SDF.DE', 'G24.DE', 'NDA.DE', 'EVT.DE', 'BC8.DE',
        'TKA.DE', 'GXI.DE', 'WAF.DE', 'LXS.DE', 'BOSS.DE', 'JUN3.DE', 'KGX.DE',
        'NDX1.DE', 'AFX.DE', 'SZG.DE', 'PNE3.DE', 'FNTN.DE', 'LEG.DE', 'VBK.DE',
        'SMHN.DE', 'KRN.DE', 'DUE.DE', 'COP.DE', 'EVK.DE', 'RAA.DE',

        // Asia Top 100
        // Japan
        '7203.T', '6758.T', '9984.T', '6861.T', '8306.T', '9432.T', '6902.T',
        '8035.T', '4063.T', '4502.T', '4503.T', '7974.T', '9433.T', '6367.T',
        '6501.T', '7267.T', '8316.T', '6594.T', '4568.T', '6273.T',

        // Hong Kong / China
        '0700.HK', '9988.HK', '0941.HK', '1299.HK', '0939.HK', '2318.HK',
        '1398.HK', '3690.HK', '0388.HK', '1810.HK', '2020.HK', '0883.HK',
        '1113.HK', '0016.HK', '0002.HK', '0005.HK', '0011.HK', '0001.HK',
        '0003.HK', '0006.HK',

        // India
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS',
        'ICICIBANK.NS', 'BHARTIARTL.NS', 'SBIN.NS', 'BAJFINANCE.NS', 'ITC.NS',
        'LT.NS', 'KOTAKBANK.NS', 'ASIANPAINT.NS', 'AXISBANK.NS', 'MARUTI.NS',
        'TITAN.NS', 'WIPRO.NS', 'ULTRACEMCO.NS', 'NESTLEIND.NS', 'SUNPHARMA.NS',

        // South Korea
        '005930.KS', '000660.KS', '051910.KS', '005380.KS', '035420.KS',
        '006400.KS', '035720.KS', '068270.KS', '005490.KS', '028260.KS',
        '012330.KS', '055550.KS', '066570.KS', '096770.KS', '003550.KS',

        // Taiwan
        '2330.TW', '2317.TW', '2454.TW', '2308.TW', '2882.TW',
        '1301.TW', '2412.TW', '1303.TW', '2891.TW', '3008.TW',

        // Singapore
        'D05.SI', 'O39.SI', 'U11.SI', 'C31.SI', 'Z74.SI',
        'C52.SI', 'BN4.SI', 'G13.SI', 'C09.SI', 'C38U.SI',
    ];
}

/**
 * Get symbols by region for targeted cache warming
 */
export function getSymbolsByRegion(region: 'US' | 'EU' | 'ASIA'): string[] {
    const all = getTopSymbols();

    switch (region) {
        case 'US':
            return all.filter(s => !s.includes('.'));
        case 'EU':
            return all.filter(s => s.includes('.PA') || s.includes('.L') || s.includes('.DE'));
        case 'ASIA':
            return all.filter(s => s.includes('.T') || s.includes('.HK') || s.includes('.NS') ||
                s.includes('.KS') || s.includes('.TW') || s.includes('.SI'));
        default:
            return [];
    }
}

/**
 * Get total count of symbols
 */
export function getSymbolCount(): number {
    return getTopSymbols().length;
}

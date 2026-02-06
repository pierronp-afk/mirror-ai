import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Line, ComposedChart, Legend
} from 'recharts';

interface PortfolioChartProps {
    forecast?: { date: string; value: number }[];
    currentValue: number;
}

interface ChartDataPoint {
    date: string;
    actual: number | null;
    forecast: number | null;
}

export default function PortfolioChart({ forecast, currentValue }: PortfolioChartProps) {
    // Générer des données historiques simulées (à remplacer par de vraies données)
    const generateHistoricalData = (): ChartDataPoint[] => {
        const data: ChartDataPoint[] = [];
        const today = new Date();

        for (let i = 30; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            // Simulation de variation aléatoire autour de la valeur actuelle
            const variance = (Math.random() - 0.5) * 0.1; // ±5%
            const value = currentValue * (1 - (i / 30) * 0.05 + variance);

            data.push({
                date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
                actual: Math.round(value),
                forecast: null,
            });
        }

        return data;
    };

    const historicalData = generateHistoricalData();

    // Combiner données historiques et prévisions
    const chartData = [...historicalData];

    if (forecast && forecast.length > 0) {
        forecast.forEach((f, index) => {
            const date = new Date(f.date);
            chartData.push({
                date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
                actual: index === 0 ? currentValue : null,
                forecast: f.value,
            });
        });
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {data.date}
                    </p>
                    {data.actual && (
                        <div className="mb-1">
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Valeur Réelle</p>
                            <p className="text-lg font-black text-slate-900">
                                {data.actual.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </p>
                        </div>
                    )}
                    {data.forecast && (
                        <div>
                            <p className="text-[9px] font-bold text-blue-500 uppercase">Prévision IA</p>
                            <p className="text-lg font-black text-blue-600">
                                {data.forecast.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/40 border border-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
                        Pilotage &amp; Prévisions
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                        Projection basée sur l&apos;analyse Mirror AI
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase">Réel</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="text-[9px] font-black text-blue-600 uppercase">Prévision</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <defs>
                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Ligne réelle */}
                            <Area
                                type="monotone"
                                dataKey="actual"
                                stroke="#0f172a"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorActual)"
                                connectNulls={false}
                            />

                            {/* Ligne prévision */}
                            <Area
                                type="monotone"
                                dataKey="forecast"
                                stroke="#2563eb"
                                strokeWidth={3}
                                strokeDasharray="5 5"
                                fillOpacity={1}
                                fill="url(#colorForecast)"
                                connectNulls={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-50 rounded-[2rem]">
                        <BarChart3 size={40} className="mb-2 opacity-50" />
                        <p className="font-bold italic">Audit requis pour projection</p>
                    </div>
                )}
            </div>

            {/* Stats rapides */}
            {forecast && forecast.length > 0 && (
                <div className="mt-8 grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Valeur Actuelle
                        </p>
                        <p className="text-xl font-black text-slate-900">
                            {currentValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">
                            Prévision 30j
                        </p>
                        <p className="text-xl font-black text-blue-600">
                            {forecast[forecast.length - 1].value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </p>
                    </div>
                    <div className={`rounded-2xl p-4 border ${forecast[forecast.length - 1].value >= currentValue
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-rose-50 border-rose-100'
                        }`}>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <TrendingUp size={10} /> Évolution
                        </p>
                        <p className={`text-xl font-black ${forecast[forecast.length - 1].value >= currentValue
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                            }`}>
                            {((forecast[forecast.length - 1].value - currentValue) / currentValue * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

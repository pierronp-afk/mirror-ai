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
        <div className="lg:col-span-2 bg-white rounded-[3rem] p-8 md:p-10 shadow-xl shadow-slate-200/40 border border-white flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
                        Cockpit prédictif
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
                        Projection à 90 jours (Mirror AI Engine)
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-slate-900 rounded-full shadow-sm"></div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Réel</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm shadow-blue-500/50"></div>
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">Prévision</span>
                    </div>
                </div>
            </div>

            <div className="h-[250px] w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
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
                            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={20}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />

                            <Area
                                type="monotone"
                                dataKey="actual"
                                stroke="#0f172a"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorActual)"
                                connectNulls={false}
                                animationDuration={2000}
                            />

                            <Area
                                type="monotone"
                                dataKey="forecast"
                                stroke="#2563eb"
                                strokeWidth={3}
                                strokeDasharray="8 6"
                                fillOpacity={1}
                                fill="url(#colorForecast)"
                                connectNulls={false}
                                animationDuration={3000}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-50 rounded-[2rem] bg-slate-50/30">
                        <BarChart3 size={40} className="mb-2 opacity-50" />
                        <p className="text-xs font-bold italic tracking-wider">Audit requis pour projection 90j</p>
                    </div>
                )}
            </div>

            {/* Stats détaillées compactes */}
            {forecast && forecast.length > 0 && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Actuel</p>
                            <p className="text-lg font-black text-slate-900">
                                {currentValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <TrendingUp size={16} className="text-slate-400" />
                        </div>
                    </div>

                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 flex items-center justify-between group hover:border-blue-400 transition-all">
                        <div>
                            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Cible 90j</p>
                            <p className="text-lg font-black text-blue-600">
                                {forecast[forecast.length - 1].value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform shadow-blue-200/50">
                            <TrendingUp size={16} className="text-blue-500" />
                        </div>
                    </div>

                    <div className={`rounded-2xl p-4 border flex items-center justify-between group transition-all ${forecast[forecast.length - 1].value >= currentValue
                        ? 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-400'
                        : 'bg-rose-50/50 border-rose-100 hover:border-rose-400'
                        }`}>
                        <div>
                            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${forecast[forecast.length - 1].value >= currentValue ? 'text-emerald-500' : 'text-rose-500'
                                }`}>
                                Performance
                            </p>
                            <p className={`text-lg font-black ${forecast[forecast.length - 1].value >= currentValue ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                {((forecast[forecast.length - 1].value - currentValue) / currentValue * 100).toFixed(1)}%
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <TrendingUp size={16} className={forecast[forecast.length - 1].value >= currentValue ? 'text-emerald-500' : 'text-rose-500'} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

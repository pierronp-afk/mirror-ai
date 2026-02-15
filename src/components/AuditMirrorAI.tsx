import React from 'react';
import { Stock, AISignal } from '@/types';
import { generateAudit } from '@/lib/auditHelpers';
import { AlertTriangle, CheckCircle2, TrendingUp, X } from 'lucide-react';

interface AuditMirrorAIProps {
    portfolio: Stock[];
    signals: AISignal[];
    totalValue: number;
    onClose: () => void;
}

export default function AuditMirrorAI({ portfolio, signals, totalValue, onClose }: AuditMirrorAIProps) {
    const audit = generateAudit(portfolio, signals, totalValue);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500 border-emerald-200 bg-emerald-50';
        if (score >= 60) return 'text-blue-500 border-blue-200 bg-blue-50';
        if (score >= 40) return 'text-orange-500 border-orange-200 bg-orange-50';
        return 'text-rose-500 border-rose-200 bg-rose-50';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 backdrop-blur-xl bg-slate-900/60 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl min-h-[50vh] max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative my-auto animate-in zoom-in duration-300 text-slate-900">

                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">🎯 Audit Mirror AI</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Analyse prédictive & Conseils</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-8">

                    {/* Health Score Section */}
                    <div className="flex items-center gap-6">
                        <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-black ${getScoreColor(audit.healthScore)}`}>
                            {audit.healthScore}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Santé du Portefeuille</h3>
                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                {audit.healthDescription}
                            </p>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Résumé</h4>
                        <p className="text-sm text-slate-700 italic">
                            &ldquo;{audit.shortSummary}&rdquo;
                        </p>
                    </div>

                    {/* PRIORITY ACTIONS */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-lg flex items-center gap-2">
                                ⚡ ACTIONS PRIORITAIRES
                            </h3>
                            {audit.priorityActions.length > 0 && (
                                <span className="bg-rose-100 text-rose-600 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
                                    {audit.priorityActions.length} requises
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {audit.priorityActions.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-3xl">
                                    <CheckCircle2 size={40} className="mx-auto text-emerald-200 mb-3" />
                                    <p className="text-slate-400 font-bold">Aucune action urgente.</p>
                                    <p className="text-xs text-slate-300">Votre portefeuille est bien équilibré.</p>
                                </div>
                            ) : (
                                audit.priorityActions.map((action, idx) => (
                                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                        {action.urgency === 'high' && (
                                            <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                                                Urgent
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-black text-lg mr-2">{action.symbol}</span>
                                                <span className="text-xs text-slate-400 font-bold uppercase">{action.name}</span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                                            {action.reason}
                                        </p>

                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-3">
                                            <div className={`mt-0.5 p-1 rounded-full ${action.recommendation === 'Vendre' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {action.recommendation === 'Vendre' ? <AlertTriangle size={12} /> : <TrendingUp size={12} />}
                                            </div>
                                            <div>
                                                <span className={`text-xs font-black uppercase tracking-wide block mb-0.5 ${action.recommendation === 'Vendre' ? 'text-rose-600' : 'text-blue-600'}`}>
                                                    {action.recommendation}
                                                </span>
                                                <span className="text-sm font-bold text-slate-900">
                                                    {action.action}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

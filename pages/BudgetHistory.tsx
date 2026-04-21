import React, { useMemo, useState } from "react";
import { Clock, Target, X } from "lucide-react";
import type { BudgetStrategy } from "../types";

interface BudgetHistoryProps {
  strategies: BudgetStrategy[];
  currency: string;
  isLoading: boolean;
}

export default function BudgetHistory({ strategies, currency, isLoading }: BudgetHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => strategies.find((entry) => entry.id === selectedId) || null,
    [selectedId, strategies]
  );

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/40 text-center">
        <p className="text-sm font-bold text-slate-500">Loading strategy history...</p>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/40 text-center">
        <Clock size={42} className="mx-auto text-slate-300 mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">No saved strategies yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {strategies.map((strategy) => (
        <button
          key={strategy.id}
          type="button"
          onClick={() => setSelectedId(strategy.id)}
          className="w-full text-left bg-white/80 backdrop-blur-md rounded-[2rem] p-6 border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all"
        >
          <div className="flex gap-4 items-center">
            <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-700 shrink-0">
              <Target size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">Goal: {strategy.goalName}</p>
              <p className="text-sm font-bold text-slate-600">Strategy: {strategy.strategyName}</p>
              <p className="text-xs font-black text-indigo-700 mt-1">
                Save per month: {currency}{strategy.monthlySavingsRequired.toLocaleString()}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                Selected on: {new Date(strategy.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </button>
      ))}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-2xl font-extrabold text-slate-900">{selected.strategyName}</h3>
              <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-600">Goal: {selected.goalName}</p>
              <p className="text-sm font-black text-slate-900">
                Monthly Savings Required: {currency}{selected.monthlySavingsRequired.toLocaleString()}
              </p>
              <p className="text-sm font-bold text-slate-700">{selected.description}</p>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Steps To Follow</p>
                <ul className="space-y-1">
                  {selected.stepsToFollow.map((step, index) => (
                    <li key={`${selected.id}-step-${index}`} className="text-sm font-bold text-slate-700">- {step}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Spending Adjustments</p>
                <ul className="space-y-1">
                  {selected.spendingAdjustments.map((item, index) => (
                    <li key={`${selected.id}-adj-${index}`} className="text-sm font-bold text-slate-700">- {item}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm font-bold text-slate-700">Timeline Projection: {selected.timelineProjection}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

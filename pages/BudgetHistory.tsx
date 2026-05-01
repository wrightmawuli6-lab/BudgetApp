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
      <div className="app-card rounded-[2.5rem] border border-white/10 bg-[#171719] p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <p className="text-sm font-bold text-white/45">Loading strategy history...</p>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="app-card rounded-[2.5rem] border border-white/10 bg-[#171719] p-10 text-center shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <Clock size={42} className="mx-auto mb-4 text-white/20" />
        <p className="text-xs font-black uppercase tracking-widest text-white/35">No selected budget strategies yet</p>
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
          className="app-card w-full rounded-[2rem] border border-white/10 bg-[#171719] p-6 text-left shadow-[0_24px_60px_rgba(0,0,0,0.35)] transition-all hover:border-violet-400/40"
        >
          <div className="flex gap-4 items-center">
            <div className="p-3 rounded-2xl bg-violet-500/15 text-violet-200 shrink-0">
              <Target size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white">Goal: {strategy.goalName}</p>
              <p className="text-sm font-bold text-white/60">Selected strategy: {strategy.strategyName}</p>
              <p className="text-xs font-black text-violet-200 mt-1">
                Save per month: {currency}{strategy.monthlySavingsRequired.toLocaleString()}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mt-2">
                Selected on: {new Date(strategy.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </button>
      ))}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="app-card w-full max-w-xl rounded-t-[2.5rem] border border-white/10 bg-[#101012] p-8 shadow-2xl sm:rounded-[2.5rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Selected budget strategy</p>
                <h3 className="text-2xl font-extrabold text-white">{selected.strategyName}</h3>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={20} className="text-white/50" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-white/55">Goal: {selected.goalName}</p>
              <p className="text-sm font-black text-white">
                Monthly Savings Required: {currency}{selected.monthlySavingsRequired.toLocaleString()}
              </p>
              <p className="text-sm font-bold text-white/65">{selected.description}</p>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white/35 mb-2">Steps To Follow</p>
                <ul className="space-y-1">
                  {selected.stepsToFollow.map((step, index) => (
                    <li key={`${selected.id}-step-${index}`} className="text-sm font-bold text-white/65">- {step}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white/35 mb-2">Spending Adjustments</p>
                <ul className="space-y-1">
                  {selected.spendingAdjustments.map((item, index) => (
                    <li key={`${selected.id}-adj-${index}`} className="text-sm font-bold text-white/65">- {item}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm font-bold text-white/65">Timeline Projection: {selected.timelineProjection}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

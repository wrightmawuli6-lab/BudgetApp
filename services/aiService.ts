
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetState, AIAdvice, Category } from "../types";

export const getBudgetAdvice = async (state: BudgetState): Promise<AIAdvice | null> => {
  if (!process.env.API_KEY) return null;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const totalSpent = state.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = state.profile.monthlyAllowance - totalSpent;
  const isOverspent = totalSpent > state.profile.monthlyAllowance;
  
  const expenseSummary = state.expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const prompt = `
    As a professional AI student budget advisor, analyze this financial situation:
    - Monthly Allowance: ${state.profile.currency} ${state.profile.monthlyAllowance}
    - Total Spent: ${state.profile.currency} ${totalSpent}
    - Balance: ${state.profile.currency} ${remaining}
    - Is Overspent: ${isOverspent}
    - Categories: ${JSON.stringify(expenseSummary)}
    - Goals: ${JSON.stringify(state.goals)}

    CRITICAL INSTRUCTIONS:
    1. If "Is Overspent" is true, focus strictly on debt recovery and expense reduction.
    2. Evaluate if the savings goals are "achievable" based on current remaining balance and duration.
    3. Provide JSON response. Use encouraging but firm student-friendly language.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            headline: { type: Type.STRING },
            summary: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedReductions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  reason: { type: Type.STRING }
                },
                required: ["category", "amount", "reason"]
              }
            },
            isDebtWarning: { type: Type.BOOLEAN },
            achievabilityScore: { type: Type.NUMBER }
          },
          required: ["status", "headline", "summary", "tips", "suggestedReductions", "isDebtWarning", "achievabilityScore"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as AIAdvice;
  } catch (error) {
    console.error("AI Advice Error:", error);
    return null;
  }
};

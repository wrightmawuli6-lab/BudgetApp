import { BudgetState, AIAdvice } from "../types";

export const getBudgetAdvice = async (state: BudgetState): Promise<AIAdvice | null> => {
  void state;
  throw new Error("Client-side AI advice has been removed. Use the backend /api/ai endpoints instead.");
};

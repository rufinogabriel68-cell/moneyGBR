import React from "react";
import {
  getTransactions,
  getDebts,
  getGoals,
  getReimbursements,
  getDailyBalances,
  getStorageMode,
} from "./actions";
import FinanceDashboardClient from "./FinanceDashboardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [
    initialTransactions,
    initialDebts,
    initialGoals,
    initialReimbursements,
    initialDailyBalances,
    storageMode,
  ] = await Promise.all([
    getTransactions(),
    getDebts(),
    getGoals(),
    getReimbursements(),
    getDailyBalances(),
    getStorageMode(),
  ]);

  return (
    <FinanceDashboardClient
      initialTransactions={initialTransactions}
      initialDebts={initialDebts}
      initialGoals={initialGoals}
      initialReimbursements={initialReimbursements}
      initialDailyBalances={initialDailyBalances}
      storageMode={storageMode}
    />
  );
}

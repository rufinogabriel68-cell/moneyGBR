"use server";

import { revalidatePath } from "next/cache";
import {
  listDocs,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  countDocs,
  storageMode,
} from "@/lib/data-store";

// Collections
const C_TX = "transactions";
const C_DEBTS = "debts";
const C_GOALS = "savings_goals";
const C_REIMB = "reimbursements";
const C_DAILY = "daily_balances";

// ---------------- Types ----------------
export interface TransactionInput {
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  sourceOrDestination: string;
  date?: Date;
  notes?: string;
  scope?: "pessoal" | "empresarial";
  costCenter?: string;
  isBusinessExpense?: boolean;
  reimbursementStatus?: "na" | "pendente" | "reembolsado" | "pro_labore";
  projectClient?: string;
  taxDeductible?: boolean;
}

export interface DebtInput {
  name: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  dueDate: Date;
  priority: "high" | "medium" | "low";
  monthlyPayment: number;
  notes?: string;
  scope?: "pessoal" | "empresarial";
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  category?: string;
  scope?: "pessoal" | "empresarial";
}

export interface ReimbursementInput {
  description: string;
  amount: number;
  direction: "empresa_deve_pf" | "pf_deve_empresa" | "pro_labore";
  relatedTransactionIds?: string[];
  notes?: string;
}

export interface DailyBalanceInput {
  date: string; // yyyy-mm-dd
  scope: "pessoal" | "empresarial" | "consolidado";
  balance: number; // saldo atual daquele dia
  spent?: number; // quanto gastei
  received?: number; // quanto recebi
  account?: string; // qual conta / banco
  description: string; // descritivo obrigatório
  notes?: string;
}

export async function getStorageMode() {
  return storageMode();
}

// ---------------- Seed ----------------
async function ensureSeedData() {
  const count = await countDocs(C_TX);
  if (count > 0) return;

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);
  const day = (o: number) => {
    const d = new Date();
    d.setDate(d.getDate() - o);
    return d;
  };

  // debts
  await addDoc(C_DEBTS, { name: "Cartão de Crédito Nubank", totalAmount: 4500, remainingAmount: 3200, interestRate: 12.5, dueDate: nextMonth, status: "active", priority: "high", monthlyPayment: 400, notes: "Fatura de eletrônicos.", scope: "pessoal", createdAt: now });
  await addDoc(C_DEBTS, { name: "Empréstimo Banco do Brasil", totalAmount: 15000, remainingAmount: 11200, interestRate: 3.2, dueDate: nextMonth, status: "active", priority: "medium", monthlyPayment: 650, notes: "Reforma doméstica.", scope: "pessoal", createdAt: now });
  await addDoc(C_DEBTS, { name: "Fornecedor Matéria-Prima XYZ", totalAmount: 3800, remainingAmount: 2100, interestRate: 2.8, dueDate: nextMonth, status: "active", priority: "high", monthlyPayment: 700, notes: "Insumos pagos no cartão PF.", scope: "empresarial", createdAt: now });

  // goals
  const target = new Date();
  target.setFullYear(now.getFullYear() + 1);
  await addDoc(C_GOALS, { name: "Reserva de Emergência", targetAmount: 12000, currentAmount: 2500, deadline: target, category: "Segurança", scope: "pessoal", createdAt: now });
  await addDoc(C_GOALS, { name: "Viagem de Fim de Ano", targetAmount: 5000, currentAmount: 1200, deadline: target, category: "Lazer", scope: "pessoal", createdAt: now });
  await addDoc(C_GOALS, { name: "Caixa Giro Empresa", targetAmount: 15000, currentAmount: 4200, deadline: target, category: "Empresa", scope: "empresarial", createdAt: now });

  // transactions
  const txs = [
    { description: "Salário Mensal", amount: 6500, type: "income", category: "Salário", sourceOrDestination: "Banco Itaú", date: day(15), notes: "Salário CLT.", scope: "pessoal", costCenter: "Pessoal", isBusinessExpense: false, reimbursementStatus: "na", taxDeductible: false, projectClient: null },
    { description: "Freelance Landing Page", amount: 1200, type: "income", category: "Freelance", sourceOrDestination: "Conta Cora", date: day(8), notes: "Projeto de site.", scope: "pessoal", costCenter: "Serviços", isBusinessExpense: false, reimbursementStatus: "na", taxDeductible: false, projectClient: null },
    { description: "Venda Produto - ACME Ltda", amount: 3800, type: "income", category: "Vendas", sourceOrDestination: "PIX Conta PF", date: day(7), notes: "Faturamento recebido no PF.", scope: "empresarial", costCenter: "Vendas", isBusinessExpense: false, reimbursementStatus: "na", taxDeductible: false, projectClient: "ACME Ltda" },
    { description: "Consultoria", amount: 2400, type: "income", category: "Serviços", sourceOrDestination: "Nubank PF", date: day(3), notes: "NF emitida pelo MEI.", scope: "empresarial", costCenter: "Serviços", isBusinessExpense: false, reimbursementStatus: "na", taxDeductible: false, projectClient: "Startup Beta" },
    { description: "Aluguel & Condomínio", amount: 2200, type: "expense", category: "Moradia", sourceOrDestination: "Banco Itaú", date: day(10), notes: "Fixa mensal.", scope: "pessoal", costCenter: "Moradia", isBusinessExpense: false, reimbursementStatus: "na", taxDeductible: false, projectClient: null },
    { description: "Supermercado", amount: 650.32, type: "expense", category: "Alimentação", sourceOrDestination: "Cartão Itaú", date: day(12), notes: "Rancho mensal.", scope: "pessoal", costCenter: "Alimentação", isBusinessExpense: false, reimbursementStatus: "na", taxDeductible: false, projectClient: null },
    { description: "Compra Material - Insumos", amount: 890, type: "expense", category: "Material", sourceOrDestination: "Cartão Nubank PF", date: day(11), notes: "EMPRESA DEVE REEMBOLSAR.", scope: "empresarial", costCenter: "Material", isBusinessExpense: true, reimbursementStatus: "pendente", taxDeductible: true, projectClient: "Estoque Geral" },
    { description: "Anúncios Meta Ads", amount: 420, type: "expense", category: "Marketing", sourceOrDestination: "Cartão Itaú PF", date: day(9), notes: "Tráfego pago pago com PF.", scope: "empresarial", costCenter: "Marketing", isBusinessExpense: true, reimbursementStatus: "pendente", taxDeductible: true, projectClient: "Loja Online" },
    { description: "Embalagens e Frete", amount: 186.5, type: "expense", category: "Frete", sourceOrDestination: "PIX Nubank PF", date: day(6), notes: "Envio de pedidos.", scope: "empresarial", costCenter: "Frete", isBusinessExpense: true, reimbursementStatus: "pendente", taxDeductible: true, projectClient: null },
    { description: "Combustível", amount: 220, type: "expense", category: "Transporte", sourceOrDestination: "Cartão Itaú", date: day(9), notes: "Etanol.", scope: "pessoal", costCenter: "Transporte", isBusinessExpense: false, reimbursementStatus: "na", taxDeductible: false, projectClient: null },
    { description: "Netflix & Spotify", amount: 84.8, type: "expense", category: "Lazer", sourceOrDestination: "Nubank", date: day(4), notes: "Streaming.", scope: "pessoal", costCenter: "Lazer", isBusinessExpense: false, reimbursementStatus: "na", taxDeductible: false, projectClient: null },
    { description: "Farmácia", amount: 98.5, type: "expense", category: "Saúde", sourceOrDestination: "Nubank", date: day(1), notes: "Remédios.", scope: "pessoal", costCenter: "Saúde", isBusinessExpense: false, reimbursementStatus: "na", taxDeductible: false, projectClient: null },
  ];
  for (const t of txs) await addDoc(C_TX, t);

  await addDoc(C_REIMB, { description: "Acerto PF x Empresa - Material e Marketing", amount: 1496.5, direction: "empresa_deve_pf", status: "aberto", relatedTransactionIds: null, notes: "Gastos empresariais pagos no PF.", createdAt: now, settledAt: null });

  // daily balances seed (últimos 3 dias)
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  await addDoc(C_DAILY, { date: fmt(day(2)), scope: "consolidado", balance: 8450.2, spent: 220, received: 0, account: "Banco Itaú", description: "Abastecimento do carro", notes: "Posto Ipiranga, tanque cheio.", createdAt: day(2) });
  await addDoc(C_DAILY, { date: fmt(day(1)), scope: "pessoal", balance: 8351.7, spent: 98.5, received: 0, account: "Nubank", description: "Farmácia - remédios de alergia", notes: "Compra de vitaminas também.", createdAt: day(1) });
  await addDoc(C_DAILY, { date: fmt(day(0)), scope: "empresarial", balance: 12300.0, spent: 0, received: 2400, account: "Nubank PF (empresa)", description: "Recebi pagamento de consultoria", notes: "Cliente Startup Beta, NF emitida.", createdAt: day(0) });
}

// ---------------- helpers ----------------
function toDate(v: any): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
  return new Date(v);
}

function serializeTx(d: any) {
  return {
    ...d,
    date: toDate(d.date),
    amount: Number(d.amount) || 0,
    scope: d.scope || "pessoal",
    reimbursementStatus: d.reimbursementStatus || "na",
  };
}

// ---------------- TRANSACTIONS ----------------
export async function getTransactions() {
  await ensureSeedData();
  const all = await listDocs(C_TX);
  return all
    .map(serializeTx)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function createTransaction(input: TransactionInput) {
  const doc = await addDoc(C_TX, {
    description: input.description,
    amount: Math.abs(input.amount),
    type: input.type,
    category: input.category,
    sourceOrDestination: input.sourceOrDestination,
    date: input.date || new Date(),
    notes: input.notes || "",
    scope: input.scope || "pessoal",
    costCenter: input.costCenter || (input.scope === "empresarial" ? "Geral" : "Pessoal"),
    isBusinessExpense: input.isBusinessExpense ?? input.scope === "empresarial",
    reimbursementStatus: input.reimbursementStatus || "na",
    projectClient: input.projectClient || null,
    taxDeductible: input.taxDeductible ?? false,
  });
  revalidatePath("/");
  return serializeTx(doc);
}

export async function deleteTransaction(id: string) {
  await deleteDoc(C_TX, id);
  revalidatePath("/");
}

export async function updateReimbursementStatus(id: string, status: "na" | "pendente" | "reembolsado" | "pro_labore") {
  await updateDoc(C_TX, id, { reimbursementStatus: status });
  revalidatePath("/");
}

// ---------------- DEBTS ----------------
export async function getDebts() {
  await ensureSeedData();
  const all = await listDocs(C_DEBTS);
  return all
    .map((d) => ({ ...d, dueDate: toDate(d.dueDate), scope: d.scope || "pessoal", totalAmount: Number(d.totalAmount) || 0, remainingAmount: Number(d.remainingAmount) || 0, interestRate: Number(d.interestRate) || 0, monthlyPayment: Number(d.monthlyPayment) || 0 }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export async function createDebt(input: DebtInput) {
  const doc = await addDoc(C_DEBTS, {
    name: input.name,
    totalAmount: Math.abs(input.totalAmount),
    remainingAmount: Math.abs(input.remainingAmount),
    interestRate: Math.abs(input.interestRate),
    dueDate: input.dueDate || new Date(),
    status: "active",
    priority: input.priority || "medium",
    monthlyPayment: Math.abs(input.monthlyPayment),
    notes: input.notes || "",
    scope: input.scope || "pessoal",
    createdAt: new Date(),
  });
  revalidatePath("/");
  return doc;
}

export async function payDebt(debtId: string, paymentAmount: number, sourceAccount: string, scope: "pessoal" | "empresarial" = "pessoal") {
  const debt = await getDoc(C_DEBTS, debtId);
  if (!debt) throw new Error("Dívida não encontrada.");
  const amount = Math.abs(paymentAmount);
  const newRemaining = Math.max(0, Number(debt.remainingAmount) - amount);
  const isPaid = newRemaining === 0;

  await updateDoc(C_DEBTS, debtId, { remainingAmount: newRemaining, status: isPaid ? "paid" : debt.status });

  await addDoc(C_TX, {
    description: `Pagamento: ${debt.name}`,
    amount,
    type: "expense",
    category: "Dívidas",
    sourceOrDestination: sourceAccount || "Conta Corrente",
    date: new Date(),
    notes: `Amortização. Saldo restante: R$ ${newRemaining.toFixed(2)}`,
    scope: scope || debt.scope || "pessoal",
    costCenter: "Dívidas",
    isBusinessExpense: (scope || debt.scope) === "empresarial",
    reimbursementStatus: "na",
    projectClient: null,
    taxDeductible: false,
  });
  revalidatePath("/");
}

export async function deleteDebt(id: string) {
  await deleteDoc(C_DEBTS, id);
  revalidatePath("/");
}

// ---------------- GOALS ----------------
export async function getGoals() {
  await ensureSeedData();
  const all = await listDocs(C_GOALS);
  return all
    .map((g) => ({ ...g, deadline: g.deadline ? toDate(g.deadline) : null, scope: g.scope || "pessoal", targetAmount: Number(g.targetAmount) || 0, currentAmount: Number(g.currentAmount) || 0 }))
    .sort((a, b) => a.targetAmount - b.targetAmount);
}

export async function createGoal(input: GoalInput) {
  const doc = await addDoc(C_GOALS, {
    name: input.name,
    targetAmount: Math.abs(input.targetAmount),
    currentAmount: Math.abs(input.currentAmount || 0),
    deadline: input.deadline || null,
    category: input.category || "Geral",
    scope: input.scope || "pessoal",
    createdAt: new Date(),
  });
  revalidatePath("/");
  return doc;
}

export async function addFundsToGoal(goalId: string, fundAmount: number, sourceAccount: string) {
  const goal = await getDoc(C_GOALS, goalId);
  if (!goal) throw new Error("Meta não encontrada.");
  const amount = Math.abs(fundAmount);
  const newCurrent = Number(goal.currentAmount) + amount;
  await updateDoc(C_GOALS, goalId, { currentAmount: newCurrent });

  await addDoc(C_TX, {
    description: `Aporte: ${goal.name}`,
    amount,
    type: "expense",
    category: "Investimentos",
    sourceOrDestination: sourceAccount || "Conta Corrente",
    date: new Date(),
    notes: `Reserva guardada. Total: R$ ${newCurrent.toFixed(2)}`,
    scope: goal.scope || "pessoal",
    costCenter: "Investimentos",
    isBusinessExpense: goal.scope === "empresarial",
    reimbursementStatus: "na",
    projectClient: null,
    taxDeductible: false,
  });
  revalidatePath("/");
}

export async function deleteGoal(id: string) {
  await deleteDoc(C_GOALS, id);
  revalidatePath("/");
}

// ---------------- REIMBURSEMENTS ----------------
export async function getReimbursements() {
  await ensureSeedData();
  const all = await listDocs(C_REIMB);
  return all
    .map((r) => ({ ...r, createdAt: toDate(r.createdAt), settledAt: r.settledAt ? toDate(r.settledAt) : null, amount: Number(r.amount) || 0 }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createReimbursement(input: ReimbursementInput) {
  const doc = await addDoc(C_REIMB, {
    description: input.description,
    amount: Math.abs(input.amount),
    direction: input.direction,
    status: "aberto",
    relatedTransactionIds: input.relatedTransactionIds ? JSON.stringify(input.relatedTransactionIds) : null,
    notes: input.notes || "",
    createdAt: new Date(),
    settledAt: null,
  });
  revalidatePath("/");
  return doc;
}

export async function settleReimbursement(id: string) {
  const r = await getDoc(C_REIMB, id);
  if (!r) throw new Error("Acerto não encontrado");
  await updateDoc(C_REIMB, id, { status: "quitado", settledAt: new Date() });

  if (r.relatedTransactionIds) {
    try {
      const ids: string[] = JSON.parse(r.relatedTransactionIds);
      for (const txId of ids) await updateDoc(C_TX, txId, { reimbursementStatus: "reembolsado" });
    } catch { /* ignore */ }
  }

  if (r.direction === "empresa_deve_pf") {
    await addDoc(C_TX, { description: `Reembolso PF: ${r.description}`, amount: r.amount, type: "expense", category: "Reembolso", sourceOrDestination: "Caixa Empresa → PF", date: new Date(), notes: "Acerto PF/PJ", scope: "empresarial", costCenter: "Reembolso", isBusinessExpense: true, reimbursementStatus: "na", projectClient: null, taxDeductible: true });
    await addDoc(C_TX, { description: `Recebido Reembolso: ${r.description}`, amount: r.amount, type: "income", category: "Reembolso", sourceOrDestination: "Empresa → PF", date: new Date(), notes: "Quitação PF/PJ", scope: "pessoal", costCenter: "Reembolso", isBusinessExpense: false, reimbursementStatus: "na", projectClient: null, taxDeductible: false });
  } else if (r.direction === "pro_labore") {
    await addDoc(C_TX, { description: `Pró-labore: ${r.description}`, amount: r.amount, type: "expense", category: "Pró-labore", sourceOrDestination: "Empresa → Sócio", date: new Date(), notes: "Retirada pró-labore", scope: "empresarial", costCenter: "Pró-labore", isBusinessExpense: true, reimbursementStatus: "na", projectClient: null, taxDeductible: true });
    await addDoc(C_TX, { description: `Pró-labore recebido: ${r.description}`, amount: r.amount, type: "income", category: "Pró-labore", sourceOrDestination: "Empresa", date: new Date(), notes: "Entrada pró-labore", scope: "pessoal", costCenter: "Pró-labore", isBusinessExpense: false, reimbursementStatus: "na", projectClient: null, taxDeductible: false });
  }
  revalidatePath("/");
}

export async function deleteReimbursement(id: string) {
  await deleteDoc(C_REIMB, id);
  revalidatePath("/");
}

// ---------------- DAILY BALANCES ----------------
export async function getDailyBalances() {
  await ensureSeedData();
  const all = await listDocs(C_DAILY);
  return all
    .map((d) => ({
      ...d,
      balance: Number(d.balance) || 0,
      spent: Number(d.spent) || 0,
      received: Number(d.received) || 0,
      createdAt: toDate(d.createdAt),
    }))
    .sort((a: any, b: any) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.getTime() - a.createdAt.getTime()));
}

export async function createDailyBalance(input: DailyBalanceInput) {
  if (!input.description || !input.date) throw new Error("Data e descritivo são obrigatórios.");
  const doc = await addDoc(C_DAILY, {
    date: input.date,
    scope: input.scope || "consolidado",
    balance: Number(input.balance) || 0,
    spent: Math.abs(Number(input.spent) || 0),
    received: Math.abs(Number(input.received) || 0),
    account: input.account || "",
    description: input.description,
    notes: input.notes || "",
    createdAt: new Date(),
  });
  revalidatePath("/");
  return doc;
}

export async function deleteDailyBalance(id: string) {
  await deleteDoc(C_DAILY, id);
  revalidatePath("/");
}

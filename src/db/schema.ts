import { pgTable, serial, varchar, text, doublePrecision, timestamp, boolean } from "drizzle-orm/pg-core";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: doublePrecision("amount").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'income' | 'expense'
  category: varchar("category", { length: 100 }).notNull(), // e.g. 'Salário', 'Alimentação', 'Transporte', etc.
  sourceOrDestination: varchar("source_or_destination", { length: 255 }).notNull(), // e.g. 'Banco Itaú', 'Fatura Nubank'
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  // --- NOVOS CAMPOS EMPRESARIAIS / HÍBRIDO PF-PJ ---
  scope: varchar("scope", { length: 20 }).default("pessoal").notNull(), // 'pessoal' | 'empresarial'
  costCenter: varchar("cost_center", { length: 120 }), // ex: Material, Marketing, Equipamentos, Frete, Impostos
  isBusinessExpense: boolean("is_business_expense").default(false).notNull(), // marcar se é gasto da empresa mesmo pago no PF
  reimbursementStatus: varchar("reimbursement_status", { length: 30 }).default("na").notNull(), // 'na' | 'pendente' | 'reembolsado' | 'pro_labore'
  projectClient: varchar("project_client", { length: 150 }), // cliente / projeto vinculado
  taxDeductible: boolean("tax_deductible").default(false).notNull(),
});

export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  remainingAmount: doublePrecision("remaining_amount").notNull(),
  interestRate: doublePrecision("interest_rate").default(0).notNull(), // monthly rate %
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(), // 'active' | 'paid' | 'negotiating'
  priority: varchar("priority", { length: 50 }).default("medium").notNull(), // 'high' | 'medium' | 'low'
  monthlyPayment: doublePrecision("monthly_payment").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // empresarial
  scope: varchar("scope", { length: 20 }).default("pessoal").notNull(), // 'pessoal' | 'empresarial'
});

export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  targetAmount: doublePrecision("target_amount").notNull(),
  currentAmount: doublePrecision("current_amount").default(0).notNull(),
  deadline: timestamp("deadline"),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  scope: varchar("scope", { length: 20 }).default("pessoal").notNull(),
});

// Nova tabela: reembolsos / acertos PF <-> PJ
export const reimbursements = pgTable("reimbursements", {
  id: serial("id").primaryKey(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: doublePrecision("amount").notNull(),
  direction: varchar("direction", { length: 30 }).notNull(), // 'empresa_deve_pf' | 'pf_deve_empresa' | 'pro_labore'
  status: varchar("status", { length: 30 }).default("aberto").notNull(), // 'aberto' | 'quitado'
  relatedTransactionIds: text("related_transaction_ids"), // JSON string com IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  settledAt: timestamp("settled_at"),
  notes: text("notes"),
});

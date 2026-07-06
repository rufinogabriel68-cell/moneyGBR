"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Target,
  Plus,
  Trash2,
  Award,
  Lightbulb,
  Percent,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Info,
  Sparkles,
  RefreshCw,
  Search,
  ChevronRight,
  Moon,
  Building2,
  Briefcase,
  HandCoins,
  Scale,
  Users,
  FileText,
  Layers,
  Receipt,
  ArrowLeftRight,
  BadgeCheck,
  Wallet,
  CalendarDays,
  History,
  Database,
  Save,
} from "lucide-react";
import {
  createTransaction,
  deleteTransaction,
  createDebt,
  payDebt,
  deleteDebt,
  createGoal,
  addFundsToGoal,
  deleteGoal,
  createReimbursement,
  settleReimbursement,
  deleteReimbursement,
  updateReimbursementStatus,
  createDailyBalance,
  deleteDailyBalance,
  TransactionInput,
  DebtInput,
  GoalInput,
  ReimbursementInput,
  DailyBalanceInput,
} from "./actions";

// CATEGORIAS
const INCOME_CATEGORIES_PESSOAL = ["Salário", "Freelance", "Investimentos", "Presente", "Reembolso", "Pró-labore", "Outros"];
const EXPENSE_CATEGORIES_PESSOAL = ["Alimentação", "Moradia", "Transporte", "Lazer", "Saúde", "Educação", "Imprevistos", "Dívidas", "Outros"];

const INCOME_CATEGORIES_EMPRESA = ["Vendas", "Serviços", "Assinaturas", "Marketplace", "Reembolso PF", "Outros"];
const EXPENSE_CATEGORIES_EMPRESA = ["Material", "Marketing", "Equipamentos", "Frete", "Impostos", "Software", "Fornecedores", "Pró-labore", "Reembolso", "Outros"];

const COST_CENTERS_PESSOAL = ["Pessoal", "Moradia", "Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Dívidas", "Investimentos"];
const COST_CENTERS_EMPRESA = ["Material", "Marketing", "Equipamentos", "Frete", "Impostos", "Software", "Fornecedores", "Pró-labore", "Reembolso", "Geral", "Vendas", "Serviços"];

interface FinanceDashboardClientProps {
  initialTransactions: any[];
  initialDebts: any[];
  initialGoals: any[];
  initialReimbursements: any[];
  initialDailyBalances: any[];
  storageMode: "firebase" | "memory";
}

export default function FinanceDashboardClient({
  initialTransactions,
  initialDebts,
  initialGoals,
  initialReimbursements,
  initialDailyBalances,
  storageMode,
}: FinanceDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "daily" | "empresa" | "debts" | "goals" | "insights">("overview");
  const [viewScope, setViewScope] = useState<"consolidado" | "pessoal" | "empresarial">("consolidado");
  const [isPending, startTransition] = useTransition();

  // filters
  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [txCategoryFilter, setTxCategoryFilter] = useState("all");
  const [txScopeFilter, setTxScopeFilter] = useState<"all" | "pessoal" | "empresarial">("all");

  // form tx
  const [txForm, setTxForm] = useState<TransactionInput>({
    description: "",
    amount: 0,
    type: "expense",
    category: "Alimentação",
    sourceOrDestination: "",
    notes: "",
    scope: "pessoal",
    costCenter: "Pessoal",
    isBusinessExpense: false,
    reimbursementStatus: "na",
    projectClient: "",
    taxDeductible: false,
  });

  const [debtForm, setDebtForm] = useState({
    name: "",
    totalAmount: "",
    remainingAmount: "",
    interestRate: "",
    dueDate: "",
    priority: "medium" as "high" | "medium" | "low",
    monthlyPayment: "",
    notes: "",
    scope: "pessoal" as "pessoal" | "empresarial",
  });

  const [goalForm, setGoalForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    deadline: "",
    category: "Lazer",
    scope: "pessoal" as "pessoal" | "empresarial",
  });

  // reimbursement form
  const [reimbForm, setReimbForm] = useState({
    description: "",
    amount: "",
    direction: "empresa_deve_pf" as "empresa_deve_pf" | "pf_deve_empresa" | "pro_labore",
    notes: "",
  });

  // daily balance form
  const todayStr = new Date().toISOString().slice(0, 10);
  const [dailyForm, setDailyForm] = useState<DailyBalanceInput>({
    date: todayStr,
    scope: "consolidado",
    balance: 0,
    spent: 0,
    received: 0,
    account: "",
    description: "",
    notes: "",
  });

  // modals
  const [payDebtModal, setPayDebtModal] = useState<{ debtId: string; name: string; scope: string } | null>(null);
  const [payDebtAmount, setPayDebtAmount] = useState("");
  const [payDebtSource, setPayDebtSource] = useState("");

  const [addFundsModal, setAddFundsModal] = useState<{ goalId: string; name: string } | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [addFundsSource, setAddFundsSource] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const triggerSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(()=>setSuccessMsg(""), 4800); };
  const triggerError = (msg: string) => { setErrorMsg(msg); setTimeout(()=>setErrorMsg(""), 5000); };

  // derived split metrics
  const scopeFilterFn = (t:any) => viewScope === "consolidado" ? true : (t.scope || "pessoal") === viewScope;

  const scopedTransactions = useMemo(()=> initialTransactions.filter(scopeFilterFn), [initialTransactions, viewScope]);
  const scopedDebts = useMemo(()=> initialDebts.filter(d => viewScope === "consolidado" ? true : (d.scope || "pessoal") === viewScope), [initialDebts, viewScope]);
  const scopedGoals = useMemo(()=> initialGoals.filter(g => viewScope === "consolidado" ? true : (g.scope || "pessoal") === viewScope), [initialGoals, viewScope]);

  const totalIncomes = scopedTransactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExpenses = scopedTransactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const netBalance = totalIncomes - totalExpenses;

  // PF / PJ split independent
  const pfTx = initialTransactions.filter(t => (t.scope || "pessoal")==="pessoal");
  const pjTx = initialTransactions.filter(t => (t.scope || "pessoal")==="empresarial");

  const pfIncome = pfTx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const pfExpense = pfTx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const pjIncome = pjTx.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const pjExpense = pjTx.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  const totalDebtsRemaining = scopedDebts.filter(d=>d.status!=="paid").reduce((s,d)=>s+d.remainingAmount,0);
  const totalSavedGoals = scopedGoals.reduce((s,g)=>s+g.currentAmount,0);

  // Reimbursement metrics
  const pendingBusinessExpenses = initialTransactions.filter(t =>
    t.scope === "empresarial" &&
    t.type === "expense" &&
    t.reimbursementStatus === "pendente"
  );
  const totalPendingReimbursement = pendingBusinessExpenses.reduce((s,t)=>s+t.amount,0);

  const openReimbursements = initialReimbursements.filter(r => r.status === "aberto");
  const totalOpenReimb = openReimbursements.reduce((s,r)=>s+r.amount,0);

  // filtered tx list
  const filteredTransactions = initialTransactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.sourceOrDestination.toLowerCase().includes(txSearch.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(txSearch.toLowerCase())) ||
      (t.costCenter && t.costCenter.toLowerCase().includes(txSearch.toLowerCase())) ||
      (t.projectClient && t.projectClient.toLowerCase().includes(txSearch.toLowerCase()));
    const matchesType = txTypeFilter === "all" ? true : t.type === txTypeFilter;
    const matchesCategory = txCategoryFilter === "all" ? true : t.category === txCategoryFilter;
    const matchesScope = txScopeFilter === "all" ? true : (t.scope || "pessoal") === txScopeFilter;
    return matchesSearch && matchesType && matchesCategory && matchesScope;
  });

  // cost center breakdown for empresa
  const empresaExpenses = pjTx.filter(t=>t.type==="expense");
  const costCenterBreakdown = empresaExpenses.reduce((acc:any, t:any)=>{
    const cc = t.costCenter || "Geral";
    acc[cc] = (acc[cc]||0)+t.amount;
    return acc;
  }, {});
  const totalEmpresaExpenseVolume = Object.values(costCenterBreakdown).reduce((a:number,b:any)=>a+b,0) || 1;

  // debts strategies
  const snowballDebts = [...scopedDebts].filter(d=>d.status!=="paid").sort((a,b)=>a.remainingAmount-b.remainingAmount);
  const avalancheDebts = [...scopedDebts].filter(d=>d.status!=="paid").sort((a,b)=>b.interestRate-a.interestRate);

  // daily balances scoped + metrics
  const scopedDaily = initialDailyBalances.filter((d:any)=> viewScope==="consolidado" ? true : d.scope === viewScope || d.scope === "consolidado");
  const lastDaily = scopedDaily[0]; // já vem ordenado desc por data
  const dailyTotalSpent = scopedDaily.reduce((s:number,d:any)=>s+(d.spent||0),0);
  const dailyTotalReceived = scopedDaily.reduce((s:number,d:any)=>s+(d.received||0),0);

  // ACTIONS
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.description || txForm.amount <= 0 || !txForm.sourceOrDestination) {
      triggerError("Preencha descrição, valor e conta origem/destino.");
      return;
    }
    startTransition(async ()=>{
      try{
        await createTransaction(txForm);
        setTxForm({
          description: "",
          amount: 0,
          type: "expense",
          category: txForm.scope === "empresarial" ? "Material" : "Alimentação",
          sourceOrDestination: "",
          notes: "",
          scope: txForm.scope,
          costCenter: txForm.scope === "empresarial" ? "Material" : "Pessoal",
          isBusinessExpense: txForm.scope === "empresarial",
          reimbursementStatus: "na",
          projectClient: "",
          taxDeductible: false,
        });
        triggerSuccess("Transação registrada! PF/PJ organizada.");
      }catch{ triggerError("Erro ao registrar transação."); }
    });
  };

  const handleDeleteTransaction = async (id:string)=>{
    if(!confirm("Excluir esta transação?")) return;
    startTransition(async ()=>{
      try{ await deleteTransaction(id); triggerSuccess("Transação excluída."); }
      catch{ triggerError("Erro ao excluir."); }
    });
  };

  const handleCreateDebt = async (e:React.FormEvent)=>{
    e.preventDefault();
    if(!debtForm.name || !debtForm.totalAmount || !debtForm.remainingAmount || !debtForm.dueDate){
      triggerError("Preencha nome, valores e vencimento."); return;
    }
    startTransition(async ()=>{
      try{
        await createDebt({
          name: debtForm.name,
          totalAmount: parseFloat(debtForm.totalAmount),
          remainingAmount: parseFloat(debtForm.remainingAmount),
          interestRate: parseFloat(debtForm.interestRate||"0"),
          dueDate: new Date(debtForm.dueDate),
          priority: debtForm.priority,
          monthlyPayment: parseFloat(debtForm.monthlyPayment||"0"),
          notes: debtForm.notes,
          scope: debtForm.scope,
        });
        setDebtForm({name:"",totalAmount:"",remainingAmount:"",interestRate:"",dueDate:"",priority:"medium",monthlyPayment:"",notes:"",scope:"pessoal"});
        triggerSuccess("Dívida registrada com escopo PF/PJ!");
      }catch{ triggerError("Erro ao registrar dívida."); }
    });
  };

  const handlePayDebtSubmit = async (e:React.FormEvent)=>{
    e.preventDefault();
    if(!payDebtModal || !payDebtAmount || parseFloat(payDebtAmount)<=0 || !payDebtSource){
      triggerError("Preencha valor e conta origem."); return;
    }
    startTransition(async ()=>{
      try{
        await payDebt(payDebtModal.debtId, parseFloat(payDebtAmount), payDebtSource, payDebtModal.scope as any);
        setPayDebtModal(null); setPayDebtAmount(""); setPayDebtSource("");
        triggerSuccess("Amortização registrada! Despesa automática criada.");
      }catch(err:any){ triggerError(err.message||"Erro ao pagar dívida."); }
    });
  };

  const handleDeleteDebt = async (id:string)=>{
    if(!confirm("Excluir registro desta dívida?")) return;
    startTransition(async ()=>{ try{ await deleteDebt(id); triggerSuccess("Dívida excluída."); }catch{ triggerError("Erro."); }});
  };

  const handleCreateGoal = async (e:React.FormEvent)=>{
    e.preventDefault();
    if(!goalForm.name || !goalForm.targetAmount){ triggerError("Preencha nome e meta."); return;}
    startTransition(async ()=>{
      try{
        await createGoal({
          name: goalForm.name,
          targetAmount: parseFloat(goalForm.targetAmount),
          currentAmount: parseFloat(goalForm.currentAmount||"0"),
          deadline: goalForm.deadline ? new Date(goalForm.deadline) : undefined,
          category: goalForm.category,
          scope: goalForm.scope,
        });
        setGoalForm({name:"",targetAmount:"",currentAmount:"",deadline:"",category:"Lazer",scope:"pessoal"});
        triggerSuccess("Meta criada com sucesso!");
      }catch{ triggerError("Erro ao criar meta."); }
    });
  };

  const handleAddFundsSubmit = async (e:React.FormEvent)=>{
    e.preventDefault();
    if(!addFundsModal || !addFundsAmount || parseFloat(addFundsAmount)<=0 || !addFundsSource){ triggerError("Preencha valor e conta."); return; }
    startTransition(async ()=>{
      try{
        await addFundsToGoal(addFundsModal.goalId, parseFloat(addFundsAmount), addFundsSource);
        setAddFundsModal(null); setAddFundsAmount(""); setAddFundsSource("");
        triggerSuccess("Aporte realizado!");
      }catch(err:any){ triggerError(err.message||"Erro."); }
    });
  };
  const handleDeleteGoal = async (id:string)=>{
    if(!confirm("Excluir meta?")) return;
    startTransition(async ()=>{ try{ await deleteGoal(id); triggerSuccess("Meta excluída."); }catch{ triggerError("Erro."); }});
  };

  // REIMBURSEMENT actions
  const handleCreateReimbursement = async (e:React.FormEvent)=>{
    e.preventDefault();
    if(!reimbForm.description || !reimbForm.amount || parseFloat(reimbForm.amount)<=0){
      triggerError("Preencha descrição e valor do acerto."); return;
    }
    startTransition(async ()=>{
      try{
        // auto attach pending business expenses if empresa_deve_pf
        let relatedIds:string[] = [];
        if(reimbForm.direction === "empresa_deve_pf"){
          relatedIds = pendingBusinessExpenses.map((t:any)=>t.id);
        }
        await createReimbursement({
          description: reimbForm.description,
          amount: parseFloat(reimbForm.amount),
          direction: reimbForm.direction,
          relatedTransactionIds: relatedIds,
          notes: reimbForm.notes,
        });
        setReimbForm({description:"",amount:"",direction:"empresa_deve_pf",notes:""});
        triggerSuccess("Acerto PF↔PJ criado! Agora quite para gerar os lançamentos automáticos.");
      }catch{ triggerError("Erro ao criar acerto."); }
    });
  };

  const handleSettleReimbursement = async (id:string)=>{
    if(!confirm("Confirmar quitação deste acerto? Isso irá gerar lançamentos automáticos PF e PJ e marcar reembolsos como quitados.")) return;
    startTransition(async ()=>{ try{ await settleReimbursement(id); triggerSuccess("Acerto quitado! Lançamentos PF e PJ gerados automaticamente."); }catch{ triggerError("Erro ao quitar."); }});
  };

  const handleDeleteReimbursement = async (id:string)=>{
    if(!confirm("Excluir acerto?")) return;
    startTransition(async ()=>{ try{ await deleteReimbursement(id); triggerSuccess("Acerto excluído."); }catch{ triggerError("Erro."); }});
  };

  const toggleReimbStatus = async (txId:string, current:string)=>{
    const next = current === "pendente" ? "reembolsado" : current === "reembolsado" ? "pendente" : "pendente";
    startTransition(async ()=>{
      try{ await updateReimbursementStatus(txId, next as any); triggerSuccess("Status de reembolso atualizado."); }catch{ triggerError("Erro."); }
    });
  };

  // DAILY BALANCE actions
  const handleCreateDaily = async (e:React.FormEvent)=>{
    e.preventDefault();
    if(!dailyForm.date || !dailyForm.description){
      triggerError("Preencha a data e o descritivo do dia."); return;
    }
    startTransition(async ()=>{
      try{
        await createDailyBalance({
          date: dailyForm.date,
          scope: dailyForm.scope,
          balance: Number(dailyForm.balance)||0,
          spent: Number(dailyForm.spent)||0,
          received: Number(dailyForm.received)||0,
          account: dailyForm.account,
          description: dailyForm.description,
          notes: dailyForm.notes,
        });
        setDailyForm({ date: todayStr, scope:"consolidado", balance:0, spent:0, received:0, account:"", description:"", notes:"" });
        triggerSuccess("Saldo do dia salvo no histórico!");
      }catch(err:any){ triggerError(err.message||"Erro ao salvar saldo do dia."); }
    });
  };

  const handleDeleteDaily = async (id:string)=>{
    if(!confirm("Excluir este registro de saldo diário?")) return;
    startTransition(async ()=>{ try{ await deleteDailyBalance(id); triggerSuccess("Registro excluído."); }catch{ triggerError("Erro."); }});
  };

  // INSIGHTS
  const generateInsights = () => {
    const tips:any[] = [];
    const savingsRate = totalIncomes > 0 ? (netBalance/totalIncomes)*100 : 0;

    if(viewScope==="empresarial" || viewScope==="consolidado"){
      const lucroEmpresa = pjIncome - pjExpense;
      const margem = pjIncome>0 ? (lucroEmpresa/pjIncome)*100 : 0;
      if(pjIncome>0 && margem < 10){
        tips.push({type:"warning", title:"Margem operacional da empresa apertada", desc:`Lucro empresarial atual: R$ ${lucroEmpresa.toFixed(2)} (${margem.toFixed(1)}% de margem). Ideal >20%. Revise custos de Material e Marketing.`, badge:"Empresa"});
      } else if(pjIncome>0){
        tips.push({type:"success", title:"Empresa com margem saudável", desc:`Lucro empresarial: R$ ${lucroEmpresa.toFixed(2)} (${margem.toFixed(1)}%). Continue separando PF e PJ corretamente.`, badge:"Empresa"});
      }
      if(totalPendingReimbursement>0){
        tips.push({type:"danger", title:`R$ ${totalPendingReimbursement.toFixed(2)} de gastos empresariais no PF pendentes`, desc:`Você tem ${pendingBusinessExpenses.length} lançamentos empresariais pagos com conta pessoal aguardando reembolso. Use a aba Empresa → Acerto PF↔PJ para quitar e manter a contabilidade limpa.`, badge:"Reembolso Urgente"});
      }
    }

    if(totalIncomes===0){
      tips.push({type:"warning", title:"Cadastre suas fontes de renda", desc:"Adicione receitas PF e PJ na aba Transações.", badge:"Configuração"});
    } else if(savingsRate<0){
      tips.push({type:"danger", title:"Orçamento Deficitário", desc:`Você gastou R$ ${Math.abs(netBalance).toFixed(2)} a mais do que recebeu no escopo ${viewScope}.`, badge:"Risco Alto"});
    } else if(savingsRate < 15){
      tips.push({type:"warning", title:"Margem de Segurança Estreita", desc:`Taxa de poupança ${savingsRate.toFixed(1)}%. Ideal ≥20%.`, badge:"Atenção"});
    } else {
      tips.push({type:"success", title:"Excelente Capacidade de Poupança!", desc:`Poupando ${savingsRate.toFixed(1)}% das receitas em ${viewScope}.`, badge:"Excelente"});
    }

    if(totalDebtsRemaining>0 && totalIncomes>0){
      const r = totalDebtsRemaining/totalIncomes;
      if(r>3) tips.push({type:"danger", title:"Endividamento Crítico", desc:`Dívidas R$ ${totalDebtsRemaining.toFixed(2)} > 3x renda mensal.`, badge:"Alerta"});
      else if(r>1) tips.push({type:"warning", title:"Endividamento Moderado", desc:`Dívidas equivalem a ${(r*100).toFixed(0)}% da renda mensal.`, badge:"Cuidado"});
      else tips.push({type:"success", title:"Endividamento Saudável", desc:"Dívidas < 1 mês de renda.", badge:"Controle"});
    }

    const activeDebtsWithInterest = scopedDebts.filter((d:any)=>d.status!=="paid" && d.interestRate>0);
    if(activeDebtsWithInterest.length>0){
      const highest = [...activeDebtsWithInterest].sort((a,b)=>b.interestRate-a.interestRate)[0];
      if(highest.interestRate>5){
        tips.push({type:"warning", title:`Juros altos em ${highest.name}`, desc:`Taxa ${highest.interestRate}% a.m. Priorize quitação pelo método Avalanche.`, badge:"Economize Juros"});
      }
    }

    return tips;
  };
  const insightsList = generateInsights();

  // UI helpers
  const currentIncomeCats = txForm.scope === "empresarial" ? INCOME_CATEGORIES_EMPRESA : INCOME_CATEGORIES_PESSOAL;
  const currentExpenseCats = txForm.scope === "empresarial" ? EXPENSE_CATEGORIES_EMPRESA : EXPENSE_CATEGORIES_PESSOAL;
  const currentCostCenters = txForm.scope === "empresarial" ? COST_CENTERS_EMPRESA : COST_CENTERS_PESSOAL;

  return (
    <div className="min-h-screen bg-[#0c0814] text-purple-100 antialiased font-sans selection:bg-purple-600 selection:text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-20 w-full border-b border-purple-900/60 bg-[#120c20]/90 backdrop-blur-md shadow-lg shadow-black/40">
        <div className="mx-auto flex max-w-7xl flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30">
              <Building2 className="h-5 w-5 text-purple-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold tracking-tight text-white">FinançasPro</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-950/80 px-2.5 py-0.5 text-xs font-bold text-purple-300 border border-purple-700/60 shadow-inner">
                  <Moon className="h-3 w-3 text-purple-400" /> Dark Purple • PF + PJ
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border shadow-inner ${storageMode==="firebase" ? "bg-emerald-950/70 text-emerald-300 border-emerald-700/60" : "bg-amber-950/70 text-amber-300 border-amber-700/60"}`}>
                  <Database className="h-3 w-3" /> {storageMode==="firebase" ? "Firebase conectado" : "Modo local (configurar Firebase)"}
                </span>
              </div>
              <p className="text-xs text-purple-300/70 hidden sm:block">Gestão Híbrida Pessoal & Empresarial • Firebase • Reembolso Inteligente</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope switcher */}
            <div className="flex items-center rounded-xl border border-purple-800/70 bg-[#1a1230] p-1 text-xs font-bold shadow-inner mr-2">
              {["consolidado","pessoal","empresarial"].map(s=>(
                <button key={s} onClick={()=>setViewScope(s as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all capitalize ${viewScope===s ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md" : "text-purple-300 hover:text-white"}`}>
                  {s==="consolidado" ? "Consolidado" : s==="pessoal" ? "Pessoal" : "Empresarial"}
                </button>
              ))}
            </div>

            <nav className="flex flex-wrap items-center gap-1">
              {[
                ["overview","Visão Geral"],
                ["daily","Saldo Diário"],
                ["transactions","Transações"],
                ["empresa","Empresa"],
                ["debts","Dívidas"],
                ["goals","Metas"],
                ["insights","Consultor AI"],
              ].map(([key,label])=>(
                <button key={key}
                  onClick={()=>setActiveTab(key as any)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                    activeTab===key
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/30"
                      : "text-purple-300/70 hover:bg-purple-900/40 hover:text-white"
                  }`}
                >
                  {label}
                  {key==="empresa" && totalPendingReimbursement>0 && (
                    <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-pink-500 shadow shadow-pink-500/70 animate-pulse" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* TOASTS */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {successMsg && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-[#14231b] p-4 text-emerald-300 shadow-2xl shadow-emerald-950/50 backdrop-blur-md">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-3 rounded-2xl border border-pink-500/40 bg-[#28121f] p-4 text-pink-300 shadow-2xl shadow-pink-950/50 backdrop-blur-md">
            <AlertTriangle className="h-5 w-5 text-pink-400 flex-shrink-0" />
            <p className="text-sm font-semibold">{errorMsg}</p>
          </div>
        )}
        {isPending && (
          <div className="flex items-center gap-3 rounded-2xl border border-purple-700/50 bg-[#1a1130] p-4 text-purple-200 shadow-2xl backdrop-blur-md">
            <RefreshCw className="h-5 w-5 text-purple-400 animate-spin flex-shrink-0" />
            <p className="text-sm font-semibold">Atualizando registros...</p>
          </div>
        )}
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {/* KPI TOP */}
        <section className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-1 lg:col-span-2 rounded-2xl border border-purple-800/60 bg-gradient-to-br from-[#18112c] to-[#120b22] p-5 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300/70">Saldo {viewScope}</span>
              <span className={`rounded-xl p-2.5 border ${netBalance>=0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30':'bg-pink-500/10 text-pink-400 border-pink-500/30'}`}>
                <DollarSign className="h-4 w-4"/>
              </span>
            </div>
            <h3 className={`mt-4 text-2xl font-black tracking-tight ${netBalance>=0 ? 'text-emerald-400':'text-pink-400'}`}>
              R$ {netBalance.toLocaleString("pt-BR",{minimumFractionDigits:2})}
            </h3>
            <p className="text-xs text-purple-300/70 mt-1">Receitas R$ {totalIncomes.toLocaleString("pt-BR")} • Despesas R$ {totalExpenses.toLocaleString("pt-BR")}</p>
          </div>

          <div className="rounded-2xl border border-purple-800/60 bg-gradient-to-br from-[#18112c] to-[#120b22] p-5 shadow-xl">
            <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-purple-300/70">PF</span><Users className="h-4 w-4 text-purple-300"/></div>
            <p className="mt-3 text-sm font-black text-emerald-400">+ R$ {pfIncome.toLocaleString("pt-BR")}</p>
            <p className="text-sm font-black text-pink-400">- R$ {pfExpense.toLocaleString("pt-BR")}</p>
            <p className="text-[11px] text-purple-300/70 mt-1">Saldo PF: R$ {(pfIncome-pfExpense).toLocaleString("pt-BR")}</p>
          </div>

          <div className="rounded-2xl border border-purple-800/60 bg-gradient-to-br from-[#18112c] to-[#120b22] p-5 shadow-xl">
            <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-purple-300/70">PJ</span><Briefcase className="h-4 w-4 text-purple-300"/></div>
            <p className="mt-3 text-sm font-black text-emerald-400">+ R$ {pjIncome.toLocaleString("pt-BR")}</p>
            <p className="text-sm font-black text-pink-400">- R$ {pjExpense.toLocaleString("pt-BR")}</p>
            <p className="text-[11px] text-purple-300/70 mt-1">Lucro PJ: R$ {(pjIncome-pjExpense).toLocaleString("pt-BR")}</p>
          </div>

          <div className="rounded-2xl border border-purple-800/60 bg-gradient-to-br from-[#18112c] to-[#120b22] p-5 shadow-xl">
            <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-purple-300/70">Reembolso</span><HandCoins className="h-4 w-4 text-amber-400"/></div>
            <p className="mt-3 text-lg font-black text-amber-400">R$ {totalPendingReimbursement.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
            <p className="text-[11px] text-amber-300/80">{pendingBusinessExpenses.length} itens pendentes</p>
          </div>

          <div className="rounded-2xl border border-purple-800/60 bg-gradient-to-br from-[#18112c] to-[#120b22] p-5 shadow-xl">
            <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-purple-300/70">Dívidas</span><CreditCard className="h-4 w-4 text-purple-300"/></div>
            <p className="mt-3 text-lg font-black text-white">R$ {totalDebtsRemaining.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
            <p className="text-[11px] text-purple-300/70">{scopedDebts.filter(d=>d.status!=="paid").length} ativas</p>
          </div>
        </section>

        {/* OVERVIEW TAB */}
        {activeTab==="overview" && (
          <div className="space-y-8">
            {/* PF vs PJ split cards */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h3 className="font-bold text-white text-lg">Fluxo de Caixa • {viewScope}</h3>
                <p className="text-xs text-purple-300/70">Comparativo Entradas x Saídas</p>
                <div className="relative mt-6 flex h-60 w-full items-end justify-around px-4">
                  <div className="absolute inset-0 flex flex-col justify-between opacity-30 pointer-events-none">
                    {[...Array(5)].map((_,i)=><div key={i} className="w-full border-t border-purple-900/50"/>)}
                  </div>
                  <div className="flex flex-col items-center gap-2 z-10">
                    <span className="text-xs font-extrabold text-emerald-400">R$ {totalIncomes.toLocaleString("pt-BR",{maximumFractionDigits:0})}</span>
                    <div style={{height:`${totalIncomes===0?12:Math.min(170, (totalIncomes/Math.max(totalIncomes,totalExpenses||1))*170)}px`}} className="w-20 rounded-t-xl bg-gradient-to-t from-emerald-700 via-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/20"/>
                    <span className="text-xs font-bold text-purple-300">Receitas</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 z-10">
                    <span className="text-xs font-extrabold text-pink-400">R$ {totalExpenses.toLocaleString("pt-BR",{maximumFractionDigits:0})}</span>
                    <div style={{height:`${totalExpenses===0?12:Math.min(170, (totalExpenses/Math.max(totalIncomes,totalExpenses||1))*170)}px`}} className="w-20 rounded-t-xl bg-gradient-to-t from-purple-800 via-pink-600 to-pink-400 shadow-lg shadow-pink-500/20"/>
                    <span className="text-xs font-bold text-purple-300">Despesas</span>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 text-center text-xs border-t border-purple-900/60 pt-4">
                  <div><p className="text-purple-300/70">PF Lucro</p><p className="font-black text-emerald-400">R$ {(pfIncome-pfExpense).toFixed(2)}</p></div>
                  <div><p className="text-purple-300/70">PJ Lucro</p><p className="font-black text-purple-300">R$ {(pjIncome-pjExpense).toFixed(2)}</p></div>
                  <div><p className="text-purple-300/70">Taxa Poup.</p><p className="font-black text-white">{totalIncomes>0 ? ((netBalance/totalIncomes)*100).toFixed(1):0}%</p></div>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h3 className="font-bold text-white">Centro de Custo • Empresa</h3>
                <p className="text-xs text-purple-300/70">Onde o PJ está gastando</p>
                <div className="mt-5 space-y-3">
                  {Object.keys(costCenterBreakdown).length===0 ? (
                    <p className="text-xs text-purple-400 py-6 text-center">Sem despesas empresariais registradas.</p>
                  ) : Object.entries(costCenterBreakdown).sort((a:any,b:any)=>b[1]-a[1]).slice(0,6).map(([cc, amt]:any)=>{
                    const pct = (amt/totalEmpresaExpenseVolume)*100;
                    return (
                      <div key={cc}>
                        <div className="flex justify-between text-xs"><span className="font-bold text-purple-200">{cc}</span><span className="text-purple-300">R$ {amt.toFixed(2)} <span className="text-purple-400 font-bold">({pct.toFixed(0)}%)</span></span></div>
                        <div className="h-2 rounded-full bg-purple-950 border border-purple-800/50 mt-1 overflow-hidden">
                          <div style={{width:`${pct}%`}} className="h-full bg-gradient-to-r from-purple-500 to-pink-500"/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={()=>setActiveTab("empresa")} className="mt-5 w-full rounded-xl border border-purple-700/60 bg-purple-900/30 py-2 text-xs font-bold text-purple-200 hover:bg-purple-800/50 transition-all">Abrir Central Empresa →</button>
              </div>
            </div>

            {/* Reembolso alert */}
            {totalPendingReimbursement>0 && (
              <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-[#2a1a09] to-[#1a1206] p-5 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300"><HandCoins className="h-5 w-5"/></div>
                  <div className="flex-1">
                    <h4 className="font-black text-amber-200">Atenção: R$ {totalPendingReimbursement.toFixed(2)} a reembolsar da empresa para você</h4>
                    <p className="text-xs text-amber-200/80 mt-1">Você pagou {pendingBusinessExpenses.length} despesas empresariais com sua conta pessoal. Gere um acerto PF↔PJ para manter a contabilidade separada e evitar confusão no IR / MEI.</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={()=>setActiveTab("empresa")} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-amber-950 hover:brightness-110">Fazer Acerto Agora</button>
                      <button onClick={()=>setActiveTab("transactions")} className="rounded-xl border border-amber-400/30 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400/10">Ver lançamentos</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* quick actions 3 cols */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* quick tx */}
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4"><div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30"><TrendingUp className="h-5 w-5"/></div><div><h3 className="font-bold text-white">Lançamento Híbrido</h3><p className="text-xs text-purple-300/70">PF ou PJ em 1 clique</p></div></div>
                <form onSubmit={handleCreateTransaction} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
                    {["pessoal","empresarial"].map(sc=>(
                      <button type="button" key={sc} onClick={()=>setTxForm({...txForm, scope: sc as any, category: sc==="empresarial" ? "Material" : "Alimentação", costCenter: sc==="empresarial" ? "Material":"Pessoal", isBusinessExpense: sc==="empresarial"})}
                        className={`col-span-1 rounded-lg py-2 border ${txForm.scope===sc ? "bg-purple-600 text-white border-purple-400" : "bg-[#1d1533] text-purple-300 border-purple-800/60"}`}>
                        {sc==="pessoal" ? "👤 PF" : "🏢 PJ"}
                      </button>
                    ))}
                    <div className="flex items-center justify-center text-purple-400 text-[10px]">escopo</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={()=>setTxForm({...txForm, type:"expense"})} className={`rounded-xl py-2 text-xs font-bold border ${txForm.type==="expense" ? "bg-pink-500/20 border-pink-500/60 text-pink-300":"bg-[#1d1533] border-purple-800/60 text-purple-300"}`}>Despesa</button>
                    <button type="button" onClick={()=>setTxForm({...txForm, type:"income"})} className={`rounded-xl py-2 text-xs font-bold border ${txForm.type==="income" ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300":"bg-[#1d1533] border-purple-800/60 text-purple-300"}`}>Receita</button>
                  </div>

                  <input placeholder="Descrição" value={txForm.description} onChange={e=>setTxForm({...txForm, description:e.target.value})}
                    className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2 text-sm text-purple-100 placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.01" placeholder="Valor R$" value={txForm.amount||""} onChange={e=>setTxForm({...txForm, amount: parseFloat(e.target.value)||0})}
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2 text-sm text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                    <select value={txForm.category} onChange={e=>setTxForm({...txForm, category:e.target.value})}
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-2 py-2 text-sm text-purple-100">
                      {(txForm.type==="income"? currentIncomeCats : currentExpenseCats).map(c=><option key={c} value={c} className="bg-[#150f26]">{c}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={txForm.costCenter} onChange={e=>setTxForm({...txForm, costCenter:e.target.value})}
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-2 py-2 text-xs text-purple-100">
                      {currentCostCenters.map(c=><option key={c} value={c} className="bg-[#150f26]">{c}</option>)}
                    </select>
                    <input placeholder="Cliente / Projeto" value={txForm.projectClient||""} onChange={e=>setTxForm({...txForm, projectClient:e.target.value})}
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2 text-xs text-purple-100 placeholder-purple-400/50"/>
                  </div>
                  <input placeholder="Pago / Recebido onde?" value={txForm.sourceOrDestination} onChange={e=>setTxForm({...txForm, sourceOrDestination:e.target.value})}
                    className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2 text-sm text-purple-100 placeholder-purple-400/50"/>
                  {txForm.scope==="empresarial" && txForm.type==="expense" && (
                    <label className="flex items-center gap-2 text-[11px] text-purple-300">
                      <input type="checkbox" checked={txForm.isBusinessExpense} onChange={e=>setTxForm({...txForm, isBusinessExpense:e.target.checked, reimbursementStatus: e.target.checked ? "pendente" : "na", taxDeductible: e.target.checked})}
                        className="accent-purple-600"/>
                      Pago com conta pessoal? Marcar para reembolso
                    </label>
                  )}
                  <button type="submit" disabled={isPending} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-purple-600/30">Registrar</button>
                </form>
              </div>

              {/* empresa snapshot */}
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"><Building2 className="h-5 w-5"/></div><div><h3 className="font-bold text-white">Empresa Snapshot</h3><p className="text-xs text-purple-300/70">Lucro e centros de custo</p></div></div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-purple-300">Faturamento PJ</span><span className="font-bold text-emerald-400">R$ {pjIncome.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-purple-300">Despesas PJ</span><span className="font-bold text-pink-400">R$ {pjExpense.toFixed(2)}</span></div>
                  <div className="flex justify-between border-t border-purple-900/60 pt-2"><span className="text-white font-bold">Lucro Operacional</span><span className="font-black text-purple-300">R$ {(pjIncome-pjExpense).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-purple-300">A reembolsar PF</span><span className="font-bold text-amber-400">R$ {totalPendingReimbursement.toFixed(2)}</span></div>
                </div>
                <button onClick={()=>setActiveTab("empresa")} className="mt-4 w-full rounded-xl bg-purple-900/40 border border-purple-700/60 py-2 text-xs font-bold text-purple-200 hover:bg-purple-800/60">Abrir Central Empresa</button>
              </div>

              {/* reembolso quick */}
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30"><ArrowLeftRight className="h-5 w-5"/></div><div><h3 className="font-bold text-white">Acerto PF↔PJ</h3><p className="text-xs text-purple-300/70">Reembolso & Pró-labore</p></div></div>
                <p className="text-xs text-purple-300 mb-3">Aberto: <span className="font-bold text-amber-400">R$ {totalOpenReimb.toFixed(2)}</span> • {openReimbursements.length} acertos</p>
                <form onSubmit={handleCreateReimbursement} className="space-y-2">
                  <input placeholder="Descrição do acerto" value={reimbForm.description} onChange={e=>setReimbForm({...reimbForm, description:e.target.value})}
                    className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2 text-xs text-purple-100"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.01" placeholder="Valor" value={reimbForm.amount} onChange={e=>setReimbForm({...reimbForm, amount:e.target.value})}
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2 text-xs text-purple-100"/>
                    <select value={reimbForm.direction} onChange={e=>setReimbForm({...reimbForm, direction:e.target.value as any})}
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-2 py-2 text-xs text-purple-100">
                      <option value="empresa_deve_pf" className="bg-[#150f26]">Empresa → PF</option>
                      <option value="pf_deve_empresa" className="bg-[#150f26]">PF → Empresa</option>
                      <option value="pro_labore" className="bg-[#150f26]">Pró-labore</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2 text-xs font-extrabold text-amber-950">Criar Acerto</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* DAILY BALANCE TAB */}
        {activeTab==="daily" && (
          <div className="space-y-6">
            {/* header metrics */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-purple-800/60 bg-gradient-to-br from-[#18112c] to-[#120b22] p-5 shadow-xl md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300/70">Último saldo registrado</span>
                  <Wallet className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="mt-3 text-3xl font-black text-emerald-400">R$ {lastDaily ? Number(lastDaily.balance).toLocaleString("pt-BR",{minimumFractionDigits:2}) : "0,00"}</p>
                <p className="text-xs text-purple-300/70 mt-1">{lastDaily ? `${new Date(lastDaily.date+"T12:00:00").toLocaleDateString("pt-BR")} • ${lastDaily.account || "conta não informada"}` : "Nenhum registro ainda"}</p>
              </div>
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-5 shadow-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300/70">Gasto no histórico</span>
                <p className="mt-3 text-xl font-black text-pink-400">R$ {dailyTotalSpent.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                <p className="text-[11px] text-purple-300/70">{scopedDaily.length} registros</p>
              </div>
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-5 shadow-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300/70">Recebido no histórico</span>
                <p className="mt-3 text-xl font-black text-emerald-400">R$ {dailyTotalReceived.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                <p className="text-[11px] text-purple-300/70">Escopo: {viewScope}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* form */}
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30"><CalendarDays className="h-5 w-5"/></div>
                  <div><h3 className="font-bold text-white">Registrar Saldo do Dia</h3><p className="text-xs text-purple-300/70">Anote o saldo, o que gastou e como</p></div>
                </div>
                <form onSubmit={handleCreateDaily} className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-purple-300 mb-1">Data *</label>
                      <input type="date" value={dailyForm.date} onChange={e=>setDailyForm({...dailyForm, date:e.target.value})}
                        className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-purple-300 mb-1">Escopo</label>
                      <select value={dailyForm.scope} onChange={e=>setDailyForm({...dailyForm, scope:e.target.value as any})}
                        className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-2 py-2 text-purple-100">
                        <option value="consolidado" className="bg-[#150f26]">Consolidado</option>
                        <option value="pessoal" className="bg-[#150f26]">Pessoal</option>
                        <option value="empresarial" className="bg-[#150f26]">Empresarial</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-300 mb-1">Saldo atual do dia (R$) *</label>
                    <input type="number" step="0.01" placeholder="Ex: 8450.20" value={dailyForm.balance||""} onChange={e=>setDailyForm({...dailyForm, balance: parseFloat(e.target.value)||0})}
                      className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100 text-lg font-bold"/>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-pink-300 mb-1">Gastei hoje (R$)</label>
                      <input type="number" step="0.01" placeholder="0.00" value={dailyForm.spent||""} onChange={e=>setDailyForm({...dailyForm, spent: parseFloat(e.target.value)||0})}
                        className="w-full rounded-xl bg-[#1c1432] border border-pink-800/40 px-3 py-2 text-pink-200"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-300 mb-1">Recebi hoje (R$)</label>
                      <input type="number" step="0.01" placeholder="0.00" value={dailyForm.received||""} onChange={e=>setDailyForm({...dailyForm, received: parseFloat(e.target.value)||0})}
                        className="w-full rounded-xl bg-[#1c1432] border border-emerald-800/40 px-3 py-2 text-emerald-200"/>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-300 mb-1">Conta / Banco</label>
                    <input placeholder="Ex: Itaú, Nubank, Dinheiro" value={dailyForm.account||""} onChange={e=>setDailyForm({...dailyForm, account:e.target.value})}
                      className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-300 mb-1">Descritivo do dia * <span className="text-purple-400/60 font-normal">(o que comprou / recebeu)</span></label>
                    <input placeholder="Ex: Comprei material de produção no cartão" value={dailyForm.description} onChange={e=>setDailyForm({...dailyForm, description:e.target.value})}
                      className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-300 mb-1">Observação detalhada</label>
                    <textarea placeholder="Ex: Foram 3 caixas de insumo na loja X, paguei parcelado em 2x..." value={dailyForm.notes||""} onChange={e=>setDailyForm({...dailyForm, notes:e.target.value})}
                      className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100" rows={3}/>
                  </div>

                  <button type="submit" disabled={isPending} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2">
                    <Save className="h-4 w-4"/> Salvar no Histórico
                  </button>
                </form>
              </div>

              {/* history timeline */}
              <div className="lg:col-span-2 rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-5 w-5 text-purple-400"/>
                  <h3 className="font-bold text-white text-lg">Histórico de Saldos • {viewScope}</h3>
                </div>
                {scopedDaily.length===0 ? (
                  <p className="text-center text-purple-400 py-12 text-sm">Nenhum saldo diário registrado ainda. Use o formulário ao lado para começar.</p>
                ) : (
                  <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                    {scopedDaily.map((d:any, i:number)=>{
                      const prev = scopedDaily[i+1];
                      const diff = prev ? Number(d.balance)-Number(prev.balance) : 0;
                      return (
                        <div key={d.id} className="relative rounded-xl border border-purple-800/60 bg-[#1c1432] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center justify-center rounded-lg bg-purple-900/60 border border-purple-700 px-2.5 py-1.5 min-w-[54px]">
                                <span className="text-lg font-black text-white leading-none">{new Date(d.date+"T12:00:00").getDate()}</span>
                                <span className="text-[9px] uppercase text-purple-300">{new Date(d.date+"T12:00:00").toLocaleDateString("pt-BR",{month:"short"})}</span>
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{d.description}</p>
                                {d.notes && <p className="text-[11px] text-purple-300/80 mt-0.5">{d.notes}</p>}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${ d.scope==="empresarial" ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" : d.scope==="pessoal" ? "bg-purple-900/60 text-purple-300 border-purple-700" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"}`}>{d.scope}</span>
                                  {d.account && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#241a3a] text-purple-300 border border-purple-800/60">{d.account}</span>}
                                  {d.spent>0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30">- R$ {Number(d.spent).toFixed(2)}</span>}
                                  {d.received>0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">+ R$ {Number(d.received).toFixed(2)}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <p className="text-lg font-black text-white">R$ {Number(d.balance).toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                              {prev && (
                                <span className={`text-[10px] font-bold ${diff>=0 ? "text-emerald-400":"text-pink-400"}`}>
                                  {diff>=0 ? "▲ +":"▼ "} R$ {Math.abs(diff).toLocaleString("pt-BR",{minimumFractionDigits:2})} vs dia anterior
                                </span>
                              )}
                              <button onClick={()=>handleDeleteDaily(d.id)} className="text-purple-400 hover:text-pink-300 mt-1"><Trash2 className="h-3.5 w-3.5"/></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab==="transactions" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-5 shadow-xl">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-purple-400"/>
                  <input value={txSearch} onChange={e=>setTxSearch(e.target.value)} placeholder="Buscar descrição, conta, centro de custo, cliente..."
                    className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] pl-10 pr-3 py-2.5 text-sm text-purple-100 placeholder-purple-400/50"/>
                </div>
                <select value={txScopeFilter} onChange={e=>setTxScopeFilter(e.target.value as any)}
                  className="rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2.5 text-sm text-purple-100">
                  <option value="all">PF + PJ</option>
                  <option value="pessoal">Só Pessoal</option>
                  <option value="empresarial">Só Empresarial</option>
                </select>
                <select value={txTypeFilter} onChange={e=>setTxTypeFilter(e.target.value as any)}
                  className="rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2.5 text-sm text-purple-100">
                  <option value="all">Todos tipos</option>
                  <option value="income">Receitas</option>
                  <option value="expense">Despesas</option>
                </select>
                <select value={txCategoryFilter} onChange={e=>setTxCategoryFilter(e.target.value)}
                  className="rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2.5 text-sm text-purple-100">
                  <option value="all">Todas categorias</option>
                  {[...INCOME_CATEGORIES_PESSOAL, ...INCOME_CATEGORIES_EMPRESA, ...EXPENSE_CATEGORIES_PESSOAL, ...EXPENSE_CATEGORIES_EMPRESA].filter((v,i,a)=>a.indexOf(v)===i).map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-800/60 text-xs text-purple-300 uppercase tracking-wider">
                    <th className="py-3 px-3 text-left">Lançamento</th>
                    <th className="py-3 px-3 text-left">Escopo</th>
                    <th className="py-3 px-3 text-left">Categoria / Centro</th>
                    <th className="py-3 px-3 text-left">Conta</th>
                    <th className="py-3 px-3 text-left">Data</th>
                    <th className="py-3 px-3 text-right">Valor</th>
                    <th className="py-3 px-3 text-center">Reembolso</th>
                    <th className="py-3 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/40">
                  {filteredTransactions.map(tx=>(
                    <tr key={tx.id} className="hover:bg-purple-900/20">
                      <td className="py-3 px-3">
                        <p className="font-bold text-white flex items-center gap-2">
                          {tx.type==="income" ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400"/> : <ArrowDownRight className="h-3.5 w-3.5 text-pink-400"/>}
                          {tx.description}
                        </p>
                        {tx.projectClient && <p className="text-[10px] text-purple-400 pl-5">Cliente: {tx.projectClient}</p>}
                        {tx.notes && <p className="text-[10px] text-purple-400/70 pl-5">{tx.notes}</p>}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${ (tx.scope||"pessoal")==="empresarial" ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40":"bg-purple-900/60 text-purple-300 border-purple-700/60"}`}>
                          {(tx.scope||"pessoal")==="empresarial" ? "🏢 PJ" : "👤 PF"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-purple-200 text-xs font-semibold">{tx.category}</span>
                        <div className="text-[10px] text-purple-400">{tx.costCenter || "-"}{tx.taxDeductible ? " • dedutível" : ""}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-purple-300">{tx.sourceOrDestination}</td>
                      <td className="py-3 px-3 text-xs text-purple-400">{new Date(tx.date).toLocaleDateString("pt-BR")}</td>
                      <td className={`py-3 px-3 text-right font-black ${tx.type==="income"?"text-emerald-400":"text-pink-400"}`}>{tx.type==="income"?"+":"-"} R$ {tx.amount.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                      <td className="py-3 px-3 text-center">
                        {tx.reimbursementStatus && tx.reimbursementStatus!=="na" ? (
                          <button onClick={()=>toggleReimbStatus(tx.id, tx.reimbursementStatus)}
                            className={`text-[10px] px-2 py-1 rounded-full font-bold border ${
                              tx.reimbursementStatus==="pendente" ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : tx.reimbursementStatus==="reembolsado" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-purple-900/60 text-purple-300 border-purple-700"
                            }`}>
                            {tx.reimbursementStatus}
                          </button>
                        ) : <span className="text-[10px] text-purple-500">—</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button onClick={()=>handleDeleteTransaction(tx.id)} className="text-purple-400 hover:text-pink-300"><Trash2 className="h-4 w-4"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length===0 && <p className="text-center text-purple-400 py-10 text-sm">Nenhuma transação encontrada.</p>}
            </div>
          </div>
        )}

        {/* EMPRESA TAB */}
        {activeTab==="empresa" && (
          <div className="space-y-6">
            {/* summary cards empresa */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-4 shadow-xl">
                <p className="text-xs text-purple-300/70 font-bold uppercase">Faturamento PJ</p>
                <p className="text-xl font-black text-emerald-400 mt-2">R$ {pjIncome.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-4 shadow-xl">
                <p className="text-xs text-purple-300/70 font-bold uppercase">Despesas PJ</p>
                <p className="text-xl font-black text-pink-400 mt-2">R$ {pjExpense.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-4 shadow-xl">
                <p className="text-xs text-purple-300/70 font-bold uppercase">Lucro Operacional</p>
                <p className="text-xl font-black text-purple-300 mt-2">R$ {(pjIncome-pjExpense).toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/40 bg-[#221807] p-4 shadow-xl">
                <p className="text-xs text-amber-300/80 font-bold uppercase">A Reembolsar PF</p>
                <p className="text-xl font-black text-amber-400 mt-2">R$ {totalPendingReimbursement.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* pending reimbursements list */}
              <div className="lg:col-span-2 rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h3 className="font-bold text-white text-lg flex items-center gap-2"><HandCoins className="h-5 w-5 text-amber-400"/> Gastos empresariais pagos com PF</h3>
                <p className="text-xs text-purple-300/70 mb-4">Marque como reembolsado após o acerto, ou gere um acerto automático.</p>
                {pendingBusinessExpenses.length===0 ? (
                  <div className="text-center py-10 text-emerald-300 text-sm">
                    <BadgeCheck className="h-8 w-8 mx-auto mb-2 text-emerald-400"/>
                    Nenhuma pendência! Sua separação PF/PJ está em dia.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-auto pr-2">
                    {pendingBusinessExpenses.map((tx:any)=>(
                      <div key={tx.id} className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                        <div>
                          <p className="text-sm font-bold text-white">{tx.description}</p>
                          <p className="text-[11px] text-amber-200">{tx.costCenter} • {tx.projectClient || "Sem projeto"} • {new Date(tx.date).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="font-black text-amber-300">R$ {tx.amount.toFixed(2)}</p>
                            <p className="text-[10px] text-amber-200/80">{tx.taxDeductible ? "Dedutível" : ""}</p>
                          </div>
                          <button onClick={()=>toggleReimbStatus(tx.id, tx.reimbursementStatus)} className="text-[10px] px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold hover:bg-amber-500/30">Marcar reemb.</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 border-t border-purple-900/60 pt-4 flex items-center justify-between">
                  <p className="text-sm text-purple-200">Total pendente: <span className="font-black text-amber-400">R$ {totalPendingReimbursement.toFixed(2)}</span></p>
                  <button
                    onClick={()=>{
                      setReimbForm({
                        description: `Acerto automático ${new Date().toLocaleDateString("pt-BR")} - ${pendingBusinessExpenses.length} itens`,
                        amount: totalPendingReimbursement.toFixed(2),
                        direction: "empresa_deve_pf",
                        notes: "Gerado automaticamente pela Central Empresa"
                      });
                      window.scrollTo({top:0, behavior:"smooth"});
                      triggerSuccess("Formulário de acerto preenchido automaticamente. Revise e clique em Criar Acerto.");
                    }}
                    disabled={totalPendingReimbursement===0}
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-extrabold text-amber-950 disabled:opacity-40"
                  >
                    Gerar acerto automático
                  </button>
                </div>
              </div>

              {/* acerto form + list */}
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h3 className="font-bold text-white mb-2">Novo Acerto PF↔PJ</h3>
                <form onSubmit={handleCreateReimbursement} className="space-y-3">
                  <input value={reimbForm.description} onChange={e=>setReimbForm({...reimbForm, description:e.target.value})} placeholder="Ex: Reembolso material março"
                    className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2 text-sm text-purple-100"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.01" value={reimbForm.amount} onChange={e=>setReimbForm({...reimbForm, amount:e.target.value})} placeholder="Valor R$"
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2 text-sm text-purple-100"/>
                    <select value={reimbForm.direction} onChange={e=>setReimbForm({...reimbForm, direction:e.target.value as any})}
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-2 py-2 text-xs text-purple-100">
                      <option value="empresa_deve_pf">Empresa → PF</option>
                      <option value="pf_deve_empresa">PF → Empresa</option>
                      <option value="pro_labore">Pró-labore</option>
                    </select>
                  </div>
                  <textarea value={reimbForm.notes} onChange={e=>setReimbForm({...reimbForm, notes:e.target.value})} placeholder="Observações (opcional)"
                    className="w-full rounded-xl border border-purple-800/60 bg-[#1c1432] px-3 py-2 text-xs text-purple-100" rows={2}/>
                  <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-xs font-extrabold text-white">Criar Acerto</button>
                </form>

                <div className="mt-5 border-t border-purple-900/60 pt-4">
                  <h4 className="text-xs font-bold text-purple-300 uppercase mb-2">Acertos abertos</h4>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {openReimbursements.length===0 ? <p className="text-xs text-purple-400">Nenhum acerto aberto.</p> :
                      openReimbursements.map((r:any)=>(
                        <div key={r.id} className="rounded-xl border border-purple-800/60 bg-[#1c1432] p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-white">{r.description}</p>
                              <p className="text-[10px] text-purple-300">{r.direction.replaceAll("_"," ")} • R$ {r.amount.toFixed(2)}</p>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={()=>handleSettleReimbursement(r.id)} className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">Quitar</button>
                              <button onClick={()=>handleDeleteReimbursement(r.id)} className="text-[10px] px-2 py-1 rounded bg-pink-500/10 text-pink-300">x</button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* cost center table */}
            <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
              <h3 className="font-bold text-white text-lg mb-4">DRE Simplificado • Empresa</h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-bold text-emerald-400 mb-2">Receitas PJ</h4>
                  {pjTx.filter(t=>t.type==="income").slice(0,5).map((t:any)=>(
                    <div key={t.id} className="flex justify-between py-1 border-b border-purple-900/40 text-purple-200">
                      <span>{t.description}</span><span className="font-bold text-emerald-400">R$ {t.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-black text-white"><span>Total Receitas</span><span>R$ {pjIncome.toFixed(2)}</span></div>
                </div>
                <div>
                  <h4 className="font-bold text-pink-400 mb-2">Despesas por Centro de Custo</h4>
                  {Object.entries(costCenterBreakdown).sort((a:any,b:any)=>b[1]-a[1]).map(([cc, amt]:any)=>(
                    <div key={cc} className="flex justify-between py-1 border-b border-purple-900/40 text-purple-200">
                      <span>{cc}</span><span className="font-bold text-pink-400">R$ {amt.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-black text-white"><span>Total Despesas</span><span>R$ {pjExpense.toFixed(2)}</span></div>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-purple-900/30 border border-purple-700/50 flex justify-between items-center">
                <span className="font-bold text-purple-200">Lucro Operacional PJ</span>
                <span className="text-lg font-black text-white">R$ {(pjIncome-pjExpense).toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-purple-400 mt-3">Dica: mantenha pelo menos 20% do lucro como caixa de giro da empresa (meta: R$ { (pjIncome*0.2).toFixed(2) } / mês). Use a aba Metas → escopo Empresarial para acompanhar.</p>
            </div>
          </div>
        )}

        {/* DEBTS TAB */}
        {activeTab==="debts" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-r from-[#21123d] to-[#170e2c] p-6 shadow-xl">
              <h3 className="text-lg font-black text-white">Organizador de Dívidas • {viewScope}</h3>
              <p className="text-sm text-purple-200/90">Bola de Neve vs Avalanche • Agora com filtro PF/PJ</p>
            </div>

            {/* pay debt modal */}
            {payDebtModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                <div className="w-full max-w-md rounded-2xl bg-[#160f29] p-6 shadow-2xl border border-purple-600/60">
                  <h3 className="text-lg font-black text-white">Amortizar Dívida</h3>
                  <p className="text-xs text-purple-300 mt-1">{payDebtModal.name} • Escopo: {payDebtModal.scope}</p>
                  <form onSubmit={handlePayDebtSubmit} className="mt-4 space-y-4">
                    <input type="number" step="0.01" placeholder="Valor R$" value={payDebtAmount} onChange={e=>setPayDebtAmount(e.target.value)}
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1d1533] px-3.5 py-2 text-sm text-purple-100" required autoFocus/>
                    <input type="text" placeholder="Conta origem" value={payDebtSource} onChange={e=>setPayDebtSource(e.target.value)}
                      className="w-full rounded-xl border border-purple-800/60 bg-[#1d1533] px-3.5 py-2 text-sm text-purple-100" required/>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={()=>setPayDebtModal(null)} className="rounded-xl border border-purple-800/60 px-4 py-2 text-xs font-bold text-purple-300">Cancelar</button>
                      <button type="submit" className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white">Confirmar</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h4 className="font-extrabold text-white">❄️ Bola de Neve</h4>
                <p className="text-2xs text-purple-300/70 mb-3">Menores dívidas primeiro</p>
                {snowballDebts.map((d:any,i:number)=>(
                  <div key={d.id} className="flex justify-between items-center rounded-xl bg-[#1c1432] border border-purple-800/60 p-3 mb-2">
                    <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-purple-600 text-[10px] font-bold text-white flex items-center justify-center">{i+1}</span>
                      <div><p className="text-xs font-bold text-white">{d.name}</p><p className="text-[10px] text-purple-300">{d.scope} • {d.interestRate}% a.m.</p></div>
                    </div>
                    <p className="text-xs font-black text-pink-400">R$ {d.remainingAmount.toFixed(2)}</p>
                  </div>
                ))}
                {snowballDebts.length===0 && <p className="text-xs text-purple-400">Sem dívidas ativas neste escopo.</p>}
              </div>
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h4 className="font-extrabold text-white">⚡ Avalanche</h4>
                <p className="text-2xs text-purple-300/70 mb-3">Maiores juros primeiro</p>
                {avalancheDebts.map((d:any,i:number)=>(
                  <div key={d.id} className="flex justify-between items-center rounded-xl bg-[#1c1432] border border-purple-800/60 p-3 mb-2">
                    <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-emerald-600 text-[10px] font-bold text-white flex items-center justify-center">{i+1}</span>
                      <div><p className="text-xs font-bold text-white">{d.name}</p><p className="text-[10px] text-pink-400 font-bold">{d.interestRate}% a.m. • {d.scope}</p></div>
                    </div>
                    <p className="text-xs font-black text-pink-400">R$ {d.remainingAmount.toFixed(2)}</p>
                  </div>
                ))}
                {avalancheDebts.length===0 && <p className="text-xs text-purple-400">Sem dívidas ativas neste escopo.</p>}
              </div>
            </div>

            {/* debts list + form */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h3 className="font-bold text-white text-lg mb-3">Dívidas • {viewScope}</h3>
                <div className="space-y-3">
                  {scopedDebts.map((debt:any)=>{
                    const pct = ((debt.totalAmount - debt.remainingAmount)/debt.totalAmount)*100;
                    const isPaid = debt.remainingAmount<=0 || debt.status==="paid";
                    return (
                      <div key={debt.id} className="rounded-xl border border-purple-800/60 bg-[#1c1432] p-4">
                        <div className="flex justify-between items-start">
                          <div><p className="font-bold text-white text-sm">{debt.name} <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/70 border border-purple-700 text-purple-300 ml-2">{debt.scope||"pessoal"}</span></p>
                          <p className="text-xs text-purple-300">{debt.notes}</p></div>
                          <div className="flex gap-2">
                            {!isPaid && <button onClick={()=>{setPayDebtModal({debtId:debt.id, name:debt.name, scope: debt.scope||"pessoal"}); setPayDebtAmount((debt.monthlyPayment||100).toString());}} className="text-[11px] px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold">Amortizar</button>}
                            <button onClick={()=>handleDeleteDebt(debt.id)} className="text-purple-400 hover:text-pink-300"><Trash2 className="h-4 w-4"/></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[11px] mt-3 text-purple-300">
                          <div>Total: <b className="text-white">R$ {debt.totalAmount.toFixed(2)}</b></div>
                          <div>Restante: <b className={isPaid?"text-emerald-400":"text-pink-400"}>R$ {debt.remainingAmount.toFixed(2)}</b></div>
                          <div>Juros: <b className="text-white">{debt.interestRate}% a.m.</b></div>
                          <div>Venc: <b className="text-white">{new Date(debt.dueDate).toLocaleDateString("pt-BR")}</b></div>
                        </div>
                        <div className="h-2 bg-purple-950 rounded-full mt-3 overflow-hidden border border-purple-800/50">
                          <div style={{width:`${Math.min(100, Math.max(3,pct))}%`}} className={`h-full ${isPaid ? "bg-emerald-500":"bg-gradient-to-r from-purple-500 to-pink-500"}`}/>
                        </div>
                      </div>
                    );
                  })}
                  {scopedDebts.length===0 && <p className="text-purple-400 text-sm text-center py-8">Nenhuma dívida neste escopo.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h3 className="font-bold text-white mb-3">Nova Dívida</h3>
                <form onSubmit={handleCreateDebt} className="space-y-3 text-sm">
                  <div className="flex gap-2 text-[11px] font-bold">
                    <button type="button" onClick={()=>setDebtForm({...debtForm, scope:"pessoal"})} className={`flex-1 py-2 rounded-xl border ${debtForm.scope==="pessoal" ? "bg-purple-600 text-white border-purple-400":"bg-[#1c1432] text-purple-300 border-purple-800/60"}`}>👤 PF</button>
                    <button type="button" onClick={()=>setDebtForm({...debtForm, scope:"empresarial"})} className={`flex-1 py-2 rounded-xl border ${debtForm.scope==="empresarial" ? "bg-indigo-600 text-white border-indigo-400":"bg-[#1c1432] text-purple-300 border-purple-800/60"}`}>🏢 PJ</button>
                  </div>
                  <input placeholder="Nome do credor" value={debtForm.name} onChange={e=>setDebtForm({...debtForm, name:e.target.value})} className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.01" placeholder="Total R$" value={debtForm.totalAmount} onChange={e=>setDebtForm({...debtForm, totalAmount:e.target.value})} className="rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                    <input type="number" step="0.01" placeholder="Restante R$" value={debtForm.remainingAmount} onChange={e=>setDebtForm({...debtForm, remainingAmount:e.target.value})} className="rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.1" placeholder="Juros % a.m." value={debtForm.interestRate} onChange={e=>setDebtForm({...debtForm, interestRate:e.target.value})} className="rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                    <input type="number" step="0.01" placeholder="Parcela R$" value={debtForm.monthlyPayment} onChange={e=>setDebtForm({...debtForm, monthlyPayment:e.target.value})} className="rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                  </div>
                  <input type="date" value={debtForm.dueDate} onChange={e=>setDebtForm({...debtForm, dueDate:e.target.value})} className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                  <textarea placeholder="Observações" value={debtForm.notes} onChange={e=>setDebtForm({...debtForm, notes:e.target.value})} className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100" rows={2}/>
                  <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 font-extrabold text-white">Registrar Dívida</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* GOALS TAB */}
        {activeTab==="goals" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h3 className="font-bold text-white text-lg mb-4">Metas • {viewScope}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {scopedGoals.map((goal:any)=>{
                    const pct = (goal.currentAmount/goal.targetAmount)*100;
                    return (
                      <div key={goal.id} className="rounded-xl border border-purple-800/60 bg-[#1c1432] p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/70 border border-purple-700 text-purple-300">{goal.scope||"pessoal"} • {goal.category}</span>
                            <p className="font-bold text-white mt-1">{goal.name}</p>
                          </div>
                          <button onClick={()=>handleDeleteGoal(goal.id)} className="text-purple-400 hover:text-pink-300"><Trash2 className="h-4 w-4"/></button>
                        </div>
                        <div className="mt-3 text-xs text-purple-300 flex justify-between"><span>R$ {goal.currentAmount.toFixed(2)}</span><span>R$ {goal.targetAmount.toFixed(2)}</span></div>
                        <div className="h-2 bg-purple-950 rounded-full mt-1 overflow-hidden"><div style={{width:`${Math.min(100,pct)}%`}} className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"/></div>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-[11px] text-purple-400 font-bold">{pct.toFixed(0)}%</span>
                          <button onClick={()=>{setAddFundsModal({goalId:goal.id, name:goal.name}); setAddFundsAmount("200");}} className="text-[11px] px-3 py-1.5 rounded-lg bg-purple-900/60 border border-purple-700 text-purple-200 font-bold">Aportar</button>
                        </div>
                      </div>
                    );
                  })}
                  {scopedGoals.length===0 && <p className="text-purple-400 text-sm">Nenhuma meta neste escopo.</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h3 className="font-bold text-white mb-3">Nova Meta</h3>
                <form onSubmit={handleCreateGoal} className="space-y-3 text-sm">
                  <div className="flex gap-2 text-[11px] font-bold">
                    <button type="button" onClick={()=>setGoalForm({...goalForm, scope:"pessoal"})} className={`flex-1 py-2 rounded-xl border ${goalForm.scope==="pessoal" ? "bg-purple-600 text-white border-purple-400":"bg-[#1c1432] text-purple-300 border-purple-800/60"}`}>PF</button>
                    <button type="button" onClick={()=>setGoalForm({...goalForm, scope:"empresarial"})} className={`flex-1 py-2 rounded-xl border ${goalForm.scope==="empresarial" ? "bg-indigo-600 text-white border-indigo-400":"bg-[#1c1432] text-purple-300 border-purple-800/60"}`}>PJ</button>
                  </div>
                  <input placeholder="Nome da meta" value={goalForm.name} onChange={e=>setGoalForm({...goalForm, name:e.target.value})} className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Meta R$" value={goalForm.targetAmount} onChange={e=>setGoalForm({...goalForm, targetAmount:e.target.value})} className="rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                    <input type="number" placeholder="Já tenho R$" value={goalForm.currentAmount} onChange={e=>setGoalForm({...goalForm, currentAmount:e.target.value})} className="rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                  </div>
                  <input type="date" value={goalForm.deadline} onChange={e=>setGoalForm({...goalForm, deadline:e.target.value})} className="w-full rounded-xl bg-[#1c1432] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                  <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 font-extrabold text-white">Criar Meta</button>
                </form>
              </div>
            </div>

            {addFundsModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                <div className="bg-[#160f29] border border-purple-600/60 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="font-black text-white text-lg">Aportar na Meta</h3>
                  <p className="text-xs text-purple-300">{addFundsModal.name}</p>
                  <form onSubmit={handleAddFundsSubmit} className="mt-4 space-y-3">
                    <input type="number" step="0.01" value={addFundsAmount} onChange={e=>setAddFundsAmount(e.target.value)} placeholder="Valor R$"
                      className="w-full rounded-xl bg-[#1d1533] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                    <input type="text" value={addFundsSource} onChange={e=>setAddFundsSource(e.target.value)} placeholder="Conta origem"
                      className="w-full rounded-xl bg-[#1d1533] border border-purple-800/60 px-3 py-2 text-purple-100"/>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={()=>setAddFundsModal(null)} className="px-4 py-2 rounded-xl border border-purple-800/60 text-purple-300 text-xs font-bold">Cancelar</button>
                      <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold">Confirmar</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INSIGHTS TAB */}
        {activeTab==="insights" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
              <h3 className="font-bold text-white text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-400"/> Diagnóstico PF + PJ • {viewScope}</h3>
              <div className="mt-5 space-y-3">
                {insightsList.map((ins:any,i:number)=>(
                  <div key={i} className={`rounded-xl border p-4 ${
                    ins.type==="danger" ? "border-pink-500/40 bg-pink-500/5" :
                    ins.type==="warning" ? "border-amber-500/40 bg-amber-500/5" :
                    ins.type==="success" ? "border-emerald-500/40 bg-emerald-500/5" :
                    "border-purple-600/40 bg-purple-600/5"
                  }`}>
                    <div className="flex items-start gap-3">
                      {ins.type==="danger" && <AlertTriangle className="h-5 w-5 text-pink-400 mt-0.5"/>}
                      {ins.type==="warning" && <Info className="h-5 w-5 text-amber-400 mt-0.5"/>}
                      {ins.type==="success" && <Award className="h-5 w-5 text-emerald-400 mt-0.5"/>}
                      {ins.type==="info" && <Lightbulb className="h-5 w-5 text-purple-400 mt-0.5"/>}
                      <div>
                        <p className="font-bold text-white text-sm">{ins.title} <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c1432] border border-purple-800/60 text-purple-300 ml-2">{ins.badge}</span></p>
                        <p className="text-xs text-purple-200/90 mt-1">{ins.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h4 className="font-bold text-white mb-3">Regra 50/30/20 • {viewScope}</h4>
                <div className="space-y-3 text-xs">
                  <div><div className="flex justify-between text-purple-200"><span>50% Essenciais</span><span>R$ {(totalIncomes*0.5).toFixed(2)}</span></div><div className="h-2 bg-purple-950 rounded-full mt-1"><div className="h-full w-1/2 bg-purple-500 rounded-full"/></div></div>
                  <div><div className="flex justify-between text-purple-200"><span>30% Estilo</span><span>R$ {(totalIncomes*0.3).toFixed(2)}</span></div><div className="h-2 bg-purple-950 rounded-full mt-1"><div className="h-full w-[30%] bg-pink-500 rounded-full"/></div></div>
                  <div><div className="flex justify-between text-purple-200"><span>20% Futuro</span><span>R$ {(totalIncomes*0.2).toFixed(2)}</span></div><div className="h-2 bg-purple-950 rounded-full mt-1"><div className="h-full w-[20%] bg-emerald-500 rounded-full"/></div></div>
                </div>
              </div>
              <div className="rounded-2xl border border-purple-800/60 bg-[#150f26] p-6 shadow-xl">
                <h4 className="font-bold text-white mb-3">Checklist Separação PF/PJ</h4>
                <ul className="text-xs text-purple-200 space-y-2">
                  <li className="flex gap-2"><CheckCircle2 className={`h-4 w-4 ${pjIncome>0 ? "text-emerald-400":"text-purple-500"}`}/> Receitas da empresa marcadas como <b>Empresarial</b></li>
                  <li className="flex gap-2"><CheckCircle2 className={`h-4 w-4 ${pendingBusinessExpenses.length>0 ? "text-amber-400":"text-emerald-400"}`}/> Gastos empresariais no PF {pendingBusinessExpenses.length>0 ? `(${pendingBusinessExpenses.length} pendentes)` : "(ok)"}</li>
                  <li className="flex gap-2"><CheckCircle2 className={`h-4 w-4 ${totalOpenReimb>0 ? "text-amber-400":"text-emerald-400"}`}/> Acertos PF↔PJ em dia</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-purple-400"/> Centro de custo preenchido nas despesas PJ</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-purple-400"/> Pró-labore registrado mensalmente</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-purple-900/60 bg-[#0e0918] py-8 text-center text-xs text-purple-400">
        <p className="font-semibold text-purple-300">© 2026 FinançasPro • Dark Purple • Edição Híbrida PF + PJ</p>
        <p className="mt-1 text-purple-400/70">Separação inteligente de contas pessoais e empresariais • Reembolso automático • DRE simplificado</p>
      </footer>
    </div>
  );
}

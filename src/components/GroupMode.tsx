import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Utensils,
  Shirt,
  Home,
  Car,
  PartyPopper,
  MoreHorizontal,
  Calculator,
  Check,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberManager } from "@/components/MemberManager";
import { SettlementStats } from "@/components/SettlementStats";
import {
  type Member,
  type GroupExpense,
  type Settlement,
  getMembers,
  setMembers as saveMembers,
  getGroupExpenses,
  addGroupExpense,
  deleteGroupExpense,
  calculateSettlements,
  getSettlements,
  setSettlements as saveSettlements,
  CATEGORIES,
} from "@/lib/store";

const ICON_MAP = { Utensils, Shirt, Home, Car, PartyPopper, MoreHorizontal } as const;

export function GroupMode() {
  const [members, setMembersState] = useState<Member[]>(() => getMembers());
  const [expenses, setExpenses] = useState<GroupExpense[]>(() => getGroupExpenses());
  const [settlements, setSettlementsState] = useState<Settlement[]>(() => getSettlements());
  const [showForm, setShowForm] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [settleTab, setSettleTab] = useState<"transfers" | "stats">("transfers");

  // form state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [payerId, setPayerId] = useState("");
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [showPayerDropdown, setShowPayerDropdown] = useState(false);

  const resetForm = () => {
    setAmount("");
    setCategory("food");
    setPayerId("");
    setSplitAmong([]);
    setShowForm(false);
    setShowPayerDropdown(false);
  };

  const openForm = () => {
    const allIds = members.map((m) => m.id);
    setSplitAmong(allIds);
    setPayerId(members[0]?.id || "");
    setShowForm(true);
  };

  const toggleSplit = (id: string) => {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    if (!payerId || !amount || Number(amount) <= 0 || splitAmong.length === 0) return;
    const updated = addGroupExpense({
      amount: Number(amount),
      category,
      payerId,
      splitAmong,
      date: new Date().toISOString(),
    });
    setExpenses(updated);
    resetForm();
  };

  const handleDelete = (id: string) => {
    const updated = deleteGroupExpense(id);
    setExpenses(updated);
  };

  const handleSettle = () => {
    const s = calculateSettlements(expenses, members);
    saveSettlements(s);
    setSettlementsState(s);
    setShowSettle(true);
  };

  const toggleSettled = (idx: number) => {
    const updated = [...settlements];
    updated[idx] = { ...updated[idx], settled: !updated[idx].settled };
    saveSettlements(updated);
    setSettlementsState(updated);
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  const memberEmoji = (id: string) => members.find((m) => m.id === id)?.emoji ?? "👤";
  const perPerson = splitAmong.length > 0 && Number(amount) > 0
    ? Math.round((Number(amount) / splitAmong.length) * 100) / 100
    : 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Member Manager */}
      <div className="ios-card p-4">
        <MemberManager members={members} onUpdate={setMembersState} />
      </div>

      {members.length > 0 && (
        <>
          {/* Actions */}
          <div className="flex gap-3">
            <AnimatePresence>
              {!showForm && (
                <motion.div className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button variant="ios" size="lg" className="w-full" onClick={openForm}>
                    <Plus className="w-5 h-5" /> 新增團體支出
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            {expenses.length > 0 && !showForm && (
              <Button variant="iosSecondary" size="lg" onClick={handleSettle}>
                <Calculator className="w-5 h-5" /> 結算
              </Button>
            )}
          </div>

          {/* Add Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                className="ios-card p-4 flex flex-col gap-4"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                {/* Category */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">類別</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = ICON_MAP[cat.icon];
                      return (
                        <button
                          key={cat.key}
                          onClick={() => setCategory(cat.key)}
                          className={`touch-target flex flex-col items-center justify-center gap-1 rounded-xl p-2 transition-all active:scale-95 text-sm ${
                            category === cat.key
                              ? "bg-ios-blue text-primary-foreground shadow"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">金額</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-12 rounded-xl bg-secondary px-4 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all"
                  />
                </div>

                {/* Payer Dropdown */}
                <div className="relative">
                  <label className="text-sm text-muted-foreground mb-1 block">付款人</label>
                  <button
                    onClick={() => setShowPayerDropdown(!showPayerDropdown)}
                    className="w-full h-12 rounded-xl bg-secondary px-4 flex items-center justify-between text-foreground"
                  >
                    <span>
                      {payerId
                        ? `${memberEmoji(payerId)} ${memberName(payerId)}`
                        : "選擇付款人"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showPayerDropdown ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showPayerDropdown && (
                      <motion.div
                        className="absolute z-10 top-full mt-1 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                      >
                        {members.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => { setPayerId(m.id); setShowPayerDropdown(false); }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-accent transition-colors ${
                              payerId === m.id ? "bg-accent" : ""
                            }`}
                          >
                            <span className="text-lg">{m.emoji}</span>
                            <span className="text-foreground font-medium">{m.name}</span>
                            {payerId === m.id && <Check className="w-4 h-4 text-ios-blue ml-auto" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Split Among */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-muted-foreground">分擔者</label>
                    <button
                      onClick={() =>
                        setSplitAmong(
                          splitAmong.length === members.length ? [] : members.map((m) => m.id)
                        )
                      }
                      className="text-xs font-medium text-ios-blue"
                    >
                      {splitAmong.length === members.length ? "取消全選" : "全選"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => {
                      const selected = splitAmong.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleSplit(m.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                            selected
                              ? "bg-ios-blue text-primary-foreground shadow"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          <span>{m.emoji}</span>
                          <span>{m.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Per person */}
                {perPerson > 0 && (
                  <motion.div
                    className="bg-secondary rounded-xl p-3 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <p className="text-sm text-muted-foreground">
                      每人分擔 <span className="font-bold text-foreground text-lg">${perPerson}</span>
                    </p>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <Button variant="iosSecondary" size="lg" className="flex-1" onClick={resetForm}>
                    取消
                  </Button>
                  <Button
                    variant="ios"
                    size="lg"
                    className="flex-1"
                    onClick={handleAdd}
                    disabled={!payerId || !amount || Number(amount) <= 0 || splitAmong.length === 0}
                  >
                    確認
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settlement Modal */}
          <AnimatePresence>
            {showSettle && settlements.length > 0 && (
              <motion.div
                className="ios-card p-4 flex flex-col gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground text-lg">結算清單</p>
                  <Button variant="iosGhost" size="sm" onClick={() => setShowSettle(false)}>
                    關閉
                  </Button>
                </div>
                {settlements.map((s, i) => (
                  <motion.div
                    key={`${s.from}-${s.to}`}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      s.settled ? "bg-ios-green/10" : "bg-secondary"
                    }`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {memberEmoji(s.from)} {memberName(s.from)} → {memberEmoji(s.to)} {memberName(s.to)}
                      </p>
                      <p className="text-lg font-bold text-foreground">${s.amount}</p>
                    </div>
                    <button
                      onClick={() => toggleSettled(i)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        s.settled
                          ? "bg-ios-green text-primary-foreground"
                          : "bg-secondary border-2 border-border"
                      }`}
                    >
                      {s.settled && <Check className="w-5 h-5" />}
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expense List */}
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {expenses.map((exp) => {
                const cat = CATEGORIES.find((c) => c.key === exp.category);
                const Icon = cat ? ICON_MAP[cat.icon] : MoreHorizontal;
                return (
                  <motion.div
                    key={exp.id}
                    className="ios-card px-4 py-3 flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    layout
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">
                        {memberEmoji(exp.payerId)} {memberName(exp.payerId)} 付款
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exp.splitAmong.length}人分擔 · 每人${Math.round(exp.amount / exp.splitAmong.length)}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">${exp.amount}</p>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="touch-target p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {expenses.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">尚無團體支出記錄</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

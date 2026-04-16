import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Utensils, Shirt, Hop as Home, Car, PartyPopper, MoveHorizontal as MoreHorizontal, Calculator, Check, ChevronDown, ArrowLeft, UserCheck, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettlementStats } from "@/components/SettlementStats";
import { ExportEmailPanel } from "@/components/ExportEmailPanel";
import {
  type Member, type Group, type GroupExpense, type Settlement, type SplitEntry,
  getMembers, getGroupExpensesByGroup, addGroupExpense, deleteGroupExpense,
  calculateSettlements, getSettlements, setSettlements as saveSettlements,
  updateGroup, CATEGORIES, CURRENCIES,
} from "@/lib/store";

const ICON_MAP = { Utensils, Shirt, Home, Car, PartyPopper, MoreHorizontal } as const;

interface Props {
  group: Group;
  onBack: () => void;
  onGroupUpdate: (groups: ReturnType<typeof updateGroup>) => void;
}

export function GroupDetail({ group, onBack, onGroupUpdate }: Props) {
  const [allMembers] = useState<Member[]>(() => getMembers());
  const groupMembers = allMembers.filter((m) => group.memberIds.includes(m.id));

  const [expenses, setExpenses] = useState<GroupExpense[]>(() => getGroupExpensesByGroup(group.id));
  const [settlements, setSettlementsState] = useState<Settlement[]>(() => getSettlements());
  const [showForm, setShowForm] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [settleTab, setSettleTab] = useState<"transfers" | "stats" | "export">("transfers");

  // Exchange rate controls
  const [targetCurrency, setTargetCurrency] = useState(group.baseCurrency);
  const [exchangeRate, setExchangeRate] = useState("1");
  const [showTargetCurrencyDropdown, setShowTargetCurrencyDropdown] = useState(false);

  // form state
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("food");
  const [payerId, setPayerId] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "ratio">("equal");
  const [splitWeights, setSplitWeights] = useState<Record<string, string>>({});
  const [activeSplitMembers, setActiveSplitMembers] = useState<string[]>([]);
  const [showPayerDropdown, setShowPayerDropdown] = useState(false);

  const baseCurrencySymbol = CURRENCIES.find((c) => c.code === group.baseCurrency)?.symbol ?? group.baseCurrency;
  const targetCurrencySymbol = CURRENCIES.find((c) => c.code === targetCurrency)?.symbol ?? targetCurrency;
  const rate = Number(exchangeRate) || 1;
  const isConverting = targetCurrency !== group.baseCurrency && rate !== 1;

  const formatConverted = (originalAmount: number) => {
    const converted = Math.round(originalAmount * rate * 100) / 100;
    if (!isConverting) return `${baseCurrencySymbol} ${originalAmount.toLocaleString()}`;
    return `${targetCurrencySymbol} ${converted.toLocaleString()} (${baseCurrencySymbol}${originalAmount.toLocaleString()} × ${rate})`;
  };

  const resetForm = () => {
    setAmount(""); setNote(""); setCategory("food"); setPayerId(""); setSplitType("equal");
    setSplitWeights({}); setActiveSplitMembers([]); setShowForm(false); setShowPayerDropdown(false);
  };

  const openForm = () => {
    const ids = groupMembers.map((m) => m.id);
    setActiveSplitMembers(ids);
    const weights: Record<string, string> = {};
    ids.forEach((id) => { weights[id] = "1"; });
    setSplitWeights(weights);
    setPayerId(groupMembers[0]?.id || "");
    setShowForm(true);
  };

  const toggleSplitMember = (id: string) => {
    setActiveSplitMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const buildSplits = (): SplitEntry[] =>
    activeSplitMembers.map((memberId) => ({
      memberId,
      weight: splitType === "equal" ? 1 : (parseFloat(splitWeights[memberId] ?? "1") || 1),
    }));

  const totalWeight = activeSplitMembers.reduce((s, id) => {
    return s + (splitType === "equal" ? 1 : (parseFloat(splitWeights[id] ?? "1") || 1));
  }, 0);

  const previewShare = (id: string): number | null => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || totalWeight <= 0) return null;
    const w = splitType === "equal" ? 1 : (parseFloat(splitWeights[id] ?? "1") || 1);
    return Math.round((amt * (w / totalWeight)) * 100) / 100;
  };

  const handleAdd = () => {
    const splits = buildSplits();
    if (!payerId || !amount || Number(amount) <= 0 || splits.length === 0) return;
    const updated = addGroupExpense({
      groupId: group.id,
      amount: Number(amount),
      category,
      payerId,
      splitType,
      splits,
      date: new Date().toISOString(),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setExpenses(updated.filter((e) => e.groupId === group.id));
    resetForm();
  };

  const handleDelete = (id: string) => {
    const updated = deleteGroupExpense(id);
    setExpenses(updated.filter((e) => e.groupId === group.id));
  };

  const handleSettle = () => {
    const s = calculateSettlements(expenses, groupMembers);
    saveSettlements(s); setSettlementsState(s); setShowSettle(true);
  };

  const toggleSettled = (idx: number) => {
    const updated = [...settlements];
    updated[idx] = { ...updated[idx], settled: !updated[idx].settled };
    saveSettlements(updated); setSettlementsState(updated);
  };

  const toggleGroupMember = (memberId: string) => {
    const newIds = group.memberIds.includes(memberId)
      ? group.memberIds.filter((id) => id !== memberId)
      : [...group.memberIds, memberId];
    onGroupUpdate(updateGroup(group.id, { memberIds: newIds }));
  };

  const memberName = (id: string) => allMembers.find((m) => m.id === id)?.name ?? "?";
  const memberEmoji = (id: string) => allMembers.find((m) => m.id === id)?.emoji ?? "👤";

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="touch-target w-10 h-10 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-foreground text-lg truncate">{group.name}</h2>
          <p className="text-xs text-muted-foreground">
            {groupMembers.length} 位成員 · {baseCurrencySymbol}
          </p>
        </div>
      </div>

      {/* Member Picker */}
      <div className="ios-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-foreground">團體成員</p>
          <Button variant="iosGhost" size="sm" onClick={() => setShowMemberPicker(!showMemberPicker)}>
            <UserCheck className="w-4 h-4" /> 管理
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {groupMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">請先選擇成員</p>
          ) : (
            groupMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
                <span className="text-lg">{m.emoji}</span>
                <span className="text-sm font-medium text-foreground">{m.name}</span>
              </div>
            ))
          )}
        </div>
        <AnimatePresence>
          {showMemberPicker && (
            <motion.div
              className="mt-3 flex flex-col gap-1 bg-secondary/50 rounded-xl p-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {allMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">請先到成員管理新增朋友</p>
              ) : (
                allMembers.map((m) => {
                  const inGroup = group.memberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleGroupMember(m.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] ${inGroup ? "bg-ios-blue/10" : "hover:bg-accent"}`}
                    >
                      <span className="text-xl">{m.emoji}</span>
                      <span className="flex-1 text-left text-sm font-medium text-foreground">{m.name}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${inGroup ? "bg-ios-blue text-primary-foreground" : "border-2 border-border"}`}>
                        {inGroup && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {groupMembers.length > 0 && (
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
                          className={`touch-target flex flex-col items-center justify-center gap-1 rounded-xl p-2 transition-all active:scale-95 text-sm ${category === cat.key ? "bg-ios-blue text-primary-foreground shadow" : "bg-secondary text-secondary-foreground"}`}
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
                  <label className="text-sm text-muted-foreground mb-1 block">金額 ({baseCurrencySymbol})</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      // 核心改動 3：軟體濾波 (Software Filter) - 只允許數字和小數點通過
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setAmount(val);
                      }
                    }}
                    placeholder="0"
                    className="w-full h-12 rounded-xl bg-secondary px-4 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all"
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">備註（選填）</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="例：午餐便當、高鐵車票"
                    className="w-full h-12 rounded-xl bg-secondary px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all"
                  />
                </div>

                {/* Payer Dropdown */}
                <div className="relative">
                  <label className="text-sm text-muted-foreground mb-1 block">付款人</label>
                  <button
                    onClick={() => setShowPayerDropdown(!showPayerDropdown)}
                    className="w-full h-12 rounded-xl bg-secondary px-4 flex items-center justify-between text-foreground"
                  >
                    <span>{payerId ? `${memberEmoji(payerId)} ${memberName(payerId)}` : "選擇付款人"}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showPayerDropdown ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showPayerDropdown && (
                      <motion.div
                        className="absolute z-10 top-full mt-1 w-full bg-background rounded-xl shadow-lg border border-border overflow-hidden"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                      >
                        {groupMembers.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => { setPayerId(m.id); setShowPayerDropdown(false); }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-accent transition-colors ${payerId === m.id ? "bg-accent" : ""}`}
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

                {/* Split Type Toggle */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">分帳方式</label>
                  <div className="flex gap-1 bg-secondary rounded-xl p-1">
                    {([
                      { key: "equal" as const, label: "平分" },
                      { key: "ratio" as const, label: "按比例" },
                    ]).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setSplitType(opt.key)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${splitType === opt.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split Members / Ratio Inputs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-muted-foreground">
                      {splitType === "equal" ? "分擔者" : "比例設定"}
                    </label>
                    {splitType === "equal" && (
                      <button
                        onClick={() =>
                          setActiveSplitMembers(
                            activeSplitMembers.length === groupMembers.length
                              ? []
                              : groupMembers.map((m) => m.id),
                          )
                        }
                        className="text-xs font-medium text-ios-blue"
                      >
                        {activeSplitMembers.length === groupMembers.length ? "取消全選" : "全選"}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {groupMembers.map((m) => {
                      const isActive = activeSplitMembers.includes(m.id);
                      const share = isActive ? previewShare(m.id) : null;
                      if (splitType === "equal") {
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleSplitMember(m.id)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${isActive ? "bg-ios-blue text-primary-foreground shadow" : "bg-secondary text-secondary-foreground"}`}
                          >
                            <span className="text-base">{m.emoji}</span>
                            <span className="flex-1 text-left">{m.name}</span>
                            {isActive && share !== null && (
                              <span className="text-xs opacity-80">{baseCurrencySymbol}{share}</span>
                            )}
                          </button>
                        );
                      }
                      return (
                        <div key={m.id} className="flex items-start gap-2">
                          <button
                            onClick={() => toggleSplitMember(m.id)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] whitespace-nowrap ${isActive ? "bg-ios-blue text-primary-foreground shadow" : "bg-secondary text-secondary-foreground"}`}
                          >
                            <span className="text-base">{m.emoji}</span>
                            <span>{m.name}</span>
                          </button>
                          {isActive && (
                            <div className="flex-1">
                              <input
                                type="number"
                                inputMode="decimal"
                                value={splitWeights[m.id] ?? "1"}
                                onChange={(e) =>
                                  setSplitWeights((prev) => ({ ...prev, [m.id]: e.target.value }))
                                }
                                className="w-full h-10 rounded-xl bg-secondary px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all"
                                step="0.1"
                                min="0"
                                placeholder="比重"
                              />
                              {share !== null && (
                                <p className="text-xs text-muted-foreground mt-0.5 px-1">
                                  應付 {baseCurrencySymbol}{share}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview Summary */}
                {activeSplitMembers.length > 0 && Number(amount) > 0 && (
                  <motion.div
                    className="bg-secondary rounded-xl p-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {splitType === "equal" ? (
                      <p className="text-sm text-muted-foreground text-center">
                        每人分擔{" "}
                        <span className="font-bold text-foreground text-lg">
                          {baseCurrencySymbol}{" "}
                          {Math.round((Number(amount) / activeSplitMembers.length) * 100) / 100}
                        </span>
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          按比例預覽（總比重 {totalWeight}）
                        </p>
                        {activeSplitMembers.map((id) => {
                          const w = parseFloat(splitWeights[id] ?? "1") || 1;
                          const share = previewShare(id);
                          return (
                            <div key={id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {memberEmoji(id)} {memberName(id)}
                                <span className="text-xs ml-1 opacity-60">
                                  ({((w / totalWeight) * 100).toFixed(1)}%)
                                </span>
                              </span>
                              <span className="font-semibold text-foreground">
                                {baseCurrencySymbol}{share}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                    disabled={!payerId || !amount || Number(amount) <= 0 || activeSplitMembers.length === 0}
                  >
                    確認
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settlement Panel */}
          <AnimatePresence>
            {showSettle && (
              <motion.div
                className="ios-card p-4 flex flex-col gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground text-lg">結算</p>
                  <Button variant="iosGhost" size="sm" onClick={() => setShowSettle(false)}>
                    關閉
                  </Button>
                </div>

                {/* Exchange rate controls */}
                <div className="bg-secondary/50 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground shrink-0">目標幣別</span>
                    <div className="relative flex-1">
                      <button
                        onClick={() => setShowTargetCurrencyDropdown(!showTargetCurrencyDropdown)}
                        className="w-full h-9 rounded-lg bg-background px-3 flex items-center justify-between text-foreground text-sm border border-border"
                      >
                        <span>{targetCurrencySymbol} {targetCurrency}</span>
                        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${showTargetCurrencyDropdown ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {showTargetCurrencyDropdown && (
                          <motion.div
                            className="absolute z-20 top-full mt-1 w-full bg-background rounded-xl shadow-lg border border-border overflow-hidden max-h-36 overflow-y-auto"
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                          >
                            {CURRENCIES.map((c) => (
                              <button
                                key={c.code}
                                onClick={() => {
                                  setTargetCurrency(c.code);
                                  setShowTargetCurrencyDropdown(false);
                                  if (c.code === group.baseCurrency) setExchangeRate("1");
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${targetCurrency === c.code ? "bg-accent" : ""}`}
                              >
                                {c.symbol} {c.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  {targetCurrency !== group.baseCurrency && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0 pl-6">匯率</span>
                      <span className="text-xs text-muted-foreground">1 {group.baseCurrency} =</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        className="flex-1 h-9 rounded-lg bg-background px-3 text-sm text-foreground outline-none border border-border focus:ring-1 focus:ring-ios-blue"
                        step="0.001"
                      />
                      <span className="text-xs text-muted-foreground">{targetCurrency}</span>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-secondary rounded-xl p-1">
                  {([
                    { key: "transfers" as const, label: "轉帳清單" },
                    { key: "stats" as const, label: "統計報表" },
                    { key: "export" as const, label: "匯出郵寄" },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSettleTab(tab.key)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${settleTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {settleTab === "transfers" && (
                    <motion.div
                      key="transfers"
                      className="flex flex-col gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {settlements.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4 text-sm">所有帳目已平衡！</p>
                      ) : (
                        settlements.map((s, i) => (
                          <motion.div
                            key={`${s.from}-${s.to}`}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${s.settled ? "bg-ios-green/10" : "bg-secondary"}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {memberEmoji(s.from)} {memberName(s.from)} → {memberEmoji(s.to)} {memberName(s.to)}
                              </p>
                              <p className="text-lg font-bold text-foreground">{formatConverted(s.amount)}</p>
                            </div>
                            <button
                              onClick={() => toggleSettled(i)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${s.settled ? "bg-ios-green text-primary-foreground" : "bg-secondary border-2 border-border"}`}
                            >
                              {s.settled && <Check className="w-5 h-5" />}
                            </button>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  )}

                  {settleTab === "stats" && (
                    <motion.div
                      key="stats"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SettlementStats
                        expenses={expenses}
                        members={groupMembers}
                        currencySymbol={isConverting ? targetCurrencySymbol : baseCurrencySymbol}
                        exchangeRate={rate}
                      />
                    </motion.div>
                  )}

                  {settleTab === "export" && (
                    <motion.div
                      key="export"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ExportEmailPanel
                        group={group}
                        expenses={expenses}
                        members={groupMembers}
                        settlements={settlements}
                        currencySymbol={isConverting ? targetCurrencySymbol : baseCurrencySymbol}
                        exchangeRate={rate}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expense List */}
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {expenses.map((exp) => {
                const cat = CATEGORIES.find((c) => c.key === exp.category);
                const Icon = cat ? ICON_MAP[cat.icon] : MoreHorizontal;
                const numPeople = exp.splits.length;
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
                      {exp.note && (
                        <p className="text-xs text-muted-foreground truncate">{exp.note}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {numPeople}人分擔{exp.splitType === "ratio" ? "（按比例）" : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">
                      {baseCurrencySymbol}{exp.amount}
                    </p>
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

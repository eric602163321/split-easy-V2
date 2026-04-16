import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Utensils, Shirt, Home, Car, PartyPopper, MoreHorizontal,
  Plus, Trash2, BarChart3, TrendingUp, Sparkles,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES, type PersonalExpense,
  addPersonalExpense, deletePersonalExpense, getPersonalExpenses,
} from "@/lib/store";

const ICON_MAP = { Utensils, Shirt, Home, Car, PartyPopper, MoreHorizontal } as const;

const CHART_COLORS = [
  "oklch(0.72 0.17 30)", "oklch(0.72 0.14 310)", "oklch(0.72 0.16 210)",
  "oklch(0.72 0.14 150)", "oklch(0.72 0.16 60)", "oklch(0.72 0.10 250)",
];

const LINE_COLOR = "oklch(0.65 0.18 250)";

function generateDemoData(): PersonalExpense[] {
  const now = new Date();
  const cats = CATEGORIES.map((c) => c.key);
  const notes = ["午餐", "晚餐", "捷運", "電影票", "房租", "買衣服", "咖啡", "超商"];
  const data: PersonalExpense[] = [];
  for (let m = 5; m >= 0; m--) {
    const count = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1 + Math.floor(Math.random() * 28));
      data.push({
        id: crypto.randomUUID(),
        amount: Math.round((50 + Math.random() * 500) * 100) / 100,
        category: cats[Math.floor(Math.random() * cats.length)],
        date: d.toISOString(),
        note: Math.random() > 0.4 ? notes[Math.floor(Math.random() * notes.length)] : undefined,
      });
    }
  }
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function PersonalMode() {
  const [expenses, setExpenses] = useState<PersonalExpense[]>(() => getPersonalExpenses());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoData, setDemoData] = useState<PersonalExpense[]>([]);

  const displayExpenses = demoMode ? demoData : expenses;

  const handleAdd = () => {
    if (!selectedCategory || !amount || Number(amount) <= 0) return;
    const updated = addPersonalExpense({
      amount: Number(amount), category: selectedCategory, date: new Date().toISOString(),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setExpenses(updated); setAmount(""); setNote(""); setSelectedCategory(null); setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = deletePersonalExpense(id);
    setExpenses(updated);
  };

  const handleLoadDemo = () => {
    setDemoData(generateDemoData());
    setDemoMode(true);
    setShowStats(true);
  };

  const total = displayExpenses.reduce((s, e) => s + e.amount, 0);
  const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? key;

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    displayExpenses.forEach((e) => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return CATEGORIES.map((cat, i) => ({
      name: cat.label, key: cat.key,
      value: Math.round((totals[cat.key] || 0) * 100) / 100,
      color: CHART_COLORS[i],
    })).filter((d) => d.value > 0);
  }, [displayExpenses]);

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    displayExpenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + e.amount;
    });
    return Object.entries(byMonth)
      .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [displayExpenses]);

  // Category breakdown for selected month
  const monthCategoryData = useMemo(() => {
    if (!selectedMonth) return null;
    const totals: Record<string, number> = {};
    displayExpenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key === selectedMonth) {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
      }
    });
    return CATEGORIES.map((cat, i) => ({
      name: cat.label, key: cat.key,
      value: Math.round((totals[cat.key] || 0) * 100) / 100,
      color: CHART_COLORS[i],
    })).filter((d) => d.value > 0);
  }, [displayExpenses, selectedMonth]);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return `${y}/${mo}`;
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Summary */}
      <motion.div className="ios-card p-5 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">{demoMode ? "模擬資料" : "總支出"}</p>
        <p className="text-3xl font-bold tracking-tight text-foreground mt-1">${total.toLocaleString()}</p>
        {demoMode && (
          <button onClick={() => { setDemoMode(false); setDemoData([]); }} className="text-xs text-ios-blue mt-1">
            返回真實資料
          </button>
        )}
      </motion.div>

      {/* Action buttons */}
      <AnimatePresence>
        {!showForm && (
          <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button variant="ios" size="lg" className="flex-1" onClick={() => setShowForm(true)}>
              <Plus className="w-5 h-5" /> 新增支出
            </Button>
            {displayExpenses.length > 0 && (
              <Button variant={showStats ? "ios" : "iosSecondary"} size="lg" onClick={() => setShowStats(!showStats)}>
                <BarChart3 className="w-5 h-5" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <AnimatePresence>
        {showStats && !showForm && (
          <motion.div className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}>

            {displayExpenses.length === 0 ? (
              <motion.div className="ios-card p-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-1">資料量不足以生成圖表</p>
                <p className="text-muted-foreground/60 text-xs mb-4">先新增一些支出，或載入模擬資料預覽效果</p>
                <Button variant="iosSecondary" size="lg" onClick={handleLoadDemo}>
                  <Sparkles className="w-4 h-4" /> 載入模擬資料
                </Button>
              </motion.div>
            ) : (
              <>
                {/* Donut Chart */}
                <div className="ios-card p-4">
                  <p className="text-sm font-semibold text-foreground mb-3">各類別花費佔比</p>
                  <div className="w-full" style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" stroke="none">
                          {categoryData.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as (typeof categoryData)[0];
                          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                          return (
                            <div className="ios-card px-3 py-2 text-xs shadow-lg">
                              <p className="font-semibold text-foreground">{d.name}</p>
                              <p className="text-muted-foreground">${d.value.toLocaleString()} ({pct}%)</p>
                            </div>
                          );
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {categoryData.map((d) => (
                      <div key={d.key} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-medium text-foreground">{total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly Trend Line Chart */}
                {monthlyData.length > 0 && (
                  <div className="ios-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">月度支出趨勢</p>
                    </div>
                    <div className="w-full" style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                          onClick={(e) => {
                            if (e?.activeLabel) setSelectedMonth(e.activeLabel as string);
                          }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.15)" />
                          <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" />
                          <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" width={50}
                            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                          <ReTooltip content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="ios-card px-3 py-2 text-xs shadow-lg">
                                <p className="font-semibold text-foreground">{formatMonth(label as string)}</p>
                                <p className="text-muted-foreground">${(payload[0].value as number).toLocaleString()}</p>
                                <p className="text-muted-foreground/60 mt-0.5">點擊查看詳細</p>
                              </div>
                            );
                          }} />
                          <Line type="monotone" dataKey="amount" stroke={LINE_COLOR} strokeWidth={2.5}
                            dot={{ fill: LINE_COLOR, r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: LINE_COLOR, strokeWidth: 2, stroke: "oklch(0.98 0 0)" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Selected month detail */}
                    <AnimatePresence>
                      {selectedMonth && monthCategoryData && monthCategoryData.length > 0 && (
                        <motion.div className="mt-3 bg-secondary/50 rounded-xl p-3"
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-foreground">{formatMonth(selectedMonth)} 支出佔比</p>
                            <button onClick={() => setSelectedMonth(null)} className="text-xs text-ios-blue">關閉</button>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {monthCategoryData.map((d, i) => {
                              const monthTotal = monthCategoryData.reduce((s, x) => s + x.value, 0);
                              const pct = monthTotal > 0 ? (d.value / monthTotal) * 100 : 0;
                              return (
                                <div key={d.key} className="flex items-center gap-2 text-sm">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                  <span className="text-muted-foreground flex-1">{d.name}</span>
                                  <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                                    <motion.div className="h-full rounded-full" style={{ backgroundColor: d.color }}
                                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
                                  </div>
                                  <span className="font-medium text-foreground text-xs w-14 text-right">${d.value}</span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {monthlyData.length < 2 && (
                      <p className="text-xs text-muted-foreground/60 text-center mt-2">持續記帳，趨勢圖會越來越完整 📈</p>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state with demo button */}
      {!showStats && !showForm && displayExpenses.length === 0 && (
        <motion.div className="ios-card p-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-3">想先看看圖表效果嗎？</p>
          <Button variant="iosSecondary" size="sm" onClick={handleLoadDemo}>
            <Sparkles className="w-4 h-4" /> 載入模擬資料
          </Button>
        </motion.div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="ios-card p-4 flex flex-col gap-4"
            initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}>
            <p className="font-semibold text-foreground">選擇類別</p>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = ICON_MAP[cat.icon];
                const selected = selectedCategory === cat.key;
                return (
                  <button key={cat.key} onClick={() => setSelectedCategory(cat.key)}
                    className={`touch-target flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-all active:scale-95 ${selected ? "bg-ios-blue text-primary-foreground shadow-md" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                    <Icon className="w-6 h-6" /><span className="text-xs font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">金額</label>
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                className="w-full h-12 rounded-xl bg-secondary px-4 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">備註（選填）</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：午餐便當、高鐵車票"
                className="w-full h-12 rounded-xl bg-secondary px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all" />
            </div>
            <div className="flex gap-3">
              <Button variant="iosSecondary" size="lg" className="flex-1"
                onClick={() => { setShowForm(false); setSelectedCategory(null); setAmount(""); setNote(""); }}>取消</Button>
              <Button variant="ios" size="lg" className="flex-1" onClick={handleAdd}
                disabled={!selectedCategory || !amount || Number(amount) <= 0}>確認</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense List */}
      {!demoMode && (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {expenses.map((exp) => {
              const cat = CATEGORIES.find((c) => c.key === exp.category);
              const Icon = cat ? ICON_MAP[cat.icon] : MoreHorizontal;
              return (
                <motion.div key={exp.id} className="ios-card px-4 py-3 flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }} layout>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{categoryLabel(exp.category)}</p>
                    {exp.note && <p className="text-xs text-muted-foreground truncate">{exp.note}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString("zh-TW")}</p>
                  </div>
                  <p className="font-semibold text-foreground">${exp.amount.toLocaleString()}</p>
                  <button onClick={() => handleDelete(exp.id)}
                    className="touch-target p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {expenses.length === 0 && !demoMode && !showStats && (
            <p className="text-center text-muted-foreground py-8 text-sm">尚無支出記錄</p>
          )}
        </div>
      )}
    </div>
  );
}

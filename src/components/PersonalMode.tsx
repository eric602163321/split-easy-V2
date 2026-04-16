import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Utensils, Shirt, Home, Car, PartyPopper, MoreHorizontal,
  Plus, Trash2, BarChart3,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES,
  type PersonalExpense,
  addPersonalExpense,
  deletePersonalExpense,
  getPersonalExpenses,
} from "@/lib/store";

const ICON_MAP = {
  Utensils, Shirt, Home, Car, PartyPopper, MoreHorizontal,
} as const;

const CHART_COLORS = [
  "oklch(0.72 0.17 30)",
  "oklch(0.72 0.14 310)",
  "oklch(0.72 0.16 210)",
  "oklch(0.72 0.14 150)",
  "oklch(0.72 0.16 60)",
  "oklch(0.72 0.10 250)",
];

export function PersonalMode() {
  const [expenses, setExpenses] = useState<PersonalExpense[]>(() => getPersonalExpenses());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleAdd = () => {
    if (!selectedCategory || !amount || Number(amount) <= 0) return;
    const updated = addPersonalExpense({
      amount: Number(amount),
      category: selectedCategory,
      date: new Date().toISOString(),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setExpenses(updated);
    setAmount("");
    setNote("");
    setSelectedCategory(null);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = deletePersonalExpense(id);
    setExpenses(updated);
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? key;

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return CATEGORIES.map((cat, i) => ({
      name: cat.label,
      key: cat.key,
      value: Math.round((totals[cat.key] || 0) * 100) / 100,
      color: CHART_COLORS[i],
    })).filter((d) => d.value > 0);
  }, [expenses]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Summary */}
      <motion.div
        className="ios-card p-5 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm text-muted-foreground">本月支出</p>
        <p className="text-3xl font-bold tracking-tight text-foreground mt-1">
          ${total.toLocaleString()}
        </p>
      </motion.div>

      {/* Action buttons */}
      <AnimatePresence>
        {!showForm && (
          <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button variant="ios" size="lg" className="flex-1" onClick={() => setShowForm(true)}>
              <Plus className="w-5 h-5" /> 新增支出
            </Button>
            {expenses.length > 0 && (
              <Button
                variant={showStats ? "ios" : "iosSecondary"}
                size="lg"
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart3 className="w-5 h-5" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Chart */}
      <AnimatePresence>
        {showStats && !showForm && expenses.length > 0 && (
          <motion.div
            className="ios-card p-4"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <p className="text-sm font-semibold text-foreground mb-3">各類別花費佔比</p>
            <div className="w-full" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as (typeof categoryData)[0];
                      const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                      return (
                        <div className="ios-card px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold text-foreground">{d.name}</p>
                          <p className="text-muted-foreground">${d.value.toLocaleString()} ({pct}%)</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {categoryData.map((d) => (
                <div key={d.key} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium text-foreground">
                    {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <p className="font-semibold text-foreground">選擇類別</p>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = ICON_MAP[cat.icon];
                const selected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`touch-target flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-all active:scale-95 ${
                      selected
                        ? "bg-ios-blue text-primary-foreground shadow-md"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>

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

            <div className="flex gap-3">
              <Button
                variant="iosSecondary"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setShowForm(false);
                  setSelectedCategory(null);
                  setAmount("");
                  setNote("");
                }}
              >
                取消
              </Button>
              <Button
                variant="ios"
                size="lg"
                className="flex-1"
                onClick={handleAdd}
                disabled={!selectedCategory || !amount || Number(amount) <= 0}
              >
                確認
              </Button>
            </div>
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
                exit={{ opacity: 0, x: 20, height: 0 }}
                layout
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{categoryLabel(exp.category)}</p>
                  {exp.note && (
                    <p className="text-xs text-muted-foreground truncate">{exp.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(exp.date).toLocaleDateString("zh-TW")}
                  </p>
                </div>
                <p className="font-semibold text-foreground">${exp.amount.toLocaleString()}</p>
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
          <p className="text-center text-muted-foreground py-8 text-sm">尚無支出記錄</p>
        )}
      </div>
    </div>
  );
}

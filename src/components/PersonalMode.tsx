import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Shirt, Home, Car, PartyPopper, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES,
  type PersonalExpense,
  addPersonalExpense,
  deletePersonalExpense,
  getPersonalExpenses,
} from "@/lib/store";

const ICON_MAP = {
  Utensils,
  Shirt,
  Home,
  Car,
  PartyPopper,
  MoreHorizontal,
} as const;

export function PersonalMode() {
  const [expenses, setExpenses] = useState<PersonalExpense[]>(() => getPersonalExpenses());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleAdd = () => {
    if (!selectedCategory || !amount || Number(amount) <= 0) return;
    const updated = addPersonalExpense({
      amount: Number(amount),
      category: selectedCategory,
      date: new Date().toISOString(),
    });
    setExpenses(updated);
    setAmount("");
    setSelectedCategory(null);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = deletePersonalExpense(id);
    setExpenses(updated);
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const categoryLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? key;

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

      {/* Add button */}
      <AnimatePresence>
        {!showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button
              variant="ios"
              size="lg"
              className="w-full"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-5 h-5" /> 新增支出
            </Button>
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

            <div className="flex gap-3">
              <Button
                variant="iosSecondary"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setShowForm(false);
                  setSelectedCategory(null);
                  setAmount("");
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

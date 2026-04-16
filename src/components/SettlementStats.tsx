import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Utensils, Shirt, Hop as Home, Car, PartyPopper, MoveHorizontal as MoreHorizontal, ChevronDown, TrendingUp } from "lucide-react";
import type { Member, GroupExpense } from "@/lib/store";
import { CATEGORIES, computeSharesCents } from "@/lib/store";

const ICON_MAP = { Utensils, Shirt, Home, Car, PartyPopper, MoreHorizontal } as const;

const CHART_COLORS = [
  "#B74C40", // 🍎 復古磚紅 - 食
  "#E2A752", // ☀️ 暖陽鵝黃 - 衣
  "#4A6E63", // 🌲 經典森林綠 - 住
  "#6B8D9C", // 🚙 褪色天空藍 - 行
  "#8A7261", // ☕ 溫潤摩卡棕 - 育樂
  "#A3A8AC", // 📷 金屬銀灰 - 其他
];

interface Props {
  expenses: GroupExpense[];
  members: Member[];
  currencySymbol?: string;
  exchangeRate?: number;
}

interface CategorySpend { name: string; key: string; value: number; color: string; }
interface MemberExpenseItem { expense: GroupExpense; share: number; categoryLabel: string; }
interface MemberSpend { member: Member; total: number; byCategory: Record<string, number>; items: MemberExpenseItem[]; }

function aggregateData(expenses: GroupExpense[], members: Member[], rate: number) {
  let totalSpend = 0;
  const catTotals: Record<string, number> = {};
  CATEGORIES.forEach((c) => (catTotals[c.key] = 0));

  const memberData: Record<string, MemberSpend> = {};
  members.forEach((m) => {
    const byCategory: Record<string, number> = {};
    CATEGORIES.forEach((c) => (byCategory[c.key] = 0));
    memberData[m.id] = { member: m, total: 0, byCategory, items: [] };
  });

  expenses.forEach((e) => {
    if (e.splits.length === 0) return;
    const catLabel = CATEGORIES.find((c) => c.key === e.category)?.label ?? e.category;
    const sharesCents = computeSharesCents(e);
    let expenseTotalConverted = 0;

    Object.entries(sharesCents).forEach(([id, shareCents]) => {
      const shareConverted = Math.round((shareCents / 100) * rate * 100) / 100;
      if (memberData[id]) {
        memberData[id].total += shareConverted;
        memberData[id].byCategory[e.category] += shareConverted;
        memberData[id].items.push({ expense: e, share: shareConverted, categoryLabel: catLabel });
      }
      expenseTotalConverted += shareConverted;
    });

    totalSpend += expenseTotalConverted;
    catTotals[e.category] += expenseTotalConverted;
  });

  // 3. 處理 UI 顯示用的陣列與防浮點數溢位
  totalSpend = Math.round(totalSpend * 100) / 100;
  
  const categoryData: CategorySpend[] = CATEGORIES.map((cat, i) => ({
    name: cat.label,
    key: cat.key,
    value: Math.round(catTotals[cat.key] * 100) / 100,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((d) => d.value > 0);

  const memberSpends = Object.values(memberData).map(ms => {
    ms.total = Math.round(ms.total * 100) / 100;
    Object.keys(ms.byCategory).forEach(k => {
      ms.byCategory[k] = Math.round(ms.byCategory[k] * 100) / 100;
    });
    return ms;
  });

  return { totalSpend, categoryData, memberSpends };
}

export function SettlementStats({ expenses, members, currencySymbol = "$", exchangeRate = 1 }: Props) {
  const { totalSpend, categoryData, memberSpends } = useMemo(
    () => aggregateData(expenses, members, exchangeRate), [expenses, members, exchangeRate]
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sym = currencySymbol;

  if (expenses.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">尚無支出資料</p>;
  }

  return (
    <motion.div className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-1">團隊總支出</p>
        <motion.p className="text-4xl font-bold text-foreground" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }}>
          {sym} {totalSpend.toLocaleString()}
        </motion.p>
        <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          <span>{members.length} 位成員 · {expenses.length} 筆支出</span>
        </div>
      </div>

      <div className="ios-card p-4">
        <p className="text-sm font-semibold text-foreground mb-3">各類別花費佔比</p>
        <div className="w-full" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                {categoryData.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as CategorySpend;
                const pct = totalSpend > 0 ? ((d.value / totalSpend) * 100).toFixed(1) : "0";
                return (
                  <div className="ios-card px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-foreground">{d.name}</p>
                    <p className="text-muted-foreground">{sym} {d.value.toLocaleString()} ({pct}%)</p>
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
              <span className="font-medium text-foreground">{totalSpend > 0 ? ((d.value / totalSpend) * 100).toFixed(0) : 0}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ios-card overflow-hidden">
        <p className="text-sm font-semibold text-foreground p-4 pb-2">個人明細</p>
        <div className="flex flex-col">
          {memberSpends.map((ms, idx) => {
            const isOpen = expandedId === ms.member.id;
            return (
              <motion.div key={ms.member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <button onClick={() => setExpandedId(isOpen ? null : ms.member.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors active:bg-accent">
                  <span className="text-xl">{ms.member.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{ms.member.name}</p>
                    <p className="text-xs text-muted-foreground">實際分擔花費</p>
                  </div>
                  <span className="font-semibold text-foreground text-sm">{sym} {ms.total.toLocaleString()}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <motion.div initial={false} animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                  <div className="px-4 pb-3 pl-14 flex flex-col gap-2">
                    {CATEGORIES.map((cat, ci) => {
                      const val = ms.byCategory[cat.key] || 0;
                      if (val === 0) return null;
                      const Icon = ICON_MAP[cat.icon];
                      const pct = ms.total > 0 ? (val / ms.total) * 100 : 0;
                      return (
                        <div key={cat.key} className="flex items-center gap-2 text-sm">
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground flex-1">{cat.label}</span>
                          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{ backgroundColor: CHART_COLORS[ci] }}
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: 0.1 }} />
                          </div>
                          <span className="font-medium text-foreground w-16 text-right">{sym} {val}</span>
                        </div>
                      );
                    })}
                    {ms.items.length > 0 && (
                      <div className="mt-2 border-t border-border/50 pt-2 flex flex-col gap-1.5">
                        <p className="text-xs text-muted-foreground font-medium">支出明細</p>
                        {ms.items.map((item) => (
                          <div key={item.expense.id} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground shrink-0">{item.categoryLabel}</span>
                            <div className="flex-1 min-w-0">
                              {item.expense.note && <p className="text-muted-foreground truncate">{item.expense.note}</p>}
                              <p className="text-muted-foreground/60">{new Date(item.expense.date).toLocaleDateString("zh-TW")}</p>
                            </div>
                            <span className="font-medium text-foreground shrink-0">{sym} {item.share}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
                {idx < memberSpends.length - 1 && <div className="mx-4 border-b border-border/50" />}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

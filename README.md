1. 請將 store.ts 裡的 export function calculateSettlements 覆蓋如下:

export function calculateSettlements(
  expenses: GroupExpense[],
  members: Member[]
): Settlement[] {
  // 將原本的 balance 改為 balanceCents，全面使用「分」來計算
  const balanceCents: Record<string, number> = {};
  members.forEach((m) => (balanceCents[m.id] = 0));

  expenses.forEach((e) => {
    const amountCents = Math.round(e.amount * 100);
    const numPeople = e.splitAmong.length;
    if (numPeople === 0) return;

    const baseShareCents = Math.floor(amountCents / numPeople);
    const remainderCents = amountCents % numPeople;

    // --- 偽隨機 Hash 邏輯 ---
    let hash = 0;
    for (let k = 0; k < e.id.length; k++) {
      hash = (hash << 5) - hash + e.id.charCodeAt(k);
      hash |= 0;
    }
    const startIndex = Math.abs(hash) % numPeople;
    
    const luckyIndices = new Set();
    for (let k = 0; k < remainderCents; k++) {
      luckyIndices.add((startIndex + k) % numPeople);
    }
    // ------------------------

    balanceCents[e.payerId] = (balanceCents[e.payerId] || 0) + amountCents;

    e.splitAmong.forEach((id, index) => {
      // 根據 Hash 結果決定誰多付那 1 分錢
      const actualShareCents = baseShareCents + (luckyIndices.has(index) ? 1 : 0);
      balanceCents[id] = (balanceCents[id] || 0) - actualShareCents;
    });
  });

  const debtors: { id: string; amountCents: number }[] = [];
  const creditors: { id: string; amountCents: number }[] = [];

  Object.entries(balanceCents).forEach(([id, amtCents]) => {
    if (amtCents < 0) debtors.push({ id, amountCents: -amtCents });
    else if (amtCents > 0) creditors.push({ id, amountCents: amtCents });
  });

  debtors.sort((a, b) => b.amountCents - a.amountCents);
  creditors.sort((a, b) => b.amountCents - a.amountCents);

  const settlements: Settlement[] = [];
  let i = 0, j = 0;
  
  while (i < debtors.length && j < creditors.length) {
    const transferCents = Math.min(debtors[i].amountCents, creditors[j].amountCents);
    
    if (transferCents > 0) {
      settlements.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: transferCents / 100, // 計算完畢，將「分」轉回「元」
        settled: false,
      });
    }

    debtors[i].amountCents -= transferCents;
    creditors[j].amountCents -= transferCents;

    if (debtors[i].amountCents === 0) i++;
    if (creditors[j].amountCents === 0) j++;
  }

  return settlements;
}

2. 請將 SettlementStats.ts 裡的 function aggregateData 覆蓋如下:

function aggregateData(expenses: GroupExpense[], members: Member[], rate: number) {
  let totalSpend = 0;
  const catTotals: Record<string, number> = {};
  CATEGORIES.forEach((c) => (catTotals[c.key] = 0));

  // 1. 初始化 Member 的資料容器
  const memberData: Record<string, MemberSpend> = {};
  members.forEach((m) => {
    const byCategory: Record<string, number> = {};
    CATEGORIES.forEach((c) => (byCategory[c.key] = 0));
    memberData[m.id] = { member: m, total: 0, byCategory, items: [] };
  });

  // 2. 遍歷支出，套用 Hash 法精準分配與匯率轉換
  expenses.forEach((e) => {
    const amountCents = Math.round(e.amount * 100);
    const numPeople = e.splitAmong.length;
    if (numPeople === 0) return;

    const baseShareCents = Math.floor(amountCents / numPeople);
    const remainderCents = amountCents % numPeople;

    // --- 偽隨機 Hash 邏輯 ---
    let hash = 0;
    for (let k = 0; k < e.id.length; k++) {
      hash = (hash << 5) - hash + e.id.charCodeAt(k);
      hash |= 0;
    }
    const startIndex = Math.abs(hash) % numPeople;
    
    const luckyIndices = new Set();
    for (let k = 0; k < remainderCents; k++) {
      luckyIndices.add((startIndex + k) % numPeople);
    }
    // ------------------------

    const catLabel = CATEGORIES.find((c) => c.key === e.category)?.label ?? e.category;
    let expenseTotalConverted = 0; // 用來精準追蹤這筆帳單轉換匯率後的總和

    e.splitAmong.forEach((id, index) => {
      // 算出原始幣別的精準分配 (分)
      const actualShareCents = baseShareCents + (luckyIndices.has(index) ? 1 : 0);
      const actualShareOriginal = actualShareCents / 100;
      
      // 乘上匯率，並取到小數點後兩位
      const shareConverted = Math.round(actualShareOriginal * rate * 100) / 100;

      if (memberData[id]) {
        memberData[id].total += shareConverted;
        memberData[id].byCategory[e.category] += shareConverted;
        memberData[id].items.push({ 
          expense: e, 
          share: shareConverted, 
          categoryLabel: catLabel 
        });
      }
      // 累加轉換後的真實金額
      expenseTotalConverted += shareConverted;
    });

    // 將「真正分配出去的總和」加到總支出，確保大總和等於各項小總和
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

3. 請將 GroupMode.ts 覆蓋如下:

import { useState, useEffect } from "react"; // <-- 加入 useEffect
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberManager } from "@/components/MemberManager";
import { GroupDetail } from "@/components/GroupDetail";
import {
  type Group,
  getGroups,
  addGroup,
  deleteGroup,
  getMembers,
  setMembers as saveMembers,
  type Member,
  CURRENCIES,
} from "@/lib/store";

export function GroupMode() {
  // --- 新增：Hydration 錯誤防護盾 ---
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  // --------------------------------

  const [groups, setGroups] = useState<Group[]>(() => getGroups());
  const [members, setMembersState] = useState<Member[]>(() => getMembers());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCurrency, setNewGroupCurrency] = useState("TWD");
  const [customCurrency, setCustomCurrency] = useState("");
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // --- 新增：如果還沒掛載完成，先回傳空白畫面，避免 Server/Client 不一致 ---
  if (!isMounted) {
    return null;
  }
  // ----------------------------------------------------------------------

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const currency = customCurrency.trim() || newGroupCurrency;
    const updated = addGroup(newGroupName, currency);
    setGroups(updated);
    setNewGroupName("");
    setNewGroupCurrency("TWD");
    setCustomCurrency("");
    setShowNewGroup(false);
  };

  const handleDeleteGroup = (id: string) => {
    const updated = deleteGroup(id);
    setGroups(updated);
  };

  const currencySymbol = (code: string) =>
    CURRENCIES.find((c) => c.code === code)?.symbol ?? code;

  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        onBack={() => setSelectedGroupId(null)}
        onGroupUpdate={(updated) => setGroups(updated)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="ios-card p-4">
        <MemberManager members={members} onUpdate={(m) => { saveMembers(m); setMembersState(m); }} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground text-lg">我的團體</h2>
        <Button variant="iosGhost" size="sm" onClick={() => setShowNewGroup(!showNewGroup)}>
          <Plus className="w-4 h-4" />
          新增團體
        </Button>
      </div>

      <AnimatePresence>
        {showNewGroup && (
          <motion.div
            className="ios-card p-4 flex flex-col gap-3"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="輸入團體名稱（如：眠月線登山團）"
              className="h-12 rounded-xl bg-secondary px-4 text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all"
              onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
              autoFocus
            />

            {/* Currency selector */}
            <div className="relative">
              <label className="text-sm text-muted-foreground mb-1 block">預設幣別</label>
              <button
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="w-full h-12 rounded-xl bg-secondary px-4 flex items-center justify-between text-foreground"
              >
                <span>
                  {CURRENCIES.find((c) => c.code === newGroupCurrency)
                    ? `${CURRENCIES.find((c) => c.code === newGroupCurrency)!.symbol} ${CURRENCIES.find((c) => c.code === newGroupCurrency)!.label}`
                    : newGroupCurrency}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCurrencyDropdown ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showCurrencyDropdown && (
                  <motion.div
                    className="absolute z-10 top-full mt-1 w-full bg-background rounded-xl shadow-lg border border-border overflow-hidden max-h-48 overflow-y-auto"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => { setNewGroupCurrency(c.code); setCustomCurrency(""); setShowCurrencyDropdown(false); }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-accent transition-colors text-sm ${newGroupCurrency === c.code ? "bg-accent" : ""}`}
                      >
                        <span className="font-medium text-foreground">{c.symbol}</span>
                        <span className="text-muted-foreground">{c.label} ({c.code})</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <input
              type="text"
              value={customCurrency}
              onChange={(e) => setCustomCurrency(e.target.value.toUpperCase())}
              placeholder="或自行輸入幣別代碼（如 THB）"
              className="h-10 rounded-xl bg-secondary px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all"
              maxLength={5}
            />

            <div className="flex gap-3">
              <Button variant="iosSecondary" size="lg" className="flex-1" onClick={() => { setShowNewGroup(false); setNewGroupName(""); setCustomCurrency(""); }}>
                取消
              </Button>
              <Button variant="ios" size="lg" className="flex-1" onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                建立
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {groups.map((g, i) => (
            <motion.div
              key={g.id}
              className="ios-card px-4 py-4 flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedGroupId(g.id)}
            >
              <div className="w-11 h-11 rounded-2xl bg-ios-blue/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-ios-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.memberIds.length} 位成員 · {currencySymbol(g.baseCurrency)} · {new Date(g.createdAt).toLocaleDateString("zh-TW")}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }}
                className="touch-target p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {groups.length === 0 && (
          <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">尚無團體</p>
            <p className="text-muted-foreground/60 text-xs mt-1">點擊上方「新增團體」開始</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

4. 請將 PersonalMode.tsx 與 SettlementStats.tsx 中的 const CHART_COLORS 覆蓋如下:

const CHART_COLORS = [
  "#B74C40", // 🍎 復古磚紅 - 食
  "#E2A752", // ☀️ 暖陽鵝黃 - 衣
  "#4A6E63", // 🌲 經典森林綠 - 住
  "#6B8D9C", // 🚙 褪色天空藍 - 行
  "#8A7261", // ☕ 溫潤摩卡棕 - 育樂
  "#A3A8AC", // 📷 金屬銀灰 - 其他
];

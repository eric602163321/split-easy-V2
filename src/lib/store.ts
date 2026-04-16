// LocalStorage-based state management for the bill splitting app

export interface Member {
  id: string;
  name: string;
  emoji: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  baseCurrency: string;
  createdAt: string;
}

export const CURRENCIES = [
  { code: "TWD", symbol: "NT$", label: "新台幣" },
  { code: "USD", symbol: "$", label: "美元" },
  { code: "JPY", symbol: "¥", label: "日幣" },
  { code: "CNY", symbol: "¥", label: "人民幣" },
  { code: "EUR", symbol: "€", label: "歐元" },
  { code: "KRW", symbol: "₩", label: "韓元" },
  { code: "GBP", symbol: "£", label: "英鎊" },
] as const;

export interface PersonalExpense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  amount: number;
  category: string;
  payerId: string;
  splitAmong: string[];
  date: string;
  note?: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
  settled: boolean;
}

const KEYS = {
  members: "splitapp_members",
  groups: "splitapp_groups",
  personalExpenses: "splitapp_personal",
  groupExpenses: "splitapp_group",
  settlements: "splitapp_settlements",
} as const;

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// Members (global friends list)
export function getMembers(): Member[] {
  return load(KEYS.members, []);
}
export function setMembers(m: Member[]) {
  save(KEYS.members, m);
}

// Groups
export function getGroups(): Group[] {
  return load(KEYS.groups, []);
}
export function addGroup(name: string, baseCurrency = "TWD"): Group[] {
  const list = getGroups();
  list.unshift({
    id: crypto.randomUUID(),
    name: name.trim(),
    memberIds: [],
    baseCurrency,
    createdAt: new Date().toISOString(),
  });
  save(KEYS.groups, list);
  return list;
}
export function deleteGroup(id: string): Group[] {
  const list = getGroups().filter((g) => g.id !== id);
  save(KEYS.groups, list);
  // Also clean up expenses for this group
  const expenses = getGroupExpenses().filter((e) => e.groupId !== id);
  save(KEYS.groupExpenses, expenses);
  return list;
}
export function updateGroup(id: string, patch: Partial<Omit<Group, "id">>): Group[] {
  const list = getGroups().map((g) =>
    g.id === id ? { ...g, ...patch } : g
  );
  save(KEYS.groups, list);
  return list;
}

// Personal Expenses
export function getPersonalExpenses(): PersonalExpense[] {
  return load(KEYS.personalExpenses, []);
}
export function addPersonalExpense(e: Omit<PersonalExpense, "id">) {
  const list = getPersonalExpenses();
  list.unshift({ ...e, id: crypto.randomUUID() });
  save(KEYS.personalExpenses, list);
  return list;
}
export function deletePersonalExpense(id: string) {
  const list = getPersonalExpenses().filter((e) => e.id !== id);
  save(KEYS.personalExpenses, list);
  return list;
}

// Group Expenses
export function getGroupExpenses(): GroupExpense[] {
  return load(KEYS.groupExpenses, []);
}
export function getGroupExpensesByGroup(groupId: string): GroupExpense[] {
  return getGroupExpenses().filter((e) => e.groupId === groupId);
}
export function addGroupExpense(e: Omit<GroupExpense, "id">) {
  const list = getGroupExpenses();
  list.unshift({ ...e, id: crypto.randomUUID() });
  save(KEYS.groupExpenses, list);
  return list;
}
export function deleteGroupExpense(id: string) {
  const list = getGroupExpenses().filter((e) => e.id !== id);
  save(KEYS.groupExpenses, list);
  return list;
}

// Settlements
export function getSettlements(): Settlement[] {
  return load(KEYS.settlements, []);
}
export function setSettlements(s: Settlement[]) {
  save(KEYS.settlements, s);
}

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

export const CATEGORIES = [
  { key: "food", label: "食", icon: "Utensils" as const },
  { key: "clothing", label: "衣", icon: "Shirt" as const },
  { key: "housing", label: "住", icon: "Home" as const },
  { key: "transport", label: "行", icon: "Car" as const },
  { key: "entertainment", label: "育樂", icon: "PartyPopper" as const },
  { key: "other", label: "其他", icon: "MoreHorizontal" as const },
] as const;

export const MEMBER_EMOJIS = ["😀", "😎", "🤩", "🥳", "😺", "🐶", "🦊", "🐻", "🐼", "🦁", "🐯", "🐸"];

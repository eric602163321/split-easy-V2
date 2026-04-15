// LocalStorage-based state management for the bill splitting app

export interface Member {
  id: string;
  name: string;
  emoji: string;
}

export interface PersonalExpense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface GroupExpense {
  id: string;
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

export function getMembers(): Member[] {
  return load(KEYS.members, []);
}
export function setMembers(m: Member[]) {
  save(KEYS.members, m);
}

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

export function getGroupExpenses(): GroupExpense[] {
  return load(KEYS.groupExpenses, []);
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
  // Net balance: positive = owed money, negative = owes money
  const balance: Record<string, number> = {};
  members.forEach((m) => (balance[m.id] = 0));

  expenses.forEach((e) => {
    const perPerson = e.amount / e.splitAmong.length;
    balance[e.payerId] = (balance[e.payerId] || 0) + e.amount;
    e.splitAmong.forEach((id) => {
      balance[id] = (balance[id] || 0) - perPerson;
    });
  });

  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(balance).forEach(([id, amt]) => {
    if (amt < -0.01) debtors.push({ id, amount: -amt });
    else if (amt > 0.01) creditors.push({ id, amount: amt });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    if (transfer > 0.01) {
      settlements.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: Math.round(transfer * 100) / 100,
        settled: false,
      });
    }
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
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

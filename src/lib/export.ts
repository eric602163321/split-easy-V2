import type { Group, GroupExpense, Member, Settlement } from "./store";
import { CATEGORIES, computeSharesCents } from "./store";

// Generates CSV content for expenses and settlements
export function buildCSV(
  group: Group,
  expenses: GroupExpense[],
  members: Member[],
  settlements: Settlement[],
  currencySymbol: string,
  exchangeRate: number,
): string {
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const catLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? key;
  const convert = (v: number) => Math.round(v * exchangeRate * 100) / 100;

  const lines: string[] = [];

  // Header info
  lines.push(`團體名稱,${group.name}`);
  lines.push(`幣別,${group.baseCurrency}`);
  lines.push(`匯率,${exchangeRate}`);
  lines.push(`匯出時間,${new Date().toLocaleString("zh-TW")}`);
  lines.push("");

  // Expenses sheet
  lines.push("=== 支出明細 ===");
  lines.push("日期,類別,金額,付款人,分帳方式,分擔成員,備註");
  expenses.forEach((e) => {
    const date = new Date(e.date).toLocaleDateString("zh-TW");
    const payer = memberName(e.payerId);
    const splitMode = e.splitType === "ratio" ? "按比例" : "平分";
    const splitDetail = e.splits
      .map((s) => {
        const shareCents = computeSharesCents(e)[s.memberId] ?? 0;
        const share = convert(shareCents / 100);
        return `${memberName(s.memberId)}:${currencySymbol}${share}`;
      })
      .join(" / ");
    const amt = convert(e.amount);
    lines.push(
      `${date},${catLabel(e.category)},${currencySymbol}${amt},${payer},${splitMode},"${splitDetail}","${e.note ?? ""}"`,
    );
  });

  lines.push("");

  // Per-member summary
  lines.push("=== 個人分擔彙總 ===");
  lines.push("成員,個人總花費");
  const memberTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const sharesCents = computeSharesCents(e);
    Object.entries(sharesCents).forEach(([id, cents]) => {
      memberTotals[id] = (memberTotals[id] ?? 0) + cents;
    });
  });
  members.forEach((m) => {
    const total = convert((memberTotals[m.id] ?? 0) / 100);
    lines.push(`${m.name},${currencySymbol}${total}`);
  });

  lines.push("");

  // Settlements
  lines.push("=== 結算清單 ===");
  lines.push("付款方,收款方,金額,狀態");
  settlements.forEach((s) => {
    const amt = convert(s.amount);
    lines.push(
      `${memberName(s.from)},${memberName(s.to)},${currencySymbol}${amt},${s.settled ? "已完成" : "待轉帳"}`,
    );
  });

  return lines.join("\n");
}

export function downloadCSV(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Build a plain-text summary for email body fallback
export function buildTextSummary(
  group: Group,
  expenses: GroupExpense[],
  members: Member[],
  settlements: Settlement[],
  currencySymbol: string,
  exchangeRate: number,
): string {
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const convert = (v: number) => Math.round(v * exchangeRate * 100) / 100;

  const lines: string[] = [];
  lines.push(`【${group.name}】分帳結算報表`);
  lines.push(`幣別：${group.baseCurrency}  匯率：${exchangeRate}`);
  lines.push(`共 ${expenses.length} 筆支出`);
  lines.push("");

  lines.push("── 轉帳清單 ──");
  if (settlements.length === 0) {
    lines.push("所有帳目已平衡！");
  } else {
    settlements.forEach((s) => {
      const amt = convert(s.amount);
      const status = s.settled ? "[已完成]" : "[待轉帳]";
      lines.push(`${status} ${memberName(s.from)} → ${memberName(s.to)}：${currencySymbol}${amt}`);
    });
  }

  lines.push("");
  lines.push("── 個人分擔 ──");
  const memberTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const sharesCents = computeSharesCents(e);
    Object.entries(sharesCents).forEach(([id, cents]) => {
      memberTotals[id] = (memberTotals[id] ?? 0) + cents;
    });
  });
  members.forEach((m) => {
    const total = convert((memberTotals[m.id] ?? 0) / 100);
    lines.push(`${m.name}：${currencySymbol}${total}`);
  });

  return lines.join("\n");
}

// Build an HTML email body
export function buildHtmlEmail(
  group: Group,
  expenses: GroupExpense[],
  members: Member[],
  settlements: Settlement[],
  currencySymbol: string,
  exchangeRate: number,
  csvDownloadUrl?: string,
): string {
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const memberEmoji = (id: string) => members.find((m) => m.id === id)?.emoji ?? "👤";
  const convert = (v: number) => Math.round(v * exchangeRate * 100) / 100;

  const totalSpend = (() => {
    let t = 0;
    expenses.forEach((e) => {
      Object.values(computeSharesCents(e)).forEach((c) => { t += c; });
    });
    return convert(t / 100);
  })();

  const memberTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const sharesCents = computeSharesCents(e);
    Object.entries(sharesCents).forEach(([id, cents]) => {
      memberTotals[id] = (memberTotals[id] ?? 0) + cents;
    });
  });

  const settlementRows = settlements
    .map((s) => {
      const amt = convert(s.amount);
      const bg = s.settled ? "#f0fdf4" : "#fff";
      const badge = s.settled
        ? `<span style="color:#16a34a;font-size:11px;font-weight:600;background:#dcfce7;padding:2px 7px;border-radius:999px;">已完成</span>`
        : `<span style="color:#2563eb;font-size:11px;font-weight:600;background:#dbeafe;padding:2px 7px;border-radius:999px;">待轉帳</span>`;
      return `<tr style="background:${bg}">
        <td style="padding:8px 12px;">${memberEmoji(s.from)} ${memberName(s.from)}</td>
        <td style="padding:8px 12px;text-align:center;">→</td>
        <td style="padding:8px 12px;">${memberEmoji(s.to)} ${memberName(s.to)}</td>
        <td style="padding:8px 12px;font-weight:600;">${currencySymbol}${amt}</td>
        <td style="padding:8px 12px;">${badge}</td>
      </tr>`;
    })
    .join("");

  const memberRows = members
    .map((m) => {
      const total = convert((memberTotals[m.id] ?? 0) / 100);
      return `<tr>
        <td style="padding:8px 12px;">${m.emoji} ${m.name}</td>
        <td style="padding:8px 12px;font-weight:600;">${currencySymbol}${total}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;background:#f5f5f7;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:#1d4ed8;padding:24px 28px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">${group.name}</h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">分帳結算報表 · ${new Date().toLocaleDateString("zh-TW")}</p>
    </div>
    <div style="padding:24px 28px;">
      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;background:#f0f9ff;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#1d4ed8;">${currencySymbol}${totalSpend}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">團隊總支出</div>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#16a34a;">${expenses.length}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">支出筆數</div>
        </div>
        <div style="flex:1;background:#fef9ec;border-radius:12px;padding:14px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#d97706;">${settlements.length}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">待結算項目</div>
        </div>
      </div>

      <h2 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 10px;">轉帳清單</h2>
      ${settlements.length === 0 ? '<p style="color:#64748b;font-size:13px;">所有帳目已平衡！</p>' : `
      <table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">付款方</th>
            <th style="padding:8px 12px;"></th>
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">收款方</th>
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">金額</th>
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">狀態</th>
          </tr>
        </thead>
        <tbody>${settlementRows}</tbody>
      </table>`}

      <h2 style="font-size:14px;font-weight:700;color:#1e293b;margin:20px 0 10px;">個人分擔彙總</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">成員</th>
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">應分擔金額</th>
          </tr>
        </thead>
        <tbody>${memberRows}</tbody>
      </table>

      ${csvDownloadUrl ? `<div style="margin-top:20px;text-align:center;"><a href="${csvDownloadUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 24px;border-radius:999px;font-size:13px;font-weight:600;text-decoration:none;">下載完整 CSV 報表</a></div>` : ""}
    </div>
    <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
      由小團分帳產生 · ${new Date().toLocaleString("zh-TW")}
    </div>
  </div>
</body>
</html>`;
}

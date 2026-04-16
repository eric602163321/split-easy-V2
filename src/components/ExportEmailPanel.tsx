import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Mail, X, Loader as Loader2, Check, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Group, GroupExpense, Member, Settlement } from "@/lib/store";
import { buildCSV, downloadCSV, buildHtmlEmail, buildTextSummary } from "@/lib/export";

interface Props {
  group: Group;
  expenses: GroupExpense[];
  members: Member[];
  settlements: Settlement[];
  currencySymbol: string;
  exchangeRate: number;
}

type Status = "idle" | "loading" | "success" | "error";

export function ExportEmailPanel({
  group,
  expenses,
  members,
  settlements,
  currencySymbol,
  exchangeRate,
}: Props) {
  const [emailInput, setEmailInput] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [exportStatus, setExportStatus] = useState<Status>("idle");
  const [emailStatus, setEmailStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleExportCSV = async () => {
    setExportStatus("loading");
    try {
      await new Promise((r) => setTimeout(r, 600));
      const csv = buildCSV(group, expenses, members, settlements, currencySymbol, exchangeRate);
      const filename = `${group.name.replace(/\s/g, "_")}_結算報表_${new Date().toLocaleDateString("zh-TW").replace(/\//g, "-")}.csv`;
      downloadCSV(csv, filename);
      setExportStatus("success");
      setTimeout(() => setExportStatus("idle"), 2500);
    } catch {
      setExportStatus("error");
      setErrorMsg("匯出失敗，請稍後再試");
      setTimeout(() => setExportStatus("idle"), 3000);
    }
  };

  const handleSendEmail = async () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setErrorMsg("請輸入有效的 Email 地址");
      return;
    }
    setEmailStatus("loading");
    setErrorMsg("");

    try {
      // Build email content
      const htmlBody = buildHtmlEmail(
        group, expenses, members, settlements, currencySymbol, exchangeRate,
      );
      const textBody = buildTextSummary(
        group, expenses, members, settlements, currencySymbol, exchangeRate,
      );

      // Use mailto: to open the user's default mail client with a pre-filled email
      // This is the most compatible, privacy-respecting approach without a backend API
      const subject = encodeURIComponent(`【${group.name}】分帳結算報表`);
      const body = encodeURIComponent(textBody);
      const mailtoUrl = `mailto:${encodeURIComponent(emailInput.trim())}?subject=${subject}&body=${body}`;

      // Open the mailto link
      const link = document.createElement("a");
      link.href = mailtoUrl;
      link.click();

      // Also download CSV as attachment reference
      const csv = buildCSV(group, expenses, members, settlements, currencySymbol, exchangeRate);
      const filename = `${group.name.replace(/\s/g, "_")}_結算報表.csv`;
      downloadCSV(csv, filename);

      await new Promise((r) => setTimeout(r, 800));
      setEmailStatus("success");
      setTimeout(() => {
        setEmailStatus("idle");
        setShowEmailDialog(false);
      }, 2500);

      // Unused but kept for future server-side integration
      void htmlBody;
    } catch {
      setEmailStatus("error");
      setErrorMsg("無法開啟郵件程式，請手動複製內容");
      setTimeout(() => setEmailStatus("idle"), 3000);
    }
  };

  const isExporting = exportStatus === "loading";
  const isEmailing = emailStatus === "loading";

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-secondary/50 rounded-xl p-4 flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">匯出說明</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          支援匯出 CSV 試算表格式（相容 Excel / Google Sheets），
          或透過郵件程式寄送含結算摘要的郵件給指定地址。
        </p>
      </div>

      {/* Export CSV */}
      <button
        onClick={handleExportCSV}
        disabled={isExporting || expenses.length === 0}
        className="flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-accent transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-11 h-11 rounded-2xl bg-ios-blue/10 flex items-center justify-center shrink-0">
          {isExporting ? (
            <Loader2 className="w-5 h-5 text-ios-blue animate-spin" />
          ) : exportStatus === "success" ? (
            <Check className="w-5 h-5 text-ios-green" />
          ) : (
            <FileSpreadsheet className="w-5 h-5 text-ios-blue" />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">
            {isExporting ? "正在產生試算表..." : exportStatus === "success" ? "下載成功！" : "下載 CSV 試算表"}
          </p>
          <p className="text-xs text-muted-foreground">
            {expenses.length === 0 ? "尚無支出資料" : `${expenses.length} 筆支出 · 相容 Excel / Google Sheets`}
          </p>
        </div>
        {!isExporting && exportStatus !== "success" && (
          <Download className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Email Button */}
      <button
        onClick={() => setShowEmailDialog(true)}
        disabled={expenses.length === 0}
        className="flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-accent transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-11 h-11 rounded-2xl bg-ios-green/10 flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5 text-ios-green" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">郵寄對帳單</p>
          <p className="text-xs text-muted-foreground">
            {expenses.length === 0 ? "尚無支出資料" : "開啟郵件程式並附上 CSV 報表"}
          </p>
        </div>
        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {exportStatus === "error" && (
        <p className="text-xs text-destructive text-center">{errorMsg}</p>
      )}

      {/* Email Dialog */}
      {showEmailDialog && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEmailDialog(false); }}
        >
          <motion.div
            className="w-full max-w-md bg-background rounded-t-3xl p-6 pb-10 shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-foreground text-lg">郵寄對帳單</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  將自動下載 CSV 並開啟您的郵件程式
                </p>
              </div>
              <button
                onClick={() => { setShowEmailDialog(false); setErrorMsg(""); setEmailStatus("idle"); }}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-sm text-muted-foreground mb-1.5 block">收件人 Email</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setErrorMsg(""); }}
                placeholder="example@email.com"
                className="w-full h-12 rounded-xl bg-secondary px-4 text-foreground outline-none focus:ring-2 focus:ring-ios-blue transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleSendEmail()}
                autoFocus
              />
              {errorMsg && (
                <p className="text-xs text-destructive mt-1.5 px-1">{errorMsg}</p>
              )}
            </div>

            <div className="bg-secondary/50 rounded-xl p-3 mb-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                點擊「發送」後會同時：
                <br />1. 下載 CSV 報表至您的裝置
                <br />2. 開啟郵件程式，預填主旨與文字摘要
                <br />3. 請手動將 CSV 附件加入郵件後發送
              </p>
            </div>

            <Button
              variant="ios"
              size="lg"
              className="w-full"
              onClick={handleSendEmail}
              disabled={isEmailing || emailStatus === "success"}
            >
              {isEmailing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  準備中...
                </>
              ) : emailStatus === "success" ? (
                <>
                  <Check className="w-4 h-4" />
                  已開啟郵件程式
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  發送對帳單
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

import { useState } from "react";
// 假設你原本的專案有這些圖示庫，如果沒有可以換成普通的文字或 emoji
import { Cloud, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button"; 
import { exportAllData, importAllData } from "@/lib/store";
import { loginToGoogle, syncToCloud, downloadFromCloud } from "@/lib/googleDrive";

export function GoogleAuth() {
  // 記錄按鈕的三種狀態：載入中、是否已登入、是否有錯誤
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 呼叫我們剛剛寫好的底層函數
      const token = await loginToGoogle();
      console.log("成功拿到通行證！", token);
      
      setIsLoggedIn(true);
      
      // 未來這裡會呼叫：去雲端下載帳單資料()
      
    } catch (err) {
      console.error("登入流程發生錯誤:", err);
      setError("登入失敗或被取消，請重試。");
    } finally {
      setIsLoading(false); // 不管成功或失敗，都要把載入動畫關掉
    }
  };

  // 新增處理上傳與下載的狀態
  const [syncStatus, setSyncStatus] = useState("");

  const handleBackup = async () => {
    setSyncStatus("上傳中...");
    try {
      const data = exportAllData();
      await syncToCloud(data);
      setSyncStatus("✅ 備份成功！");
      setTimeout(() => setSyncStatus(""), 3000);
    } catch (e) {
      setSyncStatus("❌ 備份失敗");
    }
  };

  const handleRestore = async () => {
    setSyncStatus("下載中...");
    try {
      const cloudData = await downloadFromCloud();
      if (cloudData) {
        importAllData(cloudData);
        setSyncStatus("✅ 還原成功！請重新整理頁面。");
        // 強制重整網頁讓 React 讀取新資料
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncStatus("雲端還沒有備份紀錄喔");
        setTimeout(() => setSyncStatus(""), 3000);
      }
    } catch (e) {
      setSyncStatus("❌ 還原失敗");
    }
  };

  // 狀態 1：已經登入成功，顯示綠色的成功提示
  if (isLoggedIn) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">已連結 Google 雲端</span>
          </div>
        </div>
        
        {/* 手動同步按鈕區塊 */}
        <div className="flex gap-2">
          <Button variant="iosSecondary" size="sm" className="flex-1 text-xs" onClick={handleBackup}>
            上傳備份 ☁️
          </Button>
          <Button variant="iosSecondary" size="sm" className="flex-1 text-xs" onClick={handleRestore}>
            下載還原 📥
          </Button>
        </div>
        
        {syncStatus && (
          <p className="text-center text-xs font-medium text-muted-foreground mt-1 animate-pulse">
            {syncStatus}
          </p>
        )}
      </div>
    );
  }

  // 狀態 2：還沒登入，顯示登入按鈕
  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleLogin}
        disabled={isLoading}
        variant="iosSecondary" // 延續你原本的 iOS 風格按鈕
        className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-foreground bg-secondary hover:bg-secondary/80 transition-colors"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <Cloud className="w-5 h-5 text-ios-blue" />
        )}
        <span className="font-medium">
          {isLoading ? "正在連接 Google..." : "開啟 Google 雲端同步"}
        </span>
      </Button>
      
      {/* 狀態 3：如果發生錯誤，顯示紅字提示 */}
      {error && (
        <div className="flex items-center justify-center gap-1 mt-1 text-xs text-destructive">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
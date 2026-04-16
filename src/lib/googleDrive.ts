// src/lib/googleDrive.ts

// Google API 配置 (之後把這串換成你申請到的 Client ID)
const CLIENT_ID = "1077593798096-su0cq2e635i911i7f0ubaclsubb234j9.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";

let accessToken: string | null = null;
let isGoogleLoaded = false;

/**
 * 1. 動態載入 Google 翻譯蒟蒻 (取代寫在 index.html 的步驟)
 */
export function initGoogleScripts(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isGoogleLoaded) {
      resolve();
      return;
    }

    // 載入 Identity 腳本 (處理登入)
    const gsiScript = document.createElement("script");
    gsiScript.src = "https://accounts.google.com/gsi/client";
    gsiScript.async = true;
    gsiScript.defer = true;
    
    // 載入 API 腳本 (處理雲端硬碟)
    const apiScript = document.createElement("script");
    apiScript.src = "https://apis.google.com/js/api.js";
    apiScript.async = true;
    apiScript.defer = true;

    // 當 API 腳本載入完成時
    apiScript.onload = () => {
      isGoogleLoaded = true;
      resolve();
    };

    apiScript.onerror = () => reject(new Error("Google Scripts 載入失敗"));

    // 把標籤塞進網頁裡
    document.head.appendChild(gsiScript);
    document.head.appendChild(apiScript);
  });
}

/**
 * 2. 啟動 Google 登入流程
 */
export async function loginToGoogle(): Promise<string> {
  // 確保腳本已經載入
  await initGoogleScripts();

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) {
          console.error("登入失敗", response);
          reject(response);
          return;
        }
        accessToken = response.access_token;
        console.log("成功拿到 Google 鑰匙！", accessToken);
        resolve(accessToken!);
      },
    });
    // 呼叫這行就會彈出 Google 登入視窗
    client.requestAccessToken();
  });
}

/**
 * 內部輔助：尋找雲端隱藏資料夾中，有沒有舊的帳單備份檔
 */
async function getBackupFileId() {
  if (!accessToken) return null;
  const res = await fetch("https://www.googleapis.com/drive/v3/files?q=name='sep_real_data.json' and 'appDataFolder' in parents&spaces=appDataFolder", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return (data.files && data.files.length > 0) ? data.files[0].id : null;
}

/**
 * 3. 上傳備份：將所有帳單推上 Google 雲端
 */
export async function syncToCloud(allData: any) {
  if (!accessToken) throw new Error("尚未登入 Google");
  
  const fileId = await getBackupFileId(); // 檢查有沒有舊檔案
  const fileContent = JSON.stringify(allData);

  const formData = new FormData();
  // 如果是更新檔案，不能傳 parents 屬性；如果是新檔案則要指定存入隱藏資料夾
  const metadata = fileId ? {} : { name: "sep_real_data.json", parents: ["appDataFolder"] };
  formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  formData.append("file", new Blob([fileContent], { type: "application/json" }));

  // 如果有舊檔案就用 PATCH 更新，沒有就用 POST 建立
  const url = fileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart` 
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const response = await fetch(url, {
    method: fileId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const result = await response.json();

  console.log("Google 回傳結果:", result); 
  
  if (result.id) {
    console.log("✅ 檔案已成功存在雲端，ID 為:", result.id);
  } else {
    console.error("❌ 檔案上傳失敗！原因:", result.error?.message);
  }
  return result;
}

/**
 * 4. 下載還原：從 Google 雲端抓取最新帳單
 */
export async function downloadFromCloud() {
  if (!accessToken) throw new Error("尚未登入 Google");
  const fileId = await getBackupFileId();
  if (!fileId) return null; // 雲端還沒有備份

  // 下載檔案內容 (?alt=media)
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return await response.json();
}
---
name: uniqlo-data-schema
description: UNIQLO 商品資料庫的欄位定義與分類階層邏輯規範，是爬蟲清洗資料與前端調用欄位的唯一準則。
---

# UNIQLO 資料庫欄位定義與分類邏輯規範

本規範定義了台灣 UNIQLO 商品資料在爬蟲抓取、資料清洗、儲存於本地快取 `products.json` 以及同步至 Firestore 線上資料庫時的欄位定義與多級分類邏輯。

---

## 📌 1. 商品主要欄位定義 (Schema Mapping)

| 資料庫欄位 | 資料類型 | 說明 / 定義 | 來源 / 映射邏輯 |
| :--- | :--- | :--- | :--- |
| **`id`** | String | 商品唯一識別碼 (與 `ProductId` 相同) | `item.productCode || item.code` |
| **`ProductId`** | String | 官網內部唯一貨號 (如 `u0000000053173`) | `item.productCode || item.code` |
| **`productCode`** | String | 官網內部產品代碼 (同 `ProductId`) | `item.productCode` |
| **`code`** | String | 官網 6 位數款式編號 (如 `482760`) | `item.code` |
| **`omsProductCode`**| String | 訂單管理系統商品代碼 | `item.omsProductCode` |
| **`name`** | String | 商品完整名稱 | `item.name || item.productName` |
| **`shortName`** | String | 商品簡短名稱 | `item.shortName || item.productName` |
| **`size`** | Array | 商品提供的尺寸列表 (已將代碼轉譯為可讀文字) | 對應 API 的 `size` 欄位並透過 `sizeMap` 轉譯 (如 `["S", "M", "L"]`)，若為 `CMC110` / `CMA80` 等代碼則提取後方數字轉譯為 `110cm` / `80cm` |
| **`sizes`** | Array | **[相容欄位]** 與 `size` 相同，維持舊前端運作 | 同上 |
| **`styleText`** | Array | 商品的所有顏色名稱列表 | `item.styleText` (如 `["00 WHITE", "09 BLACK"]`) |
| **`chipPic`** | Array | 所有顏色對應的色票圖絕對路徑網址陣列 | 將 `item.chipPic` 相對路徑拼接 `https://www.uniqlo.com/tw` |
| **`minPrice`** | Number | 目前商品銷售最低價 | `item.minPrice` |
| **`maxPrice`** | Number | 目前商品銷售最高價 | `item.maxPrice` |
| **`originPrice`** | Number | 商品原價 | `item.originPrice` |
| **`mainPic`** | String | 商品主圖絕對網址 | 將 `item.mainPic` 相對路徑拼接 `https://www.uniqlo.com/tw` |
| **`sex`** | String | 適用對象/性別 (如 `男裝/男女適穿`、`童裝`) | `item.sex || item.gender` |
| **`colors`** | Array | **[相容欄位]** 舊有的顏色與圖片物件陣列 | 包含 `code`、`name`、`chipUrl` 及 `largePicUrl` |
| **`salesPromotionLabel`**| Array | **[相容欄位]** 行銷與限時特價促銷標籤陣列 | 由 `identity` 及特價時間庫存計算得出的貼標，如 `[{ labelType: "1", labelText: "特價商品" }]` |
| **`historyPrices`** | Array | 歷史價格紀錄 (包含日期與價格，用以繪製折線圖) | `[{ date: "YYYY-MM-DD", price: 490 }]` |
| **`isNew`** | String | 是否為新品，值為 `"Y"` 或 `"N"` | 若 `item.isNew === 'Y'` 或 `identity` 包含 `new_product` 則為 `"Y"`，否則 `"N"` |
| **`isConcessionalRate`**| String | 是否為特價商品，值為 `"Y"` 或 `"N"` | 若 `item.isConcessionalRate === 'Y'` 或 `identity` 包含 `concessional_rate` 則為 `"Y"`，否則 `"N"` |
| **`isTimeDoptimal`** | String | 是否為期間限定特價，值為 `"Y"` 或 `"N"` | 若 `item.isTimeDoptimal === 'Y'` 或 `identity` 包含 `time_doptimal` 則為 `"Y"`，否則 `"N"` |
| **`timeLimitedBegin`** | Number | 期間限定特價開始時間 (毫秒時間戳) | `item.timeLimitedBegin` |
| **`timeLimitedEnd`** | Number | 期間限定特價結束時間 (毫秒時間戳) | `item.timeLimitedEnd` |
| **`planOnDate`** | Number | 預計上架時間 (毫秒時間戳) | `item.planOnDate` |
| **`firstListTime`** | Number | 首次上架時間 (毫秒時間戳) | `item.firstListTime || item.new` |
| **`planOutDate`** | Number | 預計下架時間 (毫秒時間戳) | `item.planOutDate` |
| **`makePantsLengthFlag`**| String | 可否改褲長標記，值為 `"Y"` 或 `"N"` | `item.makePantsLengthFlag || 'N'` |
| **`identity`** | Array | 官網行銷屬性標籤清單 | `item.identity` (如 `["pickUp", "concessional_rate"]`) |
| **`listYearSeason`** | String | 上架年份季節 (如 `夏季`) | `item.listYearSeason || item.season` |
| **`categoryNames`** | Array | 分類名稱階層路徑 (按 `level` 排列，詳見分類邏輯) | 整合各 level 分類名稱產生的層級路徑陣列 |

---

## 🗂️ 2. 分類結構邏輯規範 (Category Hierarchy)

為了提供前端進行多級導航與麵包屑定位，所有商品必須擁有一個反映其樹狀分類屬性的 `categoryNames` 分類路徑。

### 分類層級定義
* **Level 0 (大類/性別)**: 提取自 API 原始物件的 `topCategories` (或當不存在時以 `gender`/`sex` 作為備用)。
* **Level 1 (大品類)**: 提取自 API 原始物件 `levelOne` 陣列。
* **Level 2 (中品類)**: 提取自 API 原始物件 `levelTwo` 陣列。
* **Level 3 (小品類)**: 提取自 API 原始物件 `levelThree` 陣列。

### 爬蟲清洗與去重演算法
```javascript
const categoryNames = [];
const levels = [item.topCategories, item.levelOne, item.levelTwo, item.levelThree];
levels.forEach(levelList => {
  if (levelList && Array.isArray(levelList)) {
    levelList.forEach(c => {
      if (c.name && !categoryNames.includes(c.name)) {
        categoryNames.push(c.name);
      }
    });
  }
});
```
* **範例輸出**:
  ```json
  "categoryNames": [
    "男裝",
    "T恤/背心/休閒",
    "T恤/POLO衫",
    "背心"
  ]
  ```

---

## ⚠️ 3. 修改與調整守則 (Maintenance Policy)
1. **向下相容性**: 若有任何新增欄位之需求，請一律將新欄位作為**擴充屬性**加入資料庫，切勿修改或刪除既有前端程式碼所依賴的核心欄位（如 `sizes`、`colors`、`salesPromotionLabel` 等）。
2. **自動更新規範**: 若爬蟲清洗邏輯或資料庫結構發生任何變更，**必須同步修改此 `SKILL.md` 檔案**，以確保此檔案始終保持為唯一且最新的 Source of Truth。

# UNIQLO 商品同步架構設計文件

## 1. 需求說明

網站每週四固定抓取 UNIQLO API，更新期間限定商品資料。

目前商品規模：
- 商品數量：約 2,000 品項
- 更新頻率：每週一次
- 資料庫：Firestore

---

# 2. 整體同步流程

```
UNIQLO API
    ↓
Cloud Scheduler (每週四)
    ↓
Sync Function / Cloud Run
    ↓
資料整理與格式化
    ↓
Hash Diff 比對
    ↓
Firestore Incremental Update
    ↓
網站讀取最新資料
```

---

# 3. 同步策略

## 採用增量同步 (Incremental Sync)

流程：

```
API 商品資料
      |
      ↓
比對 Firestore 現有資料
      |
      ├── 新商品 → Create
      ├── 商品變更 → Update
      ├── 商品未變 → Skip
      └── 商品消失 → Expired
```

---

# 4. Firestore 資料結構

## products Collection

```
products
 └── {productId}
       ├── name
       ├── price
       ├── salePrice
       ├── image
       ├── category
       ├── colors
       ├── sizes
       ├── campaign
       ├── status
       ├── hash
       └── updatedAt
```

---

# 5. Hash 差異比對機制

比對欄位：

```
name
price
salePrice
image
campaign
color
size
```

流程：

```
API 商品
 ↓
產生 Hash
 ↓
與 Firestore hash 比較

相同 → Skip
不同 → Update
```

---

# 6. 商品狀態管理

不要直接刪除商品。

狀態：

```
active
expired
inactive
```

API 不再回傳：

```
active → expired
```

---

# 7. Firestore Batch Write

Firestore 單次 Batch：

```
最多 500 writes
```

2000 商品：

```
Batch 1: 500
Batch 2: 500
Batch 3: 500
Batch 4: 500
```

---

# 8. 同步紀錄

sync_logs：

```
system
 └── sync_logs
       └── 20260625
```

紀錄：

- total
- created
- updated
- unchanged
- expired
- status
- duration

---

# 9. 期間限定商品索引

建立：

```
campaign_products
 └── current
```

首頁直接讀取期間限定商品，不掃描全部 products。

---

# 10. 最終架構

```
UNIQLO API

↓

Cloud Scheduler

↓

Cloud Function / Cloud Run

↓

Data Formatter

↓

Hash Compare

↓

Firestore

├── products
├── campaign_products
├── sync_logs
└── raw_snapshots
```

---

# 11. 預期效益

2000 商品：

- 全量抓取 API
- 差異更新 Firestore
- 減少 80~90% 寫入
- 降低成本
- 提升同步速度
- 保留歷史資料

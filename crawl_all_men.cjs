const fs = require('fs');
const crypto = require('crypto');

// ========== 設定 ==========
const CONFIG = {
  // 爬取目標
  categories: [
    { code: 'all_men', label: '全部男裝' },
    { code: 'all_women', label: '全部女裝' },
    { code: 'all_kids', label: '全部童裝' },
    { code: 'all_baby', label: '全部嬰幼兒' },
  ],
  newArrivals: [
    { code: 'feature-new-men', label: '男裝新品' },
    { code: 'feature-new-women', label: '女裝新品' },
    { code: 'feature-new-kids', label: '童裝新品' },
    { code: 'feature-new-baby', label: '嬰幼兒新品' },
  ],
  pageSize: 100,
  // 反封鎖設定
  minDelay: 800,    // 每頁最小延遲 ms
  maxDelay: 1500,   // 每頁最大延遲 ms
  batchSize: 3,     // 每爬幾頁休息一次
  batchPause: 3000, // 批次間額外休息 ms
  // 路徑
  outputPath: 'C:/Users/jacky/.gemini/antigravity-ide/scratch/products_db.json',
  localJsonPath: 'c:/Users/jacky/OneDrive/Desktop/UNIQLO/src/data/products.json',
  envPath: 'c:/Users/jacky/OneDrive/Desktop/UNIQLO/.env',
};

// 隨機 User-Agent 清單
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

// 尺寸對照表
const sizeMap = {
  'SMA001': 'XXS', 'SMA002': 'XS', 'SMA003': 'S', 'SMA004': 'M',
  'SMA005': 'L', 'SMA006': 'XL', 'SMA007': 'XXL', 'SMA008': '3XL', 'SMA009': '4XL'
};

function mapSizes(sizeList) {
  if (!sizeList || !Array.isArray(sizeList)) return [];
  return sizeList.map(s => {
    const match = s.match(/^CM[A-Za-z]+(\d+)$/);
    if (match) {
      return `${match[1]}cm`;
    }
    return sizeMap[s] || s;
  });
}

// ========== 工具函式 ==========

function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function safeFetch(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        const wait = (i + 1) * 5000;
        console.log(`    ⚠ 429 Too Many Requests, waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch (e) {
      if (i < retries - 1) {
        const wait = (i + 1) * 2000;
        console.log(`    ⚠ Fetch error: ${e.message}, retry in ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw e;
      }
    }
  }
  return null;
}

// 產生商品 Hash 供比對使用
function getProductHash(p) {
  const data = `${p.name}-${p.minPrice}-${p.originPrice}-${p.mainPic}-${JSON.stringify(p.size)}-${JSON.stringify(p.colors || [])}-${JSON.stringify(p.salesPromotionLabel || [])}-${p.isNew}-${p.isConcessionalRate}-${p.isTimeDoptimal}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// ========== 爬取邏輯 ==========

async function crawlCategory(categoryCode, label) {
  const products = [];
  let totalPages = 1;
  let requestCount = 0;

  console.log(`\n  📦 [${label}] (${categoryCode}) 開始爬取...`);

  for (let page = 1; page <= totalPages; page++) {
    console.log(`    Page ${page}/${totalPages}...`);

    const url = `https://d.uniqlo.com/tw/hmall-sc-service/search/byCategoryId/v2?categoryId=${categoryCode}&price=&color=&size=&unisex=&babyAge=&multiProduct=&flashes=&season=&fit=&material=&identity=&stock=&pageNo=${page}&pageSize=${CONFIG.pageSize}&sort=orderOfCategoryNames&code=&query=&description=&stockFilter=`;

    try {
      const startTime = Date.now();
      const res = await safeFetch(url, {
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'application/json',
          'Referer': 'https://www.uniqlo.com/'
        }
      });
      const elapsed = Date.now() - startTime;
      console.log(`    ✔ HTTP ${res.status} (${elapsed}ms)`);

      if (!res || res.status !== 200) {
        console.error(`    ❌ Failed to crawl page ${page}`);
        continue;
      }

      const json = await res.json();
      if (!json.success || !json.resp || json.resp.length === 0) {
        console.log(`    No more data or success is false`);
        break;
      }

      const rawItems = json.resp[0] || [];
      const pagination = json.resp[1] || {};
      totalPages = pagination.totalPages || 1;

      console.log(`    Found ${rawItems.length} items (Total pages: ${totalPages})`);
      products.push(...rawItems);

      requestCount++;
      if (page < totalPages) {
        await randomDelay(CONFIG.minDelay, CONFIG.maxDelay);
        if (requestCount % CONFIG.batchSize === 0) {
          console.log(`    💤 批次休息 ${CONFIG.batchPause / 1000}s...`);
          await new Promise(r => setTimeout(r, CONFIG.batchPause));
        }
      }
    } catch (e) {
      console.error(`    ❌ Error page ${page}:`, e.message);
    }
  }

  console.log(`  📦 [${label}] 完成，共 ${products.length} 件\n`);
  return products;
}

// 解析商品
function parseProduct(item, today) {
  const currentPrice = item.minPrice || item.originPrice || 0;
  const historyPrices = [{ date: today, price: currentPrice }];

  const colors = [];
  const colorNums = item.colorNums || [];
  const chipPic = item.chipPic || [];
  const styleText = item.styleText || [];
  const colorPic = item.colorPic || [];
  colorNums.forEach((code, index) => {
    colors.push({
      code,
      name: styleText[index] || '',
      chipUrl: chipPic[index] || '',
      largePicUrl: colorPic[index] || ''
    });
  });

  const sizes = mapSizes(item.size);

  // 自動貼標
  const salesPromotionLabel = [];
  const now = Date.now();
  const hasTimeLimit = item.timeLimitedBegin && item.timeLimitedEnd &&
    now >= item.timeLimitedBegin && now <= item.timeLimitedEnd;
  const isConcessional = item.identity && item.identity.includes('concessional_rate');

  if (isConcessional) {
    salesPromotionLabel.push({ labelType: '1', labelText: '特價商品' });
  }
  if (hasTimeLimit) {
    const endLimit = new Date(item.timeLimitedEnd);
    const mm = String(endLimit.getMonth() + 1).padStart(2, '0');
    const dd = String(endLimit.getDate()).padStart(2, '0');
    salesPromotionLabel.push({ labelType: '2', labelText: `截至 ${mm}/${dd} 限定價格` });
  }

  // 整理分類階層邏輯 (topCategories -> levelOne -> levelTwo -> levelThree)
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
  // Fallback to categoryName
  if (categoryNames.length === 0 && item.categoryName && Array.isArray(item.categoryName)) {
    item.categoryName.forEach(name => {
      if (name && !categoryNames.includes(name)) categoryNames.push(name);
    });
  }

  // 狀態欄位布林值轉譯
  const isNew = !!(item.isNew === 'Y' || (item.identity && item.identity.includes('new_product')));
  const isConcessionalRate = !!(item.isConcessionalRate === 'Y' || (item.identity && item.identity.includes('concessional_rate')));
  const isTimeDoptimal = !!(item.isTimeDoptimal === 'Y' || (item.identity && item.identity.includes('time_doptimal')));

  // 轉換色票為相對路徑
  const relChipPic = (item.chipPic || []).map(p => p || '');

  return {
    id: item.productCode || item.code,
    ProductId: item.productCode || item.code, // 官網貨號
    productCode: item.productCode,
    code: item.code,                           // 商品編號
    omsProductCode: item.omsProductCode,
    name: item.name || item.productName,       // 商品名
    shortName: item.shortName || item.productName,
    size: sizes,                               // 尺寸 (已轉譯尺寸名稱)
    styleText: item.styleText || [],          // 顏色名稱陣列
    chipPic: relChipPic,                       // 色票圖網址陣列
    minPrice: item.minPrice,
    maxPrice: item.maxPrice,
    originPrice: item.originPrice,             // 原價
    mainPic: item.mainPic || '',
    sex: item.sex || item.gender,              // 商品性別
    colors,                                    // 保留舊 colors 欄位以相容前端
    salesPromotionLabel,                       // 保留舊促銷標籤以相容前端
    historyPrices,
    isNew,                                     // 布林值新品
    isConcessionalRate,                        // 布林值特價商品
    isTimeDoptimal,                            // 布林值期間限定特價
    timeLimitedBegin: item.timeLimitedBegin || null,
    timeLimitedEnd: item.timeLimitedEnd || null,
    planOnDate: item.planOnDate || null,
    firstListTime: item.firstListTime || item.new || null,
    planOutDate: item.planOutDate || null,
    makePantsLengthFlag: item.makePantsLengthFlag || 'N',
    identity: item.identity || [],
    listYearSeason: item.listYearSeason || item.season || null,
    categoryNames                              // 按 level 階層分類名稱陣列
  };
}

// ========== 主流程 ==========

async function crawl() {
  const today = new Date().toISOString().split('T')[0];
  const startTime = Date.now();
  const productMap = new Map();

  console.log('╔══════════════════════════════════════╗');
  console.log('║   UNIQLO 商品爬蟲 v3.0              ║');
  console.log('║   增量更新 & 寫入分流優化            ║');
  console.log(`║   ${today}                        ║`);
  console.log('╚══════════════════════════════════════╝\n');

  // 1. 爬取全量分類商品
  for (const cat of CONFIG.categories) {
    const rawList = await crawlCategory(cat.code, cat.label);
    let count = 0;
    for (const item of rawList) {
      const p = parseProduct(item, today);
      p.active = true;
      p.status = 'active';
      productMap.set(p.id, p);
      count++;
    }
    console.log(`  ✔ [${cat.label}] 載入 ${count} 件商品`);
    await randomDelay(CONFIG.minDelay, CONFIG.maxDelay);
  }

  // 2. 爬取新品標記
  let totalNewCount = 0;
  for (const cat of CONFIG.newArrivals) {
    const rawList = await crawlCategory(cat.code, cat.label);
    let newCount = 0;
    for (const item of rawList) {
      const pId = item.productCode || item.code;
      if (productMap.has(pId)) {
        productMap.get(pId).isNewArrival = true;
        newCount++;
      } else {
        const p = parseProduct(item, today);
        p.isNewArrival = true;
        p.active = true;
        p.status = 'active';
        productMap.set(pId, p);
        newCount++;
      }
    }
    totalNewCount += newCount;
    console.log(`  🆕 [${cat.label}] 標記 ${newCount} 件為新品`);
    await new Promise(r => setTimeout(r, CONFIG.batchPause));
  }

  console.log(`\n📊 新品總計：${totalNewCount} 件`);
  console.log(`📊 全部商品（最終）：${productMap.size} 件\n`);

  const allProducts = Array.from(productMap.values());

  // 儲存本地 JSON (供備份)
  fs.writeFileSync(CONFIG.outputPath, JSON.stringify(allProducts, null, 2));
  console.log('💾 本地 JSON 已儲存備份');

  // ===== Step 3: 同步到 Firestore =====
  await syncToFirestore(allProducts);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🏁 全部完成！耗時 ${elapsed}s`);
}

// ========== Firestore 同步 ==========

async function syncToFirestore(products) {
  console.log('\n===== Step 3: 增量同步至 Firestore =====');
  try {
    // 載入環境變數
    if (fs.existsSync(CONFIG.envPath)) {
      const content = fs.readFileSync(CONFIG.envPath, 'utf8');
      content.split('\n').forEach(line => {
        const parts = line.trim().split('=');
        if (parts.length >= 2) {
          process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
      });
    }

    const { initializeApp } = await import('firebase/app');
    const { getFirestore, doc, setDoc, getDoc, getDocs, collection, writeBatch } = await import('firebase/firestore');

    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const today = new Date().toISOString().split('T')[0];
    
    // A. 抓取資料庫中目前所有 active 商品 ID 集合，做下架比對
    console.log('  🔍 讀取資料庫現有商品列表...');
    const dbActiveIds = new Set();
    const dbHashMap = new Map(); // id -> hash
    
    const productsSnapshot = await getDocs(collection(db, 'products'));
    productsSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.status === 'active' || data.active === true) {
        dbActiveIds.add(docSnap.id);
      }
      if (data.hash) {
        dbHashMap.set(docSnap.id, data.hash);
      }
    });
    console.log(`  🔍 目前線上 active 商品數: ${dbActiveIds.size}`);

    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let expiredCount = 0;

    // B. 分批寫入 (Batch Size 500)
    let batch = writeBatch(db);
    let batchOpCount = 0;
    
    const commitBatchIfNeeded = async (force = false) => {
      if (batchOpCount >= 400 || (force && batchOpCount > 0)) {
        console.log(`  📤 正在提交寫入批次 (${batchOpCount} 項變更)...`);
        await batch.commit();
        batch = writeBatch(db);
        batchOpCount = 0;
      }
    };

    // 儲存期間限定商品的快速索引清單
    const campaignProducts = [];

    for (const p of products) {
      const docRef = doc(db, 'products', p.id);
      const priceDocRef = doc(db, 'product_prices', p.id);
      
      const newHash = getProductHash(p);
      const oldHash = dbHashMap.get(p.id);

      // 檢查是否為期間限定特價商品
      const isCampaign = p.isTimeDoptimal === true || 
        (p.salesPromotionLabel && p.salesPromotionLabel.some(l => l.labelText && l.labelText.includes('限定價格')));
      
      if (isCampaign) {
        campaignProducts.push({
          id: p.id,
          ProductId: p.ProductId,
          productCode: p.productCode,
          code: p.code,
          name: p.name,
          shortName: p.shortName,
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
          originPrice: p.originPrice,
          mainPic: p.mainPic,
          sex: p.sex,
          size: p.size,
          salesPromotionLabel: p.salesPromotionLabel,
          isTimeDoptimal: p.isTimeDoptimal,
          timeLimitedBegin: p.timeLimitedBegin,
          timeLimitedEnd: p.timeLimitedEnd
        });
      }

      // 從 active 集合中標記為已處理
      dbActiveIds.delete(p.id);

      // C. 檢查商品 Hash 是否改變
      if (oldHash && oldHash === newHash) {
        // Hash 相同，略過更新主商品，不產生寫入成本
        unchangedCount++;
        continue;
      }

      // Hash 不同，合併歷史價格並寫入
      let historyPrices = p.historyPrices || [{ date: today, price: p.minPrice }];
      try {
        const priceDocSnap = await getDoc(priceDocRef);
        if (priceDocSnap.exists()) {
          const existing = priceDocSnap.data();
          if (existing.historyPrices && Array.isArray(existing.historyPrices)) {
            historyPrices = existing.historyPrices;
            const todayRecord = historyPrices.find(h => h.date === today);
            if (!todayRecord) {
              historyPrices.push({ date: today, price: p.minPrice });
            } else if (todayRecord.price !== p.minPrice) {
              todayRecord.price = p.minPrice;
            }
          }
        }
      } catch (e) { /* ignore */ }

      // 計算是否為歷史最低價
      let isLowest = false;
      if (historyPrices && historyPrices.length > 1) {
        const allSame = historyPrices.every(hp => hp.price === historyPrices[0].price);
        if (!allSame) {
          const otherPrices = historyPrices.filter(hp => hp.date !== today).map(hp => hp.price);
          if (otherPrices.length > 0) {
            isLowest = p.minPrice < Math.min(...otherPrices);
          }
        }
      }
      
      // 更新屬性
      p.isHistoricalLowest = isLowest;
      p.hash = newHash;
      p.updatedAt = Date.now();

      // 1. 同步寫入歷史價格集合
      batch.set(priceDocRef, { id: p.id, historyPrices });
      batchOpCount++;

      // 2. 移除商品 doc 中的 historyPrices，避免主商品臃腫
      delete p.historyPrices;

      // 3. 過濾掉所有 null 與 undefined 值，避免儲存無效鍵名佔用空間
      Object.keys(p).forEach(key => {
        if (p[key] === null || p[key] === undefined) {
          delete p[key];
        }
      });

      // 4. 同步寫入主商品集合
      batch.set(docRef, p);
      batchOpCount++;

      if (oldHash) {
        updatedCount++;
      } else {
        createdCount++;
      }

      await commitBatchIfNeeded();
    }

    // D. 處理下架商品 (在資料庫中為 active 但本次沒爬到的商品)
    if (dbActiveIds.size > 0) {
      console.log(`  🍂 偵測到 ${dbActiveIds.size} 件商品下架，正在將狀態更新為 expired...`);
      for (const expiredId of dbActiveIds) {
        const expiredRef = doc(db, 'products', expiredId);
        batch.update(expiredRef, { 
          active: false, 
          status: 'expired',
          updatedAt: Date.now() 
        });
        batchOpCount++;
        expiredCount++;
        await commitBatchIfNeeded();
      }
    }

    // E. 建立/更新期間限定商品的獨立快速索引
    console.log(`  ⭐ 建立期間限定商品索引 (${campaignProducts.length} 件)...`);
    const campaignRef = doc(db, 'campaign_products', 'current');
    batch.set(campaignRef, {
      updatedAt: Date.now(),
      products: campaignProducts
    });
    batchOpCount++;

    // F. 寫入同步日誌
    const dateStr = today.replace(/-/g, '');
    const logRef = doc(db, 'system', `sync_logs_${dateStr}`);
    batch.set(logRef, {
      date: today,
      total: products.length,
      created: createdCount,
      updated: updatedCount,
      unchanged: unchangedCount,
      expired: expiredCount,
      status: 'success',
      duration: ((Date.now() - startTime) / 1000),
      timestamp: Date.now()
    });
    batchOpCount++;

    // 提交剩餘的所有變更
    await commitBatchIfNeeded(true);

    console.log('╔══════════════════════════════════════╗');
    console.log('║   Firestore 同步報告                  ║');
    console.log(`║   - 新增: ${createdCount} 件`);
    console.log(`║   - 更新: ${updatedCount} 件`);
    console.log(`║   - 未變: ${unchangedCount} 件 (已略過寫入)`);
    console.log(`║   - 下架: ${expiredCount} 件`);
    console.log('╚══════════════════════════════════════╝\n');

  } catch (e) {
    console.error('❌ Firestore 增量同步失敗:', e);
  }
}

crawl();

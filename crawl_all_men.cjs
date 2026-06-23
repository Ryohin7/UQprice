const fs = require('fs');

// ========== 設定 ==========
const CONFIG = {
  // 爬取目標
  categories: [
    { code: 'all_men', label: '全部男裝' },
    { code: 'all_women', label: '全部女裝' },
  ],
  newArrivals: [
    { code: 'feature-new-men', label: '男裝新品' },
    { code: 'feature-new-women', label: '女裝新品' },
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
  return sizeList.map(s => sizeMap[s] || s);
}

// ========== 工具函式 ==========

// 隨機延遲
function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, ms));
}

// 隨機 User-Agent
function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 帶重試的 fetch
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

// ========== 爬取邏輯 ==========

// 通用爬取函式
async function crawlCategory(categoryCode, label) {
  const products = [];
  let totalPages = 1;
  let requestCount = 0;

  console.log(`\n  📦 [${label}] (${categoryCode}) 開始爬取...`);

  for (let page = 1; page <= totalPages; page++) {
    console.log(`    Page ${page}/${totalPages}...`);

    try {
      const res = await safeFetch('https://d.uniqlo.com/tw/p/search/products/by-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': randomUA(),
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          'Origin': 'https://www.uniqlo.com',
          'Referer': 'https://www.uniqlo.com/tw/zh_TW/',
        },
        body: JSON.stringify({
          categoryCode,
          pageInfo: { page, pageSize: CONFIG.pageSize }
        })
      });

      if (!res || !res.ok) {
        console.error(`    ❌ Page ${page} failed, status: ${res?.status}`);
        continue;
      }

      const data = await res.json();
      const respData = data.resp && data.resp[0];
      if (!respData) continue;

      if (page === 1 && respData.productSum) {
        totalPages = Math.ceil(respData.productSum / CONFIG.pageSize);
        console.log(`    📊 共 ${respData.productSum} 件商品, ${totalPages} 頁`);
      }

      const list = respData.productList;
      if (!list || list.length === 0) continue;

      console.log(`    ✅ 取得 ${list.length} 件`);
      products.push(...list);
      requestCount++;

      // 反封鎖：隨機延遲
      await randomDelay(CONFIG.minDelay, CONFIG.maxDelay);

      // 每幾頁額外休息
      if (requestCount % CONFIG.batchSize === 0 && page < totalPages) {
        console.log(`    💤 批次休息 ${CONFIG.batchPause / 1000}s...`);
        await new Promise(r => setTimeout(r, CONFIG.batchPause));
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
      chipUrl: chipPic[index] ? `https://www.uniqlo.com/tw${chipPic[index]}` : '',
      largePicUrl: colorPic[index] ? `https://www.uniqlo.com/tw${colorPic[index]}` : ''
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

  return {
    id: item.productCode || item.code,
    productCode: item.productCode,
    code: item.code,
    omsProductCode: item.omsProductCode,
    name: item.name || item.productName,
    shortName: item.shortName || item.productName,
    minPrice: item.minPrice,
    maxPrice: item.maxPrice,
    originPrice: item.originPrice,
    mainPic: item.mainPic ? `https://www.uniqlo.com/tw${item.mainPic}` : '',
    sex: item.sex || item.gender,
    sizes,
    colors,
    salesPromotionLabel,
    historyPrices
  };
}

// ========== 主流程 ==========

async function crawl() {
  const today = new Date().toISOString().split('T')[0];
  const startTime = Date.now();
  const productMap = new Map();

  console.log('╔══════════════════════════════════════╗');
  console.log('║   UNIQLO 商品爬蟲 v2.0              ║');
  console.log('║   男裝 + 女裝 + 新品標記            ║');
  console.log(`║   ${today}                        ║`);
  console.log('╚══════════════════════════════════════╝\n');

  // ===== Step 1: 爬取全部商品 (男裝 + 女裝) =====
  console.log('===== Step 1: 爬取全部商品 =====');
  for (const cat of CONFIG.categories) {
    const rawList = await crawlCategory(cat.code, cat.label);
    for (const item of rawList) {
      const p = parseProduct(item, today);
      if (!productMap.has(p.id)) {
        p.isNewArrival = false;
        p.active = true;
        productMap.set(p.id, p);
      }
    }
    // 分類之間額外休息
    console.log(`  ⏳ 分類間休息 ${CONFIG.batchPause / 1000}s...\n`);
    await new Promise(r => setTimeout(r, CONFIG.batchPause));
  }

  console.log(`📊 全部商品（去重後）：${productMap.size} 件\n`);

  // ===== Step 2: 爬取新品，標記 isNewArrival =====
  console.log('===== Step 2: 爬取新品列表 =====');
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
        // 新品不在全部商品裡，也加進去
        const p = parseProduct(item, today);
        p.isNewArrival = true;
        p.active = true;
        productMap.set(pId, p);
        newCount++;
      }
    }
    totalNewCount += newCount;
    console.log(`  🆕 [${cat.label}] 標記 ${newCount} 件為新品`);

    // 分類之間額外休息
    await new Promise(r => setTimeout(r, CONFIG.batchPause));
  }

  console.log(`\n📊 新品總計：${totalNewCount} 件`);
  console.log(`📊 全部商品（最終）：${productMap.size} 件\n`);

  const allProducts = Array.from(productMap.values());

  // 儲存本地 JSON
  fs.writeFileSync(CONFIG.outputPath, JSON.stringify(allProducts, null, 2));
  fs.writeFileSync(CONFIG.localJsonPath, JSON.stringify(allProducts, null, 2));
  console.log('💾 JSON 已儲存');

  // ===== Step 3: 同步到 Firestore =====
  await syncToFirestore(allProducts);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🏁 全部完成！耗時 ${elapsed}s`);
}

// ========== Firestore 同步 ==========

async function syncToFirestore(products) {
  console.log('\n===== Step 3: 同步至 Firestore =====');
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
    const { getFirestore, doc, setDoc, getDoc } = await import('firebase/firestore');

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
    let count = 0;

    for (const p of products) {
      const docRef = doc(db, 'products', p.id);
      let historyPrices = p.historyPrices;

      // 合併歷史價格
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const existing = docSnap.data();
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

      p.historyPrices = historyPrices;
      await setDoc(docRef, p);
      count++;
      if (count % 100 === 0 || count === products.length) {
        console.log(`  📤 已同步 ${count}/${products.length}`);
      }
    }

    console.log(`\n✅ Firestore 同步完成，共 ${count} 件`);
  } catch (e) {
    console.error('❌ Firestore 同步失敗:', e.message);
  }
}

crawl();

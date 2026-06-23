const fs = require('fs');

// 尺寸對照表
const sizeMap = {
  'SMA001': 'XXS',
  'SMA002': 'XS',
  'SMA003': 'S',
  'SMA004': 'M',
  'SMA005': 'L',
  'SMA006': 'XL',
  'SMA007': 'XXL',
  'SMA008': '3XL',
  'SMA009': '4XL'
};

function mapSizes(sizeList) {
  if (!sizeList || !Array.isArray(sizeList)) return [];
  return sizeList.map(s => sizeMap[s] || s);
}

async function crawl() {
  const allProducts = [];
  const pageSize = 100;
  const totalPages = 8; // 709 / 100 = 7.09
  
  // 獲取今日日期格式 (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  console.log('Starting UQ Men products crawler (Real historical price starting today)...');

  for (let page = 1; page <= totalPages; page++) {
    console.log(`Crawling page ${page}/${totalPages}...`);
    try {
      const res = await fetch('https://d.uniqlo.com/tw/p/search/products/by-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categoryCode: 'all_men',
          pageInfo: {
            page: page,
            pageSize: pageSize
          }
        })
      });

      if (!res.ok) {
        console.error(`Page ${page} failed, status: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const list = data.resp && data.resp[0] && data.resp[0].productList;
      if (!list || list.length === 0) {
        console.log(`Page ${page} has no products.`);
        continue;
      }

      console.log(`Page ${page} crawled ${list.length} products.`);
      console.log('Sample labels:', list.filter(x => x.salesPromotionLabel && x.salesPromotionLabel.length > 0).slice(0, 3).map(x => ({ code: x.productCode, label: x.salesPromotionLabel })));

      // 解析商品
      for (const item of list) {
        const currentPrice = item.minPrice || item.originPrice || 590;
        
        // 歷史價格只保留今日一筆真實售價，不使用任何模擬資料
        const historyPrices = [
          { date: today, price: currentPrice }
        ];

        // 從對應的陣列中提取顏色
        const colors = [];
        const colorNums = item.colorNums || [];
        const chipPic = item.chipPic || [];
        const styleText = item.styleText || [];
        const colorPic = item.colorPic || [];

        colorNums.forEach((code, index) => {
          colors.push({
            code: code,
            name: styleText[index] || '',
            chipUrl: chipPic[index] ? `https://www.uniqlo.com/tw${chipPic[index]}` : '',
            largePicUrl: colorPic[index] ? `https://www.uniqlo.com/tw${colorPic[index]}` : ''
          });
        });

        // 將代碼對應成標準尺寸 (XS ~ 4XL)
        const sizes = mapSizes(item.size);

        // 自動貼標邏輯
        const salesPromotionLabel = [];
        const now = Date.now();
        const hasTimeLimit = item.timeLimitedBegin && item.timeLimitedEnd && 
          now >= item.timeLimitedBegin && now <= item.timeLimitedEnd;
        const isConcessional = item.identity && item.identity.includes('concessional_rate');

        if (isConcessional) {
          salesPromotionLabel.push({ labelType: '1', labelText: '特價商品' });
        }

        if (hasTimeLimit) {
          // 直接從 API 返回的 timeLimitedEnd 轉成 MM/DD
          const endLimit = new Date(item.timeLimitedEnd);
          const mm = String(endLimit.getMonth() + 1).padStart(2, '0');
          const dd = String(endLimit.getDate()).padStart(2, '0');
          
          salesPromotionLabel.push({ labelType: '2', labelText: `截至 ${mm}/${dd} 限定價格` });
        }

        const pId = item.productCode || item.code;
        if (allProducts.some(p => p.id === pId)) {
          continue;
        }

        allProducts.push({
          id: pId,
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
          sizes: sizes,
          colors: colors,
          salesPromotionLabel: salesPromotionLabel,
          historyPrices: historyPrices
        });
      }

      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`Error crawling page ${page}:`, e.message);
    }
  }

  console.log(`Crawling finished. Total unique products fetched: ${allProducts.length}`);
  
  fs.writeFileSync('C:/Users/jacky/.gemini/antigravity-ide/scratch/products_db.json', JSON.stringify(allProducts, null, 2));
  console.log('Database saved to products_db.json.');

  // 同步到 Firestore
  await syncToFirestore(allProducts);
}

async function syncToFirestore(products) {
  console.log('Starting sync to Firestore...');
  try {
    const fs = require('fs');
    // 載入環境變數
    const envPath = 'c:/Users/jacky/OneDrive/Desktop/UNIQLO/.env';
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const parts = line.trim().split('=');
        if (parts.length >= 2) {
          process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
      });
    }

    // 動態載入 Firebase
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
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const existingData = docSnap.data();
          if (existingData.historyPrices && Array.isArray(existingData.historyPrices)) {
            historyPrices = existingData.historyPrices;
            const todayRecord = historyPrices.find(h => h.date === today);
            if (!todayRecord) {
              historyPrices.push({ date: today, price: p.minPrice });
            } else if (todayRecord.price !== p.minPrice) {
              todayRecord.price = p.minPrice;
            }
          }
        }
      } catch (e) {
        // console.log(`Failed to fetch history for ${p.id}, will use default`);
      }

      p.historyPrices = historyPrices;
      await setDoc(docRef, p);
      count++;
      if (count % 50 === 0) {
        console.log(`Synced ${count}/${products.length} products to Firestore...`);
      }
    }
    console.log(`Firestore sync finished. Synced ${count} products.`);
  } catch (e) {
    console.error('Error syncing to Firestore:', e.message);
  }
}

crawl();

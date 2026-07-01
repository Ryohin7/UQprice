// Google Analytics 4 (GA4) 流量追蹤輔助模組
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

const isDev = import.meta.env.DEV;

/**
 * 初始化 Google Analytics
 */
export const initGA = () => {
  if (!GA_MEASUREMENT_ID) {
    if (isDev) {
      console.info('[GA4] 未偵測到 VITE_GA_MEASUREMENT_ID 變數，已停用流量追蹤。');
    }
    return;
  }

  // 避免重複載入
  if (window.gtag) return;

  try {
    // 1. 動態插入 Google Tag 腳本
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // 2. 初始化 dataLayer 與 gtag 函式
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };

    // 3. 設定初始配置 (停用自動發送 page_view，改由 SPA 手動觸發)
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
      cookie_flags: 'SameSite=None;Secure'
    });

    if (isDev) {
      console.log(`[GA4] 初始化成功，追蹤 ID: ${GA_MEASUREMENT_ID}`);
    }
  } catch (error) {
    console.error('[GA4] 初始化失敗:', error);
  }
};

/**
 * 內部呼叫 gtag 的安全包裝
 */
const sendGtag = (command, action, params) => {
  if (window.gtag) {
    window.gtag(command, action, params);
    if (isDev) {
      console.log(`[GA4 Event] ${command} -> ${action}:`, params);
    }
  }
};

/**
 * 記錄頁面瀏覽 (Page View)
 * @param {string} path 頁面路徑 (例如: '/' 或 '/admin')
 * @param {string} title 頁面標題
 */
export const logPageView = (path, title) => {
  if (!GA_MEASUREMENT_ID) return;
  sendGtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    send_to: GA_MEASUREMENT_ID
  });
};

/**
 * 記錄商品搜尋關鍵字
 * @param {string} searchTerm 搜尋字詞
 */
export const logSearch = (searchTerm) => {
  if (!GA_MEASUREMENT_ID || !searchTerm.trim()) return;
  sendGtag('event', 'search', {
    search_term: searchTerm.trim()
  });
};

/**
 * 記錄點擊並檢視商品詳情 (View Item)
 * @param {Object} product 商品物件
 */
export const logViewProduct = (product) => {
  if (!GA_MEASUREMENT_ID || !product) return;
  sendGtag('event', 'view_item', {
    currency: 'TWD',
    value: product.minPrice || 0,
    items: [{
      item_id: product.id || product.code,
      item_name: product.name,
      price: product.minPrice || 0,
      item_category: product.categoryNames && product.categoryNames[0] || 'Uncategorized',
      item_category2: product.sex || 'Unisex'
    }]
  });
};

/**
 * 記錄商品加入最愛追蹤清單 (Add to Wishlist)
 * @param {Object} product 商品物件
 */
export const logAddToFavorites = (product) => {
  if (!GA_MEASUREMENT_ID || !product) return;
  sendGtag('event', 'add_to_wishlist', {
    currency: 'TWD',
    value: product.minPrice || 0,
    items: [{
      item_id: product.id || product.code,
      item_name: product.name,
      price: product.minPrice || 0,
      item_category: product.categoryNames && product.categoryNames[0] || 'Uncategorized',
      item_category2: product.sex || 'Unisex'
    }]
  });
};

/**
 * 記錄商品移出最愛追蹤清單
 * @param {Object} product 商品物件
 */
export const logRemoveFromFavorites = (product) => {
  if (!GA_MEASUREMENT_ID || !product) return;
  sendGtag('event', 'remove_from_wishlist', {
    currency: 'TWD',
    value: product.minPrice || 0,
    items: [{
      item_id: product.id || product.code,
      item_name: product.name,
      price: product.minPrice || 0
    }]
  });
};

/**
 * 記錄點擊前往官網的外部連結 (Click Out / Select Item)
 * @param {Object} product 商品物件
 */
export const logClickExternalLink = (product) => {
  if (!GA_MEASUREMENT_ID || !product) return;
  sendGtag('event', 'select_item', {
    item_list_id: 'external_uniqlo_store',
    item_list_name: 'UNIQLO 台灣官方網站',
    items: [{
      item_id: product.id || product.code,
      item_name: product.name,
      price: product.minPrice || 0,
      item_category: product.categoryNames && product.categoryNames[0] || 'Uncategorized',
      item_category2: product.sex || 'Unisex'
    }]
  });
};

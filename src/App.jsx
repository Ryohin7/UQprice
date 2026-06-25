import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import ProductCard, { formatPrice } from './components/ProductCard';
import SkeletonCard from './components/SkeletonCard';
import PriceChart from './components/PriceChart';

import { Search, SlidersHorizontal, ArrowUpDown, X, Heart, ExternalLink, TrendingDown, Menu, User, Lock } from 'lucide-react';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc, increment } from 'firebase/firestore';
import AdminPanel from './components/AdminPanel';
import VersionHistoryModal from './components/VersionHistoryModal';

function AdminLoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      onLogin();
    } else {
      setError('帳號或密碼錯誤！');
    }
  };

  return (
    <div style={loginStyles.container}>
      <form onSubmit={handleSubmit} style={loginStyles.card}>
        <div style={loginStyles.iconWrapper}>
          <Lock size={32} style={{ color: 'var(--uq-red)' }} />
        </div>
        <h2 style={loginStyles.title}>管理員登入</h2>
        <p style={loginStyles.subtitle}>請輸入管理員帳密以進行系統版本發布</p>

        {error && <div style={loginStyles.error}>{error}</div>}

        <div style={loginStyles.formGroup}>
          <label style={loginStyles.label}>管理員帳號</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={loginStyles.input}
            placeholder="請輸入帳號"
            required
          />
        </div>

        <div style={loginStyles.formGroup}>
          <label style={loginStyles.label}>管理員密碼</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={loginStyles.input}
            placeholder="請輸入密碼"
            required
          />
        </div>

        <button type="submit" style={loginStyles.button}>
          登入系統
        </button>

        <button
          type="button"
          onClick={() => window.location.href = '/'}
          style={loginStyles.backButton}
        >
          返回首頁
        </button>
      </form>
    </div>
  );
}

const loginStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    padding: '24px',
  },
  card: {
    backgroundColor: 'var(--bg-white)',
    padding: '40px 32px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    border: '1px solid var(--border-color)',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
  },
  iconWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(231,31,25,0.06)',
    margin: '0 auto 20px auto',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 24px 0',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  error: {
    padding: '12px',
    backgroundColor: 'rgba(231,31,25,0.06)',
    color: 'var(--uq-red)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '20px',
    textAlign: 'center',
    border: '1px solid rgba(231,31,25,0.15)',
  },
  formGroup: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    backgroundColor: 'var(--uq-red)',
    color: 'var(--bg-white)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'opacity 0.2s',
  },
  backButton: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '12px',
    transition: 'background-color 0.2s',
  }
};

const isHistoricalLowest = (product) => {
  if (!product) return false;
  return product.isHistoricalLowest === true;
};

const isMenProduct = (p) => {
  if (!p.sex) return false;
  const s = p.sex.toLowerCase();
  return s.includes('男') || s.includes('men') || s.includes('unisex') || s.includes('適穿');
};

const isWomenProduct = (p) => {
  if (!p.sex) return false;
  const s = p.sex.toLowerCase();
  return s.includes('女') || s.includes('women') || s.includes('unisex') || s.includes('適穿');
};

const isKidsProduct = (p) => {
  if (!p.sex) return false;
  const s = p.sex.toLowerCase();
  return s.includes('童裝') || s.includes('男童') || s.includes('女童') || s.includes('kids');
};

const isBabyProduct = (p) => {
  if (!p.sex) return false;
  const s = p.sex.toLowerCase();
  const g = p.gender ? p.gender.toLowerCase() : '';
  return s.includes('新生兒') || s.includes('嬰幼兒') || s.includes('baby') || g.includes('新生兒') || g.includes('嬰幼兒');
};

const ALL_STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

const getProductSizesWithAvailability = (productSizes) => {
  if (!productSizes || productSizes.length === 0) return [];
  const upperSizes = productSizes.map(s => s.toUpperCase());
  const indices = upperSizes
    .map(s => ALL_STANDARD_SIZES.indexOf(s))
    .filter(idx => idx !== -1);

  if (indices.length === 0) {
    return productSizes.map(s => ({ size: s, available: true }));
  }

  const minIdx = Math.min(...indices);
  const maxIdx = Math.max(...indices);

  const rangeSizes = ALL_STANDARD_SIZES.slice(minIdx, maxIdx + 1);
  return rangeSizes.map(s => ({
    size: s,
    available: upperSizes.includes(s)
  }));
};



const formatSizeDisplay = (size) => {
  if (!size) return '';
  const s = size.toUpperCase();
  if (s === 'WSC023' || s === 'MSC023') return '23~25cm';
  if (s === 'MSC025') return '25~27cm';
  if (s === 'MSC027') return '27~29cm';
  if (s === 'SIZ999') return 'ONE SIZE';

  if (s.startsWith('CMD')) {
    const numPart = s.substring(3);
    const num = parseInt(numPart);
    if (!isNaN(num)) {
      return `${num}cm`;
    }
  }

  if (s.startsWith('INS')) {
    const numPart = s.substring(3);
    const num = parseInt(numPart);
    if (!isNaN(num)) {
      return `${num}inch`;
    }
  }

  return size;
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('default'); // 'default', 'priceAsc', 'priceDesc', 'discountDesc'
  const [selectedSize, setSelectedSize] = useState('ALL');
  const [selectedSex, setSelectedSex] = useState('ALL'); // 'ALL', 'men', 'women'

  // 後台路由與版本管理狀態
  const [currentView, setCurrentView] = useState(() => {
    return window.location.pathname === '/admin' ? 'admin' : 'home';
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('isAdminLoggedIn') === 'true';
  });
  const [versions, setVersions] = useState([]);
  const [crawlerReports, setCrawlerReports] = useState([]);
  const [showVersionModal, setShowVersionModal] = useState(false);

  // 詳情頁商品 Modal
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedModalColor, setSelectedModalColor] = useState(null);
  const [activeProductHistory, setActiveProductHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // 加載更多商品控制
  const [visibleCount, setVisibleCount] = useState(24);
  // 手機版漢堡選單
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // 我的最愛 / 追蹤清單
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('uq_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // 從 Firestore 監聽最新商品 (即時更新)
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, "products"), async (querySnapshot) => {
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push(doc.data());
      });
      if (items.length > 0) {
        console.log(`Successfully loaded ${items.length} products from Firestore (realtime).`);
        // 載入真實瀏覽次數並合併
        try {
          const viewsSnap = await getDocs(collection(db, 'product_views'));
          const viewsMap = {};
          viewsSnap.forEach(d => { viewsMap[d.id] = d.data().views || 0; });
          const merged = items.map(p => ({ ...p, views: viewsMap[p.id] || 0 }));
          setProducts(merged);
        } catch (e) {
          console.warn('Failed to load product views, using 0:', e);
          setProducts(items.map(p => ({ ...p, views: 0 })));
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to load products from Firestore realtime, using offline cache:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 從 Firestore 監聽版本資訊 (即時更新)
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, "versions"), async (querySnapshot) => {
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data());
      });

      // 預設 Seed Data (防空機制)
      const defaultSeed = {
        version: '1.0.0',
        releaseDate: '2026-06-24',
        type: 'major',
        description: [
          'UNIQLO 台灣官網商品查價網正式上線',
          '支持商品歷史價格走勢折線圖與史低價醒目提示',
          '提供斷碼缺貨尺寸灰階與刪除線提示'
        ],
        timestamp: 1774571400000
      };

      if (list.length === 0) {
        // 若 Firestore 中尚未有資料，寫入預設 Seed
        await setDoc(doc(db, 'versions', defaultSeed.version), defaultSeed);
        setVersions([defaultSeed]);
      } else {
        setVersions(list);
      }
    }, (error) => {
      console.error("Failed to load versions from Firestore realtime:", error);
      // Fallback 本地預設值
      setVersions([{
        version: '1.0.0',
        releaseDate: '2026-06-24',
        type: 'major',
        description: ['UNIQLO 比價網正式發布'],
        timestamp: 1774571400000
      }]);
    });

  }, []);

  // 監聽爬蟲更新報表 (即時更新)
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, "crawler_reports"), (querySnapshot) => {
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // 依時間戳降序排列
      list.sort((a, b) => b.timestamp - a.timestamp);
      setCrawlerReports(list);
    }, (error) => {
      console.error("Failed to load crawler reports from Firestore realtime:", error);
    });

    return () => unsubscribe();
  }, []);


  // 發布新版本
  const handlePublishVersion = async (newVerObj) => {
    if (!db) throw new Error('Firestore 未連接');
    const today = new Date().toISOString().split('T')[0];
    const fullVer = {
      ...newVerObj,
      releaseDate: today,
      timestamp: Date.now()
    };
    // 寫入資料庫
    await setDoc(doc(db, 'versions', fullVer.version), fullVer);
    // 更新本地狀態
    setVersions(prev => [...prev, fullVer]);
  };

  // 刪除版本
  const handleDeleteVersion = async (version) => {
    if (!db) throw new Error('Firestore 未連接');
    try {
      await deleteDoc(doc(db, 'versions', version));
      setVersions(prev => prev.filter(v => v.version !== version));
    } catch (error) {
      console.error("Failed to delete version:", error);
      alert(`刪除失敗: ${error.message}`);
    }
  };

  // 觸發手動爬蟲
  const handleTriggerCrawler = async () => {
    if (!db) throw new Error('Firestore 未連接');
    await setDoc(doc(db, 'system', 'crawler_trigger'), {
      action: 'start',
      timestamp: Date.now(),
      type: 'manual'
    });
  };


  // 我的最愛儲存
  useEffect(() => {
    localStorage.setItem('uq_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (productId, e) => {
    e.stopPropagation();
    if (favorites.includes(productId)) {
      setFavorites(favorites.filter(id => id !== productId));
    } else {
      setFavorites([...favorites, productId]);
    }
  };

  // 類別清單
  const categories = [
    { code: 'ALL', name: '全部商品' },
    { code: 'men', name: '男裝' },
    { code: 'women', name: '女裝' },
    { code: 'new_arrival', name: '新品上市' },
    { code: 'tops', name: '上衣類' },
    { code: 'bottoms', name: '下裝類' },
    { code: 'outerwear', name: '外套類' },
    { code: 'innerwear', name: '內衣/褲/襪' },
    { code: 'accessories', name: '配件' },
    { code: 'limited_price', name: '限定價格' },
    { code: 'sale_price', name: '特價商品' },
    { code: 'favorites', name: '我的追蹤' }
  ];

  // 所有的尺寸
  const sizes = ['ALL', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

  // 0ms 高效記憶體搜尋與篩選
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. 搜尋詞篩選 (品名、貨號)
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(q) ||
          p.code.includes(q) ||
          (p.productCode && p.productCode.toLowerCase().includes(q))
      );
    }

    // 2. 類別篩選
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'men') {
        result = result.filter(p => isMenProduct(p));
      } else if (selectedCategory === 'women') {
        result = result.filter(p => isWomenProduct(p));
      } else if (selectedCategory === 'new_arrival') {
        result = result.filter(p => p.isNewArrival === true);
      } else if (selectedCategory === 'favorites') {
        result = result.filter(p => favorites.includes(p.id));
      } else if (selectedCategory === 'limited_price') {
        result = result.filter(p =>
          p.salesPromotionLabel && p.salesPromotionLabel.some(l => l.labelText && l.labelText.includes('限定價格'))
        );
      } else if (selectedCategory === 'sale_price') {
        result = result.filter(p =>
          p.salesPromotionLabel && p.salesPromotionLabel.some(l => l.labelText && l.labelText.includes('特價商品'))
        );
      } else if (selectedCategory === 'tops') {
        result = result.filter(p =>
          p.categoryNames && p.categoryNames.some(c =>
            c.includes('T恤') || c.includes('襯衫') || c.includes('POLO') ||
            c.includes('上衣') || c.includes('背心') || c.includes('針織衫')
          )
        );
      } else if (selectedCategory === 'bottoms') {
        result = result.filter(p =>
          p.categoryNames && p.categoryNames.some(c =>
            c.includes('褲') || c.includes('裙')
          )
        );
      } else if (selectedCategory === 'outerwear') {
        result = result.filter(p =>
          p.categoryNames && p.categoryNames.some(c =>
            c.includes('外套') || c.includes('大衣') || c.includes('風衣')
          )
        );
      } else if (selectedCategory === 'innerwear') {
        result = result.filter(p =>
          p.categoryNames && p.categoryNames.some(c =>
            c.includes('內衣') || c.includes('內褲') || c.includes('胸罩') ||
            c.includes('BRATOP') || c.includes('HEATTECH') || c.includes('襪')
          )
        );
      } else if (selectedCategory === 'accessories') {
        result = result.filter(p =>
          p.categoryNames && p.categoryNames.some(c =>
            c.includes('配件') || c.includes('帽子') ||
            c.includes('皮帶') || c.includes('包包') || c.includes('圍兜') ||
            c.includes('雨傘') || c.includes('太陽眼鏡') || c.includes('方巾') ||
            c.includes('手套') || c.includes('鞋子')
          )
        );
      }
    }

    // 2.5. 對象/性別篩選 (可與特價、限定價格等疊加)
    if (selectedSex !== 'ALL') {
      if (selectedSex === 'men') {
        result = result.filter(p => isMenProduct(p));
      } else if (selectedSex === 'women') {
        result = result.filter(p => isWomenProduct(p));
      } else if (selectedSex === 'kids') {
        result = result.filter(p => isKidsProduct(p));
      } else if (selectedSex === 'baby') {
        result = result.filter(p => isBabyProduct(p));
      }
    }

    // 3. 尺寸篩選
    if (selectedSize !== 'ALL') {
      result = result.filter(p => p.size && p.size.includes(selectedSize));
    }

    // 4. 排序
    if (sortBy === 'priceAsc') {
      result.sort((a, b) => a.minPrice - b.minPrice);
    } else if (sortBy === 'priceDesc') {
      result.sort((a, b) => b.minPrice - a.minPrice);
    } else if (sortBy === 'discountDesc') {
      // 降價金額降序
      result.sort((a, b) => {
        const discountA = a.originPrice ? a.originPrice - a.minPrice : 0;
        const discountB = b.originPrice ? b.originPrice - b.minPrice : 0;
        return discountB - discountA;
      });
    }

    return result;
  }, [products, searchTerm, selectedCategory, selectedSize, sortBy, selectedSex, favorites]);

  // 首頁精選三大區塊資料篩選
  const topViewsProducts = useMemo(() => {
    return [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  }, [products]);

  const menNewArrivals = useMemo(() => {
    return products.filter(p => isMenProduct(p) && p.isNewArrival).slice(0, 10);
  }, [products]);

  const womenNewArrivals = useMemo(() => {
    return products.filter(p => isWomenProduct(p) && p.isNewArrival).slice(0, 10);
  }, [products]);

  const kidsNewArrivals = useMemo(() => {
    return products.filter(p => isKidsProduct(p) && p.isNewArrival).slice(0, 10);
  }, [products]);

  const babyNewArrivals = useMemo(() => {
    return products.filter(p => isBabyProduct(p) && p.isNewArrival).slice(0, 10);
  }, [products]);

  // 當搜尋條件改變時重置顯示數量
  useEffect(() => {
    setVisibleCount(24);
  }, [searchTerm, selectedCategory, selectedSize, sortBy, selectedSex]);

  const loadMore = () => {
    setVisibleCount(prev => prev + 24);
  };

  const handleProductClick = async (product) => {
    // 點擊時 views + 1 (前端即時更新 + Firestore 持久化)
    const newViews = (product.views || 0) + 1;
    setProducts(prevProducts =>
      prevProducts.map(p => p.id === product.id ? { ...p, views: newViews } : p)
    );
    setActiveProduct({ ...product, views: newViews });
    // 非同步寫入 Firestore
    if (db) {
      try {
        const viewRef = doc(db, 'product_views', product.id);
        await setDoc(viewRef, { views: increment(1) }, { merge: true });
      } catch (e) {
        console.warn('Failed to increment product view:', e);
      }
    }
    setSelectedModalColor(product.colors && product.colors.length > 0 ? product.colors[0] : null);

    // 非同步載入歷史價格
    setLoadingHistory(true);
    setActiveProductHistory(null);
    try {
      if (db) {
        const priceDocRef = doc(db, 'product_prices', product.id);
        const priceSnap = await getDoc(priceDocRef);
        if (priceSnap.exists()) {
          setActiveProductHistory(priceSnap.data().historyPrices || []);
        } else {
          setActiveProductHistory([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch product history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseModal = () => {
    setActiveProduct(null);
    setSelectedModalColor(null);
    setActiveProductHistory(null);
  };

  const isFeaturedHome = selectedCategory === 'ALL' && selectedSex === 'ALL' && searchTerm.trim() === '';

  return (
    <div style={styles.app}>
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSex={selectedSex}
        setSelectedSex={setSelectedSex}
        favorites={favorites}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      {/* 主體內容 */}
      <main style={styles.main}>
        {currentView === 'admin' ? (
          !isAdminLoggedIn ? (
            <AdminLoginForm onLogin={() => {
              sessionStorage.setItem('isAdminLoggedIn', 'true');
              setIsAdminLoggedIn(true);
            }} />
          ) : (
            <AdminPanel
              currentVersion={versions.length > 0 ? [...versions].sort((a, b) => b.timestamp - a.timestamp)[0].version : '1.0.0'}
              versions={versions}
              onPublishVersion={handlePublishVersion}
              onDeleteVersion={handleDeleteVersion}
              crawlerReports={crawlerReports}
              onTriggerCrawler={handleTriggerCrawler}
            />
          )
        ) : loading ? (
          // 骨架屏載入狀態
          <div className="product-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isFeaturedHome ? (
          // 精選首頁模式：三大精選區塊橫向滾動
          <div style={styles.featuredHome}>
            {/* 區塊 1：熱門瀏覽 TOP 10 */}
            <div style={{ marginBottom: 32 }}>
              <h3 className="section-title">熱門瀏覽 TOP 10</h3>
              {!topViewsProducts.some(product => product.views > 0) ? (
                <div style={styles.emptyFeatured}>沒有資料</div>
              ) : (
                <div className="horizontal-scroll-container">
                  {topViewsProducts.map(product => (
                    <div key={`top-${product.id}`} className="horizontal-scroll-item">
                      <ProductCard product={product} onClick={handleProductClick} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 區塊 2：男裝新品上市 TOP 10 */}
            <div style={{ marginBottom: 32 }}>
              <h3 className="section-title">男裝最新商品</h3>
              {menNewArrivals.length === 0 ? (
                <div style={styles.emptyFeatured}>暫無新品上市資料</div>
              ) : (
                <div className="horizontal-scroll-container">
                  {menNewArrivals.map(product => (
                    <div key={`men-new-${product.id}`} className="horizontal-scroll-item">
                      <ProductCard product={product} onClick={handleProductClick} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 區塊 3：女裝新品上市 TOP 10 */}
            <div style={{ marginBottom: 32 }}>
              <h3 className="section-title">女裝最新商品</h3>
              {womenNewArrivals.length === 0 ? (
                <div style={styles.emptyFeatured}>暫無新品上市資料</div>
              ) : (
                <div className="horizontal-scroll-container">
                  {womenNewArrivals.map(product => (
                    <div key={`women-new-${product.id}`} className="horizontal-scroll-item">
                      <ProductCard product={product} onClick={handleProductClick} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 區塊 4：童裝新品上市 TOP 10 */}
            <div style={{ marginBottom: 32 }}>
              <h3 className="section-title">童裝最新商品</h3>
              {kidsNewArrivals.length === 0 ? (
                <div style={styles.emptyFeatured}>暫無新品上市資料</div>
              ) : (
                <div className="horizontal-scroll-container">
                  {kidsNewArrivals.map(product => (
                    <div key={`kids-new-${product.id}`} className="horizontal-scroll-item">
                      <ProductCard product={product} onClick={handleProductClick} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 區塊 5：嬰幼兒新品上市 TOP 10 */}
            <div>
              <h3 className="section-title">嬰幼兒最新商品</h3>
              {babyNewArrivals.length === 0 ? (
                <div style={styles.emptyFeatured}>暫無新品上市資料</div>
              ) : (
                <div className="horizontal-scroll-container">
                  {babyNewArrivals.map(product => (
                    <div key={`baby-new-${product.id}`} className="horizontal-scroll-item">
                      <ProductCard product={product} onClick={handleProductClick} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // 商品列表模式
          <section style={styles.resultsSection}>
            {/* 列表頂部篩選資訊與排序/尺寸組合列 */}
            <div style={styles.resultsHeaderRow}>
              <div style={styles.resultsCount}>
                {selectedCategory === 'favorites' ? '我的追蹤清單' : (
                  <>
                    篩選結果 ({selectedSex === 'men' ? '男裝' : selectedSex === 'women' ? '女裝' : selectedSex === 'kids' ? '童裝' : selectedSex === 'baby' ? '嬰幼兒' : '全部'})
                    {selectedCategory !== 'ALL' && ` - ${categories.find(c => c.code === selectedCategory)?.name}`}
                    {searchTerm && ` - 搜尋: "${searchTerm}"`}
                  </>
                )}
                ：共找到 <span style={{ color: 'var(--uq-red)', fontWeight: 'bold' }}>{filteredProducts.length}</span> 件商品
              </div>

              {/* 排序與尺寸進階篩選 */}
              <div style={styles.listFilters}>
                {/* 排序 */}
                <div style={styles.selectWrapper}>
                  <ArrowUpDown size={14} style={styles.selectIcon} />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={styles.select}
                  >
                    <option value="default">預設排序</option>
                    <option value="priceAsc">價格低至高</option>
                    <option value="priceDesc">價格高至低</option>
                    <option value="discountDesc">折扣幅度最高</option>
                  </select>
                </div>

                {/* 尺寸 */}
                <div style={styles.selectWrapper}>
                  <SlidersHorizontal size={14} style={styles.selectIcon} />
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    style={styles.select}
                  >
                    <option value="ALL">全部尺寸</option>
                    {sizes.slice(1).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div style={styles.noResult}>
                <TrendingDown size={48} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
                <p>沒有找到符合條件的商品，請嘗試其他關鍵字。</p>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {filteredProducts.slice(0, visibleCount).map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={handleProductClick}
                    />
                  ))}
                </div>

                {/* 載入更多 */}
                {visibleCount < filteredProducts.length && (
                  <div style={styles.loadMoreContainer}>
                    <button onClick={loadMore} className="btn" style={styles.loadMoreBtn}>
                      查看更多商品 ({filteredProducts.length - visibleCount} 件)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {/* 歷史更新 Modal */}
      {showVersionModal && (
        <VersionHistoryModal
          versions={versions}
          onClose={() => setShowVersionModal(false)}
        />
      )}

      {/* 商品詳情 Modal */}
      {activeProduct && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            {/* 關閉按鈕 */}
            <button onClick={handleCloseModal} style={styles.closeBtn}>
              <X size={24} />
            </button>

            {/* 詳情佈局 */}
            <div className="detail-layout">
              {/* 左側大圖 */}
              <div className="detail-left">
                <div style={styles.detailPicWrapper}>
                  <img
                    src={(() => {
                      const pic = selectedModalColor?.largePicUrl || activeProduct.mainPic;
                      if (!pic) return '';
                      return pic.startsWith('http') ? pic : `https://www.uniqlo.com/tw${pic}`;
                    })()}
                    alt={activeProduct.name}
                    style={styles.detailPic}
                    onError={(e) => {
                      e.target.src = 'https://www.uniqlo.com/tw/favicon-uq.ico';
                    }}
                  />
                </div>
              </div>

              {/* 右側資訊 */}
              <div className="detail-right">
                <span style={styles.detailGender}>{activeProduct.sex || '男女適穿'}</span>
                <h2 style={styles.detailName}>{activeProduct.name}</h2>

                {/* 促銷標籤貼標 */}
                {(() => {
                  const promoLabels = [
                    ...(activeProduct.salesPromotionLabel || []).map(l => l.labelText),
                    ...(isHistoricalLowest(activeProduct) ? ['歷史最低價'] : [])
                  ];
                  if (promoLabels.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', gap: '6px', margin: '8px 0', flexWrap: 'wrap' }}>
                      {promoLabels.map((label, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: label === '歷史最低價' ? '#8b0000' : 'var(--uq-red)',
                            color: '#ffffff',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            borderRadius: '2px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                <div style={styles.detailCodeRow}>
                  <span>商品編號: <code>{activeProduct.code}</code></span>
                  <span>官網貨號: <code>{activeProduct.productCode}</code></span>
                </div>

                <hr style={styles.divider} />

                {/* 價格資訊 */}
                <div style={styles.detailPriceRow}>
                  <div style={{ display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', marginRight: '4px' }}>售價</span>
                    <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--uq-red)' }}>{formatPrice(activeProduct.minPrice)}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', marginLeft: '4px' }}>元</span>
                  </div>
                  {activeProduct.originPrice && activeProduct.minPrice < activeProduct.originPrice && (
                    <div style={{ display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)', marginRight: '2px' }}>原價</span>
                      <span style={{ fontSize: '18px', textDecoration: 'line-through', color: 'var(--text-light)' }}>
                        {formatPrice(activeProduct.originPrice)}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)', marginLeft: '2px' }}>元</span>
                    </div>
                  )}
                  {activeProduct.originPrice && activeProduct.minPrice < activeProduct.originPrice && (
                    <div style={{ ...styles.discountBadge, display: 'inline-flex', alignItems: 'center', height: 'fit-content', marginLeft: '16px' }}>
                      省 {formatPrice(activeProduct.originPrice - activeProduct.minPrice)}元
                    </div>
                  )}
                </div>

                {/* 尺寸與顏色 */}
                <div style={styles.metaBox}>
                  <div style={styles.metaRow}>
                    <strong style={styles.metaLabel}>尺寸：</strong>
                    <div style={styles.tagGroup}>
                      {getProductSizesWithAvailability(activeProduct.size).map(({ size, available }) => (
                        <span
                          key={size}
                          style={{
                            ...styles.sizeTag,
                            ...(available ? {} : styles.sizeTagUnavailable)
                          }}
                        >
                          {formatSizeDisplay(size)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={styles.metaRow}>
                    <strong style={styles.metaLabel}>顏色：</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
                      {activeProduct.colors.map(c => {
                        const isSelected = selectedModalColor && selectedModalColor.code === c.code;
                        return (
                          <button
                            key={c.code}
                            title={c.name}
                            onClick={() => setSelectedModalColor(c)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundImage: c.chipUrl ? `url(${c.chipUrl.startsWith('http') ? c.chipUrl : `https://www.uniqlo.com/tw${c.chipUrl}`})` : 'none',
                              backgroundColor: '#eeeeee',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              cursor: 'pointer',
                              outline: 'none',
                              border: isSelected ? '2px solid var(--uq-red)' : '1px solid var(--border-color)',
                              transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                              transition: 'all 0.2s',
                              padding: 0
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={styles.actionRow}>
                  <button
                    onClick={(e) => toggleFavorite(activeProduct.id, e)}
                    style={{
                      ...styles.favBtn,
                      color: favorites.includes(activeProduct.id) ? 'var(--uq-red)' : 'var(--text-secondary)',
                      borderColor: favorites.includes(activeProduct.id) ? 'var(--uq-red)' : 'var(--border-color)',
                      backgroundColor: favorites.includes(activeProduct.id) ? 'rgba(231,31,25,0.04)' : 'transparent'
                    }}
                  >
                    <Heart size={18} fill={favorites.includes(activeProduct.id) ? 'var(--uq-red)' : 'none'} style={{ marginRight: 6 }} />
                    {favorites.includes(activeProduct.id) ? '取消追蹤此商品' : '加入追蹤清單'}
                  </button>

                  <a
                    href={`https://www.uniqlo.com/tw/zh_TW/product-detail.html?productCode=${activeProduct.productCode}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.linkBtn}
                  >
                    <ExternalLink size={18} style={{ marginRight: 6 }} />
                    前往官網購買
                  </a>
                </div>
              </div>
            </div>

            {/* 下方歷史價格折線圖 */}
            <div style={styles.chartSection}>
              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px', color: 'var(--text-secondary)' }}>
                  <span>正在讀取歷史價格資料...</span>
                </div>
              ) : activeProductHistory ? (
                <PriceChart historyData={activeProductHistory} />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px', color: 'var(--text-secondary)' }}>
                  <span>暫無歷史價格資料</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 頁尾版權與版本顯示 */}
      <footer style={styles.footer}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <span>商品資訊皆來自UNIQLO官網，本站資訊僅供參考。< /span>
            <button
              onClick={() => setShowVersionModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--uq-red)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'underline',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              當前版本 v{versions.length > 0 ? [...versions].sort((a, b) => b.timestamp - a.timestamp)[0].version : '1.0.0'} (查看歷史更新)
            </button>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100%',
  },
  main: {
    flex: 1,
    padding: '24px',
    backgroundColor: '#fafafa',
  },
  featuredHome: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    padding: '8px 0',
  },
  emptyFeatured: {
    padding: '32px',
    color: 'var(--text-light)',
    fontSize: '14px',
    textAlign: 'center',
    backgroundColor: 'var(--bg-white)',
    border: '1px dashed var(--border-color)',
    borderRadius: '4px',
  },
  resultsHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  },
  listFilters: {
    display: 'flex',
    gap: '12px',
  },
  selectWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  selectIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-secondary)',
    pointerEvents: 'none',
  },
  select: {
    padding: '8px 12px 8px 32px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '2px',
    backgroundColor: 'var(--bg-white)',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  },
  resultsSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  resultsCount: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  noResult: {
    padding: '80px 0',
    textAlign: 'center',
    color: 'var(--text-light)',
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
  },
  loadMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '24px',
  },
  loadMoreBtn: {
    padding: '12px 32px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
    overflowY: 'auto',
  },
  modalCard: {
    backgroundColor: 'var(--bg-white)',
    width: '100%',
    maxWidth: '900px',
    borderRadius: '8px',
    padding: '32px',
    position: 'relative',
    boxShadow: 'var(--shadow-md)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'none',
    border: 'none',
    color: 'var(--text-light)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  detailPicWrapper: {
    width: '100%',
    flex: 1,
    minHeight: '300px',
    position: 'relative',
    backgroundColor: 'var(--bg-light)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  detailPic: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  detailGender: {
    fontSize: '12px',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
  },
  detailName: {
    fontSize: '20px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  detailCodeRow: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: 'var(--text-light)',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid var(--border-color)',
    margin: '4px 0',
  },
  detailPriceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  priceColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  priceLabel: {
    fontSize: '11px',
    color: 'var(--text-light)',
    marginBottom: '2px',
  },
  detailCurrentPrice: {
    fontSize: '28px',
  },
  detailOriginPrice: {
    fontSize: '18px',
    textDecoration: 'line-through',
    color: 'var(--text-light)',
  },
  discountBadge: {
    backgroundColor: 'rgba(231,31,25,0.08)',
    color: 'var(--uq-red)',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 'bold',
    borderRadius: '2px',
  },
  metaBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'var(--bg-light)',
    padding: '16px',
    borderRadius: '4px',
    border: '1px solid var(--border-color)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    width: '80px',
    flexShrink: 0,
    paddingTop: '3px',
  },
  tagGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  sizeTag: {
    fontSize: '12px',
    padding: '4px 10px',
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderRadius: '2px',
    fontWeight: '500',
  },
  sizeTagUnavailable: {
    color: 'var(--text-light)',
    backgroundColor: '#f6f6f6',
    borderColor: '#e8e8e8',
    textDecoration: 'line-through',
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  colorGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  colorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  colorColor: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    border: '1px solid var(--border-color)',
  },
  colorNameText: {
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
  actionRow: {
    display: 'flex',
    gap: '16px',
    marginTop: '8px',
  },
  favBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'var(--transition-fast)',
  },
  linkBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    backgroundColor: '#111111',
    color: '#ffffff',
    border: '1px solid #111111',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'var(--transition-fast)',
  },
  chartSection: {
    marginTop: '32px',
  },
  footer: {
    borderTop: '1px solid var(--border-color)',
    padding: '24px',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--text-light)',
    backgroundColor: 'var(--bg-white)',
  }
};

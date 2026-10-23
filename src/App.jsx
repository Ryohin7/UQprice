import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import ProductCard, { formatPrice, dropTierText } from './components/ProductCard';
import HorizontalScroller from './components/HorizontalScroller';
import SkeletonCard from './components/SkeletonCard';
import PriceChart from './components/PriceChart';

import { Search, SlidersHorizontal, ArrowUpDown, X, Heart, ExternalLink, TrendingDown, Menu, User, Lock } from 'lucide-react';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc, increment, deleteField } from 'firebase/firestore';
import AdminPanel from './components/AdminPanel';
import VersionHistoryModal from './components/VersionHistoryModal';
import NotFound from './components/NotFound';
import AccountModal from './components/AccountModal';
import PwaStatus from './components/PwaStatus';
import TargetPrice from './components/TargetPrice';
import { normalizeSettings } from './utils/userSettings';
import { signInWithGoogle, signOutUser, isAdminUser, TELEGRAM_BOT_USERNAME } from './auth';
import { loadViewCounts, incrementViewCount } from './utils/viewCounts';
import { isMenProduct, isWomenProduct, isKidsProduct, isBabyProduct, isLimitedPrice } from './utils/productGroups';
import { matchesSubCategory } from './utils/categoryMatch';

// 與 firestore.rules 的 favorites 上限一致
const MAX_FAVORITES = 300;
import { logPageView, logSearch, logViewProduct, logAddToFavorites, logRemoveFromFavorites, logClickExternalLink } from './utils/analytics';


function AdminLoginForm({ user, onSignIn, onSignOut }) {
  const [error, setError] = useState('');
  const signedInButNotAdmin = !!user && !isAdminUser(user);

  const handleSignIn = async () => {
    setError('');
    try {
      await onSignIn();
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Google 登入失敗:', err);
        setError('登入失敗，請稍後再試。');
      }
    }
  };

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.card}>
        <div style={loginStyles.iconWrapper}>
          <Lock size={32} style={{ color: 'var(--uq-red)' }} />
        </div>
        <h2 style={loginStyles.title}>管理員登入</h2>
        <p style={loginStyles.subtitle}>請使用已授權的 Google 帳號登入後台</p>

        {error && <div style={loginStyles.error}>{error}</div>}
        {signedInButNotAdmin && (
          <div style={loginStyles.error}>
            {user.email} 沒有後台權限，請改用管理員帳號。
          </div>
        )}

        {signedInButNotAdmin ? (
          <button type="button" onClick={onSignOut} style={loginStyles.button}>
            切換 Google 帳號
          </button>
        ) : (
          <button type="button" onClick={handleSignIn} style={loginStyles.button}>
            使用 Google 登入
          </button>
        )}

        <button
          type="button"
          onClick={() => window.location.href = '/'}
          style={loginStyles.backButton}
        >
          返回首頁
        </button>
      </div>
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

const DEFAULT_NAVIGATION = [
  {
    id: 'men',
    name: '男裝 MENS',
    sex: 'men',
    order: 1,
    subCategories: [
      { code: 'ALL', name: '全部男裝', matchType: 'built-in' },
      { code: 'new_arrival', name: '新品上市', matchType: 'built-in' },
      { code: 'coming_soon', name: '即將上市', matchType: 'built-in' },
      { code: 'limited_price', name: '限定價格', matchType: 'built-in' },
      { code: 'sale_price', name: '特價商品', matchType: 'built-in' },
      { code: 'tops', name: '上衣類', matchType: 'custom', selectedCategories: ['T恤/背心/休閒', 'T恤/POLO衫', '背心', '上衣', '襯衫', '針織衫', 'POLO衫'] },
      { code: 'bottoms', name: '下裝類', matchType: 'custom', selectedCategories: ['褲', '裙', '短褲', '長褲', '牛仔褲', '休閒長褲'] },
      { code: 'outerwear', name: '外套類', matchType: 'custom', selectedCategories: ['外套', '大衣', '風衣', '羽絨外套', '夾克'] },
      { code: 'innerwear', name: '內衣/褲/襪', matchType: 'custom', selectedCategories: ['內衣', '內褲', '胸罩', 'BRATOP', 'HEATTECH', '襪', '襪子', '家居服'] },
      { code: 'accessories', name: '配件', matchType: 'custom', selectedCategories: ['配件', '帽子', '皮帶', '包包', '圍兜', '雨傘', '太陽眼鏡', '方巾', '手套', '鞋子', '鞋'] }
    ]
  },
  {
    id: 'women',
    name: '女裝 WOMENS',
    sex: 'women',
    order: 2,
    subCategories: [
      { code: 'ALL', name: '全部女裝', matchType: 'built-in' },
      { code: 'new_arrival', name: '新品上市', matchType: 'built-in' },
      { code: 'coming_soon', name: '即將上市', matchType: 'built-in' },
      { code: 'limited_price', name: '限定價格', matchType: 'built-in' },
      { code: 'sale_price', name: '特價商品', matchType: 'built-in' },
      { code: 'tops', name: '上衣類', matchType: 'custom', selectedCategories: ['T恤/背心/休閒', 'T恤/POLO衫', '背心', '上衣', '襯衫', '針織衫', 'POLO衫', '洋裝'] },
      { code: 'bottoms', name: '下裝類', matchType: 'custom', selectedCategories: ['褲', '裙', '短褲', '長褲', '牛仔褲', '休閒長褲', '半身裙'] },
      { code: 'outerwear', name: '外套類', matchType: 'custom', selectedCategories: ['外套', '大衣', '風衣', '羽絨外套', '夾克', '開襟外套'] },
      { code: 'innerwear', name: '內衣/褲/襪', matchType: 'custom', selectedCategories: ['內衣', '內褲', '胸罩', 'BRATOP', '家居服', '襪', '襪子'] },
      { code: 'accessories', name: '配件', matchType: 'custom', selectedCategories: ['配件', '帽子', '皮帶', '包包', '圍兜', '雨傘', '太陽眼鏡', '方巾', '手套', '鞋子', '鞋'] }
    ]
  },
  {
    id: 'kids',
    name: '童裝 KIDS',
    sex: 'kids',
    order: 3,
    subCategories: [
      { code: 'ALL', name: '全部童裝', matchType: 'built-in' },
      { code: 'new_arrival', name: '新品上市', matchType: 'built-in' },
      { code: 'coming_soon', name: '即將上市', matchType: 'built-in' },
      { code: 'limited_price', name: '限定價格', matchType: 'built-in' },
      { code: 'sale_price', name: '特價商品', matchType: 'built-in' },
      { code: 'tops', name: '上衣類', matchType: 'custom', selectedCategories: ['T恤', '上衣', '襯衫', '針織衫', 'POLO衫', '洋裝'] },
      { code: 'bottoms', name: '下裝類', matchType: 'custom', selectedCategories: ['褲', '裙', '短褲', '長褲', '休閒長褲'] },
      { code: 'outerwear', name: '外套類', matchType: 'custom', selectedCategories: ['外套', '夾克', '連帽外套'] },
      { code: 'innerwear', name: '內衣/褲/襪', matchType: 'custom', selectedCategories: ['內衣', '內褲', '家居服', '襪', '襪子'] },
      { code: 'accessories', name: '配件', matchType: 'custom', selectedCategories: ['配件', '包包', '帽子', '雨傘'] }
    ]
  },
  {
    id: 'baby',
    name: '嬰幼兒 BABY',
    sex: 'baby',
    order: 4,
    subCategories: [
      { code: 'ALL', name: '全部嬰幼兒', matchType: 'built-in' },
      { code: 'new_arrival', name: '新品上市', matchType: 'built-in' },
      { code: 'coming_soon', name: '即將上市', matchType: 'built-in' },
      { code: 'limited_price', name: '限定價格', matchType: 'built-in' },
      { code: 'sale_price', name: '特價商品', matchType: 'built-in' },
      { code: 'tops', name: '上衣類', matchType: 'custom', selectedCategories: ['上衣', '包屁衣', '包臀衣', '連身衣'] },
      { code: 'bottoms', name: '下裝類', matchType: 'custom', selectedCategories: ['褲', '短褲', '長褲', '內搭褲'] },
      { code: 'outerwear', name: '外套類', matchType: 'custom', selectedCategories: ['外套', '背心外套'] },
      { code: 'innerwear', name: '內衣/家居服', matchType: 'custom', selectedCategories: ['內衣', '家居服', '睡衣', '襪子'] },
      { code: 'accessories', name: '配件', matchType: 'custom', selectedCategories: ['配件', '圍兜', '帽子'] }
    ]
  }
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // PWA 捷徑 (/?view=favorites) 直接開啟「我的追蹤」
  const [selectedCategory, setSelectedCategory] = useState(() =>
    new URLSearchParams(window.location.search).get('view') === 'favorites' ? 'favorites' : 'ALL'
  );
  const [sortBy, setSortBy] = useState('default'); // 'default', 'priceAsc', 'priceDesc', 'discountDesc'
  const [selectedSize, setSelectedSize] = useState('ALL');
  const [selectedSex, setSelectedSex] = useState('ALL'); // 'ALL', 'men', 'women'
  const [navigation, setNavigation] = useState([]);

  // 從 Firestore 載入導航分類 (一次性獲取)
  useEffect(() => {
    if (!db) return;
    const loadNavigation = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "navigation"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data());
        });

        if (list.length === 0) {
          // 若資料庫無導航結構，寫入預設 Seed
          for (const item of DEFAULT_NAVIGATION) {
            await setDoc(doc(db, 'navigation', item.id), item);
          }
          setNavigation(DEFAULT_NAVIGATION);
        } else {
          list.sort((a, b) => a.order - b.order);
          // 自動向下相容補上缺失的 'coming_soon'
          const processedList = list.map(mainCat => {
            const hasComingSoon = (mainCat.subCategories || []).some(s => s.code === 'coming_soon');
            if (!hasComingSoon) {
              const updatedSubs = [...(mainCat.subCategories || [])];
              const newArrivalIdx = updatedSubs.findIndex(s => s.code === 'new_arrival');
              const insertIdx = newArrivalIdx !== -1 ? newArrivalIdx + 1 : 0;
              updatedSubs.splice(insertIdx, 0, { code: 'coming_soon', name: '即將上市', matchType: 'built-in' });
              return { ...mainCat, subCategories: updatedSubs };
            }
            return mainCat;
          });
          setNavigation(processedList);
        }
      } catch (error) {
        console.error("Failed to load navigation from Firestore, using offline fallback:", error);
        setNavigation(DEFAULT_NAVIGATION);
      }
    };
    loadNavigation();
  }, []);

  // 儲存導航變更回 Firestore
  const handleSaveNavigation = async (updatedNav) => {
    if (!db) throw new Error('Firestore 未連接');
    try {
      for (const item of updatedNav) {
        await setDoc(doc(db, 'navigation', item.id), item);
      }
      const existingIds = navigation.map(n => n.id);
      const updatedIds = updatedNav.map(n => n.id);
      const deletedIds = existingIds.filter(id => !updatedIds.includes(id));
      for (const id of deletedIds) {
        await deleteDoc(doc(db, 'navigation', id));
      }
    } catch (error) {
      console.error("Failed to save navigation changes:", error);
      throw error;
    }
  };

  // 取得目前資料庫中所有不重複商品分類清單
  const allUniqueCategories = useMemo(() => {
    const set = new Set();
    products.forEach(p => {
      if (p.categoryNames && Array.isArray(p.categoryNames)) {
        p.categoryNames.forEach(c => {
          if (c && c.trim() !== '') {
            set.add(c.trim());
          }
        });
      }
    });
    return Array.from(set).sort();
  }, [products]);

  // 後台路由與版本管理狀態
  const [currentView, setCurrentView] = useState(() => {
    const path = window.location.pathname;
    if (path === '/admin') return 'admin';
    if (path === '/' || path === '') return 'home';
    return '404';
  });
  // Google 登入使用者與帳號面板
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!auth);
  const [showAccount, setShowAccount] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [userSettings, setUserSettings] = useState(() => normalizeSettings(null));
  const [targets, setTargets] = useState({});
  const isAdminLoggedIn = isAdminUser(user);
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

  // 監聽路由切換發送 GA PageView
  useEffect(() => {
    let title = 'UNIQLO 比價網站 | 即時搜尋最新與歷史價格';
    let path = '/';
    if (currentView === 'admin') {
      title = '管理員後台 | UNIQLO 比價網站';
      path = '/admin';
    } else if (currentView === '404') {
      title = '404 頁面不存在 | UNIQLO 比價網站';
      path = '/404';
    }
    logPageView(path, title);
  }, [currentView]);

  // 搜尋字詞 GA 追蹤 (防抖 1 秒)
  useEffect(() => {
    if (!searchTerm.trim()) return;
    const timer = setTimeout(() => {
      logSearch(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);


  // 從 Firestore 載入最新商品與瀏覽次數 (一次性獲取)
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const loadProductsAndViews = async () => {
      try {
        const [productsRes, viewsRes, favSnap] = await Promise.all([
          fetch('/products.json').then(res => {
            if (!res.ok) throw new Error('Failed to load products.json');
            return res.json();
          }),
          loadViewCounts(db),
          // 追蹤人數統計由爬蟲彙整 (system/favorite_stats)；讀取失敗不影響商品顯示
          getDoc(doc(db, 'system', 'favorite_stats')).catch(() => null)
        ]);
        const favCounts = favSnap && favSnap.exists() ? (favSnap.data().counts || {}) : {};

        // 瀏覽次數 = 舊版彙總文件 + 8 個分片文件，載入共 9 次讀取
        const viewsMap = viewsRes;

        if (productsRes && productsRes.length > 0) {
          console.log(`Successfully loaded ${productsRes.length} products from local JSON.`);
          const merged = productsRes.map(p => ({ ...p, views: viewsMap[p.id] || 0, favCount: favCounts[p.id] || 0 }));
          setProducts(merged);
        }
      } catch (error) {
        console.error("Failed to load products or views:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProductsAndViews();
  }, []);

  // 從 Firestore 載入版本資訊 (一次性獲取)
  useEffect(() => {
    if (!db) return;
    const loadVersions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "versions"));
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
      } catch (error) {
        console.error("Failed to load versions from Firestore:", error);
        // Fallback 本地預設值
        setVersions([{
          version: '1.0.0',
          releaseDate: '2026-06-24',
          type: 'major',
          description: ['UNIQLO 比價網正式發布'],
          timestamp: 1774571400000
        }]);
      }
    };
    loadVersions();
  }, []);

  // 從 Firestore 載入爬蟲更新報表 (一次性獲取)
  useEffect(() => {
    if (!db) return;
    const loadCrawlerReports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "crawler_reports"));
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        // 依時間戳降序排列
        list.sort((a, b) => b.timestamp - a.timestamp);
        setCrawlerReports(list);
      } catch (error) {
        console.error("Failed to load crawler reports from Firestore:", error);
      }
    };
    loadCrawlerReports();
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
  };

  // 刪除版本
  const handleDeleteVersion = async (version) => {
    if (!db) throw new Error('Firestore 未連接');
    try {
      await deleteDoc(doc(db, 'versions', version));
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

  // 監聽登入狀態
  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (u) => {
      setUser(u && !u.isAnonymous ? u : null);
      setAuthReady(true);
    });
  }, []);

  // 登入後：合併本機與雲端追蹤清單，並即時監聽雲端資料 (Telegram 機器人也會修改追蹤清單、設定與目標價)
  const cloudSyncedRef = React.useRef(false);
  const lastCloudFavsRef = React.useRef('[]');
  const hadUserRef = React.useRef(false);
  useEffect(() => {
    cloudSyncedRef.current = false;
    setTelegramLinked(false);
    setUserSettings(normalizeSettings(null));
    setTargets({});
    // 登出後清掉本機追蹤清單，避免下一位登入者被合併到上一位的資料
    if (!user && hadUserRef.current) setFavorites([]);
    hadUserRef.current = !!user;
    if (!db || !user) return undefined;
    const userRef = doc(db, 'users', user.uid);
    let first = true;
    return onSnapshot(userRef, (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setTelegramLinked(!!data.telegram?.chatId);
      setUserSettings(normalizeSettings(data.settings));
      setTargets(data.targets && typeof data.targets === 'object' ? data.targets : {});

      if (Array.isArray(data.favorites)) {
        const cloud = data.favorites.slice(0, MAX_FAVORITES);
        lastCloudFavsRef.current = JSON.stringify(cloud);
        // 首次：雲端已有清單時以雲端為準；之後：套用其他裝置或 Telegram 機器人造成的變更 (略過本機尚未送出的寫入)
        if (first || !snap.metadata.hasPendingWrites) setFavorites((local) => (JSON.stringify(local) === lastCloudFavsRef.current ? local : cloud));
      } else if (first) {
        setFavorites((local) => [...local]); // 雲端尚無清單的新帳號：觸發寫入，把本機清單帶上去
      }
      if (first) {
        first = false;
        cloudSyncedRef.current = true;
      }
    }, (err) => console.warn('讀取使用者資料失敗:', err));
  }, [user]);

  // 追蹤清單變動時寫回雲端 (僅限已登入、已完成首次合併，且內容與雲端不同)
  useEffect(() => {
    if (!db || !user || !cloudSyncedRef.current) return;
    if (JSON.stringify(favorites) === lastCloudFavsRef.current) return;
    setDoc(doc(db, 'users', user.uid), { favorites }, { merge: true })
      .catch((err) => console.warn('同步追蹤清單失敗:', err));
  }, [favorites, user]);

  const saveSettings = (next) =>
    setDoc(doc(db, 'users', user.uid), { settings: next }, { merge: true })
      .catch((err) => console.warn('儲存通知設定失敗:', err));

  const saveTarget = async (productId, price) => {
    const ref = doc(db, 'users', user.uid);
    try {
      if (price == null) await updateDoc(ref, { [`targets.${productId}`]: deleteField() });
      else await setDoc(ref, { targets: { [productId]: price } }, { merge: true });
    } catch (err) {
      console.warn('儲存目標價失敗:', err);
      alert('儲存失敗，請稍後再試。');
    }
  };

  const handleSignIn = () => signInWithGoogle();
  const handleSignOut = async () => {
    setShowAccount(false);
    await signOutUser();
  };

  // 產生一次性綁定碼，帶使用者到 Telegram 機器人完成連結
  const handleLinkTelegram = async () => {
    if (!db || !user) return;
    // 必須在使用者點擊的同一個事件迴圈內先開窗，否則手機瀏覽器會把 await 之後的 window.open 當成彈出視窗擋掉
    const popup = window.open('', '_blank');
    const code = crypto.randomUUID().replace(/-/g, '');
    const url = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`;
    try {
      await setDoc(doc(db, 'users', user.uid), { linkCode: code }, { merge: true });
      if (popup) {
        popup.opener = null;
        popup.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      if (popup) popup.close();
      console.error('建立 Telegram 綁定碼失敗:', err);
      alert('無法建立綁定連結，請稍後再試。');
    }
  };

  const toggleFavorite = (productId, e) => {
    e.stopPropagation();
    const targetProduct = products.find(p => p.id === productId);
    if (favorites.includes(productId)) {
      setFavorites(favorites.filter(id => id !== productId));
      if (user && targets[productId] != null) saveTarget(productId, null);
      if (targetProduct) {
        logRemoveFromFavorites(targetProduct);
      }
    } else {
      if (favorites.length >= MAX_FAVORITES) {
        alert(`追蹤清單最多 ${MAX_FAVORITES} 件商品，請先移除部分商品。`);
        return;
      }
      setFavorites([...favorites, productId]);
      if (targetProduct) {
        logAddToFavorites(targetProduct);
      }
    }
  };

  // 動態類別清單 (由內建促銷與資料庫 navigation 合併而成)
  const categories = useMemo(() => {
    const list = [
      { code: 'ALL', name: '全部商品' },
      { code: 'favorites', name: '我的追蹤' },
      { code: 'new_arrival', name: '新品上市' },
      { code: 'limited_price', name: '限定價格' },
      { code: 'sale_price', name: '特價商品' },
    ];
    const seenCodes = new Set(list.map(l => l.code));
    navigation.forEach(mainCat => {
      mainCat.subCategories.forEach(sub => {
        if (!seenCodes.has(sub.code)) {
          seenCodes.add(sub.code);
          list.push({ code: sub.code, name: sub.name });
        }
      });
    });
    return list;
  }, [navigation]);

  // 所有的尺寸
  const sizes = ['ALL', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

  // 0ms 高效記憶體搜尋與篩選
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. 搜尋詞篩選 (品名、貨號、分類、以及性別關鍵字多重 AND 比對)
    if (searchTerm.trim() !== '') {
      const keywords = searchTerm.trim().toLowerCase().split(/\s+/);
      result = result.filter(p => {
        // 商品必須符合所有的關鍵字 (AND)
        return keywords.every(k => {
          // 判斷是否為性別詞彙
          if (k === '男裝' || k === '男' || k === 'men') {
            return isMenProduct(p) || p.name.toLowerCase().includes(k);
          }
          if (k === '女裝' || k === '女' || k === 'women') {
            return isWomenProduct(p) || p.name.toLowerCase().includes(k);
          }
          if (k === '童裝' || k === '童' || k === '兒童' || k === 'kids') {
            return isKidsProduct(p) || p.name.toLowerCase().includes(k);
          }
          if (k === '嬰幼兒' || k === '嬰' || k === '幼兒' || k === '嬰兒' || k === 'baby') {
            return isBabyProduct(p) || p.name.toLowerCase().includes(k);
          }

          // 一般詞彙比對
          const nameMatch = p.name.toLowerCase().includes(k);
          const codeMatch = p.code.includes(k) || (p.productCode && p.productCode.toLowerCase().includes(k));
          const categoryMatch = p.categoryNames && p.categoryNames.some(c => c.toLowerCase().includes(k));

          return nameMatch || codeMatch || categoryMatch;
        });
      });
    }

    // 2. 類別篩選 (支持動態與自訂分類過濾)
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'favorites') {
        result = result.filter(p => favorites.includes(p.id));
      } else if (selectedCategory === 'new_arrival') {
        result = result.filter(p => p.isNewArrival === true);
      } else if (selectedCategory === 'coming_soon') {
        const now = Date.now();
        result = result.filter(p => p.firstListTime && p.firstListTime > now);
      } else if (selectedCategory === 'limited_price') {
        result = result.filter(p =>
          p.salesPromotionLabel && p.salesPromotionLabel.some(l => l.labelText && l.labelText.includes('限定價格'))
        );
      } else if (selectedCategory === 'sale_price') {
        result = result.filter(p =>
          p.salesPromotionLabel && p.salesPromotionLabel.some(l => l.labelText && l.labelText.includes('特價商品'))
        );
      } else {
        // 自定義次分類的資料庫分類關聯過濾
        // 各主分類 (男裝/女裝/童裝/嬰幼兒) 都可能有同代碼的次分類 (例如 tops)，全部納入比對；
        // 分類代碼帶有性別前綴 (all_men-... / all_women-...)，不會互相混到
        const targets = [];
        for (const mainCat of navigation) {
          const sub = mainCat.subCategories.find(s => s.code === selectedCategory);
          if (sub) targets.push({ sub, main: mainCat });
        }
        const targetSub = targets.length > 0 ? targets[0].sub : null;

        if (targetSub) {
          if (targetSub.matchType === 'custom') {
            // 以官網穩定分類代碼為主，並相容舊版分類名稱比對
            result = result.filter(p => targets.some(({ sub, main }) => matchesSubCategory(p, sub, main.sex)));
          } else {
            // 保留 built-in 預設向後相容
            if (selectedCategory === 'tops') {
              result = result.filter(p =>
                p.categoryNames && p.categoryNames.some(c =>
                  c.includes('T恤') || c.includes('襯衫') || c.includes('POLO') ||
                  c.includes('上衣') || c.includes('背心') || c.includes('針織衫')
                )
              );
            } else if (selectedCategory === 'bottoms') {
              result = result.filter(p =>
                p.categoryNames && p.categoryNames.some(c => c.includes('褲') || c.includes('裙'))
              );
            } else if (selectedCategory === 'outerwear') {
              result = result.filter(p =>
                p.categoryNames && p.categoryNames.some(c => c.includes('外套') || c.includes('大衣') || c.includes('風衣'))
              );
            }
          }
        }
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
  }, [products, searchTerm, selectedCategory, selectedSize, sortBy, selectedSex, favorites, navigation]);

  // 首頁區塊資料：最多人收藏 → 男/女裝限定價格 → 男/女裝最新商品
  const topFavoriteProducts = useMemo(() => {
    return products.filter(p => p.favCount > 0)
      .sort((a, b) => b.favCount - a.favCount || (b.views || 0) - (a.views || 0))
      .slice(0, 10);
  }, [products]);

  const menLimited = useMemo(() => products.filter(p => isMenProduct(p) && isLimitedPrice(p)).slice(0, 10), [products]);
  const womenLimited = useMemo(() => products.filter(p => isWomenProduct(p) && isLimitedPrice(p)).slice(0, 10), [products]);

  const menNewArrivals = useMemo(() => {
    return products.filter(p => isMenProduct(p) && p.isNewArrival).slice(0, 10);
  }, [products]);

  const womenNewArrivals = useMemo(() => {
    return products.filter(p => isWomenProduct(p) && p.isNewArrival).slice(0, 10);
  }, [products]);

  // 當搜尋條件改變時重置顯示數量
  useEffect(() => {
    setVisibleCount(24);
  }, [searchTerm, selectedCategory, selectedSize, sortBy, selectedSex]);

  const loadMore = () => {
    setVisibleCount(prev => prev + 24);
  };

  const handleProductClick = async (product) => {
    // 記錄 GA 商品檢視事件
    logViewProduct(product);

    // 點擊時 views + 1 (前端即時更新 + Firestore 持久化)
    const newViews = (product.views || 0) + 1;
    setProducts(prevProducts =>
      prevProducts.map(p => p.id === product.id ? { ...p, views: newViews } : p)
    );
    setActiveProduct({ ...product, views: newViews });
    // 非同步寫入 Firestore
    if (db) {
      try {
        await incrementViewCount(db, product.id);
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
      <PwaStatus />
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
        navigation={navigation}
        user={user}
        onOpenAccount={() => setShowAccount(true)}
        onSignIn={() => handleSignIn().catch(() => {})}
      />

      {showAccount && user && (
        <AccountModal
          user={user}
          telegramLinked={telegramLinked}
          onLinkTelegram={handleLinkTelegram}
          onSignOut={handleSignOut}
          settings={userSettings}
          onChangeSettings={saveSettings}
          onClose={() => setShowAccount(false)}
        />
      )}

      {/* 主體內容 */}
      <main style={styles.main}>
        {currentView === 'admin' ? (
          !authReady ? null : !isAdminLoggedIn ? (
            <AdminLoginForm user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />
          ) : (
            <AdminPanel
              currentVersion={versions.length > 0 ? [...versions].sort((a, b) => b.timestamp - a.timestamp)[0].version : '1.0.0'}
              versions={versions}
              onPublishVersion={handlePublishVersion}
              onDeleteVersion={handleDeleteVersion}
              crawlerReports={crawlerReports}
              onTriggerCrawler={handleTriggerCrawler}
              navigation={navigation}
              allUniqueCategories={allUniqueCategories}
              onSaveNavigation={handleSaveNavigation}
              products={products}
            />
          )
        ) : currentView === '404' ? (
          <NotFound onReturnHome={() => setCurrentView('home')} />
        ) : loading ? (
          // 骨架屏載入狀態
          <div className="product-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isFeaturedHome ? (
          // 精選首頁模式：區塊橫向滾動
          <div style={styles.featuredHome}>
            {[
              { key: 'fav', title: '最多人收藏（追蹤）', list: topFavoriteProducts, empty: '' },
              { key: 'men-limited', title: '男裝限定價格', list: menLimited, empty: '目前沒有限定價格商品' },
              { key: 'women-limited', title: '女裝限定價格', list: womenLimited, empty: '目前沒有限定價格商品' },
              { key: 'men-new', title: '男裝最新商品', list: menNewArrivals, empty: '暫無新品上市資料' },
              { key: 'women-new', title: '女裝最新商品', list: womenNewArrivals, empty: '暫無新品上市資料' },
            ].filter(section => section.key !== 'fav' || section.list.length > 0) // 尚無人追蹤時不顯示收藏區塊
              .map(section => (
              <div key={section.key} style={{ marginBottom: 16 }}>
                <h3 className="section-title">{section.title}</h3>
                {section.list.length === 0 ? (
                  <div style={styles.emptyFeatured}>{section.empty}</div>
                ) : (
                  <HorizontalScroller>
                    {section.list.map(product => (
                      <div key={`${section.key}-${product.id}`} className="horizontal-scroll-item">
                        <ProductCard product={product} onClick={handleProductClick} />
                      </div>
                    ))}
                  </HorizontalScroller>
                )}
              </div>
            ))}
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
        <div className="sheet-overlay" onClick={handleCloseModal} role="presentation">
          <div className="sheet-card" role="dialog" aria-modal="true" aria-label={activeProduct.name} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grabber" aria-hidden="true" />
            {/* 關閉按鈕 */}
            <div className="sheet-close">
              <button onClick={handleCloseModal} style={styles.closeBtn} aria-label="關閉">
                <X size={24} />
              </button>
            </div>

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
                            backgroundColor: label === '歷史最低價' ? 'var(--uq-dark-red)' : 'var(--uq-red)',
                            color: '#ffffff',
                            padding: '3px 10px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '999px'
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                <div style={styles.detailCodeRow}>
                  <span>商品編號 {activeProduct.code}</span>
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
                      <span style={{ fontSize: '14px', color: 'var(--text-light)', marginRight: '2px' }}>原價</span>
                      <span style={{ fontSize: '14px', textDecoration: 'line-through', color: 'var(--text-light)' }}>
                        {formatPrice(activeProduct.originPrice)}
                      </span>
                      <span style={{ fontSize: '14px', color: 'var(--text-light)', marginLeft: '2px' }}>元</span>
                    </div>
                  )}
                  {activeProduct.originPrice && activeProduct.minPrice < activeProduct.originPrice && (
                    <div style={{ ...styles.discountBadge, display: 'inline-flex', alignItems: 'center', height: 'fit-content', marginLeft: '16px' }}>
                      {dropTierText(activeProduct.originPrice - activeProduct.minPrice)}
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1, alignItems: 'center' }}>
                      {activeProduct.colors.map(c => {
                        const isSelected = selectedModalColor && selectedModalColor.code === c.code;
                        return (
                          <button
                            key={c.code}
                            title={c.name}
                            aria-label={c.name}
                            aria-pressed={isSelected}
                            onClick={() => setSelectedModalColor(c)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundImage: c.chipUrl ? `url(${c.chipUrl.startsWith('http') ? c.chipUrl : `https://www.uniqlo.com/tw${c.chipUrl}`})` : 'none',
                              backgroundColor: 'var(--bg-light)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              cursor: 'pointer',
                              border: isSelected ? '2px solid var(--uq-red)' : '1px solid var(--border-color)',
                              transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                              transition: 'all 0.2s',
                              padding: 0
                            }}
                          />
                        );
                      })}
                      {selectedModalColor && (
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                          {selectedModalColor.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {user && favorites.includes(activeProduct.id) && (
                  <TargetPrice
                    productId={activeProduct.id}
                    currentPrice={activeProduct.minPrice}
                    target={targets[activeProduct.id] ?? null}
                    onSave={saveTarget}
                  />
                )}

                <div className="sheet-actions">
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
                    onClick={() => logClickExternalLink(activeProduct)}
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
                textDecoration: 'none',
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
    backgroundColor: 'var(--bg-page)',
  },
  featuredHome: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
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
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(118, 118, 128, 0.16)',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  detailPicWrapper: {
    width: '100%',
    flex: 1,
    minHeight: '300px',
    position: 'relative',
    backgroundColor: 'var(--bg-light)',
    borderRadius: 'var(--radius-md)',
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
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  detailName: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.01em',
    color: 'var(--text-primary)',
    lineHeight: 1.25,
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
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: '8px 0',
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
    backgroundColor: 'rgba(215,0,21,0.10)',
    color: 'var(--uq-red)',
    padding: '5px 12px',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
  },
  metaBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'var(--bg-light)',
    padding: '16px',
    borderRadius: 'var(--radius-md)',
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
    padding: '5px 12px',
    backgroundColor: 'var(--bg-white)',
    borderRadius: '8px',
    fontWeight: '500',
  },
  sizeTagUnavailable: {
    color: 'var(--text-light)',
    backgroundColor: 'transparent',
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
    gap: '12px',
    marginTop: '8px',
  },
  favBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '48px',
    padding: '12px 16px',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
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
    minHeight: '48px',
    padding: '12px 16px',
    backgroundColor: 'var(--uq-red)',
    color: '#ffffff',
    border: '1px solid var(--uq-red)',
    borderRadius: '14px',
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
    padding: '12px',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--text-light)',
    backgroundColor: 'var(--bg-white)',
  }
};

import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import ProductCard, { formatPrice } from './components/ProductCard';
import SkeletonCard from './components/SkeletonCard';
import PriceChart from './components/PriceChart';
import productsData from './data/products.json';
import { Search, SlidersHorizontal, ArrowUpDown, X, Heart, ExternalLink, TrendingDown } from 'lucide-react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

const isHistoricalLowest = (product) => {
  if (!product || !product.historyPrices || product.historyPrices.length === 0) return false;
  const currentPrice = product.minPrice;
  const today = new Date().toISOString().split('T')[0];
  const otherPrices = product.historyPrices
    .filter(hp => hp.date !== today)
    .map(hp => hp.price);
  if (otherPrices.length > 0) {
    return currentPrice < Math.min(...otherPrices);
  }
  return product.originPrice && currentPrice < product.originPrice;
};

export default function App() {
  const [products, setProducts] = useState(productsData);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('default'); // 'default', 'priceAsc', 'priceDesc', 'discountDesc'
  const [selectedSize, setSelectedSize] = useState('ALL');

  // 詳情頁商品 Modal
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedModalColor, setSelectedModalColor] = useState(null);
  // 加載更多商品控制
  const [visibleCount, setVisibleCount] = useState(24);
  // 我的最愛 / 追蹤清單
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('uq_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // 從 Firestore 載入最新商品
  useEffect(() => {
    async function loadFromFirestore() {
      try {
        if (db) {
          const querySnapshot = await getDocs(collection(db, "products"));
          const items = [];
          querySnapshot.forEach((doc) => {
            items.push(doc.data());
          });
          if (items.length > 0) {
            console.log(`Successfully loaded ${items.length} products from Firestore.`);
            setProducts(items);
          }
        }
      } catch (error) {
        console.error("Failed to load products from Firestore, using offline cache:", error);
      } finally {
        setLoading(false);
      }
    }
    loadFromFirestore();
  }, []);

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
    { code: 'tops', name: '上衣類 (T恤/襯衫)' },
    { code: 'bottoms', name: '下裝類 (長褲/短褲)' },
    { code: 'outerwear', name: '外套類 (夾克/風衣)' },
    { code: 'limited_price', name: '限定價格 ⏳' },
    { code: 'sale_price', name: '特價商品 🔴' },
    { code: 'favorites', name: '我的追蹤 ⭐' }
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
      if (selectedCategory === 'favorites') {
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
        result = result.filter(p => p.name.includes('T恤') || p.name.includes('襯衫') || p.name.includes('POLO'));
      } else if (selectedCategory === 'bottoms') {
        result = result.filter(p => p.name.includes('褲'));
      } else if (selectedCategory === 'outerwear') {
        result = result.filter(p => p.name.includes('外套') || p.name.includes('大衣') || p.name.includes('連帽'));
      }
    }

    // 3. 尺寸篩選
    if (selectedSize !== 'ALL') {
      result = result.filter(p => p.sizes && p.sizes.includes(selectedSize));
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
  }, [products, searchTerm, selectedCategory, selectedSize, sortBy, favorites]);

  // 當搜尋條件改變時重置顯示數量
  useEffect(() => {
    setVisibleCount(24);
  }, [searchTerm, selectedCategory, selectedSize, sortBy]);

  const loadMore = () => {
    setVisibleCount(prev => prev + 24);
  };

  const handleProductClick = (product) => {
    setActiveProduct(product);
    setSelectedModalColor(product.colors && product.colors.length > 0 ? product.colors[0] : null);
  };

  const handleCloseModal = () => {
    setActiveProduct(null);
    setSelectedModalColor(null);
  };

  return (
    <div style={styles.app}>
      <Header />

      {/* 主體內容 */}
      <main style={styles.main}>
        {/* 搜尋與過濾面板 */}
        <section style={styles.searchPanel}>
          <div style={styles.searchRow}>
            <div style={styles.searchContainer}>
              <Search size={20} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="請輸入名稱或貨號"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '44px' }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={styles.clearBtn}>
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* 篩選按鈕列 */}
          <div style={styles.filterRow}>
            {/* 類別切換 */}
            <div style={styles.tabContainer}>
              {categories.map(cat => (
                <button
                  key={cat.code}
                  onClick={() => setSelectedCategory(cat.code)}
                  style={{
                    ...styles.tab,
                    borderBottom: selectedCategory === cat.code ? '2px solid var(--uq-red)' : '2px solid transparent',
                    color: selectedCategory === cat.code ? 'var(--uq-red)' : 'var(--text-secondary)',
                    fontWeight: selectedCategory === cat.code ? 'bold' : 'normal'
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* 進階過濾器 */}
            <div style={styles.filtersRight}>
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
        </section>

        {/* 商品展示區 */}
        <section style={styles.resultsSection}>
          <div style={styles.resultsCount}>
            共找到 <span style={{ color: 'var(--uq-red)', fontWeight: 'bold' }}>{filteredProducts.length}</span> 件男裝/男女適穿商品
          </div>

          {loading ? (
            // 骨架屏載入狀態
            <div className="product-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={styles.noResult}>
              <TrendingDown size={48} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
              <p>沒有找到符合條件的商品，請嘗試其他關鍵字。</p>
            </div>
          ) : (
            // 實際商品列表
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
      </main>

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
                    src={selectedModalColor?.largePicUrl || activeProduct.mainPic}
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
                    <strong style={styles.metaLabel}>可用尺寸：</strong>
                    <div style={styles.tagGroup}>
                      {activeProduct.sizes.map(s => (
                        <span key={s} style={styles.sizeTag}>{s}</span>
                      ))}
                    </div>
                  </div>

                  <div style={styles.metaRow}>
                    <strong style={styles.metaLabel}>可用顏色：</strong>
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
                              backgroundImage: c.chipUrl ? `url(${c.chipUrl})` : 'none',
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
              <PriceChart historyData={activeProduct.historyPrices} />
            </div>
          </div>
        </div>
      )}

      {/* 頁腳 */}
      <footer style={styles.footer}>
        <p>© 2026 UNIQLO 台灣商品比價首選網 | 僅供學術與練習使用</p>
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
  searchPanel: {
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-sm)',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  searchRow: {
    width: '100%',
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-light)',
    pointerEvents: 'none',
  },
  clearBtn: {
    position: 'absolute',
    right: '16px',
    background: 'none',
    border: 'none',
    color: 'var(--text-light)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  tabContainer: {
    display: 'flex',
    gap: '16px',
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '8px 4px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  filtersRight: {
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
    marginBottom: '12px',
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
    paddingTop: '100%',
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
    objectFit: 'cover',
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

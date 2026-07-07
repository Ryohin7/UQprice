import React, { useState, useEffect } from 'react';
import { Download, Heart, Search, X, Menu, ChevronDown, User } from 'lucide-react';

export default function Header({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedSex,
  setSelectedSex,
  favorites,
  currentView = 'home',
  setCurrentView,
  navigation = []
}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  const [openAccordions, setOpenAccordions] = useState({});
  const toggleAccordion = (id) => {
    setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    }
  };

  const handleLogoClick = () => {
    setSelectedSex('ALL');
    setSelectedCategory('ALL');
    setSearchTerm('');
    if (setCurrentView) setCurrentView('home');
  };

  const handleCategorySelect = (sex, categoryCode) => {
    setSelectedSex(sex);
    setSelectedCategory(categoryCode);
    setSearchTerm('');
    if (setCurrentView) setCurrentView('home');
  };

  const subCategories = [
    { code: 'ALL', name: '全部商品' },
    { code: 'new_arrival', name: '新品上市' },
    { code: 'limited_price', name: '限定價格' },
    { code: 'sale_price', name: '特價商品' },
    { code: 'tops', name: '上衣類' },
    { code: 'bottoms', name: '下裝類' },
    { code: 'outerwear', name: '外套類' },
    { code: 'innerwear', name: '內衣/褲/襪' },
    { code: 'accessories', name: '配件' }
  ];

  return (
    <>
      <header style={styles.header}>
        {/* 極簡純文字 Logo */}
        <div className="desktop-logo" style={styles.logoContainer} onClick={handleLogoClick}>
          <span style={styles.logoTextTitle}>UG快速查價</span>
        </div>

        {/* 桌面端導航選單 */}
        <ul className="nav-menu" style={styles.desktopNav}>
          {navigation.map(mainCat => (
            <li key={mainCat.id} className="nav-item">
              <button
                onClick={() => handleCategorySelect(mainCat.sex, 'ALL')}
                style={{
                  background: 'none',
                  border: 'none',
                  font: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'inherit',
                  fontWeight: 'inherit'
                }}
              >
                {mainCat.name}
              </button>
              <div className="dropdown-card">
                {mainCat.subCategories.filter(sub => sub.code !== 'ALL').map(sub => (
                  <button
                    key={`${mainCat.id}-${sub.code}`}
                    className="dropdown-item"
                    onClick={() => handleCategorySelect(mainCat.sex, sub.code)}
                    style={{
                      color: selectedSex === mainCat.sex && selectedCategory === sub.code ? 'var(--uq-red)' : 'var(--text-secondary)',
                      fontWeight: selectedSex === mainCat.sex && selectedCategory === sub.code ? 'bold' : 'normal',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        {/* 搜尋欄 & 操作按鈕區 */}
        <div style={styles.navActions} className="nav-actions-container">
          {/* 自適應全寬搜尋欄 (手機版與桌面版共用此 DOM，經 CSS 響應式配置) */}
          <div className="search-bar-wrapper" style={styles.searchContainerDesktop}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="搜尋商品名稱或編號..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedCategory('ALL');
                setSelectedSex('ALL');
                if (setCurrentView && currentView !== 'home') {
                  setCurrentView('home');
                }
              }}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={styles.clearBtn}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* 我的追蹤 - 僅桌面版顯示 */}
          <button
            onClick={() => handleCategorySelect('ALL', 'favorites')}
            style={{
              ...styles.favBtn,
              color: selectedCategory === 'favorites' ? 'var(--uq-red)' : 'var(--text-primary)',
              backgroundColor: selectedCategory === 'favorites' ? 'rgba(231,31,25,0.04)' : 'transparent',
            }}
            className="desktop-fav-btn"
          >
            <Heart size={20} fill={selectedCategory === 'favorites' ? 'var(--uq-red)' : 'none'} />
            <span style={styles.favText}>我的追蹤</span>
            {favorites.length > 0 && (
              <span style={styles.favBadge}>{favorites.length}</span>
            )}
          </button>

          {/* 下載 App 按鈕 - 僅桌面版顯示 */}
          {showInstallBtn && (
            <button onClick={handleInstallClick} style={styles.installBtn} className="desktop-install-btn">
              <Download size={14} style={{ marginRight: 4 }} />
              <span>App</span>
            </button>
          )}

          {/* 返回首頁按鈕 - 僅在後台視圖顯示 */}
          {currentView === 'admin' && (
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              style={{
                ...styles.adminBtn,
                color: 'var(--text-primary)',
                backgroundColor: 'transparent',
              }}
              className="desktop-admin-btn"
            >
              <User size={18} />
              <span style={styles.favText} className="fav-text-span">返回首頁</span>
            </button>
          )}

          {/* 漢堡菜單圖示 - 行動端必備 */}
          <button
            className="mobile-menu-btn"
            style={styles.mobileMenuToggle}
            onClick={() => setMobileDrawerOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </header >

      {/* 行動端 Drawer 側滑菜單 */}
      {
        mobileDrawerOpen && (
          <>
            <div className="drawer-overlay" onClick={() => setMobileDrawerOpen(false)} />
            <div className={`mobile-drawer ${mobileDrawerOpen ? 'open' : ''}`}>
              <div className="drawer-header">
                <span className="drawer-title">選單與商品分類</span>
                <button className="drawer-close" onClick={() => setMobileDrawerOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="drawer-menu">
                {navigation.map(mainCat => {
                  const isOpen = !!openAccordions[mainCat.id];
                  return (
                    <div key={mainCat.id} className="accordion-section">
                      <div
                        className="accordion-title"
                        onClick={() => toggleAccordion(mainCat.id)}
                      >
                        <span>{mainCat.name}</span>
                        <ChevronDown
                          size={16}
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s'
                          }}
                        />
                      </div>
                      {isOpen && (
                        <div className="accordion-content">
                          {mainCat.subCategories.filter(sub => sub.code !== 'ALL').map(sub => (
                            <div
                              key={`mob-${mainCat.id}-${sub.code}`}
                              className="accordion-item-link"
                              onClick={() => {
                                  handleCategorySelect(mainCat.sex, sub.code);
                                  setMobileDrawerOpen(false);
                              }}
                              style={{
                                color: selectedSex === mainCat.sex && selectedCategory === sub.code ? 'var(--uq-red)' : 'var(--text-secondary)',
                                fontWeight: selectedSex === mainCat.sex && selectedCategory === sub.code ? 'bold' : 'normal'
                              }}
                            >
                              {sub.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 我的追蹤 (手機端整合) */}
                <div
                  className="accordion-title"
                  onClick={() => {
                    handleCategorySelect('ALL', 'favorites');
                    setMobileDrawerOpen(false);
                  }}
                  style={{
                    color: selectedCategory === 'favorites' ? 'var(--uq-red)' : 'var(--text-primary)',
                    fontWeight: selectedCategory === 'favorites' ? 'bold' : 'normal',
                    borderBottom: '1px solid var(--bg-light)'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Heart size={16} fill={selectedCategory === 'favorites' ? 'var(--uq-red)' : 'none'} />
                    我的追蹤 ({favorites.length})
                  </span>
                </div>

                {/* 安裝桌面 App (手機端整合) */}
                {showInstallBtn && (
                  <div
                    className="accordion-title"
                    onClick={() => {
                      handleInstallClick();
                      setMobileDrawerOpen(false);
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--uq-red)' }}>
                      <Download size={16} />
                      安裝桌面 App
                    </span>
                  </div>
                )}

                {/* 返回首頁 (手機端整合，僅在後台視圖顯示) */}
                {currentView === 'admin' && (
                  <div
                    className="accordion-title"
                    onClick={() => {
                      window.location.href = '/';
                    }}
                    style={{ borderBottom: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                      <User size={16} />
                      返回首頁
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      }
    </>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 24px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-white)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  logoTextTitle: {
    fontSize: '18px',
    fontWeight: '800',
    letterSpacing: '1px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
  },
  desktopNav: {
    display: 'flex',
    flex: 1,
    alignItems: 'center',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchContainerDesktop: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-light)',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    padding: '8px 32px 8px 32px',
    fontSize: '13px',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    backgroundColor: 'var(--bg-light)',
    outline: 'none',
    transition: 'var(--transition-fast)',
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-light)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  favBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '700',
    padding: '8px 12px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  adminBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '700',
    padding: '8px 12px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  favText: {
    display: 'inline',
  },
  favBadge: {
    backgroundColor: 'var(--uq-red)',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 'bold',
    borderRadius: '10px',
    padding: '2px 6px',
    lineHeight: 1,
  },
  installBtn: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: '700',
    padding: '6px 10px',
    borderRadius: '16px',
    backgroundColor: 'var(--text-primary)',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
  },
  mobileMenuToggle: {
    display: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-primary)',
  }
};

// 注入 RWD inline-styles 支持（React inline style 不支持 @media，所以我們在 CSS 或組件頂部做 RWD 狀態）
const injectRwdCss = () => {
  if (typeof document === 'undefined') return;
  const id = 'header-rwd-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.innerHTML = `
    @media (max-width: 992px) {
      ul.nav-menu {
        display: none !important;
      }
      .fav-text-span {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
};
if (typeof window !== 'undefined') {
  injectRwdCss();
}

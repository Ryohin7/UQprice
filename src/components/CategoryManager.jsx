import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, Search, Check, Folder, FolderOpen, Tag, HelpCircle, CheckSquare, Square, GripVertical } from 'lucide-react';

export default function CategoryManager({
  initialNavigation = [],
  allUniqueCategories = [],
  onSaveNavigation
}) {
  const [navigation, setNavigation] = useState(initialNavigation);
  const [activeMainId, setActiveMainId] = useState(initialNavigation[0]?.id || '');
  const [activeSubCode, setActiveSubCode] = useState('');
  
  // 拖曳狀態追蹤
  const [draggedMainIndex, setDraggedMainIndex] = useState(null);
  const [draggedSubInfo, setDraggedSubInfo] = useState(null); // { mainId, index }
  
  // 各主分類的展開/折疊狀態
  const [expandedMainCats, setExpandedMainCats] = useState(() => {
    const states = {};
    initialNavigation.forEach(cat => {
      states[cat.id] = true; // 預設展開
    });
    return states;
  });

  // 新增主分類狀態
  const [newMainName, setNewMainName] = useState('');
  const [newMainSex, setNewMainSex] = useState('ALL');

  // 新增次分類狀態 (key 為 mainCategoryId)
  const [newSubNames, setNewSubNames] = useState({});

  // 編輯狀態
  const [editingMainId, setEditingMainId] = useState(null);
  const [editingMainName, setEditingMainName] = useState('');

  const [editingSubKey, setEditingSubKey] = useState(null); // format: "mainId-subCode"
  const [editingSubName, setEditingSubName] = useState('');

  // 右側搜尋過濾分類狀態
  const [categorySearch, setCategorySearch] = useState('');

  // 儲存中狀態
  const [isSaving, setIsSaving] = useState(false);

  // 異步同步外部導航配置與預設展開狀態 (僅在本地尚未載入或有主分類更新時)
  useEffect(() => {
    if (initialNavigation && initialNavigation.length > 0) {
      if (navigation.length === 0) {
        setNavigation(initialNavigation);
      }
      setExpandedMainCats(prev => {
        const next = { ...prev };
        let hasUpdate = false;
        initialNavigation.forEach(cat => {
          if (next[cat.id] === undefined) {
            next[cat.id] = true; // 預設展開
            hasUpdate = true;
          }
        });
        return hasUpdate ? next : prev;
      });
      if (!activeMainId && initialNavigation[0]) {
        setActiveMainId(initialNavigation[0].id);
      }
    }
  }, [initialNavigation, navigation.length, activeMainId]);

  // 切換展開/折疊
  const toggleExpand = (id) => {
    setExpandedMainCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 取得目前選中的次分類物件與其主分類
  const selectedInfo = useMemo(() => {
    if (!activeSubCode) return null;
    
    for (const mainCat of navigation) {
      const sub = (mainCat.subCategories || []).find(s => s.code === activeSubCode && `${mainCat.id}-${s.code}` === activeMainId + '-' + activeSubCode);
      if (sub) {
        return { mainCat, subCategory: sub };
      }
    }
    return null;
  }, [navigation, activeMainId, activeSubCode]);

  // 新增主分類
  const handleAddMainCategory = (e) => {
    e.preventDefault();
    if (!newMainName.trim()) return;

    const id = 'cat_' + Date.now();
    const newMain = {
      id,
      name: newMainName.trim(),
      sex: newMainSex,
      order: navigation.length + 1,
      subCategories: [
        { code: 'ALL', name: `全部${newMainName.trim()}`, matchType: 'built-in' },
        { code: 'new_arrival', name: '新品上市', matchType: 'built-in' },
        { code: 'coming_soon', name: '即將上市', matchType: 'built-in' },
        { code: 'limited_price', name: '限定價格', matchType: 'built-in' },
        { code: 'sale_price', name: '特價商品', matchType: 'built-in' }
      ]
    };

    setNavigation([...navigation, newMain]);
    setNewMainName('');
    setExpandedMainCats(prev => ({ ...prev, [id]: true }));
    setActiveMainId(id);
    setActiveSubCode('');
  };

  // 刪除主分類
  const handleDeleteMainCategory = (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`確定要刪除主分類「${name}」及其下的所有次分類嗎？`)) return;

    const updated = navigation
      .filter(cat => cat.id !== id)
      .map((cat, idx) => ({ ...cat, order: idx + 1 })); // 重整排序

    setNavigation(updated);
    if (activeMainId === id) {
      setActiveMainId(updated[0]?.id || '');
      setActiveSubCode('');
    }
  };

  // 啟動編輯主分類
  const startEditMain = (id, name, e) => {
    e.stopPropagation();
    setEditingMainId(id);
    setEditingMainName(name);
  };

  // 儲存主分類名稱
  const saveMainName = (id) => {
    if (!editingMainName.trim()) return;
    setNavigation(prev => prev.map(cat => {
      if (cat.id === id) {
        // 如果次分類中有「全部XX」，同步更新其名稱
        const updatedSubs = (cat.subCategories || []).map(sub => {
          if (sub.code === 'ALL' && sub.name === `全部${cat.name}`) {
            return { ...sub, name: `全部${editingMainName.trim()}` };
          }
          return sub;
        });
        return { ...cat, name: editingMainName.trim(), subCategories: updatedSubs };
      }
      return cat;
    }));
    setEditingMainId(null);
  };

  // 新增次分類
  const handleAddSubCategory = (mainId) => {
    const subName = newSubNames[mainId] || '';
    if (!subName.trim()) return;

    const code = 'sub_' + Date.now();
    const newSub = {
      code,
      name: subName.trim(),
      matchType: 'custom',
      selectedCategories: []
    };

    setNavigation(prev => prev.map(cat => {
      if (cat.id === mainId) {
        return {
          ...cat,
          subCategories: [...(cat.subCategories || []), newSub]
        };
      }
      return cat;
    }));

    setNewSubNames(prev => ({ ...prev, [mainId]: '' }));
    setActiveMainId(mainId);
    setActiveSubCode(code);
  };

  // 刪除次分類
  const handleDeleteSubCategory = (mainId, subCode, subName, e) => {
    e.stopPropagation();
    if (!window.confirm(`確定要刪除次分類「${subName}」嗎？`)) return;

    setNavigation(prev => prev.map(cat => {
      if (cat.id === mainId) {
        return {
          ...cat,
          subCategories: (cat.subCategories || []).filter(sub => sub.code !== subCode)
        };
      }
      return cat;
    }));

    if (activeMainId === mainId && activeSubCode === subCode) {
      setActiveSubCode('');
    }
  };

  // 啟動編輯次分類
  const startEditSub = (mainId, subCode, subName, e) => {
    e.stopPropagation();
    setEditingSubKey(`${mainId}-${subCode}`);
    setEditingSubName(subName);
  };

  // 儲存次分類名稱
  const saveSubName = (mainId, subCode) => {
    if (!editingSubName.trim()) return;
    setNavigation(prev => prev.map(cat => {
      if (cat.id === mainId) {
        return {
          ...cat,
          subCategories: (cat.subCategories || []).map(sub => {
            if (sub.code === subCode) {
              return { ...sub, name: editingSubName.trim() };
            }
            return sub;
          })
        };
      }
      return cat;
    }));
    setEditingSubKey(null);
  };

  // 點擊次分類
  const handleSelectSub = (mainId, subCode) => {
    setActiveMainId(mainId);
    setActiveSubCode(subCode);
  };

  // 右側：切換商品分類勾選
  const handleToggleCategory = (catName) => {
    if (!selectedInfo) return;
    const { mainCat, subCategory } = selectedInfo;
    if (subCategory.matchType === 'built-in') return;

    setNavigation(prev => prev.map(mCat => {
      if (mCat.id === mainCat.id) {
        const updatedSubs = (mCat.subCategories || []).map(sub => {
          if (sub.code === subCategory.code) {
            const hasCat = sub.selectedCategories.includes(catName);
            const nextCats = hasCat
              ? sub.selectedCategories.filter(c => c !== catName)
              : [...sub.selectedCategories, catName];
            return { ...sub, selectedCategories: nextCats };
          }
          return sub;
        });
        return { ...mCat, subCategories: updatedSubs };
      }
      return mCat;
    }));
  };

  // 過濾搜尋分類
  const filteredUniqueCategories = useMemo(() => {
    if (!categorySearch.trim()) return allUniqueCategories;
    const q = categorySearch.toLowerCase();
    return allUniqueCategories.filter(cat => cat.toLowerCase().includes(q));
  }, [allUniqueCategories, categorySearch]);

  // 全選過濾後的分類
  const handleSelectAllFiltered = () => {
    if (!selectedInfo) return;
    const { mainCat, subCategory } = selectedInfo;
    if (subCategory.matchType === 'built-in') return;

    setNavigation(prev => prev.map(mCat => {
      if (mCat.id === mainCat.id) {
        const updatedSubs = (mCat.subCategories || []).map(sub => {
          if (sub.code === subCategory.code) {
            // 合併現有與過濾出來的所有分類
            const merged = Array.from(new Set([...sub.selectedCategories, ...filteredUniqueCategories]));
            return { ...sub, selectedCategories: merged };
          }
          return sub;
        });
        return { ...mCat, subCategories: updatedSubs };
      }
      return mCat;
    }));
  };

  // 清除全部已勾選分類
  const handleClearAllSelected = () => {
    if (!selectedInfo) return;
    const { mainCat, subCategory } = selectedInfo;
    if (subCategory.matchType === 'built-in') return;

    setNavigation(prev => prev.map(mCat => {
      if (mCat.id === mainCat.id) {
        const updatedSubs = (mCat.subCategories || []).map(sub => {
          if (sub.code === subCategory.code) {
            return { ...sub, selectedCategories: [] };
          }
          return sub;
        });
        return { ...mCat, subCategories: updatedSubs };
      }
      return mCat;
    }));
  };

  // 儲存總變更
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveNavigation(navigation);
      alert('🎉 Header 導航分類配置儲存成功！');
    } catch (err) {
      alert(`❌ 儲存失敗: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={styles.managerContainer} id="category-manager-root">
      {/* 雙欄主區塊 */}
      <div style={styles.panelGrid}>
        
        {/* 左側：分類樹 */}
        <div style={styles.leftPanel}>
          <div style={styles.panelHeader}>
            <Folder size={18} style={{ color: 'var(--uq-red)' }} />
            <h4 style={styles.panelTitle}>主分類與次分類配置</h4>
          </div>

          <div style={styles.treeScroll}>
            {navigation.map((mainCat, idx) => {
              const isExpanded = expandedMainCats[mainCat.id];
              const isMainEditing = editingMainId === mainCat.id;

              return (
                <div 
                  key={mainCat.id} 
                  style={{
                    ...styles.mainCatBlock,
                    opacity: draggedMainIndex === idx ? 0.4 : 1,
                    cursor: 'move'
                  }}
                  draggable={!isMainEditing}
                  onDragStart={(e) => {
                    setDraggedMainIndex(idx);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedMainIndex === null || draggedMainIndex === idx) return;
                    const nextNav = [...navigation];
                    const draggedItem = nextNav[draggedMainIndex];
                    nextNav.splice(draggedMainIndex, 1);
                    nextNav.splice(idx, 0, draggedItem);
                    // 重新整理 order
                    const reordered = nextNav.map((item, index) => ({
                      ...item,
                      order: index + 1
                    }));
                    setNavigation(reordered);
                    setDraggedMainIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedMainIndex(null);
                  }}
                >
                  {/* 主分類頭 */}
                  <div 
                    style={{
                      ...styles.mainCatHeader,
                      borderLeft: activeMainId === mainCat.id && !activeSubCode ? '3px solid var(--uq-red)' : '3px solid transparent'
                    }}
                  >
                    <button 
                      onClick={() => toggleExpand(mainCat.id)}
                      style={styles.expandToggleBtn}
                    >
                      {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                    </button>

                    {isMainEditing ? (
                      <div style={styles.inlineEditForm}>
                        <input
                          type="text"
                          value={editingMainName}
                          onChange={(e) => setEditingMainName(e.target.value)}
                          style={styles.inlineInput}
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveMainName(mainCat.id)}
                        />
                        <button onClick={() => saveMainName(mainCat.id)} style={styles.inlineSaveBtn}>
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingMainId(null)} style={styles.inlineCancelBtn}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        style={styles.mainCatNameArea}
                        onClick={() => {
                          setActiveMainId(mainCat.id);
                          setActiveSubCode('');
                          if (!expandedMainCats[mainCat.id]) {
                            setExpandedMainCats(prev => ({ ...prev, [mainCat.id]: true }));
                          }
                        }}
                      >
                        <span style={styles.mainCatName}>{mainCat.name}</span>
                        <span style={styles.sexBadge}>{mainCat.sex.toUpperCase()}</span>
                      </div>
                    )}

                    {/* 主分類操作 */}
                    {!isMainEditing && (
                      <div style={styles.actionGroup}>
                        <button 
                          onClick={(e) => startEditMain(mainCat.id, mainCat.name, e)}
                          style={styles.actionIconBtn}
                          title="修改名稱"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteMainCategory(mainCat.id, mainCat.name, e)}
                          style={styles.deleteIconBtn}
                          title="刪除主分類"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 次分類列表 */}
                  {isExpanded && (
                    <div style={styles.subCatContainer}>
                      {(mainCat.subCategories || []).map((sub, subIdx) => {
                        const isSubEditing = editingSubKey === `${mainCat.id}-${sub.code}`;
                        const isSubActive = activeMainId === mainCat.id && activeSubCode === sub.code;
                        const isSubDragged = draggedSubInfo && draggedSubInfo.mainId === mainCat.id && draggedSubInfo.index === subIdx;

                        return (
                          <div 
                            key={sub.code} 
                            onClick={() => handleSelectSub(mainCat.id, sub.code)}
                            draggable={!isSubEditing}
                            onDragStart={(e) => {
                              setDraggedSubInfo({ mainId: mainCat.id, index: subIdx });
                              e.dataTransfer.effectAllowed = 'move';
                              e.stopPropagation(); // 避免觸發主分類拖曳
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation(); // 避免觸發主分類 drop
                              if (!draggedSubInfo || draggedSubInfo.mainId !== mainCat.id || draggedSubInfo.index === subIdx) return;
                              
                              const nextNav = navigation.map(cat => {
                                if (cat.id === mainCat.id) {
                                  const nextSubs = [...cat.subCategories];
                                  const draggedItem = nextSubs[draggedSubInfo.index];
                                  nextSubs.splice(draggedSubInfo.index, 1);
                                  nextSubs.splice(subIdx, 0, draggedItem);
                                  return { ...cat, subCategories: nextSubs };
                                }
                                return cat;
                              });
                              setNavigation(nextNav);
                              setDraggedSubInfo(null);
                            }}
                            onDragEnd={() => {
                              setDraggedSubInfo(null);
                            }}
                            style={{
                              ...styles.subCatRow,
                              backgroundColor: isSubActive ? 'rgba(231,31,25,0.05)' : 'transparent',
                              borderLeft: isSubActive ? '3px solid var(--uq-red)' : '3px solid transparent',
                              opacity: isSubDragged ? 0.4 : 1,
                              cursor: 'move'
                            }}
                          >
                            <GripVertical 
                              size={12} 
                              style={{ 
                                color: 'var(--text-light)', 
                                cursor: 'grab', 
                                marginRight: '4px',
                                flexShrink: 0 
                              }} 
                            />
                            <Tag size={13} style={{ color: isSubActive ? 'var(--uq-red)' : 'var(--text-light)', marginRight: 6 }} />
                            
                            {isSubEditing ? (
                              <div style={styles.inlineEditForm}>
                                <input
                                  type="text"
                                  value={editingSubName}
                                  onChange={(e) => setEditingSubName(e.target.value)}
                                  style={styles.inlineInput}
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.key === 'Enter' && saveSubName(mainCat.id, sub.code)}
                                />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); saveSubName(mainCat.id, sub.code); }} 
                                  style={styles.inlineSaveBtn}
                                >
                                  <Check size={14} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setEditingSubKey(null); }} 
                                  style={styles.inlineCancelBtn}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <span style={{ 
                                ...styles.subCatName,
                                fontWeight: isSubActive ? '700' : 'normal',
                                color: isSubActive ? 'var(--uq-red)' : 'var(--text-primary)'
                              }}>
                                {sub.name}
                                {sub.matchType === 'custom' && (
                                  <span style={styles.customCountBadge}>
                                    {sub.selectedCategories?.length || 0} 個關聯
                                  </span>
                                )}
                              </span>
                            )}

                            {/* 次分類操作 */}
                            {!isSubEditing && (
                              <div style={styles.actionGroup}>
                                <button 
                                  onClick={(e) => startEditSub(mainCat.id, sub.code, sub.name, e)}
                                  style={styles.actionIconBtn}
                                  title="修改名稱"
                                >
                                  <Edit3 size={12} />
                                </button>
                                {/* 不允許刪除預設的 ALL 次分類 */}
                                {sub.code !== 'ALL' && (
                                  <button 
                                    onClick={(e) => handleDeleteSubCategory(mainCat.id, sub.code, sub.name, e)}
                                    style={styles.deleteIconBtn}
                                    title="刪除次分類"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* 新增次分類小表單 */}
                      <div style={styles.addSubForm}>
                        <input
                          type="text"
                          placeholder="新次分類名稱..."
                          value={newSubNames[mainCat.id] || ''}
                          onChange={(e) => setNewSubNames({ ...newSubNames, [mainCat.id]: e.target.value })}
                          style={styles.addSubInput}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSubCategory(mainCat.id)}
                        />
                        <button 
                          onClick={() => handleAddSubCategory(mainCat.id)}
                          style={styles.addSubBtn}
                        >
                          <Plus size={14} />
                          新增
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 新增主分類卡片 */}
          <form onSubmit={handleAddMainCategory} style={styles.addMainForm}>
            <h5 style={styles.addMainTitle}>+ 新增主分類</h5>
            <div style={styles.addMainInputs}>
              <input
                type="text"
                placeholder="主分類名稱 (如 男裝 MENS)..."
                value={newMainName}
                onChange={(e) => setNewMainName(e.target.value)}
                style={styles.addMainNameInput}
                required
              />
              <select 
                value={newMainSex}
                onChange={(e) => setNewMainSex(e.target.value)}
                style={styles.addMainSelect}
              >
                <option value="men">男裝 (men)</option>
                <option value="women">女裝 (women)</option>
                <option value="kids">童裝 (kids)</option>
                <option value="baby">嬰幼兒 (baby)</option>
                <option value="ALL">全部 (ALL)</option>
              </select>
            </div>
            <button type="submit" style={styles.addMainSubmitBtn}>
              新增主分類
            </button>
          </form>
        </div>

        {/* 右側：商品分類關聯勾選區 */}
        <div style={styles.rightPanel}>
          {selectedInfo ? (
            <>
              <div style={styles.panelHeader}>
                <Tag size={18} style={{ color: 'var(--uq-red)' }} />
                <h4 style={styles.panelTitle}>
                  關聯設定：{selectedInfo.mainCat.name} ➡️ <span style={{ color: 'var(--uq-red)' }}>{selectedInfo.subCategory.name}</span>
                </h4>
              </div>

              {selectedInfo.subCategory.matchType === 'built-in' ? (
                <div style={styles.builtInWarning}>
                  <HelpCircle size={28} style={{ color: '#1565c0', marginBottom: 12 }} />
                  <p style={{ fontWeight: '700', fontSize: '16px', color: '#0d47a1', marginBottom: 8 }}>系統內建分類</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    此為系統保留次分類，該分類下的商品將由系統演算法自動動態篩選呈現，無須也無法手動設定關聯商品。
                  </p>
                  
                  <div style={styles.logicCard}>
                    <p style={styles.logicCardTitle}>🔍 當前內建篩選邏輯：</p>
                    <div style={styles.logicContent}>
                      {selectedInfo.subCategory.code === 'ALL' && (
                        <div>
                          <strong>篩選條件：</strong> 顯示該主分類所屬性別 (<code>{selectedInfo.mainCat.sex.toUpperCase()}</code>) 的<strong>所有商品</strong>。
                        </div>
                      )}
                      {selectedInfo.subCategory.code === 'new_arrival' && (
                        <div>
                          <strong>篩選條件：</strong> 顯示該主分類所屬性別，且商品標記為<strong>新品上市</strong> (<code>isNewArrival === true</code>) 的商品。
                        </div>
                      )}
                      {selectedInfo.subCategory.code === 'coming_soon' && (
                        <div>
                          <strong>篩選條件：</strong> 顯示該主分類所屬性別，且商品首次上架時間 (<code>firstListTime</code>) <strong>比目前時間晚</strong> (即預訂販售) 的商品。
                        </div>
                      )}
                      {selectedInfo.subCategory.code === 'limited_price' && (
                        <div>
                          <strong>篩選條件：</strong> 顯示該主分類所屬性別，且行銷促銷標籤包含<strong>「限定價格」</strong>的商品。
                        </div>
                      )}
                      {selectedInfo.subCategory.code === 'sale_price' && (
                        <div>
                          <strong>篩選條件：</strong> 顯示該主分類所屬性別，且行銷促銷標籤包含<strong>「特價商品」</strong>的商品。
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.associationEditor}>
                  <p style={styles.assocDesc}>
                    勾選下方現有的商品分類。當前台用戶選取此子分類時，系統將篩選出<strong>符合本主分類性別</strong>且<strong>包含任一已勾選分類名稱</strong>的商品。
                  </p>

                  {/* 搜尋與快捷按鈕列 */}
                  <div style={styles.assocToolbar}>
                    <div style={styles.searchWrapper}>
                      <Search size={16} style={styles.searchIcon} />
                      <input
                        type="text"
                        placeholder="搜尋商品分類名稱..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        style={styles.searchInput}
                      />
                      {categorySearch && (
                        <button onClick={() => setCategorySearch('')} style={styles.searchClearBtn}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    
                    <button 
                      onClick={handleSelectAllFiltered}
                      style={styles.toolBtn}
                      title="全選搜尋結果"
                    >
                      <CheckSquare size={14} style={{ marginRight: 4 }} />
                      全選過濾
                    </button>
                    <button 
                      onClick={handleClearAllSelected}
                      style={styles.clearToolBtn}
                      title="清除全部已勾選分類"
                    >
                      <Trash2 size={14} style={{ marginRight: 4 }} />
                      清除選擇
                    </button>
                  </div>

                  {/* 數量狀態 */}
                  <div style={styles.selectedStatus}>
                    已關聯商品分類：
                    <span style={styles.selectedCount}>
                      {selectedInfo.subCategory.selectedCategories?.length || 0}
                    </span>
                    個
                  </div>

                  {/* 分類網格複選清單 */}
                  <div style={styles.checkboxGrid}>
                    {filteredUniqueCategories.length === 0 ? (
                      <div style={styles.noFilterResult}>
                        沒有符合「{categorySearch}」的商品分類。
                      </div>
                    ) : (
                      filteredUniqueCategories.map((catName) => {
                        const isChecked = selectedInfo.subCategory.selectedCategories?.includes(catName);
                        return (
                          <div 
                            key={catName} 
                            onClick={() => handleToggleCategory(catName)}
                            style={{
                              ...styles.checkboxItem,
                              borderColor: isChecked ? 'var(--uq-red)' : 'var(--border-color)',
                              backgroundColor: isChecked ? 'rgba(231,31,25,0.02)' : '#ffffff'
                            }}
                          >
                            {isChecked ? (
                              <CheckSquare size={16} style={{ color: 'var(--uq-red)' }} />
                            ) : (
                              <Square size={16} style={{ color: 'var(--text-light)' }} />
                            )}
                            <span style={{ 
                              ...styles.checkboxLabel,
                              fontWeight: isChecked ? '700' : 'normal',
                              color: isChecked ? 'var(--uq-red)' : 'var(--text-primary)'
                            }}>
                              {catName}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyAssoc}>
              <HelpCircle size={40} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
              <p>請先由左側點選一個「次分類」進行關聯設定。</p>
            </div>
          )}
        </div>
      </div>

      {/* 底部動作列 */}
      <div style={styles.footerRow}>
        <span style={styles.footerTip}>* 請注意：完成主、次分類或商品關聯編輯後，必須按「儲存配置」按鈕以同步至資料庫。</span>
        <button 
          onClick={handleSaveAll}
          disabled={isSaving}
          style={styles.saveAllBtn}
        >
          <Save size={18} style={{ marginRight: 6 }} />
          {isSaving ? '正在儲存設定...' : '儲存所有分類與關聯配置'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  managerContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
  },
  panelGrid: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '20px',
    alignItems: 'stretch',
  },
  leftPanel: {
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-sm)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '75vh',
  },
  rightPanel: {
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-sm)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '75vh',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '12px',
  },
  panelTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  treeScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    paddingRight: '4px',
  },
  mainCatBlock: {
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    flexShrink: 0,
  },
  mainCatHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid var(--border-color)',
    gap: '8px',
  },
  expandToggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCatNameArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  mainCatName: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  sexBadge: {
    fontSize: '10px',
    fontWeight: '700',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-secondary)',
    padding: '2px 6px',
    borderRadius: '10px',
    fontFamily: 'monospace',
  },
  actionGroup: {
    display: 'flex',
    gap: '4px',
  },
  actionIconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-light)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      color: 'var(--text-primary)',
      backgroundColor: 'rgba(0,0,0,0.04)',
    }
  },
  deleteIconBtn: {
    background: 'none',
    border: 'none',
    color: '#c62828',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#ffebee',
    }
  },
  inlineEditForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
  },
  inlineInput: {
    flex: 1,
    padding: '4px 8px',
    border: '1px solid var(--uq-red)',
    borderRadius: '4px',
    fontSize: '13px',
    outline: 'none',
  },
  inlineSaveBtn: {
    backgroundColor: '#2e7d32',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  inlineCancelBtn: {
    backgroundColor: 'var(--text-light)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  subCatContainer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  subCatRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px 8px 28px',
    borderBottom: '1px solid #f0f0f0',
    gap: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  subCatName: {
    fontSize: '13px',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customCountBadge: {
    fontSize: '10px',
    color: 'var(--uq-red)',
    backgroundColor: 'rgba(231,31,25,0.06)',
    padding: '1px 6px',
    borderRadius: '10px',
    fontWeight: 'bold',
  },
  addSubForm: {
    display: 'flex',
    padding: '8px 12px 8px 28px',
    gap: '6px',
    backgroundColor: '#fafafa',
  },
  addSubInput: {
    flex: 1,
    padding: '6px 8px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '12px',
    outline: 'none',
  },
  addSubBtn: {
    backgroundColor: 'var(--text-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  addMainForm: {
    border: '1px dashed var(--border-color)',
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: '#fafafa',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  addMainTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  addMainInputs: {
    display: 'flex',
    gap: '6px',
  },
  addMainNameInput: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '12px',
    outline: 'none',
  },
  addMainSelect: {
    padding: '6px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontSize: '12px',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  addMainSubmitBtn: {
    backgroundColor: 'var(--uq-red)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  emptyAssoc: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light)',
    fontSize: '14px',
    padding: '60px 0',
  },
  builtInWarning: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#f1f8e9',
    borderRadius: '8px',
    border: '1px solid #dcedc8',
  },
  logicCard: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    textAlign: 'left',
    width: '100%',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
  },
  logicCardTitle: {
    fontWeight: '700',
    fontSize: '14px',
    color: 'var(--text-primary)',
    margin: '0 0 10px 0',
  },
  logicContent: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  associationEditor: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    overflow: 'hidden',
  },
  assocDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: 0,
  },
  assocToolbar: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: '200px',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    color: 'var(--text-light)',
  },
  searchInput: {
    width: '100%',
    padding: '8px 32px 8px 30px',
    fontSize: '13px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    outline: 'none',
  },
  searchClearBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--text-light)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  toolBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'var(--text-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  clearToolBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#c62828',
    border: '1px solid #c62828',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  selectedStatus: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  selectedCount: {
    color: 'var(--uq-red)',
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '0 4px',
  },
  checkboxGrid: {
    flex: 1,
    overflowY: 'auto',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '8px',
    alignContent: 'start',
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.2s',
  },
  checkboxLabel: {
    fontSize: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  noFilterResult: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px 0',
    color: 'var(--text-light)',
    fontSize: '13px',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  footerTip: {
    fontSize: '12px',
    color: 'var(--text-light)',
    fontStyle: 'italic',
  },
  saveAllBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: 'var(--uq-red)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(231,31,25,0.15)',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--uq-dark-red)',
      transform: 'translateY(-1px)',
    }
  }
};

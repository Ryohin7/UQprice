import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShieldCheck, HelpCircle, ArrowRight, ClipboardList, Clock } from 'lucide-react';

export default function AdminPanel({ currentVersion = '1.0.0', versions = [], onPublishVersion, onDeleteVersion }) {
  const [upgradeType, setUpgradeType] = useState('patch'); // 'major' | 'minor' | 'patch'
  const [nextVersion, setNextVersion] = useState('');
  const [descriptionList, setDescriptionList] = useState(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SemVer 版本升級計算邏輯
  useEffect(() => {
    if (!currentVersion) return;
    const parts = currentVersion.split('.').map(num => parseInt(num) || 0);
    if (parts.length !== 3) {
      setNextVersion('1.0.1');
      return;
    }

    const [major, minor, patch] = parts;
    let newMajor = major;
    let newMinor = minor;
    let newPatch = patch;

    if (upgradeType === 'major') {
      newMajor = major + 1;
      newMinor = 0;
      newPatch = 0;
    } else if (upgradeType === 'minor') {
      newMinor = minor + 1;
      newPatch = 0;
    } else if (upgradeType === 'patch') {
      newPatch = patch + 1;
    }

    setNextVersion(`${newMajor}.${newMinor}.${newPatch}`);
  }, [currentVersion, upgradeType]);

  // 新增一條更新描述
  const handleAddDescription = () => {
    setDescriptionList([...descriptionList, '']);
  };

  // 刪除一條更新描述
  const handleRemoveDescription = (index) => {
    if (descriptionList.length <= 1) return;
    const newList = descriptionList.filter((_, idx) => idx !== index);
    setDescriptionList(newList);
  };

  // 更新描述文字
  const handleDescChange = (index, value) => {
    const newList = [...descriptionList];
    newList[index] = value;
    setDescriptionList(newList);
  };

  // 提交發布
  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanDescriptions = descriptionList.filter(d => d.trim() !== '');
    if (cleanDescriptions.length === 0) {
      alert('請至少填寫一項更新說明！');
      return;
    }

    setIsSubmitting(true);
    try {
      await onPublishVersion({
        version: nextVersion,
        type: upgradeType,
        description: cleanDescriptions
      });
      // 成功後清空表單
      setDescriptionList(['']);
      setUpgradeType('patch');
      alert(`🎉 版本 v${nextVersion} 發布成功！`);
    } catch (err) {
      alert(`❌ 發布失敗: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 降序排序歷史版本顯示於右側
  const sortedVersions = [...versions].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={styles.container}>
      {/* 標題列 */}
      <div style={styles.header}>
        <ClipboardList size={28} style={{ color: 'var(--uq-red)' }} />
        <div style={{ marginLeft: 12 }}>
          <h2 style={styles.title}>系統後台管理</h2>
          <p style={styles.subtitle}>管理語意化版本與全站更新日誌發布</p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* 左側：發布新版本卡片 */}
        <form onSubmit={handleSubmit} style={styles.card}>
          <h3 style={styles.cardTitle}>發布新版本</h3>

          {/* 版本對照區 */}
          <div style={styles.versionDisplayRow}>
            <div style={styles.versionBlock}>
              <span style={styles.versionLabel}>當前最新版本</span>
              <span style={styles.versionNum}>v{currentVersion}</span>
            </div>
            <ArrowRight size={20} style={styles.arrowIcon} />
            <div style={{ ...styles.versionBlock, backgroundColor: 'rgba(231,31,25,0.02)' }}>
              <span style={{ ...styles.versionLabel, color: 'var(--uq-red)' }}>預計升級為</span>
              <span style={{ ...styles.versionNum, color: 'var(--uq-red)' }}>v{nextVersion}</span>
            </div>
          </div>

          {/* 升級類型單選 */}
          <div style={styles.formGroup}>
            <label style={styles.fieldLabel}>選擇升級類型</label>
            <div style={styles.radioGroup}>
              {/* 修復優化 */}
              <label 
                style={{
                  ...styles.radioLabel,
                  borderColor: upgradeType === 'patch' ? '#1565c0' : 'var(--border-color)',
                  backgroundColor: upgradeType === 'patch' ? 'rgba(21,101,192,0.04)' : 'transparent',
                }}
              >
                <input 
                  type="radio" 
                  name="upgradeType" 
                  value="patch"
                  checked={upgradeType === 'patch'}
                  onChange={() => setUpgradeType('patch')}
                  style={styles.radioInput}
                />
                <div>
                  <div style={{ ...styles.radioTitle, color: upgradeType === 'patch' ? '#1565c0' : 'var(--text-primary)' }}>修復優化</div>
                  <div style={styles.radioDesc}>Z 軸升級 (如 {currentVersion} ➡️ Z+1)</div>
                </div>
              </label>

              {/* 新增功能 */}
              <label 
                style={{
                  ...styles.radioLabel,
                  borderColor: upgradeType === 'minor' ? '#2e7d32' : 'var(--border-color)',
                  backgroundColor: upgradeType === 'minor' ? 'rgba(46,125,50,0.04)' : 'transparent',
                }}
              >
                <input 
                  type="radio" 
                  name="upgradeType" 
                  value="minor"
                  checked={upgradeType === 'minor'}
                  onChange={() => setUpgradeType('minor')}
                  style={styles.radioInput}
                />
                <div>
                  <div style={{ ...styles.radioTitle, color: upgradeType === 'minor' ? '#2e7d32' : 'var(--text-primary)' }}>新增功能</div>
                  <div style={styles.radioDesc}>Y 軸升級 (如 {currentVersion} ➡️ Y+1)</div>
                </div>
              </label>

              {/* 重大改版 */}
              <label 
                style={{
                  ...styles.radioLabel,
                  borderColor: upgradeType === 'major' ? 'var(--uq-red)' : 'var(--border-color)',
                  backgroundColor: upgradeType === 'major' ? 'rgba(231,31,25,0.04)' : 'transparent',
                }}
              >
                <input 
                  type="radio" 
                  name="upgradeType" 
                  value="major"
                  checked={upgradeType === 'major'}
                  onChange={() => setUpgradeType('major')}
                  style={styles.radioInput}
                />
                <div>
                  <div style={{ ...styles.radioTitle, color: upgradeType === 'major' ? 'var(--uq-red)' : 'var(--text-primary)' }}>重大改版</div>
                  <div style={styles.radioDesc}>X 軸升級 (如 {currentVersion} ➡️ X+1)</div>
                </div>
              </label>
            </div>
          </div>

          {/* 更新描述輸入區 */}
          <div style={styles.formGroup}>
            <div style={styles.fieldHeader}>
              <label style={styles.fieldLabel}>更新功能描述</label>
              <button 
                type="button" 
                onClick={handleAddDescription}
                style={styles.addBtn}
              >
                <Plus size={14} style={{ marginRight: 4 }} />
                增加一行
              </button>
            </div>

            <div style={styles.descInputList}>
              {descriptionList.map((desc, idx) => (
                <div key={idx} style={styles.descInputRow}>
                  <span style={styles.inputIndex}>{idx + 1}</span>
                  <input
                    type="text"
                    placeholder="請輸入更新說明點..."
                    value={desc}
                    onChange={(e) => handleDescChange(idx, e.target.value)}
                    style={styles.descTextInput}
                    required={idx === 0}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDescription(idx)}
                    disabled={descriptionList.length <= 1}
                    style={{
                      ...styles.removeBtn,
                      opacity: descriptionList.length <= 1 ? 0.3 : 1,
                      cursor: descriptionList.length <= 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 提交按鈕 */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{
              ...styles.submitBtn,
              backgroundColor: isSubmitting ? 'var(--text-secondary)' : 'var(--uq-red)'
            }}
          >
            {isSubmitting ? '正在同步發布中...' : '確認發布新版本'}
          </button>
        </form>

        {/* 右側：發布歷史清單 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>版本發布歷史 ({versions.length})</h3>
          <div style={styles.historyList}>
            {sortedVersions.length === 0 ? (
              <div style={styles.historyEmpty}>
                <Clock size={36} style={{ color: 'var(--text-secondary)', marginBottom: 12 }} />
                <span>尚無歷史版本發布紀錄</span>
              </div>
            ) : (
              sortedVersions.map(v => {
                const getLabelInfo = () => {
                  if (v.type === 'major') return { text: '重大改版', color: 'var(--uq-red)', bg: 'rgba(231,31,25,0.06)' };
                  if (v.type === 'minor') return { text: '新增功能', color: '#2e7d32', bg: 'rgba(46,125,50,0.06)' };
                  return { text: '修復優化', color: '#1565c0', bg: 'rgba(21,101,192,0.06)' };
                };
                const label = getLabelInfo();

                return (
                  <div key={v.version} style={styles.historyItem}>
                    <div style={styles.historyItemHeader}>
                      <span style={styles.historyVersion}>v{v.version}</span>
                      <span style={{ ...styles.historyType, color: label.color, backgroundColor: label.bg }}>{label.text}</span>
                      <span style={styles.historyDate}>{v.releaseDate}</span>
                      {onDeleteVersion && (
                        <button
                          onClick={() => {
                            if (window.confirm(`確定要刪除版本 v${v.version} 嗎？`)) {
                              onDeleteVersion(v.version);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--uq-red)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(231,31,25,0.06)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="刪除此版本"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <ul style={styles.historyDescList}>
                      {v.description.map((desc, i) => (
                        <li key={i} style={styles.historyDescItem}>{desc}</li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    animation: 'fadeIn 0.3s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '28px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'var(--bg-white)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    height: 'fit-content',
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    paddingBottom: '10px',
    borderBottom: '2px solid var(--uq-red)',
    width: 'fit-content',
  },
  versionDisplayRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg-light)',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  versionBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-white)',
    border: '1px dashed var(--border-color)',
  },
  versionLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    fontWeight: '500',
  },
  versionNum: {
    fontSize: '20px',
    fontWeight: '800',
    fontFamily: 'monospace',
    color: 'var(--text-primary)',
  },
  arrowIcon: {
    color: 'var(--text-secondary)',
    margin: '0 12px',
  },
  formGroup: {
    marginBottom: '24px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '10px',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  radioInput: {
    marginRight: '12px',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  radioTitle: {
    fontSize: '14px',
    fontWeight: '700',
  },
  radioDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  addBtn: {
    background: 'none',
    border: 'none',
    color: '#2e7d32',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(46,125,50,0.06)'
    }
  },
  descInputList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  descInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  inputIndex: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    width: '20px',
    textAlign: 'center',
  },
  descTextInput: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s',
    ':focus': {
      borderColor: 'var(--uq-red)',
    }
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s, background-color 0.2s',
    ':hover': {
      color: 'var(--uq-red)',
      backgroundColor: 'rgba(231,31,25,0.04)'
    }
  },
  submitBtn: {
    color: 'var(--bg-white)',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    ':hover': {
      opacity: 0.9,
    }
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '480px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  historyEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  historyItem: {
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-light)',
  },
  historyItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  historyVersion: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
  },
  historyType: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  historyDate: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginLeft: 'auto',
  },
  historyDescList: {
    margin: 0,
    paddingLeft: '16px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  historyDescItem: {
    lineHeight: '1.4',
  }
};

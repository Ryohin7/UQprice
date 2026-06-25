import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShieldCheck, HelpCircle, ArrowRight, ClipboardList, Clock } from 'lucide-react';

export default function AdminPanel({
  currentVersion = '1.0.0',
  versions = [],
  onPublishVersion,
  onDeleteVersion,
  crawlerReports = [],
  onTriggerCrawler
}) {
  const [upgradeType, setUpgradeType] = useState('patch'); // 'major' | 'minor' | 'patch'
  const [nextVersion, setNextVersion] = useState('');
  const [descriptionList, setDescriptionList] = useState(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('versions'); // 'versions' | 'reports'
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTriggerCrawler = async () => {
    if (!onTriggerCrawler) return;
    setIsTriggering(true);
    try {
      await onTriggerCrawler();
      alert("🚀 已成功向 Firestore 發送手動爬蟲更新請求！\n\n由於瀏覽器受 CORS 限制，請在本機終端機執行：\n👉 npm run crawl\n\n以模擬背景爬蟲處理，報表將在執行完成後自動、即時更新！");
    } catch (err) {
      alert("❌ 觸發爬蟲失敗: " + err.message);
    } finally {
      setIsTriggering(false);
    }
  };


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
          <h2 style={styles.title}>後台管理</h2>
        </div>
      </div>

      {/* 標頭下方分頁 Tabs */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('versions')}
          style={{
            ...styles.tabButton,
            backgroundColor: activeTab === 'versions' ? 'var(--uq-red)' : 'transparent',
            color: activeTab === 'versions' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'versions' ? '1px solid var(--uq-red)' : '1px solid transparent',
          }}
        >
          版本更新日誌
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            ...styles.tabButton,
            backgroundColor: activeTab === 'reports' ? 'var(--uq-red)' : 'transparent',
            color: activeTab === 'reports' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'reports' ? '1px solid var(--uq-red)' : '1px solid transparent',
          }}
        >
          資料更新報表
        </button>
      </div>

      {activeTab === 'versions' ? (
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
      ) : (
        <div style={styles.reportGrid}>
          {/* 頂部同步狀態概覽 */}
          <div style={styles.reportSummaryCard}>
            <div style={styles.reportSummaryInfo}>
              <span style={styles.reportSummaryTitle}>資料同步狀態概覽</span>
              <span style={styles.reportSummaryDesc}>
                {crawlerReports.length > 0
                  ? `最後一次更新時間：${new Date(crawlerReports[0].timestamp).toLocaleString()} (${crawlerReports[0].type === 'auto' ? '自動' : '手動'})`
                  : '目前尚無爬蟲更新紀錄'}
              </span>
            </div>
            {onTriggerCrawler && (
              <button
                onClick={handleTriggerCrawler}
                disabled={isTriggering}
                style={{
                  ...styles.triggerBtn,
                  opacity: isTriggering ? 0.6 : 1,
                  cursor: isTriggering ? 'not-allowed' : 'pointer'
                }}
              >
                <Clock size={16} style={{ marginRight: 6 }} />
                {isTriggering ? '發送請求中...' : '執行手動更新 (爬蟲)'}
              </button>
            )}
          </div>

          {/* 報表列表表格 */}
          <div style={styles.tableCard}>
            <h3 style={styles.cardTitle}>更新報表歷史紀錄 ({crawlerReports.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>更新時間</th>
                    <th style={styles.th}>更新方式</th>
                    <th style={styles.th}>期間限定特價</th>
                    <th style={styles.th}>新品上市數量</th>
                    <th style={styles.th}>特價商品數量</th>
                    <th style={styles.th}>資料變更細節</th>
                    <th style={styles.th}>執行耗時</th>
                    <th style={styles.th}>狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {crawlerReports.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ ...styles.td, textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <ClipboardList size={32} style={{ color: 'var(--text-secondary)', marginBottom: 8, display: 'block', margin: '0 auto' }} />
                        暫無爬蟲資料更新報表
                      </td>
                    </tr>
                  ) : (
                    crawlerReports.map((report) => {
                      const dateStr = new Date(report.timestamp).toLocaleString();
                      const isSuccess = report.status === 'success';

                      return (
                        <tr key={report.id || report.timestamp}>
                          <td style={styles.td}>{dateStr}</td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.typeBadge,
                                backgroundColor: report.type === 'auto' ? '#e3f2fd' : '#efebe9',
                                color: report.type === 'auto' ? '#0d47a1' : '#4e342e',
                              }}
                            >
                              {report.type === 'auto' ? '自動' : '手動'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <strong style={{ color: 'var(--uq-red)', fontSize: '14px' }}>
                              {report.campaignCount !== undefined ? report.campaignCount : '-'}
                            </strong>
                          </td>
                          <td style={styles.td}>
                            <strong style={{ color: '#2e7d32', fontSize: '14px' }}>
                              {report.newArrivalsCount !== undefined ? report.newArrivalsCount : '-'}
                            </strong>
                          </td>
                          <td style={styles.td}>
                            <strong style={{ color: '#1565c0', fontSize: '14px' }}>
                              {report.saleCount !== undefined ? report.saleCount : '-'}
                            </strong>
                          </td>
                          <td style={styles.td}>
                            {isSuccess ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                <span style={styles.statBadge}>新品: {report.created}</span>
                                <span style={styles.statBadge}>更新: {report.updated}</span>
                                <span style={styles.statBadge}>相同: {report.unchanged}</span>
                                <span style={styles.statBadge}>下架: {report.expired}</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>-</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {report.duration !== undefined ? `${report.duration} 秒` : '-'}
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                backgroundColor: isSuccess ? 'rgba(46,125,50,0.1)' : 'rgba(231,31,25,0.1)',
                                color: isSuccess ? '#2e7d32' : 'var(--uq-red)',
                              }}
                            >
                              {isSuccess ? '成功' : '失敗'}
                            </span>
                            {!isSuccess && report.error && (
                              <span style={styles.failedErrorText}>{report.error}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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
  },
  tabContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
  },
  tabButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '700',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  reportGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  reportSummaryCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--bg-light)',
    padding: '20px 24px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
  },
  reportSummaryInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  reportSummaryTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  reportSummaryDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  triggerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: 'var(--uq-red)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  tableCard: {
    backgroundColor: 'var(--bg-white)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    border: '1px solid var(--border-color)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    textAlign: 'left',
  },
  th: {
    padding: '12px',
    borderBottom: '2px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontWeight: '700',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid var(--border-color)',
    verticalAlign: 'middle',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
  },
  statBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    backgroundColor: 'var(--bg-light)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
  },
  failedErrorText: {
    color: 'var(--uq-red)',
    fontSize: '11px',
    marginTop: '4px',
    display: 'block',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    maxWidth: '250px',
  }
};

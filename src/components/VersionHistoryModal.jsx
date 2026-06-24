import React from 'react';
import { X, Calendar, Flame, Stars, ShieldAlert } from 'lucide-react';

export default function VersionHistoryModal({ versions, onClose }) {
  // 按時間降序排列
  const sortedVersions = [...versions].sort((a, b) => b.timestamp - a.timestamp);

  const getTypeLabel = (type) => {
    switch (type) {
      case 'major':
        return {
          text: '重大改版',
          color: 'var(--uq-red)',
          bgColor: 'rgba(231,31,25,0.08)',
          icon: <Flame size={12} style={{ marginRight: 4 }} />
        };
      case 'minor':
        return {
          text: '新增功能',
          color: '#2e7d32',
          bgColor: 'rgba(46,125,50,0.08)',
          icon: <Stars size={12} style={{ marginRight: 4 }} />
        };
      case 'patch':
      default:
        return {
          text: '修復優化',
          color: '#1565c0',
          bgColor: 'rgba(21,101,192,0.08)',
          icon: <ShieldAlert size={12} style={{ marginRight: 4 }} />
        };
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 標頭 */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>版本更新日誌</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* 內容時間軸 */}
        <div style={styles.content}>
          {sortedVersions.length === 0 ? (
            <div style={styles.empty}>暫無版本更新紀錄</div>
          ) : (
            <div style={styles.timeline}>
              {sortedVersions.map((v, idx) => {
                const badge = getTypeLabel(v.type);
                return (
                  <div key={v.version} style={styles.timelineItem}>
                    {/* 左側時間軸線與點 */}
                    <div style={styles.timelineLeft}>
                      <div
                        style={{
                          ...styles.timelineDot,
                          backgroundColor: badge.color,
                          boxShadow: `0 0 0 4px ${badge.bgColor}`
                        }}
                      />
                      {idx !== sortedVersions.length - 1 && <div style={styles.timelineLine} />}
                    </div>

                    {/* 右側內容卡片 */}
                    <div style={styles.timelineRight}>
                      <div style={styles.versionHeader}>
                        <span style={styles.versionNumber}>v{v.version}</span>
                        <span
                          style={{
                            ...styles.typeBadge,
                            color: badge.color,
                            backgroundColor: badge.bgColor
                          }}
                        >
                          {badge.icon}
                          {badge.text}
                        </span>
                        <span style={styles.date}>
                          <Calendar size={12} style={{ marginRight: 4, display: 'inline' }} />
                          {v.releaseDate}
                        </span>
                      </div>

                      <ul style={styles.descList}>
                        {v.description.map((desc, i) => (
                          <li key={i} style={styles.descItem}>
                            <span style={{ color: badge.color, marginRight: 8 }}>•</span>
                            {desc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'var(--bg-white)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    overflow: 'hidden',
    animation: 'modalSlideUp 0.3s ease-out',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--bg-white)',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  closeBtn: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '6px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s, color 0.2s',
    ':hover': {
      backgroundColor: 'var(--bg-light)',
      color: 'var(--text-primary)',
    }
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
    backgroundColor: 'var(--bg-white)',
  },
  empty: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    padding: '40px 0',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  timelineItem: {
    display: 'flex',
    position: 'relative',
  },
  timelineLeft: {
    width: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: '12px',
  },
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    zIndex: 2,
    marginTop: '6px',
  },
  timelineLine: {
    width: '2px',
    flex: 1,
    backgroundColor: 'var(--border-color)',
    marginTop: '6px',
    marginBottom: '-34px', // 延伸穿過間距
  },
  timelineRight: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  versionHeader: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  versionNumber: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
  },
  typeBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '20px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  date: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginLeft: 'auto',
  },
  descList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  descItem: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    display: 'flex',
    alignItems: 'flex-start',
  }
};

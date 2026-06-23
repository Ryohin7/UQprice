import React from 'react';

export default function SkeletonCard() {
  return (
    <div style={styles.card}>
      {/* 圖片區骨架 */}
      <div className="skeleton" style={styles.imageContainer}></div>
      
      {/* 文字區骨架 */}
      <div style={styles.infoContainer}>
        <div className="skeleton" style={styles.gender}></div>
        <div className="skeleton" style={styles.nameLine1}></div>
        <div className="skeleton" style={styles.nameLine2}></div>
        <div style={styles.priceContainer}>
          <div className="skeleton" style={styles.price}></div>
        </div>
        <div style={styles.colorContainer}>
          <div className="skeleton" style={styles.colorCircle}></div>
          <div className="skeleton" style={styles.colorCircle}></div>
          <div className="skeleton" style={styles.colorCircle}></div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)',
    height: '100%',
  },
  imageContainer: {
    width: '100%',
    paddingTop: '100%',
    position: 'relative',
  },
  infoContainer: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  gender: {
    width: '40px',
    height: '12px',
  },
  nameLine1: {
    width: '90%',
    height: '14px',
  },
  nameLine2: {
    width: '60%',
    height: '14px',
  },
  priceContainer: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  price: {
    width: '60px',
    height: '18px',
  },
  colorContainer: {
    display: 'flex',
    gap: '6px',
    marginTop: '6px',
    paddingTop: '8px',
    borderTop: '1px dashed var(--border-color)',
  },
  colorCircle: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
  }
};

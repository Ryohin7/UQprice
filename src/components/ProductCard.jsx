import React, { useState } from 'react';

// 價格千分位格式化函數
export function formatPrice(price) {
  if (price === undefined || price === null) return '';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const isHistoricalLowest = (product) => {
  if (!product.historyPrices || product.historyPrices.length === 0) return false;
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

export default function ProductCard({ product, onClick }) {
  // 如果有多個顏色，我們支援在卡片上預覽不同顏色
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || null);

  const isSale = product.originPrice && product.minPrice < product.originPrice;
  const discountAmount = isSale ? product.originPrice - product.minPrice : 0;

  // 使用選取的顏色大圖，若無則使用 mainPic
  const displayPic = selectedColor?.largePicUrl || product.mainPic;

  const promoLabels = [
    ...(product.salesPromotionLabel || []).map(l => l.labelText),
    ...(isHistoricalLowest(product) ? ['歷史最低價'] : [])
  ];

  return (
    <div style={styles.card} onClick={() => onClick(product)}>
      {/* 標籤群 */}
      <div style={styles.badgeContainer}>
        {isSale && (
          <span style={styles.saleBadge}>
            降 {formatPrice(discountAmount)}元
          </span>
        )}
        {promoLabels.map((label, idx) => (
          <span 
            key={idx} 
            style={{
              ...styles.promoBadge,
              backgroundColor: label === '歷史最低價' ? '#8b0000' : 'var(--uq-red)'
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* 商品圖片區 */}
      <div style={styles.imageContainer}>
        <img 
          src={displayPic} 
          alt={product.name} 
          style={styles.image} 
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://www.uniqlo.com/tw/favicon-uq.ico';
          }}
        />
      </div>

      {/* 商品資訊區 */}
      <div style={styles.infoContainer}>
        <span style={styles.gender}>{product.sex || '男女適穿'}</span>
        <h3 style={styles.name}>{product.shortName}</h3>
        
        {/* 價格區 */}
        <div style={styles.priceContainer}>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '2px' }}>售價</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--uq-red)' }}>{formatPrice(product.minPrice)}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '2px' }}>元</span>
          </span>
          {isSale && (
            <span style={styles.originPrice}>
              原價 {formatPrice(product.originPrice)}元
            </span>
          )}
        </div>

        {/* 顏色選擇晶片 */}
        {product.colors && product.colors.length > 0 && (
          <div style={styles.colorContainer} onClick={(e) => e.stopPropagation()}>
            {product.colors.slice(0, 6).map((c, idx) => {
              const isSelected = selectedColor && selectedColor.code === c.code;
              return (
                <button
                  key={idx}
                  title={c.name}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    ...styles.colorCircle,
                    backgroundImage: c.chipUrl ? `url(${c.chipUrl})` : 'none',
                    backgroundColor: '#eeeeee',
                    border: isSelected ? '2px solid #e71f19' : '1px solid #dddddd',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                  }}
                />
              );
            })}
            {product.colors.length > 6 && (
              <span style={styles.moreColors}>+{product.colors.length - 6}</span>
            )}
          </div>
        )}
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
    cursor: 'pointer',
    position: 'relative',
    transition: 'var(--transition-smooth)',
    boxShadow: 'var(--shadow-sm)',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    zIndex: 10,
  },
  saleBadge: {
    backgroundColor: 'var(--uq-red)',
    color: '#ffffff',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 'bold',
    borderRadius: '2px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    alignSelf: 'flex-start',
  },
  promoBadge: {
    backgroundColor: 'var(--uq-red)',
    color: '#ffffff',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 'bold',
    borderRadius: '2px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    alignSelf: 'flex-start',
  },
  imageContainer: {
    width: '100%',
    paddingTop: '100%', // 1:1 Aspect Ratio
    position: 'relative',
    backgroundColor: 'var(--bg-light)',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  infoContainer: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'space-between',
  },
  gender: {
    fontSize: '11px',
    color: 'var(--text-light)',
    marginBottom: '4px',
    fontWeight: '500',
  },
  name: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '8px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    height: '38px',
    lineHeight: '19px',
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginBottom: '10px',
  },
  currentPrice: {
    fontSize: '16px',
  },
  originPrice: {
    fontSize: '12px',
    textDecoration: 'line-through',
    color: 'var(--text-light)',
  },
  colorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
    paddingTop: '6px',
    borderTop: '1px dashed var(--border-color)',
  },
  colorCircle: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    cursor: 'pointer',
    outline: 'none',
    transition: 'var(--transition-fast)',
  },
  moreColors: {
    fontSize: '10px',
    color: 'var(--text-light)',
    marginLeft: '2px',
  }
};

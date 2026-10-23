import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatPrice } from './ProductCard';

export default function PriceChart({ historyData }) {
  if (!historyData || historyData.length === 0) {
    return <div style={styles.empty}>無歷史價格資料</div>;
  }

  const prices = historyData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currentPrice = historyData[historyData.length - 1].price;
  // 僅有 1 筆或價格全部相同時，史低線沒有比較意義
  const showLowest = historyData.length > 1 && minPrice !== maxPrice;
  const diffFromLowest = currentPrice - minPrice;

  const formattedData = historyData.map((d) => {
    const parts = d.date.split('-');
    return { ...d, formattedDate: `${parts[1]}/${parts[2]}` };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={styles.tooltip}>
          <p style={styles.tooltipDate}>{payload[0].payload.date}</p>
          <p style={styles.tooltipPrice}>NT$ {formatPrice(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  let verdict = null;
  if (showLowest) {
    verdict = diffFromLowest === 0
      ? { text: '目前為歷史最低價', color: 'var(--uq-red)' }
      : { text: `比史低高 ${formatPrice(diffFromLowest)} 元`, color: 'var(--text-secondary)' };
  }

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>歷史價格</h4>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>目前</span>
          <span style={styles.statValue}>{formatPrice(currentPrice)}</span>
        </div>
        {showLowest && (
          <div style={styles.stat}>
            <span style={styles.statLabel}>歷史最低</span>
            <span style={{ ...styles.statValue, color: 'var(--uq-red)' }}>{formatPrice(minPrice)}</span>
          </div>
        )}
        {showLowest && (
          <div style={styles.stat}>
            <span style={styles.statLabel}>歷史最高</span>
            <span style={styles.statValue}>{formatPrice(maxPrice)}</span>
          </div>
        )}
      </div>
      {verdict && <p style={{ ...styles.verdict, color: verdict.color }}>{verdict.text}</p>}

      <div style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={formattedData} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
            <XAxis
              dataKey="formattedDate"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              minTickGap={24}
            />
            <YAxis
              domain={[Math.max(0, minPrice - 60), maxPrice + 60]}
              ticks={[...new Set([minPrice, maxPrice])]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} />

            {showLowest && (
              <ReferenceLine y={minPrice} stroke="var(--uq-red)" strokeDasharray="4 4" strokeOpacity={0.6} />
            )}

            {/* 價格是階梯式變動，用 stepAfter 如實呈現，不做平滑曲線 */}
            <Line
              type="stepAfter"
              dataKey="price"
              stroke="var(--text-primary)"
              strokeWidth={2.5}
              dot={formattedData.length > 12 ? false : { r: 3.5, stroke: 'var(--text-primary)', strokeWidth: 2, fill: 'var(--bg-white)' }}
              activeDot={{ r: 6, stroke: 'var(--uq-red)', strokeWidth: 2, fill: 'var(--bg-white)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p style={styles.footnote}>
        紀錄自 {historyData[0].date} 起，共 {historyData.length} 筆{showLowest && '；虛線為歷史最低價'}
      </p>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'var(--bg-light)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    width: '100%',
  },
  title: {
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '12px',
  },
  stats: {
    display: 'flex',
    gap: '28px',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.01em',
    color: 'var(--text-primary)',
  },
  verdict: {
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '8px',
  },
  chartWrapper: {
    width: '100%',
    position: 'relative',
    marginTop: '12px',
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  tooltip: {
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    padding: '8px 12px',
    boxShadow: 'var(--shadow-md)',
    borderRadius: '10px',
  },
  tooltipDate: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '2px',
  },
  tooltipPrice: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  footnote: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '8px',
  },
};

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

  // 找出歷史最低價格
  const minPrice = Math.min(...historyData.map((d) => d.price));
  // 找出最高價格
  const maxPrice = Math.max(...historyData.map((d) => d.price));

  // 格式化日期，只顯示月/日
  const formattedData = historyData.map(d => {
    const parts = d.date.split('-');
    return {
      ...d,
      formattedDate: `${parts[1]}/${parts[2]}`,
      displayPrice: d.price
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={styles.tooltip}>
          <p style={styles.tooltipDate}>{payload[0].payload.date}</p>
          <p style={styles.tooltipPrice}>
            價格: <span style={{ color: 'var(--uq-red)', fontWeight: 'bold' }}>{formatPrice(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>歷史價格趨勢</h4>
      <div style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={formattedData}
            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeeee" />
            <XAxis 
              dataKey="formattedDate" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-light)', fontSize: 11 }}
            />
            <YAxis 
              domain={[Math.max(0, minPrice - 200), maxPrice + 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-light)', fontSize: 11 }}
              tickFormatter={(v) => v}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* 歷史最低價參考線 */}
            <ReferenceLine 
              y={minPrice} 
              stroke="var(--uq-red)" 
              strokeDasharray="4 4"
              label={{ 
                value: `歷史史低: ${formatPrice(minPrice)}`, 
                fill: 'var(--uq-red)', 
                position: 'top',
                fontSize: 10,
                fontWeight: 'bold',
                backgroundColor: 'rgba(255,255,255,0.8)'
              }} 
            />

            <Line
              type="monotone"
              dataKey="price"
              stroke="#222222"
              strokeWidth={3}
              dot={{ r: 4, stroke: '#222222', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 6, stroke: 'var(--uq-red)', strokeWidth: 2, fill: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={styles.legendContainer}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendColor, backgroundColor: '#222222' }}></span>
          商品價格折線
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendColor, border: '1px dashed var(--uq-red)' }}></span>
          歷史低價參考線
        </span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'var(--bg-white)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    width: '100%',
  },
  title: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '16px',
    borderLeft: '3px solid var(--uq-red)',
    paddingLeft: '10px',
    lineHeight: 1.2,
  },
  chartWrapper: {
    width: '100%',
    position: 'relative',
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-light)',
    fontSize: '14px',
  },
  tooltip: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    padding: '8px 12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    borderRadius: '2px',
  },
  tooltipDate: {
    fontSize: '11px',
    color: 'var(--text-light)',
    marginBottom: '4px',
  },
  tooltipPrice: {
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  legendContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '12px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    gap: '6px',
  },
  legendColor: {
    display: 'inline-block',
    width: '18px',
    height: '3px',
  }
};

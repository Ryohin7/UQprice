import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initGA } from './utils/analytics'

// 初始化 GA 流量追蹤
initGA();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 阻止 iOS Safari 雙指與手勢縮放 (iOS 10+ 忽略 viewport user-scalable 的解法)
if (typeof document !== 'undefined') {
  document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
  });
}


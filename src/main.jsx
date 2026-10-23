import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initGA } from './utils/analytics'
import { registerSW } from './pwa'

// 初始化 GA 流量追蹤
initGA();

// 註冊 Service Worker (離線與新版本提示)
registerSW();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

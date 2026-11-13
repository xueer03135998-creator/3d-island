import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/global.css';

// 未处理的 Promise 异常统一转成 error 事件，便于沙箱侧采集
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const reason: unknown = event.reason;
  window.dispatchEvent(
    new ErrorEvent('error', {
      error: reason,
      message: reason instanceof Error ? reason.message : String(reason),
      filename: location.href,
    })
  );
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);






























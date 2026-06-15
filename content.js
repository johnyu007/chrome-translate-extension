/**
 * Content Script — 文本捕获
 * 监听页面复制事件，捕获选中文本并推送到扩展
 */

(function () {
  'use strict';

  const DEBUG = true; // 排查问题时开启，正式发布可关闭

  function log(...args) {
    if (DEBUG) console.log('[AI翻译助手]', ...args);
  }

  log('content script loaded on', window.location.href);

  // ── 监听 copy 事件 ──────────────────────────────────
  document.addEventListener('copy', () => {
    try {
      const selection = window.getSelection();
      const text = selection?.toString()?.trim();

      if (!text || text.length < 2) return;
      if (text.length > 50000) {
        log('text too long, skipping:', text.length);
        return;
      }

      log('copy detected, text length:', text.length);

      chrome.runtime.sendMessage({
        type: 'TEXT_CAPTURED',
        text,
        url: window.location.href,
        title: document.title,
      }).then((response) => {
        log('background responded:', response);
      }).catch((err) => {
        // 扩展未加载或 Service Worker 未就绪时可能失败
        console.warn('[AI翻译助手] sendMessage failed:', err.message);
        console.warn('[AI翻译助手] 请确认扩展已加载，并刷新本页面后重试');
      });
    } catch (err) {
      console.error('[AI翻译助手] unexpected error in copy listener:', err);
    }
  });

  // ── 监听来自扩展的消息 ────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_SELECTION') {
      const text = window.getSelection()?.toString()?.trim();
      sendResponse({ text: text || '' });
      return true;
    }
    if (msg.type === 'PING') {
      sendResponse({ ok: true });
      return true;
    }
  });
})();

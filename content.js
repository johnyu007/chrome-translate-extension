/**
 * Content Script — 文本捕获
 * 监听页面复制事件，捕获选中文本并推送到扩展
 */

(function () {
  'use strict';

  // ── 监听 copy 事件 ──────────────────────────────────
  document.addEventListener('copy', () => {
    try {
      const selection = window.getSelection();
      const text = selection?.toString()?.trim();

      if (text && text.length > 1 && text.length < 50000) {
        chrome.runtime.sendMessage({
          type: 'TEXT_CAPTURED',
          text,
          url: window.location.href,
          title: document.title,
        }).catch(() => {
          // 侧边栏未打开时忽略发送失败
        });
      }
    } catch {
      // 静默处理异常
    }
  });

  // ── 监听来自扩展的消息 ────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_SELECTION') {
      const text = window.getSelection()?.toString()?.trim();
      sendResponse({ text: text || '' });
      return true;
    }
  });
})();

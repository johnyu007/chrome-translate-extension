/**
 * Background Service Worker
 * 职责：消息路由、右键菜单、设置读写、API 代理
 */

import { Translator, getLanguageName } from './lib/translator.js';
import { openaiProvider } from './lib/providers/openai.js';

// ── 状态 ────────────────────────────────────────────
let sidePanelPort = null;

// ── 初始化 ──────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: '翻译选中文本',
    contexts: ['selection'],
  });
});

// ── 右键菜单点击 ────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translate-selection' && info.selectionText) {
    await saveCapturedText(info.selectionText.trim());
    await chrome.sidePanel.open({ tabId: tab.id });
    notifySidePanel({ type: 'TEXT_CAPTURED', text: info.selectionText.trim() });
  }
});

// ── 监听扩展图标点击 ────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// ── Side Panel 长连接 ──────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    sidePanelPort = port;

    // 连接建立后，发送之前缓存的文本
    loadCapturedText().then(text => {
      if (text) {
        port.postMessage({ type: 'TEXT_CAPTURED', text });
      }
    });

    port.onMessage.addListener(async (msg) => {
      switch (msg.type) {
        case 'TRANSLATE':
          await handleTranslate(port, msg);
          break;

        case 'GET_SETTINGS':
          await handleGetSettings(port);
          break;

        case 'SAVE_SETTINGS':
          await handleSaveSettings(port, msg.settings);
          break;

        case 'CLEAR_CAPTURED':
          await clearCapturedText();
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      sidePanelPort = null;
    });
  }
});

// ── Content Script 消息 ─────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TEXT_CAPTURED' && msg.text) {
    const text = msg.text.trim();
    // 持久化存储，防止 Service Worker 休眠丢失
    saveCapturedText(text).then(() => {
      notifySidePanel({ type: 'TEXT_CAPTURED', text });
    });
    sendResponse({ success: true });
  }
  return true;
});

// ── 翻译处理 ────────────────────────────────────────
async function handleTranslate(port, msg) {
  const { text, targetLang, sourceLang } = msg;

  try {
    const settings = await loadSettings();
    const translator = new Translator(openaiProvider);

    port.postMessage({ type: 'TRANSLATION_STARTED' });

    const result = await translator.translate(text, targetLang, sourceLang, {
      apiKey: settings.apiKey,
      apiEndpoint: settings.apiEndpoint || 'https://api.openai.com/v1/chat/completions',
      model: settings.model || 'gpt-4o',
      systemPrompt: settings.systemPrompt,
    });

    port.postMessage({
      type: 'TRANSLATION_COMPLETED',
      translation: result.translation,
      sourceLang: result.sourceLang,
    });
  } catch (error) {
    port.postMessage({
      type: 'TRANSLATION_ERROR',
      error: error.message || '翻译失败',
    });
  }
}

// ── 设置读写 ────────────────────────────────────────
async function handleGetSettings(port) {
  const settings = await loadSettings();
  // 不返回 API Key——仅保存时可写入，读取时脱敏
  const safe = { ...settings, apiKey: settings.apiKey ? '••••••••' : '' };
  port.postMessage({ type: 'SETTINGS_LOADED', settings: safe });
}

async function handleSaveSettings(port, newSettings) {
  // 如果 API Key 是脱敏占位符，保留旧值
  if (newSettings.apiKey === '••••••••') {
    const old = await loadSettings();
    newSettings.apiKey = old.apiKey;
  }
  await chrome.storage.local.set({ settings: newSettings });
  port.postMessage({ type: 'SETTINGS_SAVED', success: true });
}

async function loadSettings() {
  const data = await chrome.storage.local.get('settings');
  return data.settings || getDefaultSettings();
}

function getDefaultSettings() {
  return {
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    targetLanguage: 'zh-CN',
    autoTranslate: true,
    systemPrompt: '',
  };
}

// ── 捕获文本的持久化 ────────────────────────────────
async function saveCapturedText(text) {
  await chrome.storage.local.set({ capturedText: text, capturedTime: Date.now() });
}

async function loadCapturedText() {
  const data = await chrome.storage.local.get(['capturedText', 'capturedTime']);
  // 超过 10 分钟的缓存视为过期
  if (data.capturedText && Date.now() - (data.capturedTime || 0) < 10 * 60 * 1000) {
    return data.capturedText;
  }
  return null;
}

async function clearCapturedText() {
  await chrome.storage.local.remove(['capturedText', 'capturedTime']);
}

// ── 辅助 ────────────────────────────────────────────
function notifySidePanel(msg) {
  if (sidePanelPort) {
    try {
      sidePanelPort.postMessage(msg);
    } catch {
      sidePanelPort = null;
    }
  }
}

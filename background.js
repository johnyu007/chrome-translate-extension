/**
 * Background Service Worker
 * 职责：消息路由、右键菜单、设置读写、API 代理
 */

import { Translator, getLanguageName } from './lib/translator.js';
import { openaiProvider } from './lib/providers/openai.js';

// ── 状态 ────────────────────────────────────────────
let latestCapturedText = null;
let sidePanelPort = null;

// ── 初始化 ──────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  // 注册右键菜单
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: '翻译选中文本',
    contexts: ['selection'],
  });
});

// ── 右键菜单点击 ────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translate-selection' && info.selectionText) {
    latestCapturedText = info.selectionText.trim();
    // 打开侧边栏
    await chrome.sidePanel.open({ tabId: tab.id });
    // 通知侧边栏
    notifySidePanel({ type: 'TEXT_CAPTURED', text: latestCapturedText });
  }
});

// ── 监听扩展图标点击（打开侧边栏） ──────────────────
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// ── Side Panel 长连接 ──────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    sidePanelPort = port;

    // 如果有待翻译的文本，发送给侧边栏
    if (latestCapturedText) {
      port.postMessage({ type: 'TEXT_CAPTURED', text: latestCapturedText });
    }

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
          latestCapturedText = null;
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
    latestCapturedText = msg.text.trim();
    notifySidePanel({ type: 'TEXT_CAPTURED', text: latestCapturedText });
    sendResponse({ success: true });
  }
  return true; // 保持消息通道开放
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
  // 不暴露 API Key 明文给侧边栏获取（仅在保存时写入）
  port.postMessage({ type: 'SETTINGS_LOADED', settings });
}

async function handleSaveSettings(port, newSettings) {
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

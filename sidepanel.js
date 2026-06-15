/**
 * Side Panel — 翻译 UI 逻辑
 * 与 background.js 通过 Port 长连接通信
 */

// ── DOM 引用 ────────────────────────────────────────
const sourceTextEl = document.getElementById('sourceText');
const sourceLangEl = document.getElementById('sourceLang');
const targetLangEl = document.getElementById('targetLang');
const translateBtn = document.getElementById('translateBtn');
const swapLangBtn = document.getElementById('swapLangBtn');
const clearBtn = document.getElementById('clearBtn');
const copyResultBtn = document.getElementById('copyResultBtn');
const retranslateBtn = document.getElementById('retranslateBtn');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const resultStatus = document.getElementById('resultStatus');
const loadingSection = document.getElementById('loadingSection');
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const dismissError = document.getElementById('dismissError');
const charCount = document.getElementById('charCount');
const settingsBtn = document.getElementById('settingsBtn');

// ── 状态 ────────────────────────────────────────────
let isTranslating = false;
let settings = null;
let port = null;

// ── 设置加载（从 storage 直读，避免后台往返的时序问题）──
async function loadSettingsFromStorage() {
  const data = await chrome.storage.local.get('settings');
  settings = data.settings || {};
  applySettings();
  return settings;
}

// ── 初始化连接 ──────────────────────────────────────
async function connectToBackground() {
  // 先加载设置，再建立连接（确保收到 TEXT_CAPTURED 时 settings 已就绪）
  await loadSettingsFromStorage();

  // 监外设置变更
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      settings = changes.settings.newValue || {};
      applySettings();
    }
  });

  port = chrome.runtime.connect({ name: 'sidepanel' });

  port.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'TEXT_CAPTURED':
        handleCapturedText(msg.text);
        break;
      case 'TRANSLATION_STARTED':
        showLoading();
        break;
      case 'TRANSLATION_COMPLETED':
        showResult(msg.translation, msg.sourceLang);
        break;
      case 'TRANSLATION_ERROR':
        showError(msg.error);
        break;
      case 'SETTINGS_SAVED':
        hideError();
        break;
    }
  });

  port.onDisconnect.addListener(() => {
    port = null;
    setTimeout(connectToBackground, 1000);
  });
}

// ── 处理捕获的文本 ──────────────────────────────────
function handleCapturedText(text) {
  if (!text) return;

  // 填充到输入框
  sourceTextEl.value = text;
  updateCharCount();

  // 如果设置了自动翻译且 API Key 已配置且非翻译中状态
  if (settings?.autoTranslate && settings?.apiKey && !isTranslating) {
    triggerTranslation();
  } else if (!settings?.apiKey) {
    // API Key 未配置时只显示原文
    showError('请先在设置中配置 API Key');
  }
}

// ── 触发翻译 ────────────────────────────────────────
function triggerTranslation() {
  const text = sourceTextEl.value.trim();
  if (!text) {
    showError('请输入或复制需要翻译的文本');
    return;
  }

  if (isTranslating) return;

  const sourceLang = sourceLangEl.value;
  const targetLang = targetLangEl.value;

  if (!targetLang) {
    showError('请选择目标语言');
    return;
  }

  hideError();
  isTranslating = true;
  translateBtn.disabled = true;

  port.postMessage({
    type: 'TRANSLATE',
    text,
    sourceLang: sourceLang || undefined,
    targetLang,
  });
}

// ── 显示翻译结果 ────────────────────────────────────
function showResult(translation, detectedLang) {
  isTranslating = false;
  translateBtn.disabled = false;
  loadingSection.style.display = 'none';
  resultSection.style.display = 'block';

  resultContent.textContent = translation;

  // 显示检测到的语言
  if (detectedLang) {
    const langNames = {
      'zh-CN': '简体中文', 'zh-TW': '繁体中文', 'en': '英语',
      'ja': '日语', 'ko': '韩语', 'fr': '法语', 'de': '德语',
      'es': '西班牙语', 'pt': '葡萄牙语', 'ru': '俄语',
      'ar': '阿拉伯语', 'hi': '印地语', 'th': '泰语',
      'vi': '越南语', 'it': '意大利语', 'nl': '荷兰语',
      'pl': '波兰语', 'tr': '土耳其语', 'id': '印尼语', 'ms': '马来语',
    };
    resultStatus.textContent = `已翻译 · 源语言: ${langNames[detectedLang] || detectedLang}`;
    resultStatus.className = 'result-status success';
  } else {
    resultStatus.textContent = '翻译完成';
    resultStatus.className = 'result-status success';
  }
}

// ── 状态展示 ────────────────────────────────────────
function showLoading() {
  resultSection.style.display = 'none';
  errorBanner.style.display = 'none';
  loadingSection.style.display = 'flex';
}

function showError(msg) {
  isTranslating = false;
  translateBtn.disabled = false;
  loadingSection.style.display = 'none';
  errorBanner.style.display = 'flex';
  errorMessage.textContent = msg;
}

function hideError() {
  errorBanner.style.display = 'none';
}

// ── 字符计数 ────────────────────────────────────────
function updateCharCount() {
  const len = sourceTextEl.value.length;
  charCount.textContent = `${len} / 5000`;
  charCount.style.color = len > 5000 ? 'var(--color-error)' : 'var(--color-text-tertiary)';
}

// ── 设置应用 ────────────────────────────────────────
function applySettings() {
  if (settings?.targetLanguage) {
    targetLangEl.value = settings.targetLanguage;
  }
}

// ── 事件监听 ────────────────────────────────────────

// 翻译按钮
translateBtn.addEventListener('click', triggerTranslation);

// 输入框变化
sourceTextEl.addEventListener('input', updateCharCount);

// 交换语言
swapLangBtn.addEventListener('click', () => {
  const sourceVal = sourceLangEl.value;
  const targetVal = targetLangEl.value;
  if (sourceVal) {
    sourceLangEl.value = targetVal;
    targetLangEl.value = sourceVal;
    // 如果原文已存在，提示用户可重新翻译
    if (sourceTextEl.value.trim()) {
      triggerTranslation();
    }
  }
});

// 清除按钮
clearBtn.addEventListener('click', () => {
  sourceTextEl.value = '';
  updateCharCount();
  resultSection.style.display = 'none';
  hideError();
  port.postMessage({ type: 'CLEAR_CAPTURED' });
});

// 复制译文
copyResultBtn.addEventListener('click', async () => {
  const text = resultContent.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showCopyFeedback();
  } catch {
    // 降级方案
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyFeedback();
  }
});

// 重新翻译
retranslateBtn.addEventListener('click', triggerTranslation);

// 关闭错误
dismissError.addEventListener('click', hideError);

// 设置按钮
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Ctrl+Enter 快捷键触发翻译
sourceTextEl.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    triggerTranslation();
  }
});

// ── 复制反馈动画 ────────────────────────────────────
function showCopyFeedback() {
  const el = document.createElement('div');
  el.className = 'copy-feedback';
  el.textContent = '已复制 ✓';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2100);
}

// ── 启动 ────────────────────────────────────────────
connectToBackground();

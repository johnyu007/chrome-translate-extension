/**
 * 设置页面逻辑
 * 通过 chrome.runtime 与 background.js 通信读写设置
 */

// ── DOM 引用 ────────────────────────────────────────
const apiEndpointEl = document.getElementById('apiEndpoint');
const apiKeyEl = document.getElementById('apiKey');
const modelEl = document.getElementById('model');
const targetLanguageEl = document.getElementById('targetLanguage');
const autoTranslateEl = document.getElementById('autoTranslate');
const systemPromptEl = document.getElementById('systemPrompt');
const toggleKeyBtn = document.getElementById('toggleKeyBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

// ── 默认设置 ────────────────────────────────────────
const DEFAULT_SETTINGS = {
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o',
  targetLanguage: 'zh-CN',
  autoTranslate: true,
  systemPrompt: '',
};

// ── 加载设置 ────────────────────────────────────────
async function loadSettings() {
  const data = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

async function populateForm() {
  const settings = await loadSettings();
  apiEndpointEl.value = settings.apiEndpoint || '';
  apiKeyEl.value = settings.apiKey || '';
  modelEl.value = settings.model || '';
  targetLanguageEl.value = settings.targetLanguage || 'zh-CN';
  autoTranslateEl.checked = settings.autoTranslate !== false;
  systemPromptEl.value = settings.systemPrompt || '';
}

// ── 保存设置 ────────────────────────────────────────
async function saveSettings() {
  const settings = {
    apiKey: apiKeyEl.value.trim(),
    apiEndpoint: apiEndpointEl.value.trim(),
    model: modelEl.value.trim(),
    targetLanguage: targetLanguageEl.value,
    autoTranslate: autoTranslateEl.checked,
    systemPrompt: systemPromptEl.value.trim(),
  };

  // 基本验证
  if (!settings.apiEndpoint) {
    showToast('请输入 API 端点 URL', 'error');
    return;
  }

  await chrome.storage.local.set({ settings });
  showToast('✅ 设置已保存');
}

// ── 恢复默认 ────────────────────────────────────────
async function resetSettings() {
  if (!confirm('确定要恢复默认设置吗？这将清除 API Key 等所有配置。')) return;
  await chrome.storage.local.remove('settings');
  await populateForm();
  showToast('已恢复默认设置');
}

// ── 显示/隐藏 API Key ──────────────────────────────
function toggleKeyVisibility() {
  const isPassword = apiKeyEl.type === 'password';
  apiKeyEl.type = isPassword ? 'text' : 'password';
  toggleKeyBtn.textContent = isPassword ? '隐藏' : '显示';
  toggleKeyBtn.classList.toggle('show', isPassword);
}

// ── Toast 提示 ──────────────────────────────────────
function showToast(message) {
  const existing = document.querySelector('.save-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'save-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// ── 事件绑定 ────────────────────────────────────────
saveBtn.addEventListener('click', saveSettings);
resetBtn.addEventListener('click', resetSettings);
toggleKeyBtn.addEventListener('click', toggleKeyVisibility);

// 快捷键 Ctrl+S 保存
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSettings();
  }
});

// ── 启动 ────────────────────────────────────────────
populateForm();

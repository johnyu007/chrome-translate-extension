/**
 * 翻译引擎抽象层
 * 提供统一的翻译接口，支持不同 AI 模型提供商
 */

export class Translator {
  /**
   * @param {object} provider - 翻译提供商实例
   * @param {string} provider.name - 提供商名称
   * @param {function} provider.translate - 翻译方法
   */
  constructor(provider) {
    this.provider = provider;
  }

  /**
   * 执行翻译
   * @param {string} text - 待翻译文本
   * @param {string} targetLang - 目标语言代码
   * @param {string} [sourceLang] - 源语言代码，不传则自动检测
   * @param {object} [options] - 额外选项
   * @returns {Promise<{translation: string, sourceLang?: string}>}
   */
  async translate(text, targetLang, sourceLang, options = {}) {
    if (!text || !text.trim()) {
      throw new Error('翻译文本不能为空');
    }
    return this.provider.translate(text, targetLang, sourceLang, options);
  }

  /** 获取当前提供商名称 */
  get providerName() {
    return this.provider.name;
  }
}

/**
 * 语言代码映射 — 用于 System Prompt 中的人类可读语言名
 */
export const LANGUAGE_NAMES = {
  'zh-CN': '简体中文',
  'zh-TW': '繁体中文',
  'en': '英语',
  'ja': '日语',
  'ko': '韩语',
  'fr': '法语',
  'de': '德语',
  'es': '西班牙语',
  'pt': '葡萄牙语',
  'ru': '俄语',
  'ar': '阿拉伯语',
  'hi': '印地语',
  'th': '泰语',
  'vi': '越南语',
  'it': '意大利语',
  'nl': '荷兰语',
  'pl': '波兰语',
  'tr': '土耳其语',
  'id': '印尼语',
  'ms': '马来语',
};

/**
 * 获取语言的人类可读名称
 */
export function getLanguageName(code) {
  return LANGUAGE_NAMES[code] || code;
}

/**
 * OpenAI 兼容翻译提供商
 * 支持 OpenAI 官方 API、DeepSeek、Ollama、Groq 等兼容接口
 */

export const openaiProvider = {
  name: 'OpenAI',

  /**
   * 执行翻译
   * @param {string} text - 待翻译文本
   * @param {string} targetLang - 目标语言代码
   * @param {string} [sourceLang] - 源语言（不传则自动检测）
   * @param {object} options - 配置选项
   * @param {string} options.apiKey - API Key
   * @param {string} options.apiEndpoint - API 端点
   * @param {string} options.model - 模型名称
   * @param {string} [options.systemPrompt] - 自定义 System Prompt
   * @returns {Promise<{translation: string, sourceLang?: string}>}
   */
  async translate(text, targetLang, sourceLang, options) {
    const {
      apiKey,
      apiEndpoint,
      model,
      systemPrompt,
    } = options;

    if (!apiKey) throw new Error('请先配置 API Key');
    if (!apiEndpoint) throw new Error('请先配置 API 端点');
    if (!model) throw new Error('请先配置模型名称');

    const targetName = getLanguageNameFromCode(targetLang);
    const sourceHint = sourceLang
      ? `，源语言为${getLanguageNameFromCode(sourceLang)}`
      : '，请自动检测源语言';

    const prompt = systemPrompt || buildDefaultPrompt(targetName, sourceHint);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: Math.max(text.length * 3, 1024),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.error?.message || `API 请求失败 (${response.status})`;
      throw new Error(message);
    }

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content?.trim();

    if (!translation) {
      throw new Error('翻译返回为空，请检查 API 配置');
    }

    return { translation };
  },
};

/**
 * 构建默认翻译 System Prompt
 */
function buildDefaultPrompt(targetName, sourceHint) {
  return `你是一个专业翻译引擎。将用户输入的文本翻译为${targetName}${sourceHint}。

翻译要求：
1. 严格保持原文的格式、换行和段落结构
2. 专业术语、技术名词翻译准确，无法翻译的专有名词保留原文
3. 语气和风格与原文一致
4. 只返回译文，不要添加任何解释、注释或额外内容
5. 如果原文已经是${targetName}，直接返回原文`;
}

/**
 * 从语言代码映射到中文名（用于 prompt）
 */
function getLanguageNameFromCode(code) {
  const map = {
    'zh-CN': '简体中文', 'zh-TW': '繁体中文', 'en': '英语',
    'ja': '日语', 'ko': '韩语', 'fr': '法语', 'de': '德语',
    'es': '西班牙语', 'pt': '葡萄牙语', 'ru': '俄语',
    'ar': '阿拉伯语', 'hi': '印地语', 'th': '泰语',
    'vi': '越南语', 'it': '意大利语', 'nl': '荷兰语',
    'pl': '波兰语', 'tr': '土耳其语', 'id': '印尼语', 'ms': '马来语',
  };
  return map[code] || code;
}

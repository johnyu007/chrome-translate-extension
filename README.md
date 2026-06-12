# AI 翻译助手

<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="AI 翻译助手">
</p>

<p align="center">
  <strong>基于 AI 大模型的 Chrome 浏览器实时翻译扩展</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-114%2B-blue?logo=googlechrome" alt="Chrome 114+">
  <img src="https://img.shields.io/badge/Manifest-V3-green?logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License: MIT">
</p>

---

## 核心功能

- **实时翻译** — 网页上复制任意文本，自动捕捉并翻译，无需切换页面
- **侧边栏展示** — 翻译结果在浏览器右侧面板呈现，类似分屏效果，跟随标签页切换
- **AI 引擎驱动** — 相比传统机器翻译，大模型翻译更自然、更流畅、更懂上下文
- **多提供商支持** — 兼容所有 OpenAI API 格式的服务（OpenAI / DeepSeek / Ollama / Groq / 自定义）
- **隐私优先** — API Key 仅存于本机 `chrome.storage.local`，翻译文本不经过任何中间服务器
- **右键翻译** — 选中文本右键即可翻译，无需额外操作

## 使用场景

| 场景 | 效果 |
|------|------|
| LinkedIn 英文 JD | 复制职位描述 → 侧边栏自动翻译，左侧看原文右侧看翻译 |
| 技术文档阅读 | 选中段落右键翻译，不打断阅读节奏 |
| 跨语言沟通 | 快速翻译消息、邮件内容 |
| 学术论文阅读 | 复制摘要/段落自动获取中文翻译 |

## 安装方式

### 方式一：Chrome Web Store（推荐）

> 暂未上架，计划中

### 方式二：开发者模式加载

1. 下载本仓库代码
   ```bash
   git clone https://github.com/你的用户名/chrome-translate-extension.git
   ```
2. 打开 Chrome，地址栏输入 `chrome://extensions/`
3. 右上角开启 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择项目目录

## 配置指南

安装后点击扩展图标打开侧边栏，点击底部齿轮 ⚙️ 进入设置页面。

### 填写 API 信息

| 服务商 | API 端点 | 模型示例 |
|--------|---------|---------|
| **OpenAI** | `https://api.openai.com/v1/chat/completions` | `gpt-4o` |
| **DeepSeek** | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` |
| **Groq** | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile` |
| **Ollama (本地)** | `http://localhost:11434/v1/chat/completions` | `llama3`, `qwen2.5` |

### 代理配置（可选）

如果你使用 API 代理/中转服务，在 API 端点填入代理地址即可。例如：

```
https://你的代理域名/v1/chat/completions
```

## 项目结构

```
chrome-translate-extension/
├── manifest.json              # Chrome Extension Manifest V3
├── background.js              # Service Worker — 消息路由与 API 代理
├── content.js                 # 内容脚本 — 监听 copy 事件捕获文本
├── sidepanel.html             # 侧边栏 UI
├── sidepanel.css              # 侧边栏样式（Google Translate 风格）
├── sidepanel.js               # 侧边栏逻辑
├── settings.html              # 设置页面
├── settings.js                # 设置页面逻辑
├── lib/
│   ├── translator.js          # 翻译引擎抽象层（策略模式）
│   └── providers/
│       └── openai.js          # OpenAI 兼容接口实现
├── icons/                     # 扩展图标
├── LICENSE                    # MIT 开源协议
└── README.md                  # 本文件
```

## 架构设计

```
┌──────────────────────┐      ┌──────────────────────┐
│   网页 (LinkedIn 等)   │      │   Side Panel (侧边栏)  │
│                      │      │                      │
│  content.js          │ msg  │  sidepanel.html      │
│  copy 事件 → 捕获文本  │─────▶│  sidepanel.js        │
│  右键菜单 → 发送选中   │      │  翻译UI + 结果展示     │
└──────────────────────┘      └──────────┬───────────┘
                                         │ Port 长连接
                                  ┌──────▼───────────┐
                                  │  background.js    │
                                  │  消息路由中枢       │
                                  │  API 代理调用      │
                                  │  设置读写          │
                                  └──────┬───────────┘
                                         │ HTTPS fetch
                                  ┌──────▼───────────┐
                                  │  AI API           │
                                  │  OpenAI / DeepSeek│
                                  │  / Ollama / ...   │
                                  └──────────────────┘
```

## 技术栈

- **Chrome Extension Manifest V3**
- **Side Panel API** — Chrome 114+ 原生侧边栏
- **chrome.runtime Port** — Service Worker 与 Side Panel 长连接通信
- **chrome.storage.local** — 本机配置存储
- **OpenAI Chat Completions API** — 翻译引擎接口

## 参与贡献

欢迎提交 Issue 和 Pull Request！

### 开发方式

1. Fork 本仓库
2. 在 `chrome://extensions/` 加载项目目录
3. 修改代码后刷新扩展即可生效
4. 提交 PR 前请确保功能正常

### 扩展翻译提供商

`lib/providers/` 目录下添加新文件即可扩展新的 AI 提供商，需实现：

```javascript
export const myProvider = {
  name: 'ProviderName',
  async translate(text, targetLang, sourceLang, options) {
    // 调用 API，返回 { translation: '...' }
  },
};
```

## License

[MIT](LICENSE) © 2026 AI Translate Assistant

# 文章同步助手

一个强大的 Chrome 扩展程序，支持将文章一键同步到 29+ 自媒体平台。

## 功能特性

### 一键批量发布
支持将文章同步到以下平台：

| 平台类型 | 支持平台 |
|---------|---------|
| 技术社区 | 知乎、掘金、CSDN、简书、博客园、SegmentFault、开源中国 |
| 社交媒体 | 微博、小红书、抖音、B站、快手 |
| 资讯平台 | 今日头条、百家号、大鱼号、企鹅号、搜狐号、网易号 |
| 自建站 | WordPress、Typecho、博客园 (MetaWeblog API) |

### 网页转 Markdown
- 智能提取正文（基于 Mozilla Readability）
- 自动过滤广告噪音
- 图片本地化下载
- 打包为 Markdown + 图片 ZIP 压缩包

### 智能提取
- 自动提取文章标题
- 自动提取正文内容
- 自动提取封面图
- 支持多种网页格式

### 图片自动上传
- 自动识别文章中的图片
- 转存到目标平台图床
- 自动替换图片链接

### 草稿模式
- 同步后保存为草稿
- 支持二次编辑后发布

### AI 集成
支持多种 AI 服务：
- **Chrome Built-in AI**：免费，无需 API Key（需要 Chrome 131+）
- **OpenAI API**：GPT-4o、GPT-4o-mini 等模型
- **Claude API**：Claude 3.5 Sonnet、Claude 3.5 Haiku 等模型

AI 功能：
- 文章优化
- 多语言翻译
- 摘要生成
- 标题优化
- 关键词提取
- 文章校对

## 安装方法

### 从源码安装

1. 克隆仓库：
```bash
git clone https://github.com/jiajai2587/ai-.git
```

2. 打开 Chrome 浏览器，访问 `chrome://extensions/`

3. 开启右上角的「开发者模式」

4. 点击「加载已解压的扩展程序」，选择项目目录

### 配置

1. 点击扩展图标，进入设置页面

2. 配置 AI 服务（可选）：
   - 选择 AI 提供商
   - 输入 API Key（如使用 OpenAI 或 Claude）

3. 配置自建站（可选）：
   - WordPress：输入站点 URL、用户名和应用密码
   - 博客园：输入 MetaWeblog API 地址和凭证
   - Typecho：输入 XML-RPC 地址和凭证

## 使用方法

### 从网页提取文章

1. 打开任意网页文章
2. 点击扩展图标或使用快捷键 `Ctrl+Shift+S`
3. 文章内容将自动提取并显示在弹出窗口中

### 批量发布到多平台

1. 提取文章后，在弹出窗口中选择目标平台
2. 选择发布选项（草稿/直接发布）
3. 点击「一键发布」按钮

### 导出 Markdown

1. 提取文章后，点击「导出 Markdown」按钮
2. 或点击「下载 ZIP 包」获取包含图片的压缩包

### 使用 AI 功能

1. 提取文章后，点击 AI 功能按钮：
   - 优化文章：改进结构和表达
   - 翻译：翻译成其他语言
   - 生成摘要：自动生成文章摘要
   - 优化标题：生成标题建议

## 项目结构

```
ai-/
├── manifest.json           # Chrome 扩展配置
├── popup/                  # 弹出窗口
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/             # Service Worker
│   └── background.js
├── content/                # 内容脚本
│   ├── content.js
│   └── content.css
├── lib/                    # 第三方库
│   ├── readability.js     # Mozilla Readability
│   ├── turndown.js        # HTML 转 Markdown
│   └── jszip.min.js       # ZIP 打包
├── adapters/               # 平台适配器
│   ├── base.js            # 基础适配器
│   ├── zhihu.js           # 知乎
│   ├── juejin.js          # 掘金
│   ├── csdn.js            # CSDN
│   └── ...                # 其他平台
├── services/               # 服务层
│   └── ai.js              # AI 服务
├── utils/                  # 工具函数
│   ├── storage.js
│   ├── helpers.js
│   └── request.js
├── options/                # 设置页面
│   ├── options.html
│   ├── options.css
│   └── options.js
└── icons/                  # 图标资源
```

## 注意事项

### 平台登录状态
- 大多数平台需要先登录才能发布
- 扩展会自动检测登录状态
- 登录过期需要重新登录

### 发布限制
- 部分平台有发布频率限制
- 建议使用草稿模式先保存再发布
- 内容需要符合各平台的审核规范

### 图片上传
- 部分平台不支持图片上传 API
- 图片可能需要手动处理

## 开发说明

### 添加新平台适配器

1. 在 `adapters/` 目录创建新文件
2. 继承基础适配器类：

```javascript
class NewPlatformAdapter {
  constructor() {
    this.name = 'newplatform';
    this.displayName = '新平台';
    this.editUrl = 'https://example.com/write';
    this.domain = 'example.com';
  }

  async checkLogin() { /* ... */ }
  async publish(article) { /* ... */ }
  async saveDraft(article) { /* ... */ }
  async uploadImage(image) { /* ... */ }
}
```

3. 在 `utils/helpers.js` 的 `PlatformConfig` 中添加平台配置

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

/**
 * 文章同步助手 - AI 服务
 * 支持 Chrome Built-in AI、OpenAI API 和 Claude API
 */

class AIService {
  constructor(config = {}) {
    this.provider = config.provider || 'chrome';
    this.openaiKey = config.openaiKey || '';
    this.claudeKey = config.claudeKey || '';
  }

  /**
   * 处理文本
   * @param {string} task - 任务类型
   * @param {string} content - 内容
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async process(task, content, options = {}) {
    switch (this.provider) {
      case 'chrome':
        return this.processWithChromeAI(task, content, options);
      case 'openai':
        return this.processWithOpenAI(task, content, options);
      case 'claude':
        return this.processWithClaude(task, content, options);
      default:
        throw new Error('未知的 AI 服务提供商');
    }
  }

  /**
   * 使用 Chrome Built-in AI 处理
   */
  async processWithChromeAI(task, content, options) {
    // 检查 API 可用性
    if (!self.ai?.languageModel) {
      throw new Error('Chrome AI 不可用，请使用 Chrome 131+ 版本');
    }

    const capabilities = await self.ai.languageModel.capabilities();
    if (capabilities.available !== 'readily') {
      throw new Error('Chrome AI 模型未就绪，请等待模型下载完成');
    }

    // 创建会话
    const session = await self.ai.languageModel.create({
      systemPrompt: this.getSystemPrompt(task, options),
      topK: 40,
      temperature: 0.7
    });

    // 生成内容
    const prompt = this.getPrompt(task, content, options);
    const result = await session.prompt(prompt);

    // 销毁会话
    session.destroy();

    return this.parseResult(task, result);
  }

  /**
   * 使用 OpenAI API 处理
   */
  async processWithOpenAI(task, content, options) {
    if (!this.openaiKey) {
      throw new Error('请先配置 OpenAI API Key');
    }

    const model = options.model || 'gpt-4o-mini';
    const maxTokens = options.maxTokens || 4096;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(task, options)
          },
          {
            role: 'user',
            content: this.getPrompt(task, content, options)
          }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API 请求失败');
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content;

    return this.parseResult(task, result);
  }

  /**
   * 使用 Claude API 处理
   */
  async processWithClaude(task, content, options) {
    if (!this.claudeKey) {
      throw new Error('请先配置 Claude API Key');
    }

    const model = options.model || 'claude-3-5-sonnet-20241022';
    const maxTokens = options.maxTokens || 4096;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.claudeKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: this.getSystemPrompt(task, options),
        messages: [
          {
            role: 'user',
            content: this.getPrompt(task, content, options)
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API 请求失败');
    }

    const data = await response.json();
    const result = data.content[0]?.text;

    return this.parseResult(task, result);
  }

  /**
   * 获取系统提示
   */
  getSystemPrompt(task, options) {
    const prompts = {
      optimize: `你是一个专业的文章编辑，擅长优化文章的结构、表达和可读性。
请按照以下原则优化文章：
1. 保持原文的核心内容和观点
2. 改进表达方式，使语言更加流畅
3. 优化文章结构，使逻辑更加清晰
4. 修正语法错误和错别字
5. 适当添加过渡句，增强连贯性`,

      translate: `你是一个专业的翻译专家，擅长将文章翻译成目标语言。
请按照以下原则翻译：
1. 保持原文的意思和风格
2. 使用地道的表达方式
3. 注意文化差异，进行适当本地化
4. 保持专业术语的准确性`,

      summarize: `你是一个专业的文章摘要专家，擅长提取文章的核心观点。
请按照以下原则生成摘要：
1. 提取最重要的信息
2. 保持客观，不添加主观评价
3. 语言简洁明了
4. 字数控制在 100-200 字`,

      title: `你是一个专业的标题优化专家，擅长创作吸引人的标题。
请按照以下原则生成标题：
1. 准确概括文章内容
2. 具有吸引力，引起读者兴趣
3. 简洁有力，避免过长
4. 避免标题党和夸张表述`,

      keywords: `你是一个专业的 SEO 专家，擅长提取文章关键词。
请按照以下原则提取关键词：
1. 提取 3-5 个核心关键词
2. 关键词应准确反映文章主题
3. 考虑搜索热度和相关性`,

      proofread: `你是一个专业的校对专家，擅长检查文章错误。
请检查以下内容：
1. 语法错误
2. 错别字
3. 标点符号使用
4. 格式问题
5. 逻辑不通顺的地方`
    };

    return prompts[task] || '你是一个专业的写作助手。';
  }

  /**
   * 获取用户提示
   */
  getPrompt(task, content, options) {
    const truncatedContent = content.substring(0, 4000);
    const title = options.title || '';

    const prompts = {
      optimize: `请优化以下文章：

标题：${title}

内容：
${truncatedContent}

请以 JSON 格式返回结果：
{
  "content": "优化后的内容",
  "markdown": "优化后的 Markdown 格式内容（如果是 Markdown 输入）",
  "changes": ["改动点1", "改动点2"]
}`,

      translate: `请将以下文章翻译成${options.targetLanguage || '英文'}：

标题：${title}

内容：
${truncatedContent}

请以 JSON 格式返回结果：
{
  "content": "翻译后的内容",
  "language": "目标语言"
}`,

      summarize: `请为以下文章生成摘要：

标题：${title}

内容：
${truncatedContent}

请以 JSON 格式返回结果：
{
  "summary": "文章摘要（100-200字）",
  "keyPoints": ["要点1", "要点2", "要点3"]
}`,

      title: `请为以下文章生成 ${options.count || 5} 个备选标题：

原标题：${title}

内容摘要：
${truncatedContent.substring(0, 500)}

请以 JSON 格式返回结果：
{
  "titles": ["标题1", "标题2", "标题3"],
  "recommended": 0
}`,

      keywords: `请为以下文章提取关键词：

标题：${title}

内容：
${truncatedContent}

请以 JSON 格式返回结果：
{
  "keywords": ["关键词1", "关键词2", "关键词3"]
}`,

      proofread: `请校对以下文章，找出所有错误：

标题：${title}

内容：
${truncatedContent}

请以 JSON 格式返回结果：
{
  "errors": [
    {
      "type": "错误类型（语法/错字/标点/格式/逻辑）",
      "location": "错误位置",
      "original": "原文",
      "suggestion": "建议修改"
    }
  ],
  "score": 100
}`
    };

    return prompts[task] || truncatedContent;
  }

  /**
   * 解析结果
   */
  parseResult(task, result) {
    try {
      // 尝试提取 JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // JSON 解析失败
    }

    // 返回原始结果
    switch (task) {
      case 'optimize':
        return { content: result, markdown: result, changes: [] };
      case 'translate':
        return { content: result, language: 'unknown' };
      case 'summarize':
        return { summary: result, keyPoints: [] };
      case 'title':
        return { titles: [result], recommended: 0 };
      case 'keywords':
        return { keywords: result.split(/[，,\n]/).filter(k => k.trim()) };
      case 'proofread':
        return { errors: [], rawResult: result };
      default:
        return { content: result };
    }
  }

  /**
   * 文章优化
   */
  async optimizeArticle(article) {
    return this.process('optimize', article.content || article.markdown, {
      title: article.title
    });
  }

  /**
   * 翻译文章
   */
  async translateArticle(article, targetLanguage = 'English') {
    return this.process('translate', article.content || article.markdown, {
      title: article.title,
      targetLanguage
    });
  }

  /**
   * 生成摘要
   */
  async generateSummary(article) {
    return this.process('summarize', article.content || article.markdown, {
      title: article.title
    });
  }

  /**
   * 生成标题
   */
  async generateTitles(article, count = 5) {
    return this.process('title', article.content || article.markdown, {
      title: article.title,
      count
    });
  }

  /**
   * 提取关键词
   */
  async extractKeywords(article) {
    return this.process('keywords', article.content || article.markdown, {
      title: article.title
    });
  }

  /**
   * 校对文章
   */
  async proofreadArticle(article) {
    return this.process('proofread', article.content || article.markdown, {
      title: article.title
    });
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
}

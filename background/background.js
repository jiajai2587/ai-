/**
 * 文章同步助手 - Background Service Worker
 */

// 存储工具
const Storage = {
  async get(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  },

  async set(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  config: {
    async get() {
      const result = await Storage.get('config');
      return result.config || { platforms: {}, ai: { provider: 'chrome' }, publish: { defaultMode: 'draft' } };
    },
    async set(config) {
      await Storage.set({ config });
    }
  }
};

// 初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('文章同步助手已安装');

  // 初始化默认配置
  const config = await Storage.config.get();
  await Storage.config.set(config);

  // 创建右键菜单
  createContextMenu();
});

// 创建右键菜单
function createContextMenu() {
  chrome.contextMenus.create({
    id: 'extract-article',
    title: '提取文章内容',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'sync-to-platforms',
    title: '同步到各平台',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'export-markdown',
    title: '导出为 Markdown',
    contexts: ['page']
  });
}

// 右键菜单点击事件
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'extract-article':
      await extractAndShow(tab.id);
      break;
    case 'sync-to-platforms':
      // 打开弹出窗口
      chrome.action.openPopup();
      break;
    case 'export-markdown':
      await exportMarkdown(tab.id);
      break;
  }
});

// 提取并显示
async function extractAndShow(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'extractContent'
    });

    if (response?.success) {
      // 保存到存储
      await Storage.drafts.add({
        title: response.data.title,
        url: response.data.url,
        excerpt: Utils.extractText(response.data.content, 100),
        content: response.data.content,
        markdown: response.data.markdown,
        coverImage: response.data.coverImage
      });

      // 显示通知
      showNotification('提取成功', `已提取: ${response.data.title}`);
    }
  } catch (error) {
    showNotification('提取失败', error.message, 'error');
  }
}

// 导出 Markdown
async function exportMarkdown(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'extractContent'
    });

    if (response?.success) {
      // 发送到 content script 下载
      chrome.tabs.sendMessage(tabId, {
        action: 'downloadMarkdown',
        data: response.data
      });
    }
  } catch (error) {
    showNotification('导出失败', error.message, 'error');
  }
}

// 消息处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // 保持消息通道开启
});

async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'extractContent':
        // 由 content script 处理
        break;

      case 'publishArticle':
        const results = await publishArticle(request.data);
        sendResponse({ success: true, results });
        break;

      case 'aiProcess':
        const aiResult = await processAI(request.data);
        sendResponse(aiResult);
        break;

      case 'checkPlatformLogin':
        const loginStatus = await checkPlatformLogin(request.platform);
        sendResponse({ success: true, status: loginStatus });
        break;

      case 'getArticle':
        const article = await getArticle(request.url);
        sendResponse({ success: true, article });
        break;

      case 'saveDraft':
        await Storage.drafts.add(request.data);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: '未知操作' });
    }
  } catch (error) {
    console.error('处理消息失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 发布文章
async function publishArticle({ article, platforms, options }) {
  const results = [];

  for (const platformId of platforms) {
    try {
      // 获取适配器
      const adapter = await getAdapter(platformId);

      if (!adapter) {
        results.push({
          platform: platformId,
          success: false,
          error: '平台适配器未找到'
        });
        continue;
      }

      // 检查登录状态
      const isLoggedIn = await adapter.checkLogin();
      if (!isLoggedIn) {
        results.push({
          platform: platformId,
          success: false,
          error: '请先登录该平台'
        });
        continue;
      }

      // 上传图片（如果启用）
      let processedArticle = { ...article };
      if (options.autoUploadImages && article.images?.length > 0) {
        processedArticle = await uploadImages(article, adapter);
      }

      // 发布或保存草稿
      let publishResult;
      if (options.saveAsDraft) {
        publishResult = await adapter.saveDraft(processedArticle);
      } else {
        publishResult = await adapter.publish(processedArticle);
      }

      results.push({
        platform: platformId,
        success: true,
        result: publishResult
      });

      // 更新登录状态
      await Storage.platforms.setStatus(platformId, { loggedIn: true });

    } catch (error) {
      results.push({
        platform: platformId,
        success: false,
        error: error.message
      });

      // 更新登录状态（如果是因为未登录）
      if (error.message.includes('登录')) {
        await Storage.platforms.setStatus(platformId, { loggedIn: false });
      }
    }
  }

  return results;
}

// 获取平台适配器
async function getAdapter(platformId) {
  if (adapters.has(platformId)) {
    return adapters.get(platformId);
  }

  // 动态加载适配器
  try {
    const adapterModule = await import(`../adapters/${platformId}.js`);
    const adapter = new adapterModule.default();
    adapters.set(platformId, adapter);
    return adapter;
  } catch (error) {
    console.error(`加载适配器失败: ${platformId}`, error);
    return null;
  }
}

// 上传图片
async function uploadImages(article, adapter) {
  if (!article.images || article.images.length === 0) {
    return article;
  }

  const uploadedImages = [];
  let content = article.content;

  for (const image of article.images) {
    try {
      const uploadedUrl = await adapter.uploadImage(image);
      uploadedImages.push({
        original: image.url,
        uploaded: uploadedUrl
      });

      // 替换内容中的图片链接
      content = content.replace(image.url, uploadedUrl);
    } catch (error) {
      console.error('上传图片失败:', image.url, error);
    }
  }

  return {
    ...article,
    content,
    uploadedImages
  };
}

// AI 处理
async function processAI({ task, content, title }) {
  const config = await Storage.config.get();
  const provider = config.ai?.provider || 'chrome';

  try {
    let result;

    switch (provider) {
      case 'chrome':
        result = await processWithChromeAI(task, content, title);
        break;
      case 'openai':
        result = await processWithOpenAI(task, content, title, config.ai.openaiKey);
        break;
      case 'claude':
        result = await processWithClaude(task, content, title, config.ai.claudeKey);
        break;
      default:
        throw new Error('未配置 AI 服务');
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Chrome Built-in AI 处理
async function processWithChromeAI(task, content, title) {
  // 检查 Chrome AI API 可用性
  if (!self.ai?.languageModel) {
    throw new Error('Chrome AI 不可用，请使用 Chrome 131+ 版本并启用 AI 功能');
  }

  const capabilities = await self.ai.languageModel.capabilities();
  if (capabilities.available !== 'readily') {
    throw new Error('Chrome AI 模型未就绪');
  }

  const session = await self.ai.languageModel.create({
    systemPrompt: getSystemPrompt(task)
  });

  const prompt = getPromptForTask(task, content, title);
  const result = await session.prompt(prompt);

  return parseAIResult(task, result);
}

// OpenAI API 处理
async function processWithOpenAI(task, content, title, apiKey) {
  if (!apiKey) {
    throw new Error('请先配置 OpenAI API Key');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: getSystemPrompt(task) },
        { role: 'user', content: getPromptForTask(task, content, title) }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API 请求失败');
  }

  const data = await response.json();
  const result = data.choices[0]?.message?.content;

  return parseAIResult(task, result);
}

// Claude API 处理
async function processWithClaude(task, content, title, apiKey) {
  if (!apiKey) {
    throw new Error('请先配置 Claude API Key');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: getSystemPrompt(task),
      messages: [
        { role: 'user', content: getPromptForTask(task, content, title) }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Claude API 请求失败');
  }

  const data = await response.json();
  const result = data.content[0]?.text;

  return parseAIResult(task, result);
}

// 获取系统提示
function getSystemPrompt(task) {
  const prompts = {
    optimize: '你是一个专业的文章编辑，擅长优化文章的结构、表达和可读性。请保持原文的核心内容和观点，改进表达方式和文章结构。',
    translate: '你是一个专业的翻译专家，擅长将中文文章翻译成英文（或用户指定的语言）。请保持原文的意思和风格，使用地道的表达方式。',
    summarize: '你是一个专业的文章摘要专家，擅长提取文章的核心观点和关键信息，生成简洁明了的摘要。',
    title: '你是一个专业的标题优化专家，擅长创作吸引人且准确的标题。请为文章生成3-5个备选标题。'
  };

  return prompts[task] || '你是一个专业的写作助手。';
}

// 获取任务提示
function getPromptForTask(task, content, title) {
  const truncatedContent = content.substring(0, 4000);

  const prompts = {
    optimize: `请优化以下文章，改进其结构、表达和可读性。保持原文的核心内容和观点。

标题: ${title}

内容:
${truncatedContent}

请以 JSON 格式返回优化后的内容:
{
  "content": "优化后的HTML内容",
  "markdown": "优化后的Markdown内容",
  "changes": ["主要改进点1", "主要改进点2"]
}`,
    translate: `请将以下文章翻译成英文。保持原文的意思和风格。

标题: ${title}

内容:
${truncatedContent}

请以 JSON 格式返回:
{
  "content": "翻译后的内容",
  "language": "English"
}`,
    summarize: `请为以下文章生成一个简洁的摘要（100-200字）。

标题: ${title}

内容:
${truncatedContent}

请以 JSON 格式返回:
{
  "summary": "文章摘要",
  "keyPoints": ["要点1", "要点2", "要点3"]
}`,
    title: `请为以下文章生成3-5个备选标题。

原标题: ${title}

内容摘要:
${truncatedContent.substring(0, 500)}

请以 JSON 格式返回:
{
  "titles": ["标题1", "标题2", "标题3"],
  "recommended": 0
}`
  };

  return prompts[task] || truncatedContent;
}

// 解析 AI 结果
function parseAIResult(task, result) {
  try {
    // 尝试解析 JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // 解析失败，返回原始结果
  }

  // 根据任务返回结构化结果
  switch (task) {
    case 'optimize':
      return { content: result, markdown: result };
    case 'translate':
      return { content: result, language: 'English' };
    case 'summarize':
      return { summary: result };
    case 'title':
      return { titles: [result] };
    default:
      return { content: result };
  }
}

// 检查平台登录状态
async function checkPlatformLogin(platformId) {
  try {
    const adapter = await getAdapter(platformId);
    if (!adapter) return false;

    const isLoggedIn = await adapter.checkLogin();
    await Storage.platforms.setStatus(platformId, { loggedIn: isLoggedIn });
    return isLoggedIn;
  } catch {
    return false;
  }
}

// 获取文章
async function getArticle(url) {
  // 尝试从草稿中获取
  const drafts = await Storage.drafts.getAll();
  return drafts.find(d => d.url === url);
}

// 显示通知
function showNotification(title, message, type = 'basic') {
  chrome.notifications.create({
    type: type === 'error' ? 'basic' : type,
    iconUrl: '/icons/icon128.png',
    title: title,
    message: message
  });
}

// 定时任务：检查登录状态
chrome.alarms.create('checkLoginStatus', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkLoginStatus') {
    const platforms = PlatformConfig.all;
    for (const platform of platforms) {
      await checkPlatformLogin(platform.id);
    }
  }
});

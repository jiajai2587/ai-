/**
 * 文章同步助手 - 弹出窗口逻辑
 */

// 当前状态
let currentArticle = null;
let currentPageInfo = null;
let selectedPlatforms = new Set();

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await initApp();
});

async function initApp() {
  // 初始化标签页
  initTabs();

  // 初始化平台列表
  initPlatformList();

  // 初始化事件监听
  initEventListeners();

  // 获取当前标签页信息
  await getCurrentPageInfo();

  // 加载文章预览
  await loadArticlePreview();

  // 加载发布历史
  await loadHistory();
}

// 标签页切换
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`tab-${targetId}`).classList.add('active');
    });
  });
}

// 初始化平台列表
function initPlatformList() {
  const platformList = document.getElementById('platform-list');
  const groups = PlatformConfig.byType();

  let html = '';
  for (const type in groups) {
    // 排除源平台
    if (type === 'source') continue;

    const platforms = groups[type];
    const typeName = PlatformConfig.typeNames[type] || type;

    html += `
      <div class="platform-group">
        <div class="platform-group-title">${typeName}</div>
        <div class="platform-list">
          ${platforms.map(p => `
            <div class="platform-item" data-platform="${p.id}">
              <span class="status" title="登录状态"></span>
              <span>${p.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  platformList.innerHTML = html;

  // 平台选择事件
  document.querySelectorAll('.platform-item').forEach(item => {
    item.addEventListener('click', () => {
      const platformId = item.dataset.platform;
      if (selectedPlatforms.has(platformId)) {
        selectedPlatforms.delete(platformId);
        item.classList.remove('selected');
      } else {
        selectedPlatforms.add(platformId);
        item.classList.add('selected');
      }
      updatePublishButton();
    });
  });

  // 加载登录状态
  loadPlatformStatus();
}

// 加载平台登录状态
async function loadPlatformStatus() {
  const status = await Storage.platforms.getStatus();

  document.querySelectorAll('.platform-item').forEach(item => {
    const platformId = item.dataset.platform;
    const statusEl = item.querySelector('.status');

    if (status[platformId]?.loggedIn) {
      statusEl.classList.add('logged-in');
    } else {
      statusEl.classList.remove('logged-in');
    }
  });
}

// 初始化事件监听
function initEventListeners() {
  // 设置按钮
  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 重新提取
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    showLoading('正在提取内容...');
    try {
      await extractCurrentPage();
      await loadArticlePreview();
      showToast('内容提取成功', 'success');
    } catch (error) {
      showToast('提取失败: ' + error.message, 'error');
    } finally {
      hideLoading();
    }
  });

  // 全选按钮
  document.getElementById('btn-select-all').addEventListener('click', () => {
    const allItems = document.querySelectorAll('.platform-item');
    const allSelected = selectedPlatforms.size === allItems.length;

    allItems.forEach(item => {
      const platformId = item.dataset.platform;
      if (allSelected) {
        selectedPlatforms.delete(platformId);
        item.classList.remove('selected');
      } else {
        selectedPlatforms.add(platformId);
        item.classList.add('selected');
      }
    });

    updatePublishButton();
  });

  // AI 功能按钮
  document.querySelectorAll('.btn-ai').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      await handleAIAction(action);
    });
  });

  // 导出 Markdown
  document.getElementById('btn-export').addEventListener('click', async () => {
    if (!currentArticle) {
      showToast('请先提取文章内容', 'error');
      return;
    }

    const markdown = currentArticle.markdown || currentArticle.content;
    const filename = `${currentArticle.title || 'article'}.md`;
    Utils.downloadFile(markdown, filename, 'text/markdown');
    showToast('导出成功', 'success');
  });

  // 一键发布
  document.getElementById('btn-publish').addEventListener('click', async () => {
    if (!currentArticle) {
      showToast('请先提取文章内容', 'error');
      return;
    }

    if (selectedPlatforms.size === 0) {
      showToast('请选择目标平台', 'error');
      return;
    }

    await publishArticle();
  });

  // 提取内容按钮
  document.getElementById('btn-extract').addEventListener('click', async () => {
    showLoading('正在提取内容...');
    try {
      await extractCurrentPage();
      showToast('内容提取成功', 'success');
    } catch (error) {
      showToast('提取失败: ' + error.message, 'error');
    } finally {
      hideLoading();
    }
  });

  // 复制 Markdown
  document.getElementById('btn-copy-md').addEventListener('click', async () => {
    if (!currentArticle?.markdown) {
      showToast('请先提取内容', 'error');
      return;
    }

    await Utils.copyToClipboard(currentArticle.markdown);
    showToast('已复制到剪贴板', 'success');
  });

  // 下载 ZIP
  document.getElementById('btn-download-zip').addEventListener('click', async () => {
    if (!currentArticle) {
      showToast('请先提取内容', 'error');
      return;
    }

    showLoading('正在打包...');
    try {
      await downloadAsZip();
      showToast('下载成功', 'success');
    } catch (error) {
      showToast('下载失败: ' + error.message, 'error');
    } finally {
      hideLoading();
    }
  });

  // 清空历史
  document.getElementById('btn-clear-history').addEventListener('click', async () => {
    if (confirm('确定要清空所有发布历史吗？')) {
      await Storage.history.clear();
      await loadHistory();
      showToast('历史已清空', 'success');
    }
  });
}

// 获取当前标签页信息
async function getCurrentPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      currentPageInfo = {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      };

      // 更新页面信息显示
      document.getElementById('page-title').textContent = tab.title || '-';
      document.getElementById('page-source').textContent = Utils.getDomain(tab.url) || '-';
    }
  } catch (error) {
    console.error('获取页面信息失败:', error);
  }
}

// 提取当前页面内容
async function extractCurrentPage() {
  if (!currentPageInfo?.id) {
    throw new Error('无法获取当前页面');
  }

  try {
    // 发送消息给 content script 提取内容
    const response = await chrome.tabs.sendMessage(currentPageInfo.id, {
      action: 'extractContent'
    });

    if (response?.success) {
      currentArticle = response.data;

      // 保存到存储
      await Storage.drafts.add({
        title: currentArticle.title,
        url: currentPageInfo.url,
        excerpt: Utils.extractText(currentArticle.content, 100),
        content: currentArticle.content,
        markdown: currentArticle.markdown,
        coverImage: currentArticle.coverImage
      });

      return currentArticle;
    } else {
      throw new Error(response?.error || '提取失败');
    }
  } catch (error) {
    // 如果 content script 未加载，尝试注入
    if (error.message.includes('Receiving end does not exist')) {
      await chrome.scripting.executeScript({
        target: { tabId: currentPageInfo.id },
        files: ['content/content.js']
      });

      // 重试提取
      const response = await chrome.tabs.sendMessage(currentPageInfo.id, {
        action: 'extractContent'
      });

      if (response?.success) {
        currentArticle = response.data;
        return currentArticle;
      }
    }

    throw error;
  }
}

// 加载文章预览
async function loadArticlePreview() {
  const preview = document.getElementById('article-preview');

  if (!currentArticle) {
    // 尝试从 storage 加载最近的草稿
    const drafts = await Storage.drafts.getAll();
    if (drafts.length > 0) {
      const latestDraft = drafts[0];
      currentArticle = {
        title: latestDraft.title,
        content: latestDraft.content,
        markdown: latestDraft.markdown,
        coverImage: latestDraft.coverImage
      };
    }
  }

  if (currentArticle) {
    preview.innerHTML = `
      <div class="article-title">${Utils.escapeHtml(currentArticle.title || '无标题')}</div>
      <div class="article-meta">
        ${currentArticle.wordCount ? `${currentArticle.wordCount} 字` : ''}
        ${currentArticle.readTime ? ` · ${currentArticle.readTime} 分钟阅读` : ''}
      </div>
      <div class="article-excerpt">${Utils.escapeHtml(Utils.extractText(currentArticle.content, 200))}</div>
    `;

    // 更新内容提取页面的信息
    document.getElementById('page-words').textContent = currentArticle.wordCount || '-';

    if (currentArticle.coverImage) {
      document.getElementById('cover-image').innerHTML = `
        <img src="${currentArticle.coverImage}" alt="封面图">
      `;
    }

    if (currentArticle.markdown) {
      document.getElementById('content-preview').innerHTML = `
        <pre style="white-space: pre-wrap; margin: 0;">${Utils.escapeHtml(currentArticle.markdown.substring(0, 1000))}${currentArticle.markdown.length > 1000 ? '...' : ''}</pre>
      `;
    }
  } else {
    preview.innerHTML = `
      <div class="article-placeholder">
        <p>请先打开要同步的文章页面</p>
        <p class="hint">支持微信公众号、知乎、掘金、CSDN 等平台文章</p>
      </div>
    `;
  }

  updatePublishButton();
}

// 更新发布按钮状态
function updatePublishButton() {
  const btn = document.getElementById('btn-publish');
  btn.disabled = !currentArticle || selectedPlatforms.size === 0;
}

// 发布文章
async function publishArticle() {
  const statusContainer = document.getElementById('publish-status');
  const statusList = document.getElementById('status-list');
  const statusCount = document.getElementById('status-count');

  // 获取发布选项
  const saveAsDraft = document.getElementById('opt-draft').checked;
  const autoUploadImages = document.getElementById('opt-images').checked;
  const showNotification = document.getElementById('opt-notify').checked;

  const platforms = Array.from(selectedPlatforms);
  let completed = 0;

  statusContainer.style.display = 'block';
  statusList.innerHTML = platforms.map(p => {
    const config = PlatformConfig.get(p);
    return `
      <div class="status-item" data-platform="${p}">
        <span class="platform-name">${config?.name || p}</span>
        <svg class="status-icon loading" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z" opacity="0.3"/>
          <path fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2Z"/>
        </svg>
      </div>
    `;
  }).join('');

  // 发送发布请求到 background
  const response = await chrome.runtime.sendMessage({
    action: 'publishArticle',
    data: {
      article: currentArticle,
      platforms,
      options: {
        saveAsDraft,
        autoUploadImages,
        showNotification
      }
    }
  });

  // 更新状态
  if (response?.results) {
    for (const result of response.results) {
      const item = statusList.querySelector(`[data-platform="${result.platform}"]`);
      if (item) {
        const icon = item.querySelector('.status-icon');
        icon.classList.remove('loading');

        if (result.success) {
          icon.classList.add('success');
          icon.innerHTML = '<path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z"/>';
        } else {
          icon.classList.add('error');
          icon.innerHTML = '<path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"/>';
          item.title = result.error;
        }
      }
      completed++;
      statusCount.textContent = `${completed}/${platforms.length}`;
    }
  }

  // 添加到历史
  await Storage.history.add({
    title: currentArticle.title,
    platforms: platforms.map(p => PlatformConfig.get(p)?.name || p),
    results: response?.results
  });

  // 重新加载历史
  await loadHistory();

  if (showNotification) {
    const successCount = response?.results?.filter(r => r.success).length || 0;
    showToast(`发布完成: ${successCount}/${platforms.length} 成功`, successCount === platforms.length ? 'success' : '');
  }
}

// AI 功能处理
async function handleAIAction(action) {
  if (!currentArticle) {
    showToast('请先提取文章内容', 'error');
    return;
  }

  showLoading(`正在${getAIActionName(action)}...`);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'aiProcess',
      data: {
        task: action,
        content: currentArticle.content || currentArticle.markdown,
        title: currentArticle.title
      }
    });

    if (response?.success) {
      // 根据不同操作更新内容
      switch (action) {
        case 'optimize':
          currentArticle.content = response.data.content;
          if (response.data.markdown) {
            currentArticle.markdown = response.data.markdown;
          }
          await loadArticlePreview();
          break;
        case 'translate':
          // 显示翻译结果
          currentArticle.translatedContent = response.data.content;
          showToast('翻译完成，已保存', 'success');
          break;
        case 'summarize':
          currentArticle.summary = response.data.summary;
          showToast('摘要: ' + response.data.summary, 'success');
          break;
        case 'title':
          currentArticle.suggestedTitles = response.data.titles;
          showToast('建议标题: ' + response.data.titles.join(', '), 'success');
          break;
      }
      showToast(`${getAIActionName(action)}完成`, 'success');
    } else {
      throw new Error(response?.error || 'AI 处理失败');
    }
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    hideLoading();
  }
}

function getAIActionName(action) {
  const names = {
    optimize: '优化文章',
    translate: '翻译',
    summarize: '生成摘要',
    title: '优化标题'
  };
  return names[action] || action;
}

// 下载为 ZIP
async function downloadAsZip() {
  // 动态加载 JSZip
  if (typeof JSZip === 'undefined') {
    await loadScript(chrome.runtime.getURL('../lib/jszip.min.js'));
  }

  const zip = new JSZip();

  // 添加 Markdown 文件
  const filename = `${currentArticle.title || 'article'}.md`;
  zip.file(filename, currentArticle.markdown || currentArticle.content);

  // 添加图片文件夹
  if (currentArticle.images?.length > 0) {
    const imgFolder = zip.folder('images');

    for (let i = 0; i < currentArticle.images.length; i++) {
      const img = currentArticle.images[i];
      try {
        const blob = await fetch(img.url).then(r => r.blob());
        const ext = img.url.split('.').pop().split('?')[0] || 'jpg';
        imgFolder.file(`${i + 1}.${ext}`, blob);
      } catch (error) {
        console.error('下载图片失败:', img.url, error);
      }
    }
  }

  // 生成并下载 ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentArticle.title || 'article'}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// 加载历史记录
async function loadHistory() {
  const historyList = document.getElementById('history-list');
  const history = await Storage.history.getAll();

  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-hint">暂无发布记录</p>';
    return;
  }

  historyList.innerHTML = history.slice(0, 20).map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-item-title">${Utils.escapeHtml(item.title || '无标题')}</div>
      <div class="history-item-meta">
        <span>${item.platforms?.join(', ') || '-'}</span>
        <span>${Utils.formatDate(item.timestamp, 'MM-DD HH:mm')}</span>
      </div>
    </div>
  `).join('');
}

// 辅助函数
function showLoading(text = '处理中...') {
  const overlay = document.getElementById('loading-overlay');
  document.getElementById('loading-text').textContent = text;
  overlay.classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast' + (type ? ` ${type}` : '');

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * 文章同步助手 - 设置页面逻辑
 */

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await initApp();
});

async function initApp() {
  // 初始化导航
  initNavigation();

  // 初始化 AI 提供商切换
  initAIProviderSwitch();

  // 加载配置
  await loadConfig();

  // 初始化事件监听
  initEventListeners();

  // 加载平台列表
  await loadPlatformList();
}

// 导航切换
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.dataset.section;

      navItems.forEach(i => i.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// AI 提供商切换
function initAIProviderSwitch() {
  const providerSelect = document.getElementById('aiProvider');
  const openaiSettings = document.getElementById('openaiSettings');
  const claudeSettings = document.getElementById('claudeSettings');

  providerSelect.addEventListener('change', () => {
    openaiSettings.style.display = 'none';
    claudeSettings.style.display = 'none';

    switch (providerSelect.value) {
      case 'openai':
        openaiSettings.style.display = 'block';
        break;
      case 'claude':
        claudeSettings.style.display = 'block';
        break;
    }
  });
}

// 加载配置
async function loadConfig() {
  const config = await Storage.config.get();

  // 通用设置
  document.querySelector(`input[name="publishMode"][value="${config.publish?.defaultMode || 'draft'}"]`).checked = true;
  document.getElementById('autoUploadImages').checked = config.publish?.autoUploadImages !== false;
  document.getElementById('downloadImages').checked = config.publish?.downloadImages || false;
  document.getElementById('maxRetries').value = config.publish?.maxRetries || 3;
  document.getElementById('showNotification').checked = config.publish?.showNotification !== false;

  // AI 设置
  document.getElementById('aiProvider').value = config.ai?.provider || 'chrome';
  document.getElementById('openaiKey').value = config.ai?.openaiKey || '';
  document.getElementById('openaiModel').value = config.ai?.openaiModel || 'gpt-4o-mini';
  document.getElementById('claudeKey').value = config.ai?.claudeKey || '';
  document.getElementById('claudeModel').value = config.ai?.claudeModel || 'claude-3-5-sonnet-20241022';

  // 触发 AI 提供商切换
  document.getElementById('aiProvider').dispatchEvent(new Event('change'));

  // 自建站设置
  document.getElementById('wordpressEnabled').checked = config.selfhosted?.wordpress?.enabled || false;
  document.getElementById('wordpressUrl').value = config.selfhosted?.wordpress?.url || '';
  document.getElementById('wordpressUsername').value = config.selfhosted?.wordpress?.username || '';
  document.getElementById('wordpressPassword').value = config.selfhosted?.wordpress?.password || '';

  document.getElementById('cnblogsEnabled').checked = config.selfhosted?.cnblogs?.enabled || false;
  document.getElementById('cnblogsApiUrl').value = config.selfhosted?.cnblogs?.apiUrl || '';
  document.getElementById('cnblogsUsername').value = config.selfhosted?.cnblogs?.username || '';
  document.getElementById('cnblogsPassword').value = config.selfhosted?.cnblogs?.password || '';

  document.getElementById('typechoEnabled').checked = config.selfhosted?.typecho?.enabled || false;
  document.getElementById('typechoApiUrl').value = config.selfhosted?.typecho?.apiUrl || '';
  document.getElementById('typechoUsername').value = config.selfhosted?.typecho?.username || '';
  document.getElementById('typechoPassword').value = config.selfhosted?.typecho?.password || '';
}

// 保存配置
async function saveConfig() {
  const config = {
    publish: {
      defaultMode: document.querySelector('input[name="publishMode"]:checked').value,
      autoUploadImages: document.getElementById('autoUploadImages').checked,
      downloadImages: document.getElementById('downloadImages').checked,
      maxRetries: parseInt(document.getElementById('maxRetries').value),
      showNotification: document.getElementById('showNotification').checked
    },
    ai: {
      provider: document.getElementById('aiProvider').value,
      openaiKey: document.getElementById('openaiKey').value,
      openaiModel: document.getElementById('openaiModel').value,
      claudeKey: document.getElementById('claudeKey').value,
      claudeModel: document.getElementById('claudeModel').value
    },
    selfhosted: {
      wordpress: {
        enabled: document.getElementById('wordpressEnabled').checked,
        url: document.getElementById('wordpressUrl').value,
        username: document.getElementById('wordpressUsername').value,
        password: document.getElementById('wordpressPassword').value
      },
      cnblogs: {
        enabled: document.getElementById('cnblogsEnabled').checked,
        apiUrl: document.getElementById('cnblogsApiUrl').value,
        username: document.getElementById('cnblogsUsername').value,
        password: document.getElementById('cnblogsPassword').value
      },
      typecho: {
        enabled: document.getElementById('typechoEnabled').checked,
        apiUrl: document.getElementById('typechoApiUrl').value,
        username: document.getElementById('typechoUsername').value,
        password: document.getElementById('typechoPassword').value
      }
    }
  };

  await Storage.config.set(config);
  showToast('设置已保存', 'success');
}

// 初始化事件监听
function initEventListeners() {
  // 保存按钮
  document.getElementById('btn-save').addEventListener('click', saveConfig);

  // 导出配置
  document.getElementById('btn-export-config').addEventListener('click', async (e) => {
    e.preventDefault();
    const config = await Storage.config.get();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'article-sync-config.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('配置已导出', 'success');
  });

  // 导入配置
  document.getElementById('btn-import-config').addEventListener('click', (e) => {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const config = JSON.parse(e.target.result);
            await Storage.config.set(config);
            await loadConfig();
            showToast('配置已导入', 'success');
          } catch (error) {
            showToast('配置文件格式错误', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  });
}

// 加载平台列表
async function loadPlatformList() {
  const platformList = document.querySelector('.platform-list');
  const platformStatus = await Storage.platforms.getStatus();

  const platforms = PlatformConfig.all.filter(p => p.type !== 'source');

  platformList.innerHTML = platforms.map(platform => {
    const status = platformStatus[platform.id];
    const isLoggedIn = status?.loggedIn;

    return `
      <div class="platform-card" data-platform="${platform.id}">
        <div class="platform-info">
          <div class="platform-icon">${getPlatformEmoji(platform.id)}</div>
          <div class="platform-details">
            <h4>${platform.name}</h4>
            <p>${platform.domain || '自定义平台'}</p>
          </div>
        </div>
        <div class="platform-status">
          <span class="status-badge ${isLoggedIn ? 'logged-in' : ''}">
            ${isLoggedIn ? '已登录' : '未登录'}
          </span>
          <button class="btn btn-secondary btn-sm" data-action="login">
            ${isLoggedIn ? '刷新' : '登录'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  // 登录按钮事件
  platformList.querySelectorAll('[data-action="login"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.platform-card');
      const platformId = card.dataset.platform;
      await handlePlatformLogin(platformId);
    });
  });
}

// 处理平台登录
async function handlePlatformLogin(platformId) {
  const platform = PlatformConfig.get(platformId);
  if (!platform) return;

  // 打开平台登录页面
  if (platform.domain) {
    const loginUrl = getLoginUrl(platformId);
    chrome.tabs.create({ url: loginUrl });
  } else {
    showToast('请先在自建站设置中配置该平台', 'warning');
  }
}

// 获取登录 URL
function getLoginUrl(platformId) {
  const loginUrls = {
    zhihu: 'https://www.zhihu.com/signin',
    juejin: 'https://juejin.cn/passport/login',
    csdn: 'https://passport.csdn.net/login',
    jianshu: 'https://www.jianshu.com/sign_in',
    weibo: 'https://weibo.com/login.php',
    xiaohongshu: 'https://creator.xiaohongshu.com/login',
    douyin: 'https://creator.douyin.com/',
    toutiao: 'https://mp.toutiao.com/auth/page/login',
    baijiahao: 'https://baijiahao.baidu.com/builder/app/login',
    bilibili: 'https://passport.bilibili.com/login'
  };

  return loginUrls[platformId] || `https://${PlatformConfig.get(platformId)?.domain}`;
}

// 获取平台 Emoji
function getPlatformEmoji(platformId) {
  const emojis = {
    zhihu: '📚',
    juejin: '💎',
    csdn: '💻',
    jianshu: '📝',
    weibo: '🔴',
    xiaohongshu: '📕',
    douyin: '🎵',
    toutiao: '📰',
    baijiahao: '🔵',
    bilibili: '📺',
    kuaishou: '⚡',
    cnblogs: '📖',
    segmentfault: '🔧',
    oschina: '🏪',
    douban: '🎬',
    jike: '🚴',
    twitter: '🐦',
    facebook: '👤'
  };

  return emojis[platformId] || '📄';
}

// 显示 Toast 提示
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast' + (type ? ` ${type}` : '');

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3000);
}

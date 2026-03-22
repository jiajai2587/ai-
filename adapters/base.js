/**
 * 文章同步助手 - 基础适配器类
 * 所有平台适配器都继承此类
 */

class BaseAdapter {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
    this.displayName = '基础平台';
    this.editUrl = '';
    this.domain = '';
  }

  /**
   * 检查登录状态
   * @returns {Promise<boolean>}
   */
  async checkLogin() {
    throw new Error('checkLogin 方法必须由子类实现');
  }

  /**
   * 发布文章
   * @param {Object} article - 文章对象
   * @returns {Promise<Object>}
   */
  async publish(article) {
    throw new Error('publish 方法必须由子类实现');
  }

  /**
   * 保存草稿
   * @param {Object} article - 文章对象
   * @returns {Promise<Object>}
   */
  async saveDraft(article) {
    throw new Error('saveDraft 方法必须由子类实现');
  }

  /**
   * 上传图片
   * @param {Object} image - 图片对象 { url, alt, blob }
   * @returns {Promise<string>} 上传后的图片 URL
   */
  async uploadImage(image) {
    throw new Error('uploadImage 方法必须由子类实现');
  }

  /**
   * 获取 Cookie
   * @param {string} name - Cookie 名称
   * @returns {Promise<string>}
   */
  async getCookie(name) {
    return new Promise((resolve, reject) => {
      chrome.cookies.get(
        { url: `https://${this.domain}`, name },
        (cookie) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(cookie?.value);
          }
        }
      );
    });
  }

  /**
   * 获取所有 Cookie
   * @returns {Promise<string>}
   */
  async getAllCookies() {
    return new Promise((resolve, reject) => {
      chrome.cookies.getAll({ domain: this.domain }, (cookies) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
          resolve(cookieString);
        }
      });
    });
  }

  /**
   * 发送 HTTP 请求
   * @param {string} url - 请求 URL
   * @param {Object} options - 请求选项
   * @returns {Promise<Response>}
   */
  async fetch(url, options = {}) {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    return fetch(url, { ...defaultOptions, ...options });
  }

  /**
   * 发送 GET 请求
   * @param {string} url - 请求 URL
   * @param {Object} params - 查询参数
   * @returns {Promise<any>}
   */
  async get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    const response = await this.fetch(fullUrl);

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 发送 POST 请求
   * @param {string} url - 请求 URL
   * @param {Object} data - 请求数据
   * @returns {Promise<any>}
   */
  async post(url, data = {}) {
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`请求失败: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * 打开编辑页面
   * @param {Object} article - 文章对象
   * @returns {Promise<number>} 标签页 ID
   */
  async openEditPage(article) {
    const tab = await chrome.tabs.create({
      url: this.editUrl,
      active: false
    });

    // 等待页面加载
    await new Promise(resolve => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });

    return tab.id;
  }

  /**
   * 注入内容到编辑器
   * @param {number} tabId - 标签页 ID
   * @param {Object} article - 文章对象
   * @param {Object} selectors - 选择器配置
   */
  async injectContent(tabId, article, selectors) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (article, selectors) => {
        // 填充标题
        if (selectors.title) {
          const titleEl = document.querySelector(selectors.title);
          if (titleEl) {
            titleEl.value = article.title;
            titleEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        // 填充内容
        if (selectors.content) {
          const contentEl = document.querySelector(selectors.content);
          if (contentEl) {
            if (contentEl.tagName === 'TEXTAREA' || contentEl.tagName === 'INPUT') {
              contentEl.value = article.content;
            } else {
              contentEl.innerHTML = article.content;
            }
            contentEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }

        // 填充封面图
        if (selectors.coverImage && article.coverImage) {
          // 通常需要模拟点击上传按钮
        }

        // 填充摘要
        if (selectors.summary && article.summary) {
          const summaryEl = document.querySelector(selectors.summary);
          if (summaryEl) {
            summaryEl.value = article.summary;
            summaryEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      },
      args: [article, selectors]
    });
  }

  /**
   * 等待元素出现
   * @param {number} tabId - 标签页 ID
   * @param {string} selector - 元素选择器
   * @param {number} timeout - 超时时间（毫秒）
   */
  async waitForElement(tabId, selector, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (selector) => !!document.querySelector(selector),
        args: [selector]
      });

      if (result[0].result) {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    throw new Error(`等待元素超时: ${selector}`);
  }

  /**
   * 点击元素
   * @param {number} tabId - 标签页 ID
   * @param {string} selector - 元素选择器
   */
  async clickElement(tabId, selector) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (selector) => {
        const el = document.querySelector(selector);
        if (el) {
          el.click();
        }
      },
      args: [selector]
    });
  }

  /**
   * 执行脚本
   * @param {number} tabId - 标签页 ID
   * @param {Function} func - 要执行的函数
   * @param {Array} args - 参数
   * @returns {Promise<any>}
   */
  async executeScript(tabId, func, args = []) {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func,
      args
    });
    return result[0].result;
  }

  /**
   * 等待指定时间
   * @param {number} ms - 毫秒数
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BaseAdapter;
}

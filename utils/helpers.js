/**
 * 通用工具函数模块
 */

const Utils = {
  /**
   * 生成唯一 ID
   * @returns {string}
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * 延迟执行
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * 重试函数
   * @param {Function} fn - 要执行的函数
   * @param {number} retries - 重试次数
   * @param {number} delay - 重试间隔
   * @returns {Promise<any>}
   */
  async retry(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.sleep(delay * (i + 1));
      }
    }
  },

  /**
   * 格式化日期
   * @param {Date|string} date - 日期对象或字符串
   * @param {string} format - 格式模板
   * @returns {string}
   */
  formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  /**
   * 截断字符串
   * @param {string} str - 原字符串
   * @param {number} length - 最大长度
   * @param {string} suffix - 后缀
   * @returns {string}
   */
  truncate(str, length = 100, suffix = '...') {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  /**
   * 解析 URL 参数
   * @param {string} url - URL 字符串
   * @returns {Object}
   */
  parseUrlParams(url) {
    const params = {};
    const searchParams = new URL(url).searchParams;
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
    return params;
  },

  /**
   * 获取域名
   * @param {string} url - URL 字符串
   * @returns {string}
   */
  getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  },

  /**
   * 清理 HTML 标签
   * @param {string} html - HTML 字符串
   * @returns {string}
   */
  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  },

  /**
   * 提取纯文本
   * @param {string} html - HTML 字符串
   * @param {number} maxLength - 最大长度
   * @returns {string}
   */
  extractText(html, maxLength = 200) {
    const text = this.stripHtml(html)
      .replace(/\s+/g, ' ')
      .trim();
    return this.truncate(text, maxLength);
  },

  /**
   * 解码 HTML 实体
   * @param {string} html - HTML 字符串
   * @returns {string}
   */
  decodeHtml(html) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  },

  /**
   * 转义 HTML
   * @param {string} text - 文本
   * @returns {string}
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  },

  /**
   * 复制到剪贴板
   * @param {string} text - 要复制的文本
   * @returns {Promise<void>}
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  },

  /**
   * 下载文件
   * @param {string} content - 文件内容
   * @param {string} filename - 文件名
   * @param {string} type - MIME 类型
   */
  downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * 批量处理
   * @param {Array} items - 要处理的项
   * @param {Function} handler - 处理函数
   * @param {number} concurrency - 并发数
   * @returns {Promise<Array>}
   */
  async batchProcess(items, handler, concurrency = 3) {
    const results = [];
    const queue = [...items];

    async function processQueue() {
      while (queue.length > 0) {
        const item = queue.shift();
        try {
          const result = await handler(item);
          results.push({ success: true, item, result });
        } catch (error) {
          results.push({ success: false, item, error: error.message });
        }
      }
    }

    const workers = Array(Math.min(concurrency, items.length))
      .fill(null)
      .map(() => processQueue());

    await Promise.all(workers);
    return results;
  },

  /**
   * 深拷贝
   * @param {any} obj - 要拷贝的对象
   * @returns {any}
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Object) {
      const copy = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          copy[key] = this.deepClone(obj[key]);
        }
      }
      return copy;
    }
    return obj;
  }
};

// 平台配置
const PlatformConfig = {
  // 所有支持的平台
  all: [
    // 技术社区
    { id: 'zhihu', name: '知乎', type: 'community', icon: 'zhihu.png', domain: 'zhihu.com' },
    { id: 'juejin', name: '掘金', type: 'community', icon: 'juejin.png', domain: 'juejin.cn' },
    { id: 'csdn', name: 'CSDN', type: 'community', icon: 'csdn.png', domain: 'csdn.net' },
    { id: 'jianshu', name: '简书', type: 'community', icon: 'jianshu.png', domain: 'jianshu.com' },
    { id: 'cnblogs', name: '博客园', type: 'community', icon: 'cnblogs.png', domain: 'cnblogs.com' },
    { id: 'segmentfault', name: 'SegmentFault', type: 'community', icon: 'segmentfault.png', domain: 'segmentfault.com' },
    { id: 'oschina', name: '开源中国', type: 'community', icon: 'oschina.png', domain: 'oschina.net' },
    { id: 'infoq', name: 'InfoQ', type: 'community', icon: 'infoq.png', domain: 'infoq.cn' },

    // 社交媒体
    { id: 'weibo', name: '微博', type: 'social', icon: 'weibo.png', domain: 'weibo.com' },
    { id: 'xiaohongshu', name: '小红书', type: 'social', icon: 'xiaohongshu.png', domain: 'xiaohongshu.com' },
    { id: 'douyin', name: '抖音', type: 'social', icon: 'douyin.png', domain: 'douyin.com' },
    { id: 'bilibili', name: 'B站', type: 'social', icon: 'bilibili.png', domain: 'bilibili.com' },
    { id: 'kuaishou', name: '快手', type: 'social', icon: 'kuaishou.png', domain: 'kuaishou.com' },

    // 资讯平台
    { id: 'toutiao', name: '今日头条', type: 'news', icon: 'toutiao.png', domain: 'toutiao.com' },
    { id: 'baijiahao', name: '百家号', type: 'news', icon: 'baijiahao.png', domain: 'baijiahao.baidu.com' },
    { id: 'dayu', name: '大鱼号', type: 'news', icon: 'dayu.png', domain: 'mp.dayu.com' },
    { id: 'penguin', name: '企鹅号', type: 'news', icon: 'penguin.png', domain: 'om.qq.com' },
    { id: 'sohu', name: '搜狐号', type: 'news', icon: 'sohu.png', domain: 'mp.sohu.com' },
    { id: 'neteas', name: '网易号', type: 'news', icon: 'neteas.png', domain: 'mp.163.com' },

    // 自建站
    { id: 'wordpress', name: 'WordPress', type: 'selfhosted', icon: 'wordpress.png' },
    { id: 'typecho', name: 'Typecho', type: 'selfhosted', icon: 'typecho.png' },
    { id: 'hexo', name: 'Hexo', type: 'static', icon: 'hexo.png' },
    { id: 'hugo', name: 'Hugo', type: 'static', icon: 'hugo.png' },

    // 源平台
    { id: 'wechat', name: '微信公众号', type: 'source', icon: 'wechat.png', domain: 'mp.weixin.qq.com' },

    // 其他
    { id: 'douban', name: '豆瓣', type: 'other', icon: 'douban.png', domain: 'douban.com' },
    { id: 'jike', name: '即刻', type: 'other', icon: 'jike.png', domain: 'okjike.com' },
    { id: 'twitter', name: 'Twitter', type: 'other', icon: 'twitter.png', domain: 'twitter.com' },
    { id: 'facebook', name: 'Facebook', type: 'other', icon: 'facebook.png', domain: 'facebook.com' }
  ],

  // 按类型分组
  byType() {
    const groups = {};
    for (const platform of this.all) {
      if (!groups[platform.type]) {
        groups[platform.type] = [];
      }
      groups[platform.type].push(platform);
    }
    return groups;
  },

  // 获取平台
  get(id) {
    return this.all.find(p => p.id === id);
  },

  // 类型名称映射
  typeNames: {
    community: '技术社区',
    social: '社交媒体',
    news: '资讯平台',
    selfhosted: '自建站',
    static: '静态博客',
    source: '源平台',
    other: '其他平台'
  }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Utils, PlatformConfig };
}

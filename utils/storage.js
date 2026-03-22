/**
 * 存储工具模块
 * 封装 Chrome Storage API，提供统一的存储接口
 */

const Storage = {
  /**
   * 获取存储数据
   * @param {string|string[]} keys - 要获取的键
   * @returns {Promise<Object>}
   */
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

  /**
   * 设置存储数据
   * @param {Object} data - 要存储的数据
   * @returns {Promise<void>}
   */
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

  /**
   * 删除存储数据
   * @param {string|string[]} keys - 要删除的键
   * @returns {Promise<void>}
   */
  async remove(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * 清空所有存储数据
   * @returns {Promise<void>}
   */
  async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  // 配置相关方法
  config: {
    async get() {
      const result = await Storage.get('config');
      return result.config || {
        platforms: {},
        ai: {
          provider: 'chrome', // chrome, openai, claude
          openaiKey: '',
          claudeKey: ''
        },
        publish: {
          defaultMode: 'draft', // draft, publish
          autoUploadImages: true,
          maxRetries: 3
        }
      };
    },

    async set(config) {
      await Storage.set({ config });
    },

    async update(partialConfig) {
      const config = await this.get();
      await this.set({ ...config, ...partialConfig });
    }
  },

  // 草稿相关方法
  drafts: {
    async getAll() {
      const result = await Storage.get('drafts');
      return result.drafts || [];
    },

    async add(draft) {
      const drafts = await this.getAll();
      drafts.push({
        ...draft,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      await Storage.set({ drafts });
    },

    async update(id, data) {
      const drafts = await this.getAll();
      const index = drafts.findIndex(d => d.id === id);
      if (index !== -1) {
        drafts[index] = {
          ...drafts[index],
          ...data,
          updatedAt: new Date().toISOString()
        };
        await Storage.set({ drafts });
      }
    },

    async remove(id) {
      const drafts = await this.getAll();
      const filtered = drafts.filter(d => d.id !== id);
      await Storage.set({ drafts: filtered });
    }
  },

  // 发布历史
  history: {
    async getAll() {
      const result = await Storage.get('history');
      return result.history || [];
    },

    async add(record) {
      const history = await this.getAll();
      history.unshift({
        ...record,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      });
      // 只保留最近 100 条记录
      if (history.length > 100) {
        history.length = 100;
      }
      await Storage.set({ history });
    },

    async clear() {
      await Storage.set({ history: [] });
    }
  },

  // 平台登录状态
  platforms: {
    async getStatus() {
      const result = await Storage.get('platformStatus');
      return result.platformStatus || {};
    },

    async setStatus(platform, status) {
      const platformStatus = await this.getStatus();
      platformStatus[platform] = {
        ...status,
        updatedAt: new Date().toISOString()
      };
      await Storage.set({ platformStatus });
    },

    async clearStatus(platform) {
      const platformStatus = await this.getStatus();
      delete platformStatus[platform];
      await Storage.set({ platformStatus });
    }
  }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}

/**
 * 请求封装模块
 * 提供统一的 HTTP 请求接口
 */

const Request = {
  /**
   * 发送请求
   * @param {string} url - 请求 URL
   * @param {Object} options - 请求选项
   * @returns {Promise<Response>}
   */
  async fetch(url, options = {}) {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    const mergedOptions = { ...defaultOptions, ...options };
    const { timeout, ...fetchOptions } = mergedOptions;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw error;
    }
  },

  /**
   * 发送 GET 请求
   * @param {string} url - 请求 URL
   * @param {Object} params - 查询参数
   * @param {Object} options - 额外选项
   * @returns {Promise<any>}
   */
  async get(url, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    const response = await this.fetch(fullUrl, {
      ...options,
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  },

  /**
   * 发送 POST 请求
   * @param {string} url - 请求 URL
   * @param {Object} data - 请求数据
   * @param {Object} options - 额外选项
   * @returns {Promise<any>}
   */
  async post(url, data = {}, options = {}) {
    const response = await this.fetch(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`请求失败: ${response.status} ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  },

  /**
   * 发送表单请求
   * @param {string} url - 请求 URL
   * @param {FormData|Object} data - 表单数据
   * @param {Object} options - 额外选项
   * @returns {Promise<any>}
   */
  async postForm(url, data, options = {}) {
    let formData;
    if (data instanceof FormData) {
      formData = data;
    } else {
      formData = new FormData();
      for (const key in data) {
        formData.append(key, data[key]);
      }
    }

    const response = await this.fetch(url, {
      ...options,
      method: 'POST',
      headers: {}, // 让浏览器自动设置 Content-Type
      body: formData
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  },

  /**
   * 下载文件
   * @param {string} url - 文件 URL
   * @param {string} filename - 保存的文件名
   * @returns {Promise<Blob>}
   */
  async download(url, filename) {
    const response = await this.fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }
    return response.blob();
  },

  /**
   * 获取 Cookie
   * @param {string} domain - 域名
   * @returns {Promise<string>}
   */
  async getCookies(domain) {
    return new Promise((resolve, reject) => {
      chrome.cookies.getAll({ domain }, (cookies) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          const cookieString = cookies
            .map(c => `${c.name}=${c.value}`)
            .join('; ');
          resolve(cookieString);
        }
      });
    });
  },

  /**
   * 设置 Cookie
   * @param {Object} details - Cookie 详情
   * @returns {Promise<void>}
   */
  async setCookie(details) {
    return new Promise((resolve, reject) => {
      chrome.cookies.set(details, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * 检查登录状态
   * @param {string} url - 检查 URL
   * @param {Function} validate - 验证函数
   * @returns {Promise<boolean>}
   */
  async checkLogin(url, validate) {
    try {
      const response = await this.fetch(url);
      const text = await response.text();
      return validate(text, response);
    } catch {
      return false;
    }
  }
};

// XML-RPC 客户端
const XMLRPC = {
  /**
   * 创建 XML-RPC 请求
   * @param {string} methodName - 方法名
   * @param {Array} params - 参数数组
   * @returns {string}
   */
  createRequest(methodName, params = []) {
    let xml = `<?xml version="1.0"?>
<methodCall>
  <methodName>${this.escapeXml(methodName)}</methodName>
  <params>`;

    for (const param of params) {
      xml += `
    <param>
      <value>${this.encodeValue(param)}</value>
    </param>`;
    }

    xml += `
  </params>
</methodCall>`;

    return xml;
  },

  /**
   * 编码值
   * @param {any} value - 值
   * @returns {string}
   */
  encodeValue(value) {
    if (value === null || value === undefined) {
      return '<nil/>';
    }

    switch (typeof value) {
      case 'string':
        return `<string>${this.escapeXml(value)}</string>`;
      case 'number':
        if (Number.isInteger(value)) {
          return `<int>${value}</int>`;
        }
        return `<double>${value}</double>`;
      case 'boolean':
        return `<boolean>${value ? 1 : 0}</boolean>`;
      case 'object':
        if (value instanceof Date) {
          return `<dateTime.iso8601>${value.toISOString()}</dateTime.iso8601>`;
        }
        if (Array.isArray(value)) {
          let arrayXml = '<array><data>';
          for (const item of value) {
            arrayXml += `<value>${this.encodeValue(item)}</value>`;
          }
          arrayXml += '</data></array>';
          return arrayXml;
        }
        // 对象
        let structXml = '<struct>';
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            structXml += `<member>
              <name>${this.escapeXml(key)}</name>
              <value>${this.encodeValue(value[key])}</value>
            </member>`;
          }
        }
        structXml += '</struct>';
        return structXml;
      default:
        return `<string>${this.escapeXml(String(value))}</string>`;
    }
  },

  /**
   * 转义 XML
   * @param {string} str - 字符串
   * @returns {string}
   */
  escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  /**
   * 解析 XML-RPC 响应
   * @param {string} xml - XML 字符串
   * @returns {any}
   */
  parseResponse(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // 检查错误
    const fault = doc.querySelector('fault');
    if (fault) {
      const errorValue = this.parseValue(fault.querySelector('value'));
      throw new Error(errorValue.faultString || 'XML-RPC 错误');
    }

    // 解析返回值
    const paramValue = doc.querySelector('params > param > value');
    if (paramValue) {
      return this.parseValue(paramValue);
    }

    return null;
  },

  /**
   * 解析值
   * @param {Element} valueElement - 值元素
   * @returns {any}
   */
  parseValue(valueElement) {
    if (!valueElement) return null;

    const child = valueElement.firstElementChild;
    if (!child) {
      return valueElement.textContent;
    }

    const tagName = child.tagName.toLowerCase();

    switch (tagName) {
      case 'string':
        return child.textContent;
      case 'int':
      case 'i4':
      case 'i8':
        return parseInt(child.textContent, 10);
      case 'double':
        return parseFloat(child.textContent);
      case 'boolean':
        return child.textContent === '1';
      case 'datetime.iso8601':
        return new Date(child.textContent);
      case 'nil':
        return null;
      case 'array':
        const data = child.querySelector('data');
        const values = data.querySelectorAll(':scope > value');
        return Array.from(values).map(v => this.parseValue(v));
      case 'struct':
        const members = child.querySelectorAll('member');
        const obj = {};
        members.forEach(member => {
          const name = member.querySelector('name').textContent;
          const value = member.querySelector('value');
          obj[name] = this.parseValue(value);
        });
        return obj;
      case 'base64':
        return atob(child.textContent);
      default:
        return child.textContent;
    }
  },

  /**
   * 发送 XML-RPC 请求
   * @param {string} url - 端点 URL
   * @param {string} methodName - 方法名
   * @param {Array} params - 参数
   * @returns {Promise<any>}
   */
  async call(url, methodName, params = []) {
    const requestBody = this.createRequest(methodName, params);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml'
      },
      body: requestBody
    });

    if (!response.ok) {
      throw new Error(`XML-RPC 请求失败: ${response.status}`);
    }

    const responseText = await response.text();
    return this.parseResponse(responseText);
  }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Request, XMLRPC };
}

/**
 * WordPress 适配器 (REST API / MetaWeblog)
 */

class WordPressAdapter {
  constructor(config = {}) {
    this.name = 'wordpress';
    this.displayName = 'WordPress';
    this.apiUrl = config.apiUrl || '';
    this.xmlrpcUrl = config.xmlrpcUrl || '';
    this.username = config.username || '';
    this.password = config.password || '';
    this.domain = '';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      if (!this.apiUrl || !this.username || !this.password) {
        return false;
      }

      const response = await fetch(`${this.apiUrl}/wp/v2/users/me`, {
        headers: {
          'Authorization': `Basic ${this.getAuthToken()}`
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 发布文章
   */
  async publish(article) {
    const response = await fetch(`${this.apiUrl}/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        excerpt: article.summary || '',
        status: 'publish'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '发布失败');
    }

    const result = await response.json();
    return {
      id: result.id,
      url: result.link,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    const response = await fetch(`${this.apiUrl}/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        excerpt: article.summary || '',
        status: 'draft'
      })
    });

    if (!response.ok) {
      throw new Error('保存草稿失败');
    }

    const result = await response.json();
    return {
      id: result.id,
      url: result.link,
      status: 'draft'
    };
  }

  /**
   * 上传图片
   */
  async uploadImage(image) {
    let blob = image.blob;
    if (!blob && image.url) {
      const response = await fetch(image.url);
      blob = await response.blob();
    }

    const formData = new FormData();
    formData.append('file', blob, 'image.jpg');
    formData.append('status', 'inherit');

    const response = await fetch(`${this.apiUrl}/wp/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const result = await response.json();
    return result.source_url;
  }

  /**
   * 获取认证 Token
   */
  getAuthToken() {
    return btoa(`${this.username}:${this.password}`);
  }

  /**
   * 使用 MetaWeblog API 发布（备用方案）
   */
  async publishViaXmlrpc(article) {
    const blogId = '1';
    const post = {
      title: article.title,
      description: article.content,
      categories: article.tags || [],
      dateCreated: new Date()
    };

    // 使用 XML-RPC 协议
    const xml = this.createXmlRpcRequest('metaWeblog.newPost', [
      blogId,
      this.username,
      this.password,
      post,
      true
    ]);

    const response = await fetch(this.xmlrpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml'
      },
      body: xml
    });

    if (!response.ok) {
      throw new Error('发布失败');
    }

    const responseText = await response.text();
    return this.parseXmlRpcResponse(responseText);
  }

  /**
   * 创建 XML-RPC 请求
   */
  createXmlRpcRequest(methodName, params) {
    let xml = `<?xml version="1.0"?>
<methodCall>
  <methodName>${methodName}</methodName>
  <params>`;

    for (const param of params) {
      xml += `
    <param>
      <value>${this.encodeXmlRpcValue(param)}</value>
    </param>`;
    }

    xml += `
  </params>
</methodCall>`;

    return xml;
  }

  /**
   * 编码 XML-RPC 值
   */
  encodeXmlRpcValue(value) {
    if (value === null || value === undefined) {
      return '<nil/>';
    }

    switch (typeof value) {
      case 'string':
        return `<string>${this.escapeXml(value)}</string>`;
      case 'number':
        return Number.isInteger(value)
          ? `<int>${value}</int>`
          : `<double>${value}</double>`;
      case 'boolean':
        return `<boolean>${value ? 1 : 0}</boolean>`;
      case 'object':
        if (value instanceof Date) {
          return `<dateTime.iso8601>${value.toISOString()}</dateTime.iso8601>`;
        }
        if (Array.isArray(value)) {
          let arrayXml = '<array><data>';
          for (const item of value) {
            arrayXml += `<value>${this.encodeXmlRpcValue(item)}</value>`;
          }
          arrayXml += '</data></array>';
          return arrayXml;
        }
        let structXml = '<struct>';
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            structXml += `<member>
              <name>${this.escapeXml(key)}</name>
              <value>${this.encodeXmlRpcValue(value[key])}</value>
            </member>`;
          }
        }
        structXml += '</struct>';
        return structXml;
      default:
        return `<string>${this.escapeXml(String(value))}</string>`;
    }
  }

  /**
   * 解析 XML-RPC 响应
   */
  parseXmlRpcResponse(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const fault = doc.querySelector('fault');
    if (fault) {
      throw new Error('XML-RPC 错误');
    }

    const paramValue = doc.querySelector('params > param > value');
    if (paramValue) {
      return paramValue.textContent;
    }

    return null;
  }

  /**
   * 转义 XML
   */
  escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WordPressAdapter;
}

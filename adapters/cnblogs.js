/**
 * 博客园适配器 (MetaWeblog API)
 */

class CnblogsAdapter {
  constructor(config = {}) {
    this.name = 'cnblogs';
    this.displayName = '博客园';
    this.apiUrl = config.apiUrl || '';
    this.username = config.username || '';
    this.password = config.password || '';
    this.domain = 'cnblogs.com';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      if (!this.apiUrl || !this.username || !this.password) {
        return false;
      }

      // 通过获取用户博客列表来验证
      const result = await this.call('blogger.getUsersBlogs', [this.username, this.password]);
      return result && result.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 发布文章
   */
  async publish(article) {
    const blogId = await this.getBlogId();

    const post = {
      title: article.title,
      description: article.content,
      categories: article.tags || [],
      dateCreated: new Date()
    };

    const result = await this.call('metaWeblog.newPost', [
      blogId,
      this.username,
      this.password,
      post,
      true // publish
    ]);

    return {
      id: result,
      url: `https://www.cnblogs.com/${this.username}/p/${result}.html`,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    const blogId = await this.getBlogId();

    const post = {
      title: article.title,
      description: article.content,
      categories: article.tags || [],
      dateCreated: new Date()
    };

    const result = await this.call('metaWeblog.newPost', [
      blogId,
      this.username,
      this.password,
      post,
      false // draft
    ]);

    return {
      id: result,
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

    const blogId = await this.getBlogId();
    const base64 = await this.blobToBase64(blob);

    const result = await this.call('metaWeblog.newMediaObject', [
      blogId,
      this.username,
      this.password,
      {
        name: `image_${Date.now()}.jpg`,
        type: 'image/jpeg',
        bits: base64
      }
    ]);

    return result.url;
  }

  /**
   * 获取博客 ID
   */
  async getBlogId() {
    const blogs = await this.call('blogger.getUsersBlogs', [this.username, this.password]);
    return blogs[0]?.blogid;
  }

  /**
   * 调用 MetaWeblog API
   */
  async call(methodName, params) {
    const xml = this.createXMLRequest(methodName, params);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml'
      },
      body: xml
    });

    if (!response.ok) {
      throw new Error(`MetaWeblog API 调用失败: ${response.status}`);
    }

    const responseText = await response.text();
    return this.parseXMLResponse(responseText);
  }

  /**
   * 创建 XML-RPC 请求
   */
  createXMLRequest(methodName, params) {
    let xml = `<?xml version="1.0"?>
<methodCall>
  <methodName>${methodName}</methodName>
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
  }

  /**
   * 编码值
   */
  encodeValue(value) {
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
  }

  /**
   * 解析 XML-RPC 响应
   */
  parseXMLResponse(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // 检查错误
    const fault = doc.querySelector('fault');
    if (fault) {
      throw new Error('MetaWeblog API 错误');
    }

    // 解析返回值
    const paramValue = doc.querySelector('params > param > value');
    if (paramValue) {
      return this.parseValue(paramValue);
    }

    return null;
  }

  /**
   * 解析值
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

  /**
   * Blob 转 Base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CnblogsAdapter;
}

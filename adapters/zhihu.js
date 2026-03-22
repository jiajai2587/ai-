/**
 * 知乎适配器
 */

class ZhihuAdapter {
  constructor() {
    this.name = 'zhihu';
    this.displayName = '知乎';
    this.editUrl = 'https://zhuanlan.zhihu.com/write';
    this.domain = 'zhihu.com';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      const response = await fetch('https://www.zhihu.com/api/v4/me', {
        credentials: 'include'
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
    // 获取必要的 token
    const token = await this.getXsrfToken();
    const drafted = false;

    const response = await fetch('https://zhuanlan.zhihu.com/api/articles', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Xsrftoken': token
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        excerpt: article.summary || '',
        column: null,
        topics: [],
        can_comment: true,
        disclaimer_type: 0,
        disclaimer: '',
        is_limited: false,
        disclaimer_status: 'closed',
       commercial: false,
        disclaimer_type: 0
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`发布失败: ${error}`);
    }

    const result = await response.json();
    return {
      id: result.id,
      url: result.url,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    const token = await this.getXsrfToken();

    const response = await fetch('https://zhuanlan.zhihu.com/api/articles/drafts', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Xsrftoken': token
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        excerpt: article.summary || ''
      })
    });

    if (!response.ok) {
      throw new Error('保存草稿失败');
    }

    const result = await response.json();
    return {
      id: result.id,
      status: 'draft'
    };
  }

  /**
   * 上传图片
   */
  async uploadImage(image) {
    const token = await this.getXsrfToken();

    // 获取图片数据
    let blob = image.blob;
    if (!blob && image.url) {
      const response = await fetch(image.url);
      blob = await response.blob();
    }

    const formData = new FormData();
    formData.append('picture', blob, 'image.jpg');

    const response = await fetch('https://zhuanlan.zhihu.com/api/images', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Xsrftoken': token
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const result = await response.json();
    return result.src;
  }

  /**
   * 获取 XSRF Token
   */
  async getXsrfToken() {
    return new Promise((resolve, reject) => {
      chrome.cookies.get(
        { url: 'https://www.zhihu.com', name: '_xsrf' },
        (cookie) => {
          if (cookie?.value) {
            resolve(cookie.value);
          } else {
            reject(new Error('未获取到登录凭证，请先登录知乎'));
          }
        }
      );
    });
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZhihuAdapter;
}

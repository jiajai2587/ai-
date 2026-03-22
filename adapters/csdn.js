/**
 * CSDN 适配器
 */

class CSDNAdapter {
  constructor() {
    this.name = 'csdn';
    this.displayName = 'CSDN';
    this.editUrl = 'https://mp.csdn.net/mp_blog/creation/editor';
    this.domain = 'csdn.net';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      const response = await fetch('https://bizapi.csdn.net/blog-console-api/v1/user/info', {
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
    const formData = new FormData();
    formData.append('title', article.title);
    formData.append('markdowncontent', article.markdown || article.content);
    formData.append('content', article.content);
    formData.append('tags', '');
    formData.append('categories', '');
    formData.append('type', 'original');
    formData.append('readType', 'public');
    formData.append('status', 'publish');

    const response = await fetch('https://mp.csdn.net/mp_blog/creation/save', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('发布失败');
    }

    const result = await response.json();
    if (result.status !== true) {
      throw new Error(result.message || '发布失败');
    }

    return {
      id: result.data?.id,
      url: result.data?.url,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    const formData = new FormData();
    formData.append('title', article.title);
    formData.append('markdowncontent', article.markdown || article.content);
    formData.append('content', article.content);
    formData.append('tags', '');
    formData.append('categories', '');
    formData.append('type', 'original');
    formData.append('readType', 'public');
    formData.append('status', 'draft');

    const response = await fetch('https://mp.csdn.net/mp_blog/creation/save', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('保存草稿失败');
    }

    const result = await response.json();
    if (result.status !== true) {
      throw new Error(result.message || '保存草稿失败');
    }

    return {
      id: result.data?.id,
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

    const response = await fetch('https://mp.csdn.net/UploadImage', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const result = await response.json();
    return result.url || result.data?.url;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSDNAdapter;
}

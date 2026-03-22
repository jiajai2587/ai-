/**
 * 简书适配器
 */

class JianshuAdapter {
  constructor() {
    this.name = 'jianshu';
    this.displayName = '简书';
    this.editUrl = 'https://www.jianshu.com/writer';
    this.domain = 'jianshu.com';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      const response = await fetch('https://www.jianshu.com/users/me.json', {
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
    const notebookId = await this.getDefaultNotebook();

    const response = await fetch('https://www.jianshu.com/notes', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        notebook_id: notebookId,
        autosave_control: 1
      })
    });

    if (!response.ok) {
      throw new Error('发布失败');
    }

    const result = await response.json();
    return {
      id: result.id,
      url: `https://www.jianshu.com/p/${result.slug}`,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    return this.publish(article); // 简书自动保存草稿
  }

  /**
   * 获取默认笔记本
   */
  async getDefaultNotebook() {
    const response = await fetch('https://www.jianshu.com/notebooks', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('获取笔记本失败');
    }

    const notebooks = await response.json();
    return notebooks[0]?.id;
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

    const response = await fetch('https://www.jianshu.com/upload_images', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const result = await response.json();
    return result.url;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JianshuAdapter;
}

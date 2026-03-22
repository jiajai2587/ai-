/**
 * 小红书适配器
 */

class XiaohongshuAdapter {
  constructor() {
    this.name = 'xiaohongshu';
    this.displayName = '小红书';
    this.editUrl = 'https://creator.xiaohongshu.com/publish/publish';
    this.domain = 'xiaohongshu.com';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      const response = await fetch('https://creator.xiaohongshu.com/api/user/info', {
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
    // 小红书必须上传图片
    if (!article.images?.length && !article.coverImage) {
      throw new Error('小红书发布需要至少一张图片');
    }

    // 上传图片
    const images = await this.uploadImages(article.images || [{ url: article.coverImage }]);

    const response = await fetch('https://creator.xiaohongshu.com/api/publish', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        note_type: 0, // 0: 图文, 1: 视频
        title: article.title,
        desc: article.content.substring(0, 1000), // 小红书字数限制
        images,
        topics: [],
        post_time: ''
      })
    });

    if (!response.ok) {
      throw new Error('发布失败');
    }

    const result = await response.json();
    return {
      id: result.data?.noteId,
      url: `https://www.xiaohongshu.com/explore/${result.data?.noteId}`,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    // 小红书草稿功能
    const images = await this.uploadImages(article.images || [{ url: article.coverImage }]);

    const response = await fetch('https://creator.xiaohongshu.com/api/draft', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: article.title,
        desc: article.content,
        images
      })
    });

    if (!response.ok) {
      throw new Error('保存草稿失败');
    }

    const result = await response.json();
    return {
      id: result.data?.draftId,
      status: 'draft'
    };
  }

  /**
   * 批量上传图片
   */
  async uploadImages(images) {
    const uploadedImages = [];

    for (const image of images.slice(0, 9)) { // 最多9张图
      try {
        const result = await this.uploadImage(image);
        uploadedImages.push(result);
      } catch (error) {
        console.error('上传图片失败:', error);
      }
    }

    return uploadedImages;
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

    const response = await fetch('https://creator.xiaohongshu.com/api/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const result = await response.json();
    return {
      url: result.data?.url,
      width: result.data?.width,
      height: result.data?.height
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = XiaohongshuAdapter;
}

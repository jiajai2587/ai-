/**
 * 抖音适配器
 */

class DouyinAdapter {
  constructor() {
    this.name = 'douyin';
    this.displayName = '抖音';
    this.editUrl = 'https://creator.douyin.com/creator-micro/content/publish';
    this.domain = 'douyin.com';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      const response = await fetch('https://creator.douyin.com/web/api/media/user/info/', {
        credentials: 'include'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 发布文章（图文）
   */
  async publish(article) {
    // 抖音图文需要上传图片
    if (!article.images?.length && !article.coverImage) {
      throw new Error('抖音图文发布需要至少一张图片');
    }

    // 上传图片
    const images = await this.uploadImages(article.images || [{ url: article.coverImage }]);

    const response = await fetch('https://creator.douyin.com/web/api/media/article/create/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content.substring(0, 2000),
        images: images.map(img => img.uri),
        cover_image: images[0]?.uri,
        publish_time: 0, // 0: 立即发布
        visible: 0 // 0: 公开
      })
    });

    if (!response.ok) {
      throw new Error('发布失败');
    }

    const result = await response.json();
    if (result.status_code !== 0) {
      throw new Error(result.status_msg || '发布失败');
    }

    return {
      id: result.data?.item_id,
      url: `https://www.douyin.com/note/${result.data?.item_id}`,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    const images = await this.uploadImages(article.images || [{ url: article.coverImage }]);

    const response = await fetch('https://creator.douyin.com/web/api/media/article/draft/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        images: images.map(img => img.uri)
      })
    });

    if (!response.ok) {
      throw new Error('保存草稿失败');
    }

    const result = await response.json();
    return {
      id: result.data?.draft_id,
      status: 'draft'
    };
  }

  /**
   * 批量上传图片
   */
  async uploadImages(images) {
    const uploadedImages = [];

    for (const image of images.slice(0, 12)) { // 抖音图文最多12张
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
    formData.append('image', blob, 'image.jpg');

    const response = await fetch('https://creator.douyin.com/web/api/media/image/upload/', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const result = await response.json();
    return {
      uri: result.data?.uri,
      url: result.data?.url
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DouyinAdapter;
}

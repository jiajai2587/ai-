/**
 * 微博适配器
 */

class WeiboAdapter {
  constructor() {
    this.name = 'weibo';
    this.displayName = '微博';
    this.editUrl = 'https://weibo.com';
    this.domain = 'weibo.com';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      const response = await fetch('https://weibo.com/ajax/profile/info', {
        credentials: 'include'
      });
      const data = await response.json();
      return data.ok === 1;
    } catch {
      return false;
    }
  }

  /**
   * 发布文章（长微博）
   */
  async publish(article) {
    // 微博文章需要先上传图片，再发布
    let picIds = [];
    if (article.images?.length > 0) {
      picIds = await this.uploadImages(article.images.slice(0, 9)); // 微博最多9张图
    }

    const formData = new FormData();
    formData.append('content', article.content.substring(0, 2000)); // 微博字数限制
    formData.append('visible', '0'); // 0: 公开
    formData.append('share_id', '');

    if (picIds.length > 0) {
      formData.append('pic_ids', picIds.join(','));
    }

    const response = await fetch('https://weibo.com/ajax/statuses/update', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('发布失败');
    }

    const result = await response.json();
    return {
      id: result.id,
      url: `https://weibo.com/${result.user?.id}/${result.id}`,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    // 微博没有草稿功能，直接发布
    return this.publish(article);
  }

  /**
   * 批量上传图片
   */
  async uploadImages(images) {
    const picIds = [];

    for (const image of images) {
      try {
        const picId = await this.uploadImage(image);
        picIds.push(picId);
      } catch (error) {
        console.error('上传图片失败:', error);
      }
    }

    return picIds;
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
    formData.append('b64_data', await this.blobToBase64(blob));

    const response = await fetch('https://picupload.weibo.com/interface/pic_upload.php', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const result = await response.json();
    return result.pic_id;
  }

  /**
   * Blob 转 Base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeiboAdapter;
}

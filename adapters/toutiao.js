/**
 * 今日头条适配器
 */

class ToutiaoAdapter {
  constructor() {
    this.name = 'toutiao';
    this.displayName = '今日头条';
    this.editUrl = 'https://mp.toutiao.com/profile_v4/index/content/publish';
    this.domain = 'toutiao.com';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      const response = await fetch('https://mp.toutiao.com/profile_v4/graph ql/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operationName: 'userInfoQuery',
          query: 'query userInfoQuery { userInfo { userId } }',
          variables: {}
        })
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
    formData.append('content', article.content);
    formData.append('save', '1'); // 1: 发布, 0: 草稿
    formData.append('article_ad', '0');
    formData.append('article_type', '0');
    formData.append('copyright', '0');

    const response = await fetch('https://mp.toutiao.com/profile_v4/graph ql/', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('发布失败');
    }

    const result = await response.json();
    return {
      id: result.data?.article_id,
      url: `https://www.toutiao.com/article/${result.data?.article_id}`,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    const formData = new FormData();
    formData.append('title', article.title);
    formData.append('content', article.content);
    formData.append('save', '0'); // 草稿

    const response = await fetch('https://mp.toutiao.com/profile_v4/graph ql/', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('保存草稿失败');
    }

    const result = await response.json();
    return {
      id: result.data?.article_id,
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
    formData.append('image', blob, 'image.jpg');

    const response = await fetch('https://mp.toutiao.com/profile_v4/graph ql/', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const result = await response.json();
    return result.data?.url;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToutiaoAdapter;
}

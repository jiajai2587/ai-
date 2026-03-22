/**
 * 掘金适配器
 */

class JuejinAdapter {
  constructor() {
    this.name = 'juejin';
    this.displayName = '掘金';
    this.editUrl = 'https://juejin.cn/editor/draft';
    this.domain = 'juejin.cn';
  }

  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      const response = await fetch('https://api.juejin.cn/user_api/v1/user/get', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const data = await response.json();
      return data.err_no === 0;
    } catch {
      return false;
    }
  }

  /**
   * 发布文章
   */
  async publish(article) {
    const draftId = await this.createDraft(article);

    // 发布文章
    const response = await fetch('https://api.juejin.cn/content_api/v1/article/publish', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        draft_id: draftId,
        sync_to_org: false,
        column_ids: [],
        theme_ids: []
      })
    });

    if (!response.ok) {
      throw new Error('发布失败');
    }

    const result = await response.json();
    if (result.err_no !== 0) {
      throw new Error(result.err_msg || '发布失败');
    }

    return {
      id: result.data?.article_id,
      url: `https://juejin.cn/post/${result.data?.article_id}`,
      status: 'published'
    };
  }

  /**
   * 保存草稿
   */
  async saveDraft(article) {
    const draftId = await this.createDraft(article);
    return {
      id: draftId,
      status: 'draft'
    };
  }

  /**
   * 创建草稿
   */
  async createDraft(article) {
    // 先创建草稿
    const createResponse = await fetch('https://api.juejin.cn/content_api/v1/article_draft/create', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: article.title,
        mark_content: article.markdown || article.content,
        content: article.content,
        cover_url: article.coverImage || '',
        cover_type: 1,
        category_id: '0', // 需要选择分类
        tag_ids: []
      })
    });

    if (!createResponse.ok) {
      throw new Error('创建草稿失败');
    }

    const createResult = await createResponse.json();
    if (createResult.err_no !== 0) {
      throw new Error(createResult.err_msg || '创建草稿失败');
    }

    return createResult.data?.id;
  }

  /**
   * 上传图片
   */
  async uploadImage(image) {
    // 获取图片数据
    let blob = image.blob;
    if (!blob && image.url) {
      const response = await fetch(image.url);
      blob = await response.blob();
    }

    const formData = new FormData();
    formData.append('file', blob, 'image.jpg');

    const response = await fetch('https://api.juejin.cn/content_api/v1/image/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error('图片上传失败');
    }

    const result = await response.json();
    if (result.err_no !== 0) {
      throw new Error(result.err_msg || '图片上传失败');
    }

    return result.data?.url;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JuejinAdapter;
}

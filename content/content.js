/**
 * 文章同步助手 - 内容脚本
 * 注入到网页中，负责提取页面内容
 */

(function () {
  'use strict';

  // 避免重复注入
  if (window.__articleSyncHelperInjected) return;
  window.__articleSyncHelperInjected = true;

  /**
   * 内容提取器
   */
  const ContentExtractor = {
    /**
     * 提取页面内容
     * @returns {Object}
     */
    extract() {
      const url = window.location.href;
      const hostname = window.location.hostname;

      // 根据不同网站使用不同的提取策略
      if (hostname.includes('mp.weixin.qq.com')) {
        return this.extractWechat();
      } else if (hostname.includes('zhihu.com')) {
        return this.extractZhihu();
      } else if (hostname.includes('juejin.cn')) {
        return this.extractJuejin();
      } else if (hostname.includes('csdn.net')) {
        return this.extractCSDN();
      } else if (hostname.includes('jianshu.com')) {
        return this.extractJianshu();
      } else {
        // 通用提取
        return this.extractGeneric();
      }
    },

    /**
     * 提取微信公众号文章
     */
    extractWechat() {
      const article = {
        url: window.location.href,
        source: '微信公众号',
        title: '',
        content: '',
        markdown: '',
        coverImage: '',
        images: [],
        author: '',
        publishTime: '',
        wordCount: 0
      };

      // 标题
      const titleEl = document.querySelector('#activity-name') ||
        document.querySelector('.rich_media_title') ||
        document.querySelector('h1');
      article.title = titleEl?.textContent?.trim() || document.title;

      // 作者
      const authorEl = document.querySelector('#js_name') ||
        document.querySelector('.rich_media_meta_nickname');
      article.author = authorEl?.textContent?.trim() || '';

      // 发布时间
      const timeEl = document.querySelector('#publish_time') ||
        document.querySelector('.rich_media_meta_date');
      article.publishTime = timeEl?.textContent?.trim() || '';

      // 正文内容
      const contentEl = document.querySelector('#js_content') ||
        document.querySelector('.rich_media_content');

      if (contentEl) {
        // 提取内容
        article.content = contentEl.innerHTML;

        // 提取图片
        const images = contentEl.querySelectorAll('img');
        article.images = Array.from(images).map(img => ({
          url: img.dataset.src || img.src,
          alt: img.alt || ''
        })).filter(img => img.url);

        // 提取封面图
        const coverEl = document.querySelector('.rich_media_thumb') ||
          document.querySelector('meta[property="og:image"]');
        if (coverEl) {
          article.coverImage = coverEl.getAttribute('content') ||
            coverEl.dataset.src || coverEl.src;
        } else if (article.images.length > 0) {
          article.coverImage = article.images[0].url;
        }

        // 转 Markdown
        article.markdown = this.toMarkdown(contentEl);

        // 计算字数
        article.wordCount = contentEl.textContent.replace(/\s/g, '').length;
      }

      return article;
    },

    /**
     * 提取知乎文章
     */
    extractZhihu() {
      const article = {
        url: window.location.href,
        source: '知乎',
        title: '',
        content: '',
        markdown: '',
        coverImage: '',
        images: [],
        author: '',
        publishTime: '',
        wordCount: 0
      };

      // 标题
      const titleEl = document.querySelector('.Post-Title') ||
        document.querySelector('.QuestionHeader-title') ||
        document.querySelector('h1');
      article.title = titleEl?.textContent?.trim() || document.title;

      // 作者
      const authorEl = document.querySelector('.AuthorInfo-name') ||
        document.querySelector('.Post-Author .UserLink-link');
      article.author = authorEl?.textContent?.trim() || '';

      // 正文
      const contentEl = document.querySelector('.Post-RichTextContainer') ||
        document.querySelector('.RichContent-inner') ||
        document.querySelector('.RichText');

      if (contentEl) {
        article.content = contentEl.innerHTML;

        // 提取图片
        const images = contentEl.querySelectorAll('img');
        article.images = Array.from(images).map(img => ({
          url: img.dataset.actualsrc || img.dataset.src || img.src,
          alt: img.alt || ''
        })).filter(img => img.url);

        if (article.images.length > 0) {
          article.coverImage = article.images[0].url;
        }

        article.markdown = this.toMarkdown(contentEl);
        article.wordCount = contentEl.textContent.replace(/\s/g, '').length;
      }

      return article;
    },

    /**
     * 提取掘金文章
     */
    extractJuejin() {
      const article = {
        url: window.location.href,
        source: '掘金',
        title: '',
        content: '',
        markdown: '',
        coverImage: '',
        images: [],
        author: '',
        publishTime: '',
        wordCount: 0
      };

      // 标题
      const titleEl = document.querySelector('.article-title') ||
        document.querySelector('h1');
      article.title = titleEl?.textContent?.trim() || document.title;

      // 作者
      const authorEl = document.querySelector('.author-name') ||
        document.querySelector('.user-name');
      article.author = authorEl?.textContent?.trim() || '';

      // 正文
      const contentEl = document.querySelector('.article-content') ||
        document.querySelector('.markdown-body');

      if (contentEl) {
        article.content = contentEl.innerHTML;

        const images = contentEl.querySelectorAll('img');
        article.images = Array.from(images).map(img => ({
          url: img.src,
          alt: img.alt || ''
        })).filter(img => img.url);

        // 掘金封面图
        const coverEl = document.querySelector('.article-hero-image img');
        if (coverEl) {
          article.coverImage = coverEl.src;
        } else if (article.images.length > 0) {
          article.coverImage = article.images[0].url;
        }

        article.markdown = this.toMarkdown(contentEl);
        article.wordCount = contentEl.textContent.replace(/\s/g, '').length;
      }

      return article;
    },

    /**
     * 提取 CSDN 文章
     */
    extractCSDN() {
      const article = {
        url: window.location.href,
        source: 'CSDN',
        title: '',
        content: '',
        markdown: '',
        coverImage: '',
        images: [],
        author: '',
        publishTime: '',
        wordCount: 0
      };

      // 标题
      const titleEl = document.querySelector('.title-article') ||
        document.querySelector('h1');
      article.title = titleEl?.textContent?.trim() || document.title;

      // 作者
      const authorEl = document.querySelector('.follow-nickName') ||
        document.querySelector('.user-name');
      article.author = authorEl?.textContent?.trim() || '';

      // 正文
      const contentEl = document.querySelector('#article_content') ||
        document.querySelector('.markdown_views');

      if (contentEl) {
        article.content = contentEl.innerHTML;

        const images = contentEl.querySelectorAll('img');
        article.images = Array.from(images).map(img => ({
          url: img.src,
          alt: img.alt || ''
        })).filter(img => img.url);

        if (article.images.length > 0) {
          article.coverImage = article.images[0].url;
        }

        article.markdown = this.toMarkdown(contentEl);
        article.wordCount = contentEl.textContent.replace(/\s/g, '').length;
      }

      return article;
    },

    /**
     * 提取简书文章
     */
    extractJianshu() {
      const article = {
        url: window.location.href,
        source: '简书',
        title: '',
        content: '',
        markdown: '',
        coverImage: '',
        images: [],
        author: '',
        publishTime: '',
        wordCount: 0
      };

      // 标题
      const titleEl = document.querySelector('.title') ||
        document.querySelector('h1');
      article.title = titleEl?.textContent?.trim() || document.title;

      // 作者
      const authorEl = document.querySelector('.author-name') ||
        document.querySelector('.name');
      article.author = authorEl?.textContent?.trim() || '';

      // 正文
      const contentEl = document.querySelector('.article') ||
        document.querySelector('.show-content');

      if (contentEl) {
        article.content = contentEl.innerHTML;

        const images = contentEl.querySelectorAll('img');
        article.images = Array.from(images).map(img => ({
          url: img.src,
          alt: img.alt || ''
        })).filter(img => img.url);

        if (article.images.length > 0) {
          article.coverImage = article.images[0].url;
        }

        article.markdown = this.toMarkdown(contentEl);
        article.wordCount = contentEl.textContent.replace(/\s/g, '').length;
      }

      return article;
    },

    /**
     * 通用内容提取
     * 使用 Readability 算法
     */
    extractGeneric() {
      const article = {
        url: window.location.href,
        source: window.location.hostname,
        title: '',
        content: '',
        markdown: '',
        coverImage: '',
        images: [],
        author: '',
        publishTime: '',
        wordCount: 0
      };

      // 尝试使用 Open Graph 标签
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');

      article.title = ogTitle?.content || document.title;

      if (ogImage?.content) {
        article.coverImage = ogImage.content;
      }

      // 尝试查找主要内容区域
      const possibleContentSelectors = [
        'article',
        '.article',
        '.post',
        '.content',
        '.entry-content',
        '.post-content',
        '.article-content',
        'main',
        '#main',
        '#content',
        '.main-content'
      ];

      let contentEl = null;
      for (const selector of possibleContentSelectors) {
        contentEl = document.querySelector(selector);
        if (contentEl && contentEl.textContent.length > 200) {
          break;
        }
      }

      if (!contentEl) {
        // 最后尝试使用 body
        contentEl = document.body;
      }

      // 克隆节点进行处理
      const clonedEl = contentEl.cloneNode(true);

      // 移除不需要的元素
      const removeSelectors = [
        'script', 'style', 'nav', 'header', 'footer',
        '.sidebar', '.comment', '.comments', '.ad', '.ads',
        '.navigation', '.menu', '.social', '.share'
      ];

      removeSelectors.forEach(selector => {
        clonedEl.querySelectorAll(selector).forEach(el => el.remove());
      });

      article.content = clonedEl.innerHTML;

      // 提取图片
      const images = clonedEl.querySelectorAll('img');
      article.images = Array.from(images).map(img => ({
        url: img.src,
        alt: img.alt || ''
      })).filter(img => img.url && !img.url.includes('avatar'));

      if (!article.coverImage && article.images.length > 0) {
        article.coverImage = article.images[0].url;
      }

      // 转 Markdown
      article.markdown = this.toMarkdown(clonedEl);
      article.wordCount = clonedEl.textContent.replace(/\s/g, '').length;

      // 提取作者
      const authorEl = document.querySelector('meta[name="author"]') ||
        document.querySelector('.author') ||
        document.querySelector('[rel="author"]');
      article.author = authorEl?.getAttribute('content') ||
        authorEl?.textContent?.trim() || '';

      // 提取发布时间
      const timeEl = document.querySelector('time') ||
        document.querySelector('meta[property="article:published_time"]') ||
        document.querySelector('.date') ||
        document.querySelector('.publish-time');
      article.publishTime = timeEl?.getAttribute('datetime') ||
        timeEl?.getAttribute('content') ||
        timeEl?.textContent?.trim() || '';

      return article;
    },

    /**
     * 将 HTML 转换为 Markdown
     * @param {Element} element - HTML 元素
     * @returns {string}
     */
    toMarkdown(element) {
      let markdown = '';

      // 简单的 HTML 到 Markdown 转换
      const processNode = (node, listDepth = 0) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }

        const tag = node.tagName.toLowerCase();
        let result = '';
        let prefix = '';
        let suffix = '';

        switch (tag) {
          case 'h1':
            prefix = '# ';
            suffix = '\n\n';
            break;
          case 'h2':
            prefix = '## ';
            suffix = '\n\n';
            break;
          case 'h3':
            prefix = '### ';
            suffix = '\n\n';
            break;
          case 'h4':
            prefix = '#### ';
            suffix = '\n\n';
            break;
          case 'h5':
            prefix = '##### ';
            suffix = '\n\n';
            break;
          case 'h6':
            prefix = '###### ';
            suffix = '\n\n';
            break;
          case 'p':
            suffix = '\n\n';
            break;
          case 'br':
            return '\n';
          case 'hr':
            return '\n---\n\n';
          case 'strong':
          case 'b':
            prefix = '**';
            suffix = '**';
            break;
          case 'em':
          case 'i':
            prefix = '*';
            suffix = '*';
            break;
          case 'code':
            if (node.parentElement?.tagName.toLowerCase() === 'pre') {
              return node.textContent;
            }
            prefix = '`';
            suffix = '`';
            break;
          case 'pre':
            const codeEl = node.querySelector('code') || node;
            const lang = codeEl.className.match(/language-(\w+)/)?.[1] || '';
            prefix = '\n```' + lang + '\n';
            suffix = '\n```\n\n';
            return prefix + codeEl.textContent + suffix;
          case 'blockquote':
            prefix = '\n> ';
            suffix = '\n\n';
            break;
          case 'a':
            const href = node.getAttribute('href') || '';
            suffix = `](${href})`;
            prefix = '[';
            break;
          case 'img':
            const src = node.getAttribute('src') || node.dataset.src || '';
            const alt = node.getAttribute('alt') || '';
            return `![${alt}](${src})`;
          case 'ul':
            suffix = '\n';
            break;
          case 'ol':
            suffix = '\n';
            break;
          case 'li':
            const parent = node.parentElement;
            if (parent?.tagName.toLowerCase() === 'ol') {
              const index = Array.from(parent.children).indexOf(node) + 1;
              prefix = '  '.repeat(listDepth) + `${index}. `;
            } else {
              prefix = '  '.repeat(listDepth) + '- ';
            }
            suffix = '\n';
            break;
          case 'table':
            return this.tableToMarkdown(node);
          case 'div':
          case 'section':
          case 'article':
          case 'span':
            // 忽略这些容器标签
            break;
          default:
            break;
        }

        // 处理子节点
        let childContent = '';
        for (const child of node.childNodes) {
          childContent += processNode(child, tag === 'ul' || tag === 'ol' ? listDepth + 1 : listDepth);
        }

        // 特殊处理：引用块内的换行
        if (tag === 'blockquote') {
          childContent = childContent.replace(/\n/g, '\n> ');
        }

        return prefix + childContent + suffix;
      };

      markdown = processNode(element);

      // 清理多余空行
      markdown = markdown
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\s+|\s+$/g, '');

      return markdown;
    },

    /**
     * 表格转 Markdown
     * @param {Element} table - 表格元素
     * @returns {string}
     */
    tableToMarkdown(table) {
      const rows = table.querySelectorAll('tr');
      const result = [];

      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const cellContents = Array.from(cells).map(cell => {
          return cell.textContent.trim().replace(/\|/g, '\\|');
        });

        result.push('| ' + cellContents.join(' | ') + ' |');

        // 添加表头分隔线
        if (rowIndex === 0 && row.querySelectorAll('th').length > 0) {
          const separator = cellContents.map(() => '---');
          result.push('| ' + separator.join(' | ') + ' |');
        }
      });

      return '\n' + result.join('\n') + '\n\n';
    }
  };

  // 消息监听
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      try {
        const article = ContentExtractor.extract();
        sendResponse({ success: true, data: article });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    } else if (request.action === 'downloadMarkdown') {
      // 下载 Markdown 文件
      const { title, markdown } = request.data;
      const blob = new Blob([markdown || ''], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'article'}.md`;
      a.click();
      URL.revokeObjectURL(url);
      sendResponse({ success: true });
    }
    return true;
  });

  // 添加快捷键支持
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + E: 提取内容
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      const article = ContentExtractor.extract();
      console.log('提取的文章:', article);
    }
  });
})();

export function getStaticWidgetScript(): string {
  return `
class NasaFacebookFeed extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.allPosts = [];
    this.visibleCount = 0;
    this.loading = true;
  }

  static get observedAttributes() {
    return ['limit', 'step'];
  }

  get limit() {
    return parseInt(this.getAttribute('limit') || '5');
  }

  get step() {
    return parseInt(this.getAttribute('step') || this.getAttribute('limit') || '5');
  }

  get hasMore() {
    return this.visibleCount < this.allPosts.length;
  }

  connectedCallback() {
    this.render();
    this.loadFeed();
  }

  getScriptBaseUrl() {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      if (script.src && script.src.includes('widget.js')) {
        return script.src.replace(/widget\\.js.*$/, '');
      }
    }
    return './';
  }

  async loadFeed() {
    try {
      const baseUrl = this.getScriptBaseUrl();
      const response = await fetch(baseUrl + 'feed.json');
      if (!response.ok) throw new Error('Failed to load feed');
      this.allPosts = await response.json();
      this.visibleCount = Math.min(this.limit, this.allPosts.length);
      this.loading = false;
      this.render();
    } catch (error) {
      console.error('Failed to load Facebook feed:', error);
      this.loading = false;
      this.render();
    }
  }

  showMore() {
    this.visibleCount = Math.min(this.visibleCount + this.step, this.allPosts.length);
    this.render();
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
      /youtube\\.com\\/watch\\?v=([^&]+)/,
      /youtu\\.be\\/([^?]+)/,
      /youtube\\.com\\/embed\\/([^?]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  extractVimeoId(url) {
    if (!url) return null;
    const patterns = [
      /vimeo\\.com\\/(\\d+)/,
      /player\\.vimeo\\.com\\/video\\/(\\d+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  getVideoNoticeText() {
    const lang = navigator.language || navigator.userLanguage || '';
    const isDanish = lang.toLowerCase().startsWith('da');
    return isDanish ? 'Video tilgængelig på Facebook' : 'Video available on Facebook';
  }

  getMediaHtml(post) {
    const attachment = post.attachments?.data?.[0];
    const attachmentUrl = attachment?.url || '';
    const attachmentType = attachment?.type || '';

    if (attachment && attachment.media?.source) {
      return '<video part="video" controls playsinline preload="metadata">' +
        '<source src="' + attachment.media.source + '" type="video/mp4">' +
        '</video>';
    }

    const youtubeId = this.extractYouTubeId(attachmentUrl);
    if (youtubeId) {
      return '<div part="video-container">' +
        '<iframe part="video-embed" src="https://www.youtube.com/embed/' + youtubeId + '" ' +
        'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'allowfullscreen></iframe>' +
        '</div>';
    }

    const vimeoId = this.extractVimeoId(attachmentUrl);
    if (vimeoId) {
      return '<div part="video-container">' +
        '<iframe part="video-embed" src="https://player.vimeo.com/video/' + vimeoId + '" ' +
        'frameborder="0" allow="autoplay; fullscreen; picture-in-picture" ' +
        'allowfullscreen></iframe>' +
        '</div>';
    }

    if ((attachmentType.includes('video') || attachmentType === 'share') && post.full_picture && attachmentUrl) {
      return '<a part="video-link" href="' + attachmentUrl + '" target="_blank" rel="noopener">' +
        '<div part="video-thumbnail">' +
        '<img part="image" src="' + post.full_picture + '" alt="" loading="lazy">' +
        '<div part="play-overlay"><svg part="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>' +
        '</div>' +
        '</a>';
    }

    if (attachmentType === 'native_templates' || attachmentType.includes('video') || (attachmentType === 'share' && !post.full_picture)) {
      const videoIcon = '<svg part="video-notice-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>';
      return '<a part="video-notice" href="' + post.permalink_url + '" target="_blank" rel="noopener">' +
        videoIcon +
        '<span part="video-notice-text">' + this.getVideoNoticeText() + '</span>' +
        '</a>';
    }

    if (post.full_picture) {
      return '<img part="image" src="' + post.full_picture + '" alt="" loading="lazy">';
    }
    return '';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    if (this.loading) {
      this.shadowRoot.innerHTML = '<div part="container"><div part="loading">Loading...</div></div>';
      return;
    }

    const visiblePosts = this.allPosts.slice(0, this.visibleCount);
    const postsHtml = visiblePosts.map(post => {
      const mediaHtml = this.getMediaHtml(post);
      const messageHtml = post.message
        ? '<p part="message">' + this.escapeHtml(post.message) + '</p>'
        : '';

      return '<article part="post">' +
        '<time part="date" datetime="' + post.created_time + '">' + this.formatDate(post.created_time) + '</time>' +
        messageHtml +
        mediaHtml +
        '<a part="link" href="' + post.permalink_url + '" target="_blank" rel="noopener">View on Facebook</a>' +
        '</article>';
    }).join('');

    this.shadowRoot.innerHTML =
      '<div part="container">' +
        postsHtml +
        (this.hasMore ? '<button part="load-more">Load more</button>' : '') +
      '</div>';

    const loadMoreBtn = this.shadowRoot.querySelector('[part="load-more"]');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.showMore());
    }
  }
}

customElements.define('nasa-facebook-feed', NasaFacebookFeed);
`;
}

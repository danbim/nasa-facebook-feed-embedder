export function getWidgetScript(): string {
  return `
class NasaFacebookFeed extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.posts = [];
    this.cursor = null;
    this.hasMore = true;
    this.loading = false;
  }

  static get observedAttributes() {
    return ['api', 'limit'];
  }

  get api() {
    return this.getAttribute('api') || '';
  }

  get limit() {
    return parseInt(this.getAttribute('limit') || '10');
  }

  connectedCallback() {
    this.render();
    this.loadPosts();
  }

  async loadPosts() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    this.updateLoadingState();

    try {
      let url = this.api + '?limit=' + this.limit;
      if (this.cursor) {
        url += '&cursor=' + encodeURIComponent(this.cursor);
      }

      const response = await fetch(url);
      const data = await response.json();

      this.posts = [...this.posts, ...data.posts];
      this.cursor = data.paging.next_cursor;
      this.hasMore = data.paging.has_more;
      this.render();
    } catch (error) {
      console.error('Failed to load Facebook feed:', error);
    } finally {
      this.loading = false;
      this.updateLoadingState();
    }
  }

  updateLoadingState() {
    const loadingEl = this.shadowRoot.querySelector('[part="loading"]');
    const loadMoreBtn = this.shadowRoot.querySelector('[part="load-more"]');
    if (loadingEl) loadingEl.style.display = this.loading ? 'block' : 'none';
    if (loadMoreBtn) loadMoreBtn.style.display = this.loading ? 'none' : (this.hasMore ? 'block' : 'none');
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
    // Match youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
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
    // Match vimeo.com/ID or player.vimeo.com/video/ID
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

  getMediaHtml(post) {
    const attachment = post.attachments?.data?.[0];
    const attachmentUrl = attachment?.url || '';
    const attachmentType = attachment?.type || '';

    // Check for native Facebook video with source
    if (attachment && attachment.media?.source) {
      return '<video part="video" controls playsinline preload="metadata">' +
        '<source src="' + attachment.media.source + '" type="video/mp4">' +
        '</video>';
    }

    // Check for YouTube embed
    const youtubeId = this.extractYouTubeId(attachmentUrl);
    if (youtubeId) {
      return '<div part="video-container">' +
        '<iframe part="video-embed" src="https://www.youtube.com/embed/' + youtubeId + '" ' +
        'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'allowfullscreen></iframe>' +
        '</div>';
    }

    // Check for Vimeo embed
    const vimeoId = this.extractVimeoId(attachmentUrl);
    if (vimeoId) {
      return '<div part="video-container">' +
        '<iframe part="video-embed" src="https://player.vimeo.com/video/' + vimeoId + '" ' +
        'frameborder="0" allow="autoplay; fullscreen; picture-in-picture" ' +
        'allowfullscreen></iframe>' +
        '</div>';
    }

    // For video_inline or share types with thumbnail, show play overlay
    if ((attachmentType.includes('video') || attachmentType === 'share') && post.full_picture && attachmentUrl) {
      return '<a part="video-link" href="' + attachmentUrl + '" target="_blank" rel="noopener">' +
        '<div part="video-thumbnail">' +
        '<img part="image" src="' + post.full_picture + '" alt="" loading="lazy">' +
        '<div part="play-overlay"><svg part="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>' +
        '</div>' +
        '</a>';
    }

    // Fall back to image
    if (post.full_picture) {
      return '<img part="image" src="' + post.full_picture + '" alt="" loading="lazy">';
    }
    return '';
  }

  render() {
    const postsHtml = this.posts.map(post => {
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
        '<button part="load-more" style="display: ' + (this.hasMore && !this.loading ? 'block' : 'none') + '">Load more</button>' +
        '<div part="loading" style="display: ' + (this.loading ? 'block' : 'none') + '">Loading...</div>' +
      '</div>';

    const loadMoreBtn = this.shadowRoot.querySelector('[part="load-more"]');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadPosts());
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('nasa-facebook-feed', NasaFacebookFeed);
`;
}

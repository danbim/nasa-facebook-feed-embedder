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

  getMediaHtml(post) {
    // Check for video in attachments
    const attachment = post.attachments?.data?.[0];
    if (attachment && attachment.media?.source) {
      return '<video part="video" controls playsinline preload="metadata">' +
        '<source src="' + attachment.media.source + '" type="video/mp4">' +
        '</video>';
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

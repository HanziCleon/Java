// Notification Manager
class NotificationManager {
  static show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>${this.getIcon(type)}</span>
        <span>${message}</span>
      </div>
    `;
    
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);

    return toast;
  }

  static getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  static getContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }
}

// Data Manager
class DataManager {
  static async fetchAnimeData() {
    try {
      const response = await fetch('/api/anime');
      if (!response.ok) throw new Error('Failed to fetch');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      NotificationManager.show('Gagal memuat data anime', 'error');
      return [];
    }
  }

  static processAnimeData(rawData) {
    return rawData.map(anime => ({
      ...anime,
      id: anime.id || 0,
      title: anime.judul || 'Judul Tidak Diketahui',
      thumb: anime.thumbnail || this.generatePlaceholderImage(anime.judul),
      episodes: anime.episodes || [],
      episodeCount: anime.episodes ? anime.episodes.length : 0,
      searchText: `${anime.judul}`.toLowerCase()
    }));
  }

  static generatePlaceholderImage(title) {
    const colors = ['#fbbf24', '#f59e0b', '#d97706', '#92400e'];
    const color = colors[title.length % colors.length];
    const initials = title.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
    
    return `data:image/svg+xml;charset=UTF-8,%3csvg width='200' height='250' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='${color}'/%3e%3ctext x='50%25' y='50%25' font-size='36' fill='%23000' text-anchor='middle' dominant-baseline='middle' font-family='Inter,sans-serif' font-weight='700'%3e${initials}%3c/text%3e%3c/svg%3e`;
  }
}

// URL Manager
class URLManager {
  static createStreamingUrl(anime, episodeNum = 1) {
    return `/watch?id=${anime.id}&ep=${episodeNum}`;
  }

  static parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      search: urlParams.get('search') || '',
      sort: urlParams.get('sort') || 'title'
    };
  }

  static updateURL(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'title') {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.replaceState({}, '', url);
  }
}

// Anime Card Component
class AnimeCard {
  static create(anime) {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = URLManager.createStreamingUrl(anime);
    
    const truncate = (text, maxLength) => {
      if (!text) return 'N/A';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };
    
    card.innerHTML = `
      <div class="card-image">
        <img src="${anime.thumb}" alt="${anime.title}" loading="lazy">
        <div class="card-overlay">
          <div class="play-icon">▶</div>
        </div>
      </div>
      <div class="card-info">
        <h3 class="card-title">${truncate(anime.title, 40)}</h3>
        <div class="card-details">
          ${anime.episodeCount > 0 ? `<div class="episodes">📺 ${anime.episodeCount} Episode</div>` : '<div></div>'}
        </div>
      </div>
    `;
    
    card.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = URLManager.createStreamingUrl(anime);
    });
    
    return card;
  }
}

// Main Controller
class IndexController {
  constructor() {
    this.elements = this.getElements();
    this.currentData = [];
    this.animeData = [];
    this.isGridView = localStorage.getItem('dongtube_view') !== 'list';
    this.searchTimeout = null;
    
    if (this.elements.animeList) {
      this.init();
    }
  }

  getElements() {
    return {
      animeList: document.getElementById('animeList'),
      searchInput: document.getElementById('searchInput'),
      sortSelect: document.getElementById('sortSelect'),
      resetBtn: document.getElementById('resetBtn'),
      loadingIndicator: document.getElementById('loadingIndicator'),
      resultCount: document.getElementById('resultCount'),
      noResults: document.getElementById('noResults'),
      skeletonWrapper: document.getElementById('skeletonWrapper'),
      gridViewBtn: document.getElementById('gridView'),
      listViewBtn: document.getElementById('listView'),
      animeCountStat: document.getElementById('animeCount'),
      authBtn: document.getElementById('authBtn')
    };
  }

  async init() {
    this.setupAuth();
    this.bindEvents();
    this.showLoading();
    
    this.animeData = await DataManager.fetchAnimeData();
    this.animeData = DataManager.processAnimeData(this.animeData);
    this.currentData = [...this.animeData];
    
    this.applyUrlParams();
    this.updateStats();
    this.hideLoading();
    this.renderAnimeList();
    this.updateViewMode();
  }

  setupAuth() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      this.elements.authBtn.textContent = '🔐 Login';
      this.elements.authBtn.onclick = () => window.location.href = '/auth';
    } else {
      const user = JSON.parse(currentUser);
      this.elements.authBtn.textContent = `👤 ${user.username}`;
      this.elements.authBtn.onclick = () => {
        const menu = confirm('Logout?');
        if (menu) {
          localStorage.removeItem('currentUser');
          window.location.reload();
        }
      };
    }
  }

  applyUrlParams() {
    const params = URLManager.parseUrlParams();
    if (params.search) this.elements.searchInput.value = params.search;
    if (params.sort !== 'title') this.elements.sortSelect.value = params.sort;
    if (params.search || params.sort !== 'title') this.filterAndSearch();
  }

  bindEvents() {
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', () => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.filterAndSearch(), 300);
      });
    }

    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('change', () => this.filterAndSearch());
    }

    if (this.elements.resetBtn) {
      this.elements.resetBtn.addEventListener('click', () => this.resetFilters());
    }

    if (this.elements.gridViewBtn && this.elements.listViewBtn) {
      this.elements.gridViewBtn.addEventListener('click', () => this.setViewMode(true));
      this.elements.listViewBtn.addEventListener('click', () => this.setViewMode(false));
    }
  }

  showLoading() {
    if (this.elements.loadingIndicator) this.elements.loadingIndicator.style.display = 'flex';
    if (this.elements.animeList) this.elements.animeList.style.display = 'none';
    if (this.elements.skeletonWrapper) this.elements.skeletonWrapper.style.display = 'grid';
  }

  hideLoading() {
    if (this.elements.loadingIndicator) this.elements.loadingIndicator.style.display = 'none';
    if (this.elements.animeList) this.elements.animeList.style.display = 'grid';
    if (this.elements.skeletonWrapper) this.elements.skeletonWrapper.style.display = 'none';
  }

  filterAndSearch() {
    this.showLoading();

    const query = this.elements.searchInput?.value.toLowerCase().trim() || '';
    const sortBy = this.elements.sortSelect?.value || 'title';

    let filtered = this.animeData.filter(anime => {
      return !query || anime.searchText.includes(query);
    });

    filtered = this.sortData(filtered, sortBy);

    URLManager.updateURL({ search: query, sort: sortBy });
    this.currentData = filtered;
    
    setTimeout(() => {
      this.hideLoading();
      this.renderAnimeList();
    }, 200);
  }

  sortData(data, sortBy) {
    const sortFunctions = {
      title: (a, b) => a.title.localeCompare(b.title),
      newest: (a, b) => b.id - a.id,
      episodes: (a, b) => b.episodeCount - a.episodeCount
    };

    return [...data].sort(sortFunctions[sortBy] || sortFunctions.title);
  }

  renderAnimeList() {
    if (!this.elements.animeList) return;

    this.updateResultCount(this.currentData.length);

    if (this.currentData.length === 0) {
      this.showNoResults();
      return;
    }

    this.hideNoResults();
    this.elements.animeList.innerHTML = '';

    this.currentData.forEach((anime) => {
      const card = AnimeCard.create(anime);
      this.elements.animeList.appendChild(card);
    });

    this.updateViewMode();
  }

  updateViewMode() {
    if (!this.elements.animeList) return;
    this.elements.animeList.className = this.isGridView ? 'anime-grid' : 'anime-grid list-view';
    
    if (this.elements.gridViewBtn && this.elements.listViewBtn) {
      this.elements.gridViewBtn.classList.toggle('active', this.isGridView);
      this.elements.listViewBtn.classList.toggle('active', !this.isGridView);
    }
  }

  setViewMode(isGrid) {
    this.isGridView = isGrid;
    localStorage.setItem('dongtube_view', isGrid ? 'grid' : 'list');
    this.updateViewMode();
  }

  resetFilters() {
    if (this.elements.searchInput) this.elements.searchInput.value = '';
    if (this.elements.sortSelect) this.elements.sortSelect.value = 'title';
    
    URLManager.updateURL({ search: null, sort: null });
    this.currentData = [...this.animeData];
    this.renderAnimeList();
    NotificationManager.show('Filter berhasil direset', 'success');
  }

  updateResultCount(count) {
    if (this.elements.resultCount) {
      this.elements.resultCount.textContent = count.toLocaleString();
    }
  }

  showNoResults() {
    if (this.elements.noResults) this.elements.noResults.style.display = 'block';
  }

  hideNoResults() {
    if (this.elements.noResults) this.elements.noResults.style.display = 'none';
  }

  updateStats() {
    if (this.elements.animeCountStat) {
      this.animateCounter(this.elements.animeCountStat, this.animeData.length, 1500);
    }
  }

  animateCounter(element, target, duration) {
    const start = 0;
    const startTime = performance.now();
    
    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(start + (target - start) * easeOutQuart);
      
      element.textContent = current.toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target.toLocaleString();
      }
    };
    
    requestAnimationFrame(updateCounter);
  }
}

function resetFilters() {
  if (window.indexController) {
    window.indexController.resetFilters();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.indexController = new IndexController();
  document.body.classList.add('loaded');
});
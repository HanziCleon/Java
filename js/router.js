// Router module for AnimeFlow SPA
const Router = {
    currentRoute: '/',
    currentData: null,
    isInitialized: false,
    currentEditingAnimeId: null,
    
    routes: {
        '/': { 
            component: 'auth',
            requireAuth: false,
            title: 'Sign In - AnimeFlow'
        },
        '/browse': { 
            component: 'browse',
            requireAuth: true,
            title: 'Browse Anime - AnimeFlow'
        },
        '/trending': { 
            component: 'trending',
            requireAuth: true,
            title: 'Trending Anime - AnimeFlow'
        },
        '/watch': { 
            component: 'player',
            requireAuth: true,
            title: 'Watch - AnimeFlow'
        },
        '/admin': { 
            component: 'admin',
            requireAuth: true,
            requireAdmin: true,
            title: 'Admin Panel - AnimeFlow'
        },
        '/search': { 
            component: 'search',
            requireAuth: true,
            title: 'Search Results - AnimeFlow'
        }
    },

        const animeId = data?.animeId || Router.getQueryParam('anime');
        const episodeId = data?.episodeId || Router.getQueryParam('episode');
        
        if (!animeId) {
            Router.navigate('/browse');
            return;
        }

        const anime = Database.anime.getById(animeId);
        if (!anime) {
            Utils.showToast('Anime not found', 'error');
            Router.navigate('/browse');
            return;
        }

        container.innerHTML = `
            <div class="player-page">
                <div class="player-layout">
                    <div class="video-section">
                        <div class="video-player" id="videoPlayer">
                            <video class="video-element" id="videoElement" preload="metadata">
                                <source src="" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                            <div class="video-overlay" id="videoOverlay">
                                <button class="play-btn" onclick="Player.togglePlay()">▶</button>
                            </div>
                        </div>
                        
                        <div class="video-controls">
                            <div class="episode-info">
                                <h1 class="episode-title" id="currentEpisodeTitle">${anime.title}</h1>
                                <div class="episode-meta">
                                    <span id="episodeSeason">${anime.year}</span>
                                    <span>•</span>
                                    <span id="episodeDuration">Loading...</span>
                                    <span>•</span>
                                    <span id="episodeQuality">1080p HD</span>
                                </div>
                            </div>
                            
                            <div class="progress-section">
                                <div class="progress-bar" onclick="Player.seekVideo(event)" id="progressBar">
                                    <div class="progress-fill" id="progressFill"></div>
                                </div>
                                <div class="progress-time">
                                    <span id="currentTime">0:00</span>
                                    <span id="totalTime">0:00</span>
                                </div>
                            </div>
                            
                            <div class="control-buttons">
                                <button class="control-btn primary" id="playPauseBtn" onclick="Player.togglePlay()">▶</button>
                                <button class="control-btn" onclick="Player.skipTime(-10)">⪤</button>
                                <button class="control-btn" onclick="Player.skipTime(10)">⪢</button>
                                <button class="control-btn" id="muteBtn" onclick="Player.toggleMute()">🔊</button>
                                <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="100" oninput="Player.setVolume(this.value)">
                                <button class="control-btn" onclick="Player.changePlaybackSpeed()">1x</button>
                                <button class="control-btn" onclick="Player.toggleFullscreen()">⛶</button>
                                <span class="time-display" id="timeDisplay">0:00 / 0:00</span>
                            </div>
                        </div>
                    </div>

                    <div class="episodes-section">
                        <h3 class="section-title-with-icon">🎬 Episodes</h3>
                        <div class="episodes-container">
                            <div class="episodes-scroll" id="episodesList">
                                ${Router.renderEpisodesList(anime.episodes || [])}
                            </div>
                        </div>
                    </div>

                    <div class="comments-section">
                        <div class="comments-header">
                            <h3 class="section-title-with-icon">💬 Comments</h3>
                            <span class="comments-count" id="commentsCount">0 comments</span>
                        </div>

                        <div class="comment-form">
                            <textarea class="comment-input" placeholder="Add a comment..." id="commentInput" rows="1"></textarea>
                            <button class="comment-submit" onclick="Router.addComment()">Post</button>
                        </div>

                        <div class="comments-list" id="commentsList"></div>
                    </div>
                </div>
            </div>
        `;

        // Initialize player
        Player.init(anime, episodeId);
        
        // Load comments
        Router.loadComments(animeId);

        // Hide search in navigation for player
        Utils.select('#navSearch').style.display = 'none';
    },

    // Load admin component
    loadAdminComponent: async (container, data) => {
        if (!Auth.isAdmin()) {
            Utils.showToast(CONFIG.ERRORS.ADMIN_REQUIRED, 'error');
            Router.navigate('/browse');
            return;
        }

        container.innerHTML = `
            <div class="admin-page">
                <div class="admin-header">
                    <h1 class="admin-title">Admin Panel</h1>
                    <div class="admin-actions">
                        <button class="btn btn-secondary" onclick="Database.export()">
                            💾 Export Data
                        </button>
                        <button class="btn btn-primary" onclick="Database.sync()">
                            🔄 Sync Database
                        </button>
                    </div>
                </div>

                <div class="admin-tabs">
                    <div class="admin-tab active" onclick="Router.switchAdminTab('anime', event)">Manage Anime</div>
                    <div class="admin-tab" onclick="Router.switchAdminTab('episodes', event)">Manage Episodes</div>
                    <div class="admin-tab" onclick="Router.switchAdminTab('comments', event)">Manage Comments</div>
                </div>

                <div class="admin-content" id="adminContent">
                    ${Router.renderAdminAnimeSection()}
                </div>
            </div>
        `;

        Utils.select('#navSearch').style.display = 'none';
    },

    // Load search component
    loadSearchComponent: async (container, data) => {
        const query = data?.query || Router.getQueryParam('q') || '';
        const results = query ? Database.anime.search(query) : [];

        container.innerHTML = `
            <div class="dashboard-page">
                <section class="hero-section">
                    <h1 class="hero-title">Search Results</h1>
                    <p class="hero-subtitle">${results.length} results found for "${query}"</p>
                </section>

                <section class="section">
                    <div class="anime-grid">
                        ${results.length > 0 ? Router.renderAnimeGrid(results) : '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">No anime found matching your search.</p>'}
                    </div>
                </section>
            </div>
        `;

        Utils.select('#navSearch').style.display = 'flex';
    },

    // Load error component
    loadErrorComponent: (container, error) => {
        container.innerHTML = `
            <div class="error-page">
                <div class="error-card">
                    <h1>Oops! Something went wrong</h1>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button class="btn btn-primary" onclick="Router.navigate('/browse')">Go to Browse</button>
                </div>
            </div>
        `;
    },

    // Render anime grid
    renderAnimeGrid: (anime) => {
        if (!anime || anime.length === 0) {
            return '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">No anime available</p>';
        }

        return anime.map(a => `
            <div class="anime-card" onclick="Router.watchAnime(${a.id})">
                <div class="anime-poster">
                    <img src="${a.thumbnail}" alt="${a.title}" 
                         onerror="this.src='https://via.placeholder.com/240x320/333/fff?text=Anime'">
                    <div class="play-overlay">
                        <button class="play-btn">▶</button>
                    </div>
                </div>
                <div class="anime-info">
                    <h3 class="anime-title">${a.title}</h3>
                    <div class="anime-meta">
                        <div class="anime-rating">
                            <span>⭐</span>
                            <span>${a.rating || '4.5'}</span>
                        </div>
                        <span>•</span>
                        <span>${a.episodes?.length || 0} Episodes</span>
                        <span>•</span>
                        <span>${a.year || '2023'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // Render episodes list
    renderEpisodesList: (episodes) => {
        if (!episodes || episodes.length === 0) {
            return '<p style="color: var(--text-muted); text-align: center;">No episodes available</p>';
        }

        return episodes.map((episode, index) => `
            <div class="episode-card ${index === 0 ? 'active' : ''}" onclick="Player.loadEpisode(${episode.id})">
                <div class="episode-thumbnail">
                    <img src="${episode.thumbnail || 'https://via.placeholder.com/240x135/333/fff?text=EP' + (index + 1)}" alt="${episode.title}">
                    <div class="episode-number">EP ${index + 1}</div>
                </div>
                <div class="episode-details">
                    <h4>${episode.title}</h4>
                    <p>${episode.duration || '24:30'}</p>
                </div>
            </div>
        `).join('');
    },

    // Update navigation
    updateNavigation: () => {
        // Update active nav link
        Utils.selectAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.route === Router.currentRoute) {
                link.classList.add('active');
            }
        });

        // Show/hide elements based on authentication and route
        const showSearch = Auth.isAuthenticated() && ['/browse', '/trending', '/search'].includes(Router.currentRoute);
        Utils.select('#navSearch').style.display = showSearch ? 'flex' : 'none';
        Utils.select('#navMenu').style.display = Auth.isAuthenticated() ? 'flex' : 'none';
    },

    // Utility functions
    getQueryParam: (name) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    watchAnime: (id) => {
        Router.navigate('/watch?anime=' + id);
    },

    // Comment functions
    addComment: async () => {
        if (!Auth.checkUsername()) return;

        const input = Utils.select('#commentInput');
        const text = input.value.trim();
        
        if (!text) {
            Utils.showToast('Please enter a comment', 'warning');
            return;
        }

        try {
            const animeId = Router.currentData?.animeId || Router.getQueryParam('anime');
            if (!animeId) {
                Utils.showToast('No anime selected', 'error');
                return;
            }

            await Database.comments.add({
                animeId: parseInt(animeId),
                author: Auth.currentUser.username || Auth.currentUser.name,
                avatar: Auth.currentUser.picture,
                text: text
            });

            input.value = '';
            input.style.height = 'auto';
            Router.loadComments(animeId);
            Utils.showToast('Comment added successfully!', 'success');
        } catch (error) {
            console.error('Add comment error:', error);
            Utils.showToast('Failed to add comment', 'error');
        }
    },

    loadComments: async (animeId) => {
        if (!animeId) return;
        
        try {
            const comments = Database.comments.getByAnimeId(animeId);
            const container = Utils.select('#commentsList');
            const countElement = Utils.select('#commentsCount');

            if (countElement) {
                countElement.textContent = `${comments.length} comment${comments.length !== 1 ? 's' : ''}`;
            }

            if (container) {
                if (comments.length === 0) {
                    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No comments yet. Be the first to comment!</p>';
                } else {
                    container.innerHTML = comments.map(comment => `
                        <div class="comment">
                            <img src="${comment.avatar || 'https://via.placeholder.com/44x44/333/fff?text=' + (comment.author[0] || 'U')}" 
                                 alt="${comment.author}" class="comment-avatar" 
                                 onerror="this.src='https://via.placeholder.com/44x44/333/fff?text=${(comment.author[0] || 'U')}'">
                            <div class="comment-content">
                                <div class="comment-header">
                                    <span class="comment-author">${Utils.sanitize(comment.author)}</span>
                                    <span class="comment-time">${Utils.timeAgo(comment.timestamp)}</span>
                                    ${Auth.isAdmin() ? `<button class="comment-delete" onclick="Router.deleteComment('${comment.id}')">Delete</button>` : ''}
                                </div>
                                <p class="comment-text">${Utils.sanitize(comment.text)}</p>
                                <div class="comment-actions">
                                    <button class="comment-action" onclick="Router.likeComment('${comment.id}')">👍 ${comment.likes || 0}</button>
                                    <button class="comment-action">💬 Reply</button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Load comments error:', error);
        }
    },

    likeComment: async (commentId) => {
        try {
            const likes = await Database.comments.like(commentId);
            const animeId = Router.currentData?.animeId || Router.getQueryParam('anime');
            Router.loadComments(animeId);
        } catch (error) {
            console.error('Like comment error:', error);
            Utils.showToast('Failed to like comment', 'error');
        }
    },

    // Admin functions
    switchAdminTab: (tabName, event) => {
        // Update tab buttons
        Utils.selectAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        // Update content
        const content = Utils.select('#adminContent');
        if (!content) return;
        
        switch (tabName) {
            case 'anime':
                content.innerHTML = Router.renderAdminAnimeSection();
                break;
            case 'episodes':
                content.innerHTML = Router.renderAdminEpisodesSection();
                break;
            case 'comments':
                content.innerHTML = Router.renderAdminCommentsSection();
                break;
        }
    },

    renderAdminAnimeSection: () => {
        const anime = Database.anime.getAll();
        return `
            <div class="admin-section">
                <h3 class="admin-section-title">Add/Edit Anime</h3>
                <form id="animeForm" onsubmit="Router.handleAnimeSubmit(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Title *</label>
                            <input type="text" class="form-input" id="animeTitle" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Thumbnail URL *</label>
                            <input type="url" class="form-input" id="animeThumbnail" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rating</label>
                            <input type="number" class="form-input" id="animeRating" min="0" max="10" step="0.1" value="4.5">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Year</label>
                            <input type="number" class="form-input" id="animeYear" min="1900" max="2030" value="${new Date().getFullYear()}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Genre</label>
                            <input type="text" class="form-input" id="animeGenre" placeholder="Action, Adventure, Drama">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" id="animeStatus">
                                <option value="ongoing">Ongoing</option>
                                <option value="completed">Completed</option>
                                <option value="upcoming">Upcoming</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea class="form-textarea" id="animeDescription" placeholder="Enter anime description..."></textarea>
                    </div>
                    <div class="form-buttons">
                        <button type="submit" class="btn btn-primary" id="animeSubmitBtn">
                            ➕ Add Anime
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="Router.resetAnimeForm()">
                            🔄 Reset
                        </button>
                        <button type="button" class="btn btn-danger" id="cancelEditBtn" style="display: none;" onclick="Router.cancelEdit()">
                            ❌ Cancel Edit
                        </button>
                    </div>
                </form>

                <h3 class="admin-section-title">Anime List (${anime.length} total)</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Year</th>
                                <th>Episodes</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${anime.length === 0 ? 
                                '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No anime available</td></tr>' :
                                anime.map(a => `
                                    <tr>
                                        <td>${a.id}</td>
                                        <td>
                                            <div class="table-title">
                                                <img src="${a.thumbnail}" alt="${a.title}" class="table-thumbnail" 
                                                     onerror="this.src='https://via.placeholder.com/40x56/333/fff?text=A'">
                                                ${Utils.truncate(a.title, 30)}
                                            </div>
                                        </td>
                                        <td>${a.year || 'N/A'}</td>
                                        <td>${a.episodes?.length || 0}</td>
                                        <td><span class="status-badge status-${a.status || 'unknown'}">${a.status || 'N/A'}</span></td>
                                        <td class="table-actions">
                                            <button class="table-btn table-btn-edit" onclick="Router.editAnime(${a.id})">Edit</button>
                                            <button class="table-btn table-btn-delete" onclick="Router.deleteAnime(${a.id})">Delete</button>
                                        </td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderAdminEpisodesSection: () => {
        const anime = Database.anime.getAll();
        return `
            <div class="admin-section">
                <h3 class="admin-section-title">Add Episode</h3>
                <form id="episodeForm" onsubmit="Router.handleEpisodeSubmit(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Select Anime *</label>
                            <select class="form-select" id="episodeAnimeId" required>
                                <option value="">Choose Anime</option>
                                ${anime.map(a => `<option value="${a.id}">${a.title}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Episode Title *</label>
                            <input type="text" class="form-input" id="episodeTitle" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Episode Thumbnail</label>
                            <input type="url" class="form-input" id="episodeThumbnail" placeholder="Optional episode thumbnail URL">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Video URL *</label>
                            <input type="url" class="form-input" id="episodeVideo" required placeholder="Direct video URL (MP4, M3U8, MPD)">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Duration</label>
                            <input type="text" class="form-input" id="episodeDuration" placeholder="24:30" pattern="[0-9]{1,2}:[0-9]{2}">
                        </div>
                    </div>
                    <div class="form-buttons">
                        <button type="submit" class="btn btn-primary">➕ Add Episode</button>
                        <button type="button" class="btn btn-secondary" onclick="Router.resetEpisodeForm()">🔄 Reset</button>
                    </div>
                </form>

                <h3 class="admin-section-title">Episodes by Anime</h3>
                <div class="episodes-by-anime">
                    ${anime.length === 0 ? 
                        '<p style="color: var(--text-muted);">No anime available</p>' :
                        anime.map(a => `
                            <div class="anime-episodes-section">
                                <h4 class="anime-title-header">${a.title} (${a.episodes?.length || 0} episodes)</h4>
                                ${(!a.episodes || a.episodes.length === 0) ? 
                                    '<p style="color: var(--text-muted); margin-left: 20px;">No episodes</p>' :
                                    `<div class="episodes-table">
                                        <table class="data-table">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Title</th>
                                                    <th>Duration</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${a.episodes.map((ep, index) => `
                                                    <tr>
                                                        <td>EP ${index + 1}</td>
                                                        <td>${Utils.truncate(ep.title, 40)}</td>
                                                        <td>${ep.duration || '24:30'}</td>
                                                        <td class="table-actions">
                                                            <button class="table-btn table-btn-delete" onclick="Router.deleteEpisode(${a.id}, ${ep.id})">Delete</button>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>`
                                }
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    },

    renderAdminCommentsSection: () => {
        const comments = Database.data.comments || [];
        const anime = Database.anime.getAll();
        
        return `
            <div class="admin-section">
                <h3 class="admin-section-title">Comments Management (${comments.length} total)</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Anime</th>
                                <th>Author</th>
                                <th>Comment</th>
                                <th>Likes</th>
                                <th>Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${comments.length === 0 ? 
                                '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No comments available</td></tr>' :
                                comments.map(comment => {
                                    const animeTitle = anime.find(a => a.id === comment.animeId)?.title || 'Unknown Anime';
                                    return `
                                        <tr>
                                            <td>${comment.id}</td>
                                            <td>${Utils.truncate(animeTitle, 20)}</td>
                                            <td>
                                                <div class="author-cell">
                                                    <img src="${comment.avatar || 'https://via.placeholder.com/32x32/333/fff?text=' + (comment.author[0] || 'U')}" 
                                                         alt="${comment.author}" class="author-avatar"
                                                         onerror="this.src='https://via.placeholder.com/32x32/333/fff?text=${(comment.author[0] || 'U')}'">
                                                    ${Utils.truncate(comment.author, 15)}
                                                </div>
                                            </td>
                                            <td title="${Utils.sanitize(comment.text)}">${Utils.truncate(comment.text, 30)}</td>
                                            <td>${comment.likes || 0}</td>
                                            <td>${Utils.timeAgo(comment.timestamp)}</td>
                                            <td class="table-actions">
                                                <button class="table-btn table-btn-delete" onclick="Router.deleteComment('${comment.id}')">Delete</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // Admin form handlers
    handleAnimeSubmit: async (e) => {
        e.preventDefault();
        
        const submitBtn = Utils.select('#animeSubmitBtn');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;
            
            const animeData = {
                title: Utils.select('#animeTitle').value.trim(),
                thumbnail: Utils.select('#animeThumbnail').value.trim(),
                rating: parseFloat(Utils.select('#animeRating').value) || 4.5,
                year: parseInt(Utils.select('#animeYear').value) || new Date().getFullYear(),
                genre: Utils.select('#animeGenre').value.trim(),
                status: Utils.select('#animeStatus').value,
                description: Utils.select('#animeDescription').value.trim()
            };

            // Validation
            if (!animeData.title) {
                throw new Error('Title is required');
            }
            if (!animeData.thumbnail) {
                throw new Error('Thumbnail URL is required');
            }

            if (Router.currentEditingAnimeId) {
                // Update existing anime
                await Database.anime.update(Router.currentEditingAnimeId, animeData);
                Utils.showToast('Anime updated successfully!', 'success');
                Router.cancelEdit();
            } else {
                // Add new anime
                await Database.anime.add(animeData);
                Utils.showToast('Anime added successfully!', 'success');
            }
            
            Router.resetAnimeForm();
            Router.switchAdminTab('anime');
            
        } catch (error) {
            console.error('Anime submit error:', error);
            Utils.showToast('Failed to save anime: ' + error.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    },

    resetAnimeForm: () => {
        const form = Utils.select('#animeForm');
        if (form) {
            form.reset();
            Utils.select('#animeRating').value = '4.5';
            Utils.select('#animeYear').value = new Date().getFullYear();
        }
        Router.cancelEdit();
    },

    resetEpisodeForm: () => {
        const form = Utils.select('#episodeForm');
        if (form) {
            form.reset();
        }
    },

    editAnime: (id) => {
        const anime = Database.anime.getById(id);
        if (!anime) {
            Utils.showToast('Anime not found', 'error');
            return;
        }

        // Fill form with anime data
        Utils.select('#animeTitle').value = anime.title || '';
        Utils.select('#animeThumbnail').value = anime.thumbnail || '';
        Utils.select('#animeRating').value = anime.rating || 4.5;
        Utils.select('#animeYear').value = anime.year || new Date().getFullYear();
        Utils.select('#animeGenre').value = anime.genre || '';
        Utils.select('#animeStatus').value = anime.status || 'ongoing';
        Utils.select('#animeDescription').value = anime.description || '';

        // Update form for editing
        Router.currentEditingAnimeId = id;
        const submitBtn = Utils.select('#animeSubmitBtn');
        const cancelBtn = Utils.select('#cancelEditBtn');
        
        if (submitBtn) {
            submitBtn.textContent = '✏️ Update Anime';
        }
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-block';
        }

        // Scroll to form
        Utils.select('#animeForm').scrollIntoView({ behavior: 'smooth' });
        
        Utils.showToast('Editing anime: ' + anime.title, 'info');
    },

    cancelEdit: () => {
        Router.currentEditingAnimeId = null;
        const submitBtn = Utils.select('#animeSubmitBtn');
        const cancelBtn = Utils.select('#cancelEditBtn');
        
        if (submitBtn) {
            submitBtn.textContent = '➕ Add Anime';
        }
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    },

    deleteAnime: async (id) => {
        const anime = Database.anime.getById(id);
        if (!anime) {
            Utils.showToast('Anime not found', 'error');
            return;
        }

        const confirmMessage = `Are you sure you want to delete "${anime.title}"?\n\nThis will also delete:\n- ${anime.episodes?.length || 0} episodes\n- All related comments\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            await Database.anime.delete(id);
            Router.switchAdminTab('anime');
            Utils.showToast('Anime deleted successfully!', 'success');
            
            // If we were editing this anime, cancel edit mode
            if (Router.currentEditingAnimeId === id) {
                Router.cancelEdit();
            }
        } catch (error) {
            console.error('Delete anime error:', error);
            Utils.showToast('Failed to delete anime: ' + error.message, 'error');
        }
    },

    deleteEpisode: async (animeId, episodeId) => {
        const anime = Database.anime.getById(animeId);
        const episode = anime?.episodes?.find(ep => ep.id === episodeId);
        
        if (!episode) {
            Utils.showToast('Episode not found', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${episode.title}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            await Database.episodes.delete(animeId, episodeId);
            Router.switchAdminTab('episodes');
            Utils.showToast('Episode deleted successfully!', 'success');
        } catch (error) {
            console.error('Delete episode error:', error);
            Utils.showToast('Failed to delete episode: ' + error.message, 'error');
        }
    },

    deleteComment: async (id) => {
        const comment = Database.data.comments?.find(c => c.id === id);
        if (!comment) {
            Utils.showToast('Comment not found', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete this comment by ${comment.author}?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            await Database.comments.delete(id);
            Router.switchAdminTab('comments');
            Utils.showToast('Comment deleted successfully!', 'success');
        } catch (error) {
            console.error('Delete comment error:', error);
            Utils.showToast('Failed to delete comment: ' + error.message, 'error');
        }
    }
};

// Global function for Google Auth callback
window.handleCredentialResponse = (response) => {
    Auth.handleCredentialResponse(response);
};

// Make available globally
window.Router = Router;
    },

    handleEpisodeSubmit: async (e) => {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;
            
            const animeId = Utils.select('#episodeAnimeId').value;
            if (!animeId) {
                throw new Error('Please select an anime');
            }

            const episodeData = {
                title: Utils.select('#episodeTitle').value.trim(),
                thumbnail: Utils.select('#episodeThumbnail').value.trim(),
                videoUrl: Utils.select('#episodeVideo').value.trim(),
                duration: Utils.select('#episodeDuration').value.trim() || '24:30'
            };

            // Validation
            if (!episodeData.title) {
                throw new Error('Episode title is required');
            }
            if (!episodeData.videoUrl) {
                throw new Error('Video URL is required');
            }
            
            await Database.episodes.add(animeId, episodeData);
            Router.resetEpisodeForm();
            Router.switchAdminTab('episodes');
            Utils.showToast('Episode added successfully!', 'success');
            
        } catch (error) {
            console.error('Episode submit error:', error);
            Utils.showToast('Failed to add episode: ' + error.message, 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        } Initialize router
    init: () => {
        // Set up popstate listener for browser back/forward
        window.addEventListener('popstate', (e) => {
            Router.handlePopState(e);
        });

        // Handle initial route
        const currentPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        
        Router.currentRoute = currentPath;
        Router.isInitialized = true;
        
        // Navigate to current route
        Router.navigate(currentPath, null, false);
    },

    // Navigate to a route
    navigate: (path, data = null, updateHistory = true) => {
        // Validate route
        const route = Router.routes[path];
        if (!route) {
            console.warn(`Route ${path} not found, redirecting to /`);
            path = '/';
        }

        // Check authentication requirements
        if (route && route.requireAuth && !Auth.isAuthenticated()) {
            Router.navigate('/', null, updateHistory);
            Utils.showToast('Please sign in to continue', 'warning');
            return;
        }

        // Check admin requirements
        if (route && route.requireAdmin && !Auth.isAdmin()) {
            Utils.showToast(CONFIG.ERRORS.ADMIN_REQUIRED, 'error');
            return;
        }

        // Update browser history
        if (updateHistory) {
            window.history.pushState({ path, data }, '', path);
        }

        // Update current route and data
        Router.currentRoute = path;
        Router.currentData = data;

        // Update page title
        if (route) {
            document.title = route.title;
        }

        // Load the component
        Router.loadComponent(route ? route.component : 'auth', data);

        // Update navigation UI
        Router.updateNavigation();
    },

    // Handle popstate events (back/forward buttons)
    handlePopState: (e) => {
        if (e.state && e.state.path) {
            Router.navigate(e.state.path, e.state.data, false);
        } else {
            Router.navigate('/', null, false);
        }
    },

    // Load a component
    loadComponent: async (componentName, data = null) => {
        const container = Utils.select('#mainContent');
        
        try {
            Utils.showLoading();
            
            // Clear current content
            container.innerHTML = '';

            // Load component based on name
            switch (componentName) {
                case 'auth':
                    await Router.loadAuthComponent(container);
                    break;
                case 'browse':
                    await Router.loadBrowseComponent(container, data);
                    break;
                case 'trending':
                    await Router.loadTrendingComponent(container, data);
                    break;
                case 'player':
                    await Router.loadPlayerComponent(container, data);
                    break;
                case 'admin':
                    await Router.loadAdminComponent(container, data);
                    break;
                case 'search':
                    await Router.loadSearchComponent(container, data);
                    break;
                default:
                    throw new Error(`Unknown component: ${componentName}`);
            }

        } catch (error) {
            console.error('Error loading component:', error);
            Router.loadErrorComponent(container, error);
        } finally {
            Utils.hideLoading();
        }
    },

    // Load authentication component
    loadAuthComponent: async (container) => {
        container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card">
                    <div class="auth-logo">🎌</div>
                    <h1 class="auth-title">Welcome to AnimeFlow</h1>
                    <p class="auth-subtitle">Sign in with Google to access your personalized anime streaming experience with premium features.</p>
                    <div class="google-signin-wrapper">
                        <div id="g_id_onload"
                            data-client_id="${CONFIG.GOOGLE_CLIENT_ID}"
                            data-context="signin"
                            data-ux_mode="popup"
                            data-callback="handleCredentialResponse"
                            data-auto_prompt="false">
                        </div>
                        <div id="g_id_signin" class="g_id_signin"></div>
                    </div>
                </div>
            </div>
        `;

        // Re-render Google Sign-In button
        if (Auth.isInitialized) {
            setTimeout(() => {
                try {
                    google.accounts.id.renderButton(
                        Utils.select("#g_id_signin"),
                        {
                            theme: "outline",
                            size: "large",
                            type: "standard",
                            shape: "rectangular",
                            text: "signin_with",
                            logo_alignment: "left",
                            width: "100%"
                        }
                    );
                } catch (error) {
                    console.error('Error rendering Google Sign-In button:', error);
                }
            }, 100);
        }
    },

    // Load browse component
    loadBrowseComponent: async (container, data) => {
        const anime = Database.anime.getAll();
        const totalAnime = Database.stats.getTotalAnime();
        const totalEpisodes = Database.stats.getTotalEpisodes();

        container.innerHTML = `
            <div class="dashboard-page">
                <section class="hero-section">
                    <h1 class="hero-title">Discover Amazing Anime</h1>
                    <p class="hero-subtitle">Stream thousands of episodes in premium quality with personalized recommendations</p>
                    <div class="hero-stats">
                        <div class="stat-item">
                            <div class="stat-number">${totalAnime}</div>
                            <div class="stat-label">Anime Series</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${totalEpisodes}</div>
                            <div class="stat-label">Episodes</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">1M+</div>
                            <div class="stat-label">Happy Users</div>
                        </div>
                    </div>
                </section>

                <section class="section">
                    <div class="section-header">
                        <h2 class="section-title">
                            ⭐ Popular Anime
                            <span class="section-subtitle">Most watched this week</span>
                        </h2>
                    </div>
                    <div class="anime-grid" id="animeGrid">
                        ${Router.renderAnimeGrid(anime)}
                    </div>
                </section>
            </div>
        `;

        // Show search in navigation
        Utils.select('#navSearch').style.display = 'flex';
    },

    // Load trending component
    loadTrendingComponent: async (container, data) => {
        const trendingAnime = Database.anime.getTrending();

        container.innerHTML = `
            <div class="dashboard-page">
                <section class="hero-section">
                    <h1 class="hero-title">Trending Now</h1>
                    <p class="hero-subtitle">Most popular anime this week based on views and discussions</p>
                </section>

                <section class="section">
                    <div class="section-header">
                        <h2 class="section-title">🔥 Trending Anime</h2>
                    </div>
                    <div class="anime-grid">
                        ${Router.renderAnimeGrid(trendingAnime)}
                    </div>
                </section>
            </div>
        `;

        Utils.select('#navSearch').style.display = 'flex';
    },

    // Load player component
    loadPlayerComponent: async (container, data) => {
        const animeId = data?.animeId || Router.getQueryParam('anime');
        const episodeId = data?.episodeId || Router.getQueryParam('episode');
        
        if (!animeId) {
            Router.navigate('/browse');
            return;
        }

        const anime = Database.anime.getById(animeId);
        if (!anime) {
            Utils.showToast('Anime not found', 'error');
            Router.navigate('/browse');
            return;
        }

        container.innerHTML = `
            <div class="player-page">
                <div class="player-layout">
                    <div class="video-section">
                        <div class="video-player" id="videoPlayer">
                            <video class="video-element" id="videoElement" preload="metadata">
                                <source src="" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                            <div class="video-overlay" id="videoOverlay">
                                <button class="play-btn" onclick="Player.togglePlay()">▶</button>
                            </div>
                        </div>
                        
                        <div class="video-controls">
                            <div class="episode-info">
                                <h1 class="episode-title" id="currentEpisodeTitle">${anime.title}</h1>
                                <div class="episode-meta">
                                    <span id="episodeSeason">${anime.year}</span>
                                    <span>•</span>
                                    <span id="episodeDuration">Loading...</span>
                                    <span>•</span>
                                    <span id="episodeQuality">1080p HD</span>
                                </div>
                            </div>
                            
                            <div class="progress-section">
                                <div class="progress-bar" onclick="Player.seekVideo(event)" id="progressBar">
                                    <div class="progress-fill" id="progressFill"></div>
                                </div>
                                <div class="progress-time">
                                    <span id="currentTime">0:00</span>
                                    <span id="totalTime">0:00</span>
                                </div>
                            </div>
                            
                            <div class="control-buttons">
                                <button class="control-btn primary" id="playPauseBtn" onclick="Player.togglePlay()">▶</button>
                                <button class="control-btn" onclick="Player.skipTime(-10)">⏪</button>
                                <button class="control-btn" onclick="Player.skipTime(10)">⏩</button>
                                <button class="control-btn" id="muteBtn" onclick="Player.toggleMute()">🔊</button>
                                <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="100" oninput="Player.setVolume(this.value)">
                                <button class="control-btn" onclick="Player.changePlaybackSpeed()">1x</button>
                                <button class="control-btn" onclick="Player.toggleFullscreen()">⛶</button>
                                <span class="time-display" id="timeDisplay">0:00 / 0:00</span>
                            </div>
                        </div>
                    </div>

                    <div class="episodes-section">
                        <h3 class="section-title-with-icon">🎬 Episodes</h3>
                        <div class="episodes-container">
                            <div class="episodes-scroll" id="episodesList">
                                ${Router.renderEpisodesList(anime.episodes || [])}
                            </div>
                        </div>
                    </div>

                    <div class="comments-section">
                        <div class="comments-header">
                            <h3 class="section-title-with-icon">💬 Comments</h3>
                            <span class="comments-count" id="commentsCount">0 comments</span>
                        </div>

                        <div class="comment-form">
                            <textarea class="comment-input" placeholder="Add a comment..." id="commentInput" rows="1"></textarea>
                            <button class="comment-submit" onclick="Router.addComment()">Post</button>
                        </div>

                        <div class="comments-list" id="commentsList"></div>
                    </div>
                </div>
            </div>
        `;

        // Initialize player
        Player.init(anime, episodeId);
        
        // Load comments
        Router.loadComments(animeId);

        // Hide search in navigation for player
        Utils.select('#navSearch').style.display = 'none';
    },

    // Load admin component
    loadAdminComponent: async (container, data) => {
        if (!Auth.isAdmin()) {
            Utils.showToast(CONFIG.ERRORS.ADMIN_REQUIRED, 'error');
            Router.navigate('/browse');
            return;
        }

        container.innerHTML = `
            <div class="admin-page">
                <div class="admin-header">
                    <h1 class="admin-title">Admin Panel</h1>
                    <button class="btn btn-primary" onclick="Database.sync()">
                        🔄 Sync Database
                    </button>
                </div>

                <div class="admin-tabs">
                    <div class="admin-tab active" onclick="Router.switchAdminTab('anime')">Manage Anime</div>
                    <div class="admin-tab" onclick="Router.switchAdminTab('episodes')">Manage Episodes</div>
                    <div class="admin-tab" onclick="Router.switchAdminTab('comments')">Manage Comments</div>
                </div>

                <div class="admin-content" id="adminContent">
                    ${Router.renderAdminAnimeSection()}
                </div>
            </div>
        `;

        Utils.select('#navSearch').style.display = 'none';
    },

    // Load search component
    loadSearchComponent: async (container, data) => {
        const query = data?.query || Router.getQueryParam('q') || '';
        const results = query ? Database.anime.search(query) : [];

        container.innerHTML = `
            <div class="dashboard-page">
                <section class="hero-section">
                    <h1 class="hero-title">Search Results</h1>
                    <p class="hero-subtitle">${results.length} results found for "${query}"</p>
                </section>

                <section class="section">
                    <div class="anime-grid">
                        ${results.length > 0 ? Router.renderAnimeGrid(results) : '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">No anime found matching your search.</p>'}
                    </div>
                </section>
            </div>
        `;

        Utils.select('#navSearch').style.display = 'flex';
    },

    // Load error component
    loadErrorComponent: (container, error) => {
        container.innerHTML = `
            <div class="error-page">
                <div class="error-card">
                    <h1>Oops! Something went wrong</h1>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button class="btn btn-primary" onclick="Router.navigate('/browse')">Go to Browse</button>
                </div>
            </div>
        `;
    },

    // Render anime grid
    renderAnimeGrid: (anime) => {
        if (!anime || anime.length === 0) {
            return '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">No anime available</p>';
        }

        return anime.map(a => `
            <div class="anime-card" onclick="Router.watchAnime(${a.id})">
                <div class="anime-poster">
                    <img src="${a.thumbnail}" alt="${a.title}" 
                         onerror="this.src='https://via.placeholder.com/240x320/333/fff?text=Anime'">
                    <div class="play-overlay">
                        <button class="play-btn">▶</button>
                    </div>
                </div>
                <div class="anime-info">
                    <h3 class="anime-title">${a.title}</h3>
                    <div class="anime-meta">
                        <div class="anime-rating">
                            <span>⭐</span>
                            <span>${a.rating || '4.5'}</span>
                        </div>
                        <span>•</span>
                        <span>${a.episodes?.length || 0} Episodes</span>
                        <span>•</span>
                        <span>${a.year || '2023'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // Render episodes list
    renderEpisodesList: (episodes) => {
        if (!episodes || episodes.length === 0) {
            return '<p style="color: var(--text-muted); text-align: center;">No episodes available</p>';
        }

        return episodes.map((episode, index) => `
            <div class="episode-card ${index === 0 ? 'active' : ''}" onclick="Player.loadEpisode(${episode.id})">
                <div class="episode-thumbnail">
                    <img src="${episode.thumbnail || 'https://via.placeholder.com/240x135/333/fff?text=EP' + (index + 1)}" alt="${episode.title}">
                    <div class="episode-number">EP ${index + 1}</div>
                </div>
                <div class="episode-details">
                    <h4>${episode.title}</h4>
                    <p>${episode.duration || '24:30'}</p>
                </div>
            </div>
        `).join('');
    },

    // Update navigation
    updateNavigation: () => {
        // Update active nav link
        Utils.selectAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.route === Router.currentRoute) {
                link.classList.add('active');
            }
        });

        // Show/hide elements based on authentication and route
        const showSearch = Auth.isAuthenticated() && ['/browse', '/trending', '/search'].includes(Router.currentRoute);
        Utils.select('#navSearch').style.display = showSearch ? 'flex' : 'none';
        Utils.select('#navMenu').style.display = Auth.isAuthenticated() ? 'flex' : 'none';
    },

    // Utility functions
    getQueryParam: (name) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    watchAnime: (id) => {
        Router.navigate('/watch', { animeId: id });
    },

    // Comment functions
    addComment: async () => {
        if (!Auth.checkUsername()) return;

        const input = Utils.select('#commentInput');
        const text = input.value.trim();
        
        if (!text) return;

        try {
            const animeId = Router.currentData?.animeId || Router.getQueryParam('anime');
            await Database.comments.add({
                animeId: parseInt(animeId),
                author: Auth.currentUser.username,
                avatar: Auth.currentUser.picture,
                text: text
            });

            input.value = '';
            Router.loadComments(animeId);
            Utils.showToast('Comment added successfully!', 'success');
        } catch (error) {
            Utils.showToast('Failed to add comment', 'error');
        }
    },

    loadComments: (animeId) => {
        const comments = Database.comments.getByAnimeId(animeId);
        const container = Utils.select('#commentsList');
        const countElement = Utils.select('#commentsCount');

        if (countElement) {
            countElement.textContent = `${comments.length} comments`;
        }

        if (container) {
            if (comments.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No comments yet. Be the first to comment!</p>';
            } else {
                container.innerHTML = comments.map(comment => `
                    <div class="comment">
                        <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar" 
                             onerror="this.src='https://via.placeholder.com/44x44/333/fff?text=${comment.author[0]}'">
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-author">${comment.author}</span>
                                <span class="comment-time">${Utils.timeAgo(comment.timestamp)}</span>
                            </div>
                            <p class="comment-text">${Utils.sanitize(comment.text)}</p>
                            <div class="comment-actions">
                                <button class="comment-action" onclick="Database.comments.like('${comment.id}')">👍 ${comment.likes || 0}</button>
                                <button class="comment-action">💬 Reply</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    },

    // Admin functions
    switchAdminTab: (tabName) => {
        // Update tab buttons
        Utils.selectAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
        event.target.classList.add('active');
        
        // Update content
        const content = Utils.select('#adminContent');
        switch (tabName) {
            case 'anime':
                content.innerHTML = Router.renderAdminAnimeSection();
                break;
            case 'episodes':
                content.innerHTML = Router.renderAdminEpisodesSection();
                break;
            case 'comments':
                content.innerHTML = Router.renderAdminCommentsSection();
                break;
        }
    },

    renderAdminAnimeSection: () => {
        const anime = Database.anime.getAll();
        return `
            <h3 class="admin-section-title">Add/Edit Anime</h3>
            <form id="animeForm" onsubmit="Router.handleAnimeSubmit(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Title *</label>
                        <input type="text" class="form-input" id="animeTitle" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Thumbnail URL *</label>
                        <input type="url" class="form-input" id="animeThumbnail" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Rating</label>
                        <input type="number" class="form-input" id="animeRating" min="0" max="10" step="0.1" value="4.5">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Year</label>
                        <input type="number" class="form-input" id="animeYear" min="1900" max="2030" value="2024">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Genre</label>
                        <input type="text" class="form-input" id="animeGenre" placeholder="Action, Adventure, Drama">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-select" id="animeStatus">
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="upcoming">Upcoming</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-textarea" id="animeDescription" placeholder="Enter anime description..."></textarea>
                </div>
                <div class="form-buttons">
                    <button type="submit" class="btn btn-primary" id="animeSubmitBtn">
                        ➕ Add Anime
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="Router.resetAnimeForm()">
                        🔄 Reset
                    </button>
                </div>
            </form>

            <h3 class="admin-section-title">Anime List</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Year</th>
                        <th>Episodes</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${anime.map(a => `
                        <tr>
                            <td>${a.title}</td>
                            <td>${a.year || 'N/A'}</td>
                            <td>${a.episodes?.length || 0}</td>
                            <td>${a.status || 'N/A'}</td>
                            <td class="table-actions">
                                <button class="table-btn table-btn-edit" onclick="Router.editAnime(${a.id})">Edit</button>
                                <button class="table-btn table-btn-delete" onclick="Router.deleteAnime(${a.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderAdminEpisodesSection: () => {
        const anime = Database.anime.getAll();
        return `
            <h3 class="admin-section-title">Add Episode</h3>
            <form id="episodeForm" onsubmit="Router.handleEpisodeSubmit(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Select Anime *</label>
                        <select class="form-select" id="episodeAnimeId" required>
                            <option value="">Choose Anime</option>
                            ${anime.map(a => `<option value="${a.id}">${a.title}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Episode Title *</label>
                        <input type="text" class="form-input" id="episodeTitle" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Episode Thumbnail</label>
                        <input type="url" class="form-input" id="episodeThumbnail">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Video URL *</label>
                        <input type="url" class="form-input" id="episodeVideo" required>
                    </div>
                </div>
                <div class="form-buttons">
                    <button type="submit" class="btn btn-primary">➕ Add Episode</button>
                    <button type="button" class="btn btn-secondary" onclick="Router.resetEpisodeForm()">🔄 Reset</button>
                </div>
            </form>
        `;
    },

    renderAdminCommentsSection: () => {
        const comments = Database.data.comments;
        return `
            <h3 class="admin-section-title">Comments Management</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Author</th>
                        <th>Comment</th>
                        <th>Time</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${comments.map(comment => `
                        <tr>
                            <td>${comment.author}</td>
                            <td>${Utils.truncate(comment.text, 50)}</td>
                            <td>${Utils.timeAgo(comment.timestamp)}</td>
                            <td class="table-actions">
                                <button class="table-btn table-btn-delete" onclick="Router.deleteComment('${comment.id}')">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // Admin form handlers
    handleAnimeSubmit: async (e) => {
        e.preventDefault();
        
        try {
            const animeData = {
                title: Utils.select('#animeTitle').value,
                thumbnail: Utils.select('#animeThumbnail').value,
                rating: parseFloat(Utils.select('#animeRating').value),
                year: parseInt(Utils.select('#animeYear').value),
                genre: Utils.select('#animeGenre').value,
                status: Utils.select('#animeStatus').value,
                description: Utils.select('#animeDescription').value
            };

            await Database.anime.add(animeData);
            Router.resetAnimeForm();
            Router.switchAdminTab('anime');
            Utils.showToast('Anime added successfully!', 'success');
        } catch (error) {
            Utils.showToast('Failed to add anime', 'error');
        }
    },

    handleEpisodeSubmit: async (e) => {
        e.preventDefault();
        
        try {
            const episodeData = {
                title: Utils.select('#episodeTitle').value,
                thumbnail: Utils.select('#episodeThumbnail').value,
                videoUrl: Utils.select('#episodeVideo').value
            };
            
            const animeId = Utils.select('#episodeAnimeId').value;
            await Database.episodes.add(animeId, episodeData);
            Router.resetEpisodeForm();
            Utils.showToast('Episode added successfully!', 'success');
        } catch (error) {
            Utils.showToast('Failed to add episode', 'error');
        }
    },

    resetAnimeForm: () => {
        Utils.select('#animeForm').reset();
        Utils.select('#animeRating').value = '4.5';
        Utils.select('#animeYear').value = '2024';
    },

    resetEpisodeForm: () => {
        Utils.select('#episodeForm').reset();
    },

    editAnime: (id) => {
        const anime = Database.anime.getById(id);
        if (anime) {
            Utils.select('#animeTitle').value = anime.title;
            Utils.select('#animeThumbnail').value = anime.thumbnail;
            Utils.select('#animeRating').value = anime.rating || 4.5;
            Utils.select('#animeYear').value = anime.year || 2024;
            Utils.select('#animeGenre').value = anime.genre || '';
            Utils.select('#animeStatus').value = anime.status || 'ongoing';
            Utils.select('#animeDescription').value = anime.description || '';
        }
    },

    deleteAnime: async (id) => {
        if (confirm('Are you sure you want to delete this anime and all its episodes?')) {
            try {
                await Database.anime.delete(id);
                Router.switchAdminTab('anime');
                Utils.showToast('Anime deleted successfully!', 'success');
            } catch (error) {
                Utils.showToast('Failed to delete anime', 'error');
            }
        }
    },

    deleteComment: async (id) => {
        if (confirm('Are you sure you want to delete this comment?')) {
            try {
                await Database.comments.delete(id);
                Router.switchAdminTab('comments');
                Utils.showToast('Comment deleted successfully!', 'success');
            } catch (error) {
                Utils.showToast('Failed to delete comment', 'error');
            }
        }
    }
};

// Global function for Google Auth callback
window.handleCredentialResponse = (response) => {
    Auth.handleCredentialResponse(response);
};

// Make available globally
window.Router = Router;
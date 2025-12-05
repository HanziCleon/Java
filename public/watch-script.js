let currentAnime = null;
let currentEpisodeIndex = 0;
let currentUser = null;
let currentComments = [];
let userInteractions = { likes: [], dislikes: [], favorites: [] };
let animeLikeStats = {}; // { animeId_episodeNum: { likes: count, dislikes: count } }

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return { id: parseInt(params.get('id')) || 1, ep: parseInt(params.get('ep')) || 1 };
}

async function fetchAnimeById(id) {
    try {
        const response = await fetch(`/api/anime/${id}`);
        if (!response.ok) throw new Error('Not found');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function loadUserInteractions() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/interactions/${currentUser.id}`);
        if (response.ok) {
            userInteractions = await response.json();
        }
    } catch (error) {
        console.error('Error loading interactions:', error);
    }
}

async function loadLikeStats() {
    try {
        const response = await fetch(`/api/interactions/stats/${currentAnime.id}`);
        if (response.ok) {
            animeLikeStats = await response.json();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function saveInteraction(type, animeId, episodeNum = null) {
    if (!currentUser) {
        window.location.href = '/auth';
        return;
    }

    try {
        const response = await fetch('/api/interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                username: currentUser.username,
                type,
                animeId,
                episodeNum,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            await loadUserInteractions();
            await loadLikeStats();
            updateInteractionButtons();
        }
    } catch (error) {
        console.error('Error saving interaction:', error);
    }
}

function getEpisodeKey(animeId, episodeNum) {
    return `${animeId}_${episodeNum}`;
}

function isEpisodeLiked(animeId, episodeNum) {
    return userInteractions.likes.some(like => 
        like.animeId === animeId && like.episodeNum === episodeNum
    );
}

function isEpisodeDisliked(animeId, episodeNum) {
    return userInteractions.dislikes.some(dislike => 
        dislike.animeId === animeId && dislike.episodeNum === episodeNum
    );
}

function isFavorite(animeId) {
    return userInteractions.favorites.some(fav => fav.animeId === animeId);
}

function getLikeCount(animeId, episodeNum) {
    const key = getEpisodeKey(animeId, episodeNum);
    return animeLikeStats[key]?.likes || 0;
}

function getDislikeCount(animeId, episodeNum) {
    const key = getEpisodeKey(animeId, episodeNum);
    return animeLikeStats[key]?.dislikes || 0;
}

function getFavoriteCount(animeId) {
    return animeLikeStats[animeId]?.favorites || 0;
}

// Like Episode
async function toggleLike() {
    if (!currentUser) {
        window.location.href = '/auth';
        return;
    }

    const episodeNum = currentEpisodeIndex + 1;
    const isLiked = isEpisodeLiked(currentAnime.id, episodeNum);

    if (isLiked) {
        userInteractions.likes = userInteractions.likes.filter(like => 
            !(like.animeId === currentAnime.id && like.episodeNum === episodeNum)
        );
    } else {
        userInteractions.dislikes = userInteractions.dislikes.filter(dislike => 
            !(dislike.animeId === currentAnime.id && dislike.episodeNum === episodeNum)
        );
        userInteractions.likes.push({
            animeId: currentAnime.id,
            episodeNum,
            timestamp: new Date().toISOString()
        });
    }

    await saveInteraction('like', currentAnime.id, episodeNum);
}

// Dislike Episode
async function toggleDislike() {
    if (!currentUser) {
        window.location.href = '/auth';
        return;
    }

    const episodeNum = currentEpisodeIndex + 1;
    const isDisliked = isEpisodeDisliked(currentAnime.id, episodeNum);

    if (isDisliked) {
        userInteractions.dislikes = userInteractions.dislikes.filter(dislike => 
            !(dislike.animeId === currentAnime.id && dislike.episodeNum === episodeNum)
        );
    } else {
        userInteractions.likes = userInteractions.likes.filter(like => 
            !(like.animeId === currentAnime.id && like.episodeNum === episodeNum)
        );
        userInteractions.dislikes.push({
            animeId: currentAnime.id,
            episodeNum,
            timestamp: new Date().toISOString()
        });
    }

    await saveInteraction('dislike', currentAnime.id, episodeNum);
}

// Toggle Favorite
async function toggleFavorite() {
    if (!currentUser) {
        window.location.href = '/auth';
        return;
    }

    const isFav = isFavorite(currentAnime.id);

    if (isFav) {
        userInteractions.favorites = userInteractions.favorites.filter(fav => 
            fav.animeId !== currentAnime.id
        );
    } else {
        userInteractions.favorites.push({
            animeId: currentAnime.id,
            title: currentAnime.judul,
            timestamp: new Date().toISOString()
        });
    }

    await saveInteraction('favorite', currentAnime.id);
}

// Update button states
function updateInteractionButtons() {
    const episodeNum = currentEpisodeIndex + 1;
    const animeId = currentAnime.id;
    
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    
    const isLiked = isEpisodeLiked(animeId, episodeNum);
    const isDisliked = isEpisodeDisliked(animeId, episodeNum);
    const isFav = isFavorite(animeId);

    const likeCount = getLikeCount(animeId, episodeNum);
    const dislikeCount = getDislikeCount(animeId, episodeNum);
    const favCount = getFavoriteCount(animeId);

    if (likeBtn) {
        likeBtn.classList.toggle('active', isLiked);
        const likeCountEl = likeBtn.querySelector('.btn-count');
        if (likeCountEl) likeCountEl.textContent = likeCount > 0 ? likeCount : '';
    }
    if (dislikeBtn) {
        dislikeBtn.classList.toggle('active', isDisliked);
        const dislikeCountEl = dislikeBtn.querySelector('.btn-count');
        if (dislikeCountEl) dislikeCountEl.textContent = dislikeCount > 0 ? dislikeCount : '';
    }
    if (favoriteBtn) {
        favoriteBtn.classList.toggle('active', isFav);
        const favCountEl = favoriteBtn.querySelector('.btn-count');
        if (favCountEl) favCountEl.textContent = favCount > 0 ? favCount : '';
    }
}

// Support all video platform URLs and streaming formats
function extractVideoSource(url) {
    if (!url) return null;

    url = url.trim();

    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[1].length === 11) {
        return { type: 'youtube', id: youtubeMatch[1] };
    }

    const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
        return { type: 'vimeo', id: vimeoMatch[1] };
    }

    const dailymotionRegex = /(?:https?:\/\/)?(?:www\.)?(?:geo\.)?dailymotion\.com\/(?:embed\/video\/|video\/)([a-zA-Z0-9]+)/;
    const dailymotionMatch = url.match(dailymotionRegex);
    if (dailymotionMatch) {
        return { type: 'dailymotion', id: dailymotionMatch[1] };
    }

    const okruRegex = /(?:https?:\/\/)?(?:www\.)?ok\.ru\/videoembed\/(\d+)/;
    const okruMatch = url.match(okruRegex);
    if (okruMatch) {
        return { type: 'okru', id: okruMatch[1] };
    }

    const rumbleRegex = /(?:https?:\/\/)?(?:www\.)?rumble\.com\/embed\/([a-zA-Z0-9]+)/;
    const rumbleMatch = url.match(rumbleRegex);
    if (rumbleMatch) {
        return { type: 'rumble', id: rumbleMatch[1] };
    }

    const twitchRegex = /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/videos\/(\d+)/;
    const twitchMatch = url.match(twitchRegex);
    if (twitchMatch) {
        return { type: 'twitch', id: twitchMatch[1] };
    }

    if (url.includes('terabox.com')) {
        return { type: 'terabox', url: url };
    }

    if (url.includes('anichin.click') || url.includes('anichin.group')) {
        return { type: 'anichin', url: url };
    }

    if (url.includes('.m3u8') || url.match(/\.m3u8(\?|#|$)/i)) {
        return { type: 'hls', url: url };
    }

    if (url.includes('.mpd') || url.match(/\.mpd(\?|#|$)/i)) {
        return { type: 'dash', url: url };
    }

    if (url.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv)(\?|#|$)/i)) {
        return { type: 'direct', url: url };
    }

    return { type: 'iframe', url: url };
}

function loadVideo() {
    const episode = currentAnime.episodes[currentEpisodeIndex];
    const container = document.getElementById('videoContainer');
    
    if (!episode || !episode.url) {
        container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">Video tidak tersedia</div>';
        return;
    }

    const source = extractVideoSource(episode.url);
    
    if (!source) {
        container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">Format video tidak didukung</div>';
        return;
    }

    let html = '';

    switch (source.type) {
        case 'youtube':
            html = `<iframe src="https://www.youtube.com/embed/${source.id}?autoplay=1&modestbranding=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            break;

        case 'vimeo':
            html = `<iframe src="https://player.vimeo.com/video/${source.id}?autoplay=1" allow="autoplay" allowfullscreen></iframe>`;
            break;

        case 'dailymotion':
            html = `<iframe src="https://www.dailymotion.com/embed/video/${source.id}" allow="autoplay" allowfullscreen></iframe>`;
            break;

        case 'okru':
            html = `<iframe src="https://ok.ru/videoembed/${source.id}" allow="autoplay" allowfullscreen></iframe>`;
            break;

        case 'rumble':
            html = `<iframe src="https://rumble.com/embed/${source.id}/?pub=2li51c" allow="autoplay" allowfullscreen></iframe>`;
            break;

        case 'twitch':
            html = `<iframe src="https://player.twitch.tv/?video=${source.id}&parent=${window.location.hostname}&autoplay=true" allow="autoplay" allowfullscreen></iframe>`;
            break;

        case 'terabox':
        case 'anichin':
            html = `<iframe src="${source.url}" allow="autoplay" allowfullscreen style="width: 100%; height: 100%; border: none;"></iframe>`;
            break;

        case 'hls':
            html = `<video id="hls-video" controls playsinline style="width: 100%; height: 100%;"></video>`;
            container.innerHTML = html;
            setTimeout(() => loadHLS(source.url), 100);
            return;

        case 'dash':
            html = `<video id="dash-video" controls playsinline style="width: 100%; height: 100%;"></video>`;
            container.innerHTML = html;
            setTimeout(() => loadDASH(source.url), 100);
            return;

        case 'direct':
            const fileExtension = source.url.split('.').pop().toLowerCase();
            const mimeTypes = {
                'mp4': 'video/mp4',
                'webm': 'video/webm',
                'ogg': 'video/ogg',
                'mov': 'video/quicktime',
                'avi': 'video/x-msvideo',
                'mkv': 'video/x-matroska',
                'flv': 'video/x-flv'
            };
            const mimeType = mimeTypes[fileExtension] || 'video/mp4';
            html = `<video controls playsinline><source src="${source.url}" type="${mimeType}"><p>Browser Anda tidak mendukung HTML5 video.</p></video>`;
            break;

        case 'iframe':
        default:
            html = `<iframe src="${source.url}" allow="autoplay" allowfullscreen style="width: 100%; height: 100%; border: none;"></iframe>`;
            break;
    }

    container.innerHTML = html;
}

function loadHLS(url) {
    const video = document.getElementById('hls-video');
    if (!video) return;

    if (Hls.isSupported()) {
        const hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(err => console.log('Auto-play prevented:', err));
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(err => console.log('Auto-play prevented:', err));
    } else {
        console.error('HLS not supported');
    }
}

function loadDASH(url) {
    const video = document.getElementById('dash-video');
    if (!video) return;

    const dashPlayer = dashjs.MediaPlayer().create();
    dashPlayer.initialize(video, url, true);
    dashPlayer.attachView(video);
    dashPlayer.setAutoPlay(true);
}

function renderAnimeInfo() {
    const anime = currentAnime;
    const ep = currentEpisodeIndex + 1;
    document.getElementById('animeTitle').textContent = anime.judul;
    document.getElementById('episodeBadge').textContent = `Episode ${ep}`;
    document.getElementById('episodeCount').textContent = `${anime.episodes.length} Episode`;
    document.getElementById('animeThumbnail').src = anime.thumbnail || 'https://via.placeholder.com/180x270';
    document.title = `${anime.judul} - Episode ${ep} | DongTube`;
}

function renderEpisodeList() {
    const grid = document.getElementById('episodeGrid');
    const episodes = currentAnime.episodes;
    grid.innerHTML = episodes.map((ep, index) => `
        <button class="episode-btn ${index === currentEpisodeIndex ? 'active' : ''}" onclick="switchEpisode(${index})" title="Episode ${ep.ep}">
            Ep ${ep.ep}
        </button>
    `).join('');
}

function switchEpisode(index) {
    if (index < 0 || index >= currentAnime.episodes.length) return;
    currentEpisodeIndex = index;
    const ep = index + 1;
    window.history.replaceState({}, '', `?id=${currentAnime.id}&ep=${ep}`);
    renderAnimeInfo();
    renderEpisodeList();
    loadVideo();
    loadComments();
    updateInteractionButtons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getAvatarInitial(username) {
    return username.charAt(0).toUpperCase();
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString('id-ID');
}

function findCommentById(id) {
    const findInComments = (comments, commentId) => {
        for (let comment of comments) {
            if (comment.id === commentId) return comment;
            if (comment.replies) {
                const found = findInComments(comment.replies, commentId);
                if (found) return found;
            }
        }
        return null;
    };
    return findInComments(currentComments, id);
}

function renderReplyHTML(reply, parentAuthor) {
    const replyIsOwner = currentUser && currentUser.username === reply.username;
    const replyAvatarUrl = reply.userAvatar;
    
    return `
        <div class="reply" id="comment-${reply.id}">
            <div class="reply-header">
                <div class="reply-avatar">
                    ${replyAvatarUrl && !replyAvatarUrl.includes('placeholder') ? `<img src="${replyAvatarUrl}" alt="${reply.username}" onerror="this.style.display='none'">` : ''}
                    ${!replyAvatarUrl || replyAvatarUrl.includes('placeholder') ? getAvatarInitial(reply.username) : ''}
                </div>
                <div class="reply-meta">
                    <span class="reply-author">${escapeHtml(reply.username)}</span>
                    <span class="reply-to">↳ ${escapeHtml(parentAuthor)}</span>
                    <span class="reply-time">${formatTime(reply.timestamp)}</span>
                    ${replyIsOwner ? `<button class="btn-delete" onclick="deleteComment('${reply.id}')">Hapus</button>` : ''}
                </div>
            </div>
            <div class="reply-content">${escapeHtml(reply.content)}</div>
        </div>
    `;
}

function renderCommentThread(comment) {
    const isOwner = currentUser && currentUser.username === comment.username;
    const avatarUrl = comment.userAvatar;
    const replyCount = comment.replies ? comment.replies.length : 0;
    
    let html = `
        <div class="comment" id="comment-${comment.id}">
            <div class="comment-header">
                <div class="comment-avatar">
                    ${avatarUrl && !avatarUrl.includes('placeholder') ? `<img src="${avatarUrl}" alt="${comment.username}" onerror="this.style.display='none'">` : ''}
                    ${!avatarUrl || avatarUrl.includes('placeholder') ? getAvatarInitial(comment.username) : ''}
                </div>
                <div class="comment-info">
                    <div class="comment-top">
                        <div class="comment-meta">
                            <span class="comment-author">${escapeHtml(comment.username)}</span>
                            <span class="comment-time">${formatTime(comment.timestamp)}</span>
                        </div>
                        ${isOwner ? `<button class="btn-delete" onclick="deleteComment('${comment.id}')">Hapus</button>` : ''}
                    </div>
                </div>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <div class="comment-actions-btn">
                <button class="btn-reply" onclick="toggleReplyForm('${comment.id}')">Balas</button>
                ${replyCount > 0 ? `<button class="btn-reply" onclick="toggleReplies('${comment.id}')" id="toggle-btn-${comment.id}">Lihat ${replyCount} balasan</button>` : ''}
            </div>
            
            <div id="reply-form-${comment.id}" class="reply-form">
                <textarea class="reply-input" id="reply-input-${comment.id}" placeholder="Balas komentar..." maxlength="500"></textarea>
                <div class="reply-form-actions">
                    <button class="btn-small" onclick="submitReply('${comment.id}')">Kirim</button>
                    <button class="btn-small btn-cancel" onclick="toggleReplyForm('${comment.id}')">Batal</button>
                </div>
            </div>

            <div id="replies-${comment.id}" class="replies-container">
                <div id="replies-list-${comment.id}">
                    ${comment.replies && comment.replies.length > 0 ? 
                        comment.replies.map(reply => renderReplyHTML(reply, comment.username)).join('') 
                        : ''}
                </div>
            </div>
        </div>
    `;
    
    return html;
}

function toggleReplyForm(commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) {
        form.classList.toggle('show');
        if (form.classList.contains('show')) {
            document.getElementById(`reply-input-${commentId}`).focus();
        }
    }
}

function toggleReplies(commentId) {
    const container = document.getElementById(`replies-${commentId}`);
    const btn = document.getElementById(`toggle-btn-${commentId}`);
    const comment = findCommentById(commentId);
    
    if (container) {
        container.classList.toggle('show');
        if (container.classList.contains('show')) {
            const replyCount = comment ? (comment.replies ? comment.replies.length : 0) : 0;
            btn.textContent = `Sembunyikan ${replyCount} balasan`;
        } else {
            const replyCount = comment ? (comment.replies ? comment.replies.length : 0) : 0;
            btn.textContent = `Lihat ${replyCount} balasan`;
        }
    }
}

async function loadComments() {
    try {
        const response = await fetch('/api/comments');
        const allComments = await response.json();
        const filtered = allComments.filter(c => 
            c.animeId === currentAnime.id && 
            c.episodeNum === (currentEpisodeIndex + 1)
        );

        currentComments = filtered;
        const list = document.getElementById('commentsList');
        list.innerHTML = '';

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-comments">Belum ada komentar. Jadilah yang pertama!</div>';
            updateCommentCount(0);
            return;
        }

        filtered.forEach(comment => {
            const el = document.createElement('div');
            el.innerHTML = renderCommentThread(comment);
            list.appendChild(el.firstElementChild);
        });

        updateCommentCount(filtered.length);
    } catch (error) {
        console.error('Load comments error:', error);
    }
}

function updateCommentCount(count) {
    document.getElementById('commentsCount').textContent = `${count} komentar`;
}

async function submitComment() {
    if (!currentUser) {
        window.location.href = '/auth';
        return;
    }

    const input = document.getElementById('commentInput');
    const content = input.value.trim();
    if (!content) return;

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.username,
                animeId: currentAnime.id,
                episodeNum: currentEpisodeIndex + 1,
                content,
                userAvatar: currentUser.profilePicture
            })
        });

        if (!response.ok) throw new Error('Failed to add comment');

        input.value = '';
        document.getElementById('charCount').textContent = '0/500';
        loadComments();
    } catch (error) {
        console.error('Submit comment error:', error);
        alert('Gagal mengirim komentar');
    }
}

async function submitReply(parentId) {
    if (!currentUser) {
        window.location.href = '/auth';
        return;
    }

    const input = document.getElementById(`reply-input-${parentId}`);
    const content = input.value.trim();
    if (!content) return;

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.username,
                animeId: currentAnime.id,
                episodeNum: currentEpisodeIndex + 1,
                content,
                userAvatar: currentUser.profilePicture,
                parentId: parentId
            })
        });

        if (!response.ok) throw new Error('Failed to add reply');

        toggleReplyForm(parentId);
        loadComments();
    } catch (error) {
        console.error('Submit reply error:', error);
        alert('Gagal mengirim balasan');
    }
}

async function deleteComment(commentId) {
    if (!confirm('Yakin ingin menghapus komentar ini?')) return;

    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete comment');

        loadComments();
    } catch (error) {
        console.error('Delete comment error:', error);
        alert('Gagal menghapus komentar');
    }
}

async function initApp() {
    try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            currentUser = JSON.parse(userStr);
            await loadUserInteractions();
        }

        const { id, ep } = getUrlParams();
        const anime = await fetchAnimeById(id);

        if (!anime) {
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }

        currentAnime = anime;
        currentEpisodeIndex = Math.min(ep - 1, anime.episodes.length - 1);

        await loadLikeStats();

        renderAnimeInfo();
        renderEpisodeList();
        loadVideo();
        loadComments();
        updateInteractionButtons();

        const commentForm = document.getElementById('commentForm');
        const commentLogin = document.getElementById('commentLogin');
        const commentInput = document.getElementById('commentInput');

        if (currentUser) {
            commentForm.style.display = 'block';
            commentLogin.style.display = 'none';
            commentInput.addEventListener('input', () => {
                document.getElementById('charCount').textContent = `${commentInput.value.length}/500`;
            });
        } else {
            commentForm.style.display = 'none';
            commentLogin.style.display = 'block';
        }

        document.getElementById('mainContent').style.display = 'grid';

    } catch (error) {
        console.error('Error:', error);
    } finally {
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 500);
    }
}

document.addEventListener('DOMContentLoaded', initApp);
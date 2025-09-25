// Video Player module for AnimeFlow
const Player = {
    // Player state
    currentAnime: null,
    currentEpisode: null,
    videoElement: null,
    isPlaying: false,
    isFullscreen: false,
    isMuted: false,
    currentVolume: 100,
    currentSpeed: 1,
    duration: 0,
    currentTime: 0,
    
    // HLS and DASH players
    hlsPlayer: null,
    dashPlayer: null,

    // Initialize player
    init: (anime, episodeId = null) => {
        Player.currentAnime = anime;
        Player.videoElement = Utils.select('#videoElement');
        
        if (!Player.videoElement) {
            console.error('Video element not found');
            return;
        }

        // Load first episode or specified episode
        const episodes = anime.episodes || [];
        if (episodes.length > 0) {
            const episode = episodeId ? episodes.find(ep => ep.id === parseInt(episodeId)) : episodes[0];
            if (episode) {
                Player.loadEpisode(episode.id);
            }
        }

        // Set up event listeners
        Player.setupEventListeners();
    },

    // Set up all event listeners
    setupEventListeners: () => {
        const video = Player.videoElement;
        if (!video) return;

        // Video events
        video.addEventListener('loadedmetadata', Player.onLoadedMetadata);
        video.addEventListener('timeupdate', Player.onTimeUpdate);
        video.addEventListener('ended', Player.onEnded);
        video.addEventListener('play', Player.onPlay);
        video.addEventListener('pause', Player.onPause);
        video.addEventListener('volumechange', Player.onVolumeChange);
        video.addEventListener('error', Player.onError);
        video.addEventListener('waiting', Player.onWaiting);
        video.addEventListener('canplay', Player.onCanPlay);

        // Fullscreen events
        document.addEventListener('fullscreenchange', Player.onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', Player.onFullscreenChange);
        document.addEventListener('mozfullscreenchange', Player.onFullscreenChange);
        document.addEventListener('MSFullscreenChange', Player.onFullscreenChange);

        // Keyboard controls
        document.addEventListener('keydown', Player.onKeyDown);

        // Click to play/pause
        Utils.select('#videoPlayer')?.addEventListener('click', (e) => {
            if (e.target === Player.videoElement || e.target.closest('.video-overlay')) {
                Player.togglePlay();
            }
        });

        // Volume slider
        Utils.on('#volumeSlider', 'input', (e) => {
            Player.setVolume(e.target.value);
        });

        // Auto-resize comment input
        Utils.on('#commentInput', 'input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });

        // Comment submit on Enter
        Utils.on('#commentInput', 'keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                Router.addComment();
            }
        });
    },

    // Load specific episode
    loadEpisode: (episodeId) => {
        if (!Player.currentAnime || !Player.currentAnime.episodes) return;

        const episode = Player.currentAnime.episodes.find(ep => ep.id === parseInt(episodeId));
        if (!episode) {
            console.error('Episode not found:', episodeId);
            return;
        }

        Player.currentEpisode = episode;
        
        // Update UI
        Player.updateEpisodeInfo();
        Player.updateActiveEpisode(episodeId);
        
        // Load video source
        Player.loadVideoSource(episode.videoUrl);
        
        // Add to watch history
        if (Auth.isAuthenticated()) {
            Auth.addToWatchHistory(Player.currentAnime.id, episode.id, 0);
        }

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('episode', episodeId);
        window.history.replaceState(null, '', url);
    },

    // Load video source with format detection
    loadVideoSource: (url) => {
        if (!url || !Player.videoElement) return;

        // Clean up previous players
        Player.cleanup();

        // Detect video format and load appropriate player
        if (url.includes('.m3u8')) {
            Player.loadHLS(url);
        } else if (url.includes('.mpd')) {
            Player.loadDASH(url);
        } else {
            // Standard video formats
            Player.videoElement.src = url;
        }

        // Reset player state
        Player.isPlaying = false;
        Player.currentTime = 0;
        Player.updateControls();
    },

    // Load HLS stream
    loadHLS: (url) => {
        if (Hls.isSupported()) {
            Player.hlsPlayer = new Hls(CONFIG.PLAYER.HLS_CONFIG);
            Player.hlsPlayer.loadSource(url);
            Player.hlsPlayer.attachMedia(Player.videoElement);
            
            Player.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS manifest loaded');
            });
            
            Player.hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                    Player.handleVideoError('HLS streaming error');
                }
            });
        } else if (Player.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS support
            Player.videoElement.src = url;
        } else {
            Player.handleVideoError('HLS not supported');
        }
    },

    // Load DASH stream
    loadDASH: (url) => {
        if (typeof dashjs !== 'undefined') {
            Player.dashPlayer = dashjs.MediaPlayer().create();
            Player.dashPlayer.initialize(Player.videoElement, url, false);
            Player.dashPlayer.updateSettings(CONFIG.PLAYER.DASH_CONFIG);
            
            Player.dashPlayer.on('error', (e) => {
                console.error('DASH error:', e);
                Player.handleVideoError('DASH streaming error');
            });
        } else {
            Player.handleVideoError('DASH not supported');
        }
    },

    // Clean up players
    cleanup: () => {
        if (Player.hlsPlayer) {
            Player.hlsPlayer.destroy();
            Player.hlsPlayer = null;
        }
        
        if (Player.dashPlayer) {
            Player.dashPlayer.reset();
            Player.dashPlayer = null;
        }
    },

    // Update episode info in UI
    updateEpisodeInfo: () => {
        const episode = Player.currentEpisode;
        if (!episode) return;

        const titleElement = Utils.select('#currentEpisodeTitle');
        const durationElement = Utils.select('#episodeDuration');

        if (titleElement) {
            titleElement.textContent = episode.title;
        }
        
        if (durationElement && episode.duration) {
            durationElement.textContent = episode.duration;
        }

        // Update page title
        document.title = `${episode.title} - ${Player.currentAnime.title} - AnimeFlow`;
    },

    // Update active episode in list
    updateActiveEpisode: (episodeId) => {
        Utils.selectAll('.episode-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const activeCard = Utils.select(`.episode-card[onclick*="${episodeId}"]`);
        if (activeCard) {
            activeCard.classList.add('active');
        }
    },

    // Toggle play/pause
    togglePlay: () => {
        if (!Player.videoElement) return;

        if (Player.isPlaying) {
            Player.pause();
        } else {
            Player.play();
        }
    },

    // Play video
    play: () => {
        if (!Player.videoElement) return;

        Player.videoElement.play().then(() => {
            Player.isPlaying = true;
            Player.updatePlayButton();
        }).catch(error => {
            console.error('Play failed:', error);
            Utils.showToast('Failed to play video', 'error');
        });
    },

    // Pause video
    pause: () => {
        if (!Player.videoElement) return;

        Player.videoElement.pause();
        Player.isPlaying = false;
        Player.updatePlayButton();
    },

    // Update play button
    updatePlayButton: () => {
        const playBtn = Utils.select('#playPauseBtn');
        const overlayBtn = Utils.select('.play-btn');
        const overlay = Utils.select('#videoOverlay');

        if (Player.isPlaying) {
            if (playBtn) playBtn.textContent = '⏸';
            if (overlayBtn) overlayBtn.textContent = '⏸';
            if (overlay) overlay.style.opacity = '0';
        } else {
            if (playBtn) playBtn.textContent = '▶';
            if (overlayBtn) overlayBtn.textContent = '▶';
            if (overlay) overlay.style.opacity = '1';
        }
    },

    // Skip time (forward/backward)
    skipTime: (seconds) => {
        if (!Player.videoElement) return;

        const newTime = Math.max(0, Math.min(Player.duration, Player.videoElement.currentTime + seconds));
        Player.videoElement.currentTime = newTime;
    },

    // Seek to specific time
    seekVideo: (event) => {
        if (!Player.videoElement || !Player.duration) return;

        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * Player.duration;

        Player.videoElement.currentTime = newTime;
    },

    // Toggle mute
    toggleMute: () => {
        if (!Player.videoElement) return;

        if (Player.isMuted) {
            Player.videoElement.muted = false;
            Player.videoElement.volume = Player.currentVolume / 100;
            Player.isMuted = false;
        } else {
            Player.videoElement.muted = true;
            Player.isMuted = true;
        }

        Player.updateMuteButton();
    },

    // Set volume
    setVolume: (value) => {
        if (!Player.videoElement) return;

        const volume = Math.max(0, Math.min(100, value));
        Player.currentVolume = volume;
        Player.videoElement.volume = volume / 100;
        
        if (volume === 0) {
            Player.videoElement.muted = true;
            Player.isMuted = true;
        } else {
            Player.videoElement.muted = false;
            Player.isMuted = false;
        }

        Player.updateMuteButton();
        
        // Save volume setting
        if (Auth.isAuthenticated()) {
            Auth.saveUserSettings({ volume: volume });
        }
    },

    // Update mute button
    updateMuteButton: () => {
        const muteBtn = Utils.select('#muteBtn');
        if (!muteBtn) return;

        if (Player.isMuted || Player.currentVolume === 0) {
            muteBtn.textContent = '🔇';
        } else if (Player.currentVolume < 50) {
            muteBtn.textContent = '🔉';
        } else {
            muteBtn.textContent = '🔊';
        }
    },

    // Change playback speed
    changePlaybackSpeed: () => {
        const speeds = CONFIG.PLAYER.SUPPORTED_SPEEDS;
        const currentIndex = speeds.indexOf(Player.currentSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        Player.currentSpeed = speeds[nextIndex];
        
        if (Player.videoElement) {
            Player.videoElement.playbackRate = Player.currentSpeed;
        }

        // Update button text
        const speedBtn = Utils.select('.control-btn[onclick*="changePlaybackSpeed"]');
        if (speedBtn) {
            speedBtn.textContent = `${Player.currentSpeed}x`;
        }
    },

    // Set playback speed
    setPlaybackSpeed: (speed) => {
        Player.currentSpeed = parseFloat(speed);
        if (Player.videoElement) {
            Player.videoElement.playbackRate = Player.currentSpeed;
        }
    },

    // Toggle fullscreen
    toggleFullscreen: () => {
        const playerElement = Utils.select('#videoPlayer');
        if (!playerElement) return;

        if (!Player.isFullscreen) {
            Player.enterFullscreen(playerElement);
        } else {
            Player.exitFullscreen();
        }
    },

    // Enter fullscreen
    enterFullscreen: (element) => {
        const requestFullscreen = element.requestFullscreen ||
                                element.webkitRequestFullscreen ||
                                element.mozRequestFullScreen ||
                                element.msRequestFullscreen;

        if (requestFullscreen) {
            requestFullscreen.call(element);
        }
    },

    // Exit fullscreen
    exitFullscreen: () => {
        const exitFullscreen = document.exitFullscreen ||
                              document.webkitExitFullscreen ||
                              document.mozCancelFullScreen ||
                              document.msExitFullscreen;

        if (exitFullscreen) {
            exitFullscreen.call(document);
        }
    },

    // Toggle settings panel
    toggleSettings: () => {
        const panel = Utils.select('#settingsPanel');
        if (panel) {
            panel.classList.toggle('show');
        }
    },

    // Toggle subtitles
    toggleSubtitles: () => {
        // Implementation for subtitle toggle
        Utils.showToast('Subtitles feature coming soon', 'info');
    },

    // Update progress bar and time display
    updateProgress: () => {
        if (!Player.videoElement || !Player.duration) return;

        const currentTime = Player.videoElement.currentTime;
        const percentage = (currentTime / Player.duration) * 100;

        // Update progress bar
        const progressFill = Utils.select('#progressFill');
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }

        // Update time displays
        const currentTimeEl = Utils.select('#currentTime');
        const totalTimeEl = Utils.select('#totalTime');
        const timeDisplayEl = Utils.select('#timeDisplay');

        if (currentTimeEl) {
            currentTimeEl.textContent = Utils.formatTime(currentTime);
        }
        
        if (totalTimeEl) {
            totalTimeEl.textContent = Utils.formatTime(Player.duration);
        }
        
        if (timeDisplayEl) {
            timeDisplayEl.textContent = `${Utils.formatTime(currentTime)} / ${Utils.formatTime(Player.duration)}`;
        }

        // Update watch progress
        if (Auth.isAuthenticated() && Player.currentEpisode) {
            const progressPercent = (currentTime / Player.duration) * 100;
            if (progressPercent > 10) { // Only save if watched more than 10%
                Auth.addToWatchHistory(Player.currentAnime.id, Player.currentEpisode.id, progressPercent);
            }
        }
    },

    // Update all controls
    updateControls: () => {
        Player.updatePlayButton();
        Player.updateMuteButton();
        Player.updateProgress();
    },

    // Handle video errors
    handleVideoError: (message) => {
        console.error('Video error:', message);
        Utils.showToast(message || CONFIG.ERRORS.VIDEO_LOAD_FAILED, 'error');
        
        // Show error overlay
        const overlay = Utils.select('#videoOverlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align: center; color: white;">
                    <h3>Video Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Reload Page</button>
                </div>
            `;
            overlay.style.opacity = '1';
        }
    },

    // Event handlers
    onLoadedMetadata: () => {
        Player.duration = Player.videoElement.duration;
        Player.updateProgress();
        
        // Apply saved settings
        if (Auth.isAuthenticated() && Auth.currentUser.settings) {
            const settings = Auth.currentUser.settings;
            Player.setVolume(settings.volume || CONFIG.PLAYER.VOLUME);
            
            if (settings.autoplay && CONFIG.PLAYER.AUTO_PLAY) {
                Player.play();
            }
        }
    },

    onTimeUpdate: () => {
        Player.currentTime = Player.videoElement.currentTime;
        Player.updateProgress();
    },

    onEnded: () => {
        Player.isPlaying = false;
        Player.updatePlayButton();
        
        // Auto-play next episode
        Player.playNextEpisode();
    },

    onPlay: () => {
        Player.isPlaying = true;
        Player.updatePlayButton();
    },

    onPause: () => {
        Player.isPlaying = false;
        Player.updatePlayButton();
    },

    onVolumeChange: () => {
        Player.currentVolume = Math.round(Player.videoElement.volume * 100);
        Player.isMuted = Player.videoElement.muted;
        Player.updateMuteButton();
        
        // Update volume slider
        const volumeSlider = Utils.select('#volumeSlider');
        if (volumeSlider) {
            volumeSlider.value = Player.currentVolume;
        }
    },

    onError: () => {
        Player.handleVideoError('Failed to load video');
    },

    onWaiting: () => {
        // Show loading indicator
        Utils.showLoading();
    },

    onCanPlay: () => {
        // Hide loading indicator
        Utils.hideLoading();
    },

    onFullscreenChange: () => {
        Player.isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        
        // Update fullscreen button
        const fullscreenBtn = Utils.select('[onclick*="toggleFullscreen"]');
        if (fullscreenBtn) {
            fullscreenBtn.textContent = Player.isFullscreen ? '⛶' : '⛶';
        }
    },

    onKeyDown: (e) => {
        // Only handle keys when video player is focused or visible
        if (!Utils.select('#videoPlayer') || Router.currentRoute !== '/watch') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                Player.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                Player.skipTime(-10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                Player.skipTime(10);
                break;
            case 'ArrowUp':
                e.preventDefault();
                Player.setVolume(Player.currentVolume + 5);
                break;
            case 'ArrowDown':
                e.preventDefault();
                Player.setVolume(Player.currentVolume - 5);
                break;
            case 'KeyM':
                e.preventDefault();
                Player.toggleMute();
                break;
            case 'KeyF':
                e.preventDefault();
                Player.toggleFullscreen();
                break;
            case 'Escape':
                if (Player.isFullscreen) {
                    Player.exitFullscreen();
                }
                break;
        }
    },

    // Play next episode
    playNextEpisode: () => {
        if (!Player.currentAnime || !Player.currentAnime.episodes || !Player.currentEpisode) return;

        const episodes = Player.currentAnime.episodes;
        const currentIndex = episodes.findIndex(ep => ep.id === Player.currentEpisode.id);
        
        if (currentIndex < episodes.length - 1) {
            const nextEpisode = episodes[currentIndex + 1];
            Player.loadEpisode(nextEpisode.id);
            Utils.showToast(`Playing next episode: ${nextEpisode.title}`, 'success');
        } else {
            Utils.showToast('You have reached the end of this series', 'info');
        }
    },

    // Play previous episode
    playPreviousEpisode: () => {
        if (!Player.currentAnime || !Player.currentAnime.episodes || !Player.currentEpisode) return;

        const episodes = Player.currentAnime.episodes;
        const currentIndex = episodes.findIndex(ep => ep.id === Player.currentEpisode.id);
        
        if (currentIndex > 0) {
            const prevEpisode = episodes[currentIndex - 1];
            Player.loadEpisode(prevEpisode.id);
            Utils.showToast(`Playing previous episode: ${prevEpisode.title}`, 'success');
        } else {
            Utils.showToast('This is the first episode', 'info');
        }
    },

    // Get current playback state
    getState: () => ({
        anime: Player.currentAnime,
        episode: Player.currentEpisode,
        isPlaying: Player.isPlaying,
        currentTime: Player.currentTime,
        duration: Player.duration,
        volume: Player.currentVolume,
        speed: Player.currentSpeed,
        isFullscreen: Player.isFullscreen,
        isMuted: Player.isMuted
    }),

    // Destroy player and clean up
    destroy: () => {
        // Remove event listeners
        if (Player.videoElement) {
            Player.videoElement.removeEventListener('loadedmetadata', Player.onLoadedMetadata);
            Player.videoElement.removeEventListener('timeupdate', Player.onTimeUpdate);
            Player.videoElement.removeEventListener('ended', Player.onEnded);
            Player.videoElement.removeEventListener('play', Player.onPlay);
            Player.videoElement.removeEventListener('pause', Player.onPause);
            Player.videoElement.removeEventListener('volumechange', Player.onVolumeChange);
            Player.videoElement.removeEventListener('error', Player.onError);
            Player.videoElement.removeEventListener('waiting', Player.onWaiting);
            Player.videoElement.removeEventListener('canplay', Player.onCanPlay);
        }

        document.removeEventListener('keydown', Player.onKeyDown);

        // Clean up players
        Player.cleanup();

        // Reset state
        Player.currentAnime = null;
        Player.currentEpisode = null;
        Player.videoElement = null;
        Player.isPlaying = false;
        Player.isFullscreen = false;
        Player.isMuted = false;
        Player.currentVolume = 100;
        Player.currentSpeed = 1;
        Player.duration = 0;
        Player.currentTime = 0;
    }
};

// Make available globally
window.Player = Player;
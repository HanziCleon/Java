// Authentication module for AnimeFlow
const Auth = {
    currentUser: null,
    isInitialized: false,

    // Initialize Google Auth
    init: async () => {
        try {
            if (typeof google !== 'undefined' && google.accounts) {
                google.accounts.id.initialize({
                    client_id: CONFIG.GOOGLE_CLIENT_ID,
                    callback: Auth.handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });

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

                Auth.isInitialized = true;
                Utils.showToast('Authentication ready', 'success');
                
                // Check for existing session
                Auth.checkExistingSession();
            } else {
                throw new Error('Google SDK not loaded');
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            Utils.showToast('Authentication unavailable', 'error');
        }
    },

    // Handle Google credential response
    handleCredentialResponse: async (response) => {
        Utils.showLoading();
        
        try {
            const payload = Auth.decodeJWT(response.credential);
            const user = {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                picture: payload.picture,
                username: null,
                loginTime: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                isAdmin: CONFIG.ADMIN_EMAILS.includes(payload.email)
            };

            // Simulate loading for UX
            setTimeout(() => {
                Auth.signInUser(user);
                Utils.hideLoading();
            }, 1000);

        } catch (error) {
            console.error('Authentication error:', error);
            Utils.hideLoading();
            Utils.showToast(CONFIG.ERRORS.AUTH_FAILED, 'error');
        }
    },

    // Decode JWT token
    decodeJWT: (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            throw new Error('Invalid token format');
        }
    },

    // Sign in user
    signInUser: (user) => {
        Auth.currentUser = user;
        
        // Save to localStorage
        Utils.storage.set(CONFIG.STORAGE_KEYS.USER_DATA, user);
        
        // Update UI
        Auth.updateUI();
        
        // Navigate to appropriate page
        if (Router.currentRoute === '/') {
            Router.navigate('/browse');
        }
        
        Utils.showToast(`${CONFIG.SUCCESS.LOGIN} ${user.name}!`, 'success');
        
        // Initialize user-specific features
        Auth.initUserFeatures();
    },

    // Update UI for authenticated user
    updateUI: () => {
        const user = Auth.currentUser;
        if (!user) return;

        // Show user profile
        Utils.select('#userProfile').style.display = 'flex';
        Utils.select('#userAvatar').src = user.picture;
        Utils.select('#userName').textContent = user.name;

        // Show navigation menu and search
        Utils.select('#navMenu').style.display = 'flex';
        
        // Show admin button for admin users
        if (user.isAdmin) {
            Utils.select('#adminBtn').style.display = 'block';
        }

        // Update any user-specific UI elements
        Auth.updateUserElements();
    },

    // Update user-specific elements
    updateUserElements: () => {
        const user = Auth.currentUser;
        if (!user) return;

        // Update display name throughout the app
        Utils.selectAll('.user-display-name').forEach(el => {
            el.textContent = user.username || user.name;
        });

        // Update avatar images
        Utils.selectAll('.user-avatar-img').forEach(el => {
            el.src = user.picture;
        });
    },

    // Initialize user-specific features
    initUserFeatures: () => {
        // Load user settings
        Auth.loadUserSettings();
        
        // Initialize watch history
        Auth.initWatchHistory();
        
        // Initialize favorites
        Auth.initFavorites();
        
        // Set up periodic activity tracking
        Auth.startActivityTracking();
    },

    // Load user settings
    loadUserSettings: () => {
        const settings = Utils.storage.get(CONFIG.STORAGE_KEYS.SETTINGS, {
            quality: CONFIG.PLAYER.DEFAULT_QUALITY,
            volume: CONFIG.PLAYER.VOLUME,
            autoplay: CONFIG.PLAYER.AUTO_PLAY,
            subtitles: true
        });

        Auth.currentUser.settings = settings;
    },

    // Save user settings
    saveUserSettings: (settings) => {
        if (!Auth.currentUser) return false;
        
        Auth.currentUser.settings = { ...Auth.currentUser.settings, ...settings };
        Utils.storage.set(CONFIG.STORAGE_KEYS.SETTINGS, Auth.currentUser.settings);
        Utils.storage.set(CONFIG.STORAGE_KEYS.USER_DATA, Auth.currentUser);
        
        return true;
    },

    // Initialize watch history
    initWatchHistory: () => {
        const history = Utils.storage.get(CONFIG.STORAGE_KEYS.WATCH_HISTORY, []);
        Auth.currentUser.watchHistory = history;
    },

    // Add to watch history
    addToWatchHistory: (animeId, episodeId, progress = 0) => {
        if (!Auth.currentUser) return;

        const historyItem = {
            animeId,
            episodeId,
            progress,
            timestamp: new Date().toISOString()
        };

        // Remove existing entry for same anime/episode
        Auth.currentUser.watchHistory = Auth.currentUser.watchHistory.filter(
            item => !(item.animeId === animeId && item.episodeId === episodeId)
        );

        // Add new entry at the beginning
        Auth.currentUser.watchHistory.unshift(historyItem);

        // Limit history size
        if (Auth.currentUser.watchHistory.length > 100) {
            Auth.currentUser.watchHistory = Auth.currentUser.watchHistory.slice(0, 100);
        }

        // Save to storage
        Utils.storage.set(CONFIG.STORAGE_KEYS.WATCH_HISTORY, Auth.currentUser.watchHistory);
        Utils.storage.set(CONFIG.STORAGE_KEYS.USER_DATA, Auth.currentUser);
    },

    // Initialize favorites
    initFavorites: () => {
        const favorites = Utils.storage.get(CONFIG.STORAGE_KEYS.FAVORITES, []);
        Auth.currentUser.favorites = favorites;
    },

    // Add to favorites
    addToFavorites: (animeId) => {
        if (!Auth.currentUser) return false;

        if (!Auth.currentUser.favorites.includes(animeId)) {
            Auth.currentUser.favorites.push(animeId);
            Utils.storage.set(CONFIG.STORAGE_KEYS.FAVORITES, Auth.currentUser.favorites);
            Utils.storage.set(CONFIG.STORAGE_KEYS.USER_DATA, Auth.currentUser);
            Utils.showToast('Added to favorites', 'success');
            return true;
        }
        return false;
    },

    // Remove from favorites
    removeFromFavorites: (animeId) => {
        if (!Auth.currentUser) return false;

        const index = Auth.currentUser.favorites.indexOf(animeId);
        if (index > -1) {
            Auth.currentUser.favorites.splice(index, 1);
            Utils.storage.set(CONFIG.STORAGE_KEYS.FAVORITES, Auth.currentUser.favorites);
            Utils.storage.set(CONFIG.STORAGE_KEYS.USER_DATA, Auth.currentUser);
            Utils.showToast('Removed from favorites', 'info');
            return true;
        }
        return false;
    },

    // Check if anime is favorited
    isFavorite: (animeId) => {
        return Auth.currentUser && Auth.currentUser.favorites.includes(animeId);
    },

    // Start activity tracking
    startActivityTracking: () => {
        // Update last active timestamp every 30 seconds
        setInterval(() => {
            if (Auth.currentUser) {
                Auth.currentUser.lastActive = new Date().toISOString();
                Utils.storage.set(CONFIG.STORAGE_KEYS.USER_DATA, Auth.currentUser);
            }
        }, 30000);
    },

    // Check for existing session
    checkExistingSession: () => {
        const userData = Utils.storage.get(CONFIG.STORAGE_KEYS.USER_DATA);
        if (userData) {
            // Check if session is still valid (less than 30 days old)
            const loginTime = new Date(userData.loginTime);
            const now = new Date();
            const daysDiff = (now - loginTime) / (1000 * 60 * 60 * 24);

            if (daysDiff < 30) {
                Auth.currentUser = userData;
                Auth.updateUI();
                Auth.initUserFeatures();

                // Navigate away from auth page if currently there
                if (Router.currentRoute === '/') {
                    Router.navigate('/browse');
                }

                Utils.showToast(`Welcome back, ${userData.name}!`, 'success');
            } else {
                // Session expired, clear storage
                Auth.clearSession();
            }
        }
    },

    // Username modal functions
    showUsernameModal: () => {
        const modal = Utils.select('#usernameModal');
        const input = Utils.select('#usernameInput');
        
        modal.style.display = 'flex';
        if (Auth.currentUser) {
            input.value = Auth.currentUser.name.split(' ')[0] || '';
        }
        input.focus();
    },

    hideUsernameModal: () => {
        Utils.select('#usernameModal').style.display = 'none';
    },

    saveUsername: () => {
        const username = Utils.select('#usernameInput').value.trim();
        
        if (!username) {
            Utils.showToast('Please enter a username', 'warning');
            return;
        }

        if (!Utils.validate.username(username)) {
            Utils.showToast('Username must be 3-20 characters, letters, numbers and underscore only', 'error');
            return;
        }

        if (Auth.currentUser) {
            Auth.currentUser.username = username;
            Utils.storage.set(CONFIG.STORAGE_KEYS.USER_DATA, Auth.currentUser);
            Auth.updateUserElements();
            Auth.hideUsernameModal();
            Utils.showToast('Username saved successfully!', 'success');
        }
    },

    // Check if user needs username
    checkUsername: () => {
        if (Auth.currentUser && !Auth.currentUser.username) {
            Auth.showUsernameModal();
            return false;
        }
        return true;
    },

    // Sign out user
    signOut: () => {
        if (Auth.currentUser) {
            // Clear user data
            Auth.clearSession();
            
            // Update UI
            Auth.clearUI();
            
            // Navigate to home
            Router.navigate('/');
            
            Utils.showToast(CONFIG.SUCCESS.LOGOUT, 'info');
        }
    },

    // Clear session data
    clearSession: () => {
        Auth.currentUser = null;
        Utils.storage.remove(CONFIG.STORAGE_KEYS.USER_DATA);
        Utils.storage.remove(CONFIG.STORAGE_KEYS.SETTINGS);
        Utils.storage.remove(CONFIG.STORAGE_KEYS.WATCH_HISTORY);
        Utils.storage.remove(CONFIG.STORAGE_KEYS.FAVORITES);
    },

    // Clear UI elements
    clearUI: () => {
        Utils.select('#userProfile').style.display = 'none';
        Utils.select('#navMenu').style.display = 'none';
        Utils.select('#navSearch').style.display = 'none';
        Utils.select('#adminBtn').style.display = 'none';
        
        // Clear user-specific elements
        Utils.selectAll('.user-display-name').forEach(el => el.textContent = '');
        Utils.selectAll('.user-avatar-img').forEach(el => el.src = '');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return Auth.currentUser !== null;
    },

    // Check if user is admin
    isAdmin: () => {
        return Auth.currentUser && Auth.currentUser.isAdmin;
    },

    // Require authentication
    requireAuth: (callback) => {
        if (Auth.isAuthenticated()) {
            callback();
        } else {
            Router.navigate('/');
            Utils.showToast('Please sign in to continue', 'warning');
        }
    },

    // Require admin access
    requireAdmin: (callback) => {
        if (Auth.isAdmin()) {
            callback();
        } else if (Auth.isAuthenticated()) {
            Utils.showToast(CONFIG.ERRORS.ADMIN_REQUIRED, 'error');
        } else {
            Router.navigate('/');
            Utils.showToast('Admin access required', 'warning');
        }
    },

    // Get current user
    getCurrentUser: () => {
        return Auth.currentUser;
    },

    // Update user profile
    updateProfile: (updates) => {
        if (!Auth.currentUser) return false;

        Object.assign(Auth.currentUser, updates);
        Utils.storage.set(CONFIG.STORAGE_KEYS.USER_DATA, Auth.currentUser);
        Auth.updateUserElements();
        
        return true;
    }
};

// Event listeners for username modal
Utils.on(document, 'DOMContentLoaded', () => {
    // Username input enter key
    Utils.on('#usernameInput', 'keypress', (e) => {
        if (e.key === 'Enter') {
            Auth.saveUsername();
        }
    });

    // Click outside modal to close
    Utils.on('#usernameModal', 'click', (e) => {
        if (e.target.id === 'usernameModal') {
            Auth.hideUsernameModal();
        }
    });
});

// Make available globally
window.Auth = Auth;
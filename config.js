// Configuration file for AnimeFlow application
const CONFIG = {
    // JSONBin Configuration
    JSONBIN_API_KEY: '$2a$10$rkxBN/5kMJODzn0sDAfPSurXrLm7eRlM9i0ipOYDc8OiWFxvUfl3q',
    JSONBIN_BIN_ID: '68d5bd7943b1c97be9502115',
    
    // Google OAuth Configuration
    GOOGLE_CLIENT_ID: '779631712094-6t77ptt5366r218o80pmijmeelboj25g.apps.googleusercontent.com',
    
    // Admin Configuration
    ADMIN_EMAILS: ['hanzgantengno1@gmail.com'],
    
    // Application Settings
    APP_NAME: 'AnimeFlow',
    VERSION: '1.0.0',
    
    // Video Player Settings
    PLAYER: {
        DEFAULT_QUALITY: '720p',
        SUPPORTED_QUALITIES: ['360p', '480p', '720p', '1080p'],
        SUPPORTED_SPEEDS: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
        AUTO_PLAY: false,
        VOLUME: 100,
        SUBTITLE_LANGUAGES: ['en', 'id', 'ja'],
        HLS_CONFIG: {
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        },
        DASH_CONFIG: {
            streaming: {
                bufferTimeAtTopQuality: 30,
                bufferTimeAtTopQualityLongForm: 60
            }
        }
    },
    
    // UI Settings
    UI: {
        TOAST_DURATION: 5000,
        SEARCH_DEBOUNCE: 500,
        ANIMATION_DURATION: 300,
        ITEMS_PER_PAGE: 20
    },
    
    // API Endpoints
    ENDPOINTS: {
        JSONBIN_BASE: 'https://api.jsonbin.io/v3',
        GOOGLE_API: 'https://www.googleapis.com',
        CDN_BASE: 'https://cdnjs.cloudflare.com/ajax/libs'
    },
    
    // Routes Configuration
    ROUTES: {
        '/': 'home',
        '/browse': 'browse',
        '/trending': 'trending',
        '/watch': 'player',
        '/admin': 'admin',
        '/search': 'search'
    },
    
    // Default Data Structure
    DEFAULT_DATA: {
        anime: [],
        comments: [],
        users: [],
        settings: {
            lastUpdated: null,
            version: '1.0.0'
        }
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        USER_DATA: 'animeflow_user',
        SETTINGS: 'animeflow_settings',
        WATCH_HISTORY: 'animeflow_history',
        FAVORITES: 'animeflow_favorites'
    },
    
    // Error Messages
    ERRORS: {
        AUTH_FAILED: 'Authentication failed. Please try again.',
        NETWORK_ERROR: 'Network error. Please check your connection.',
        DATA_LOAD_FAILED: 'Failed to load data. Please refresh the page.',
        VIDEO_LOAD_FAILED: 'Failed to load video. Please try another episode.',
        ADMIN_REQUIRED: 'Admin access required.',
        USER_NOT_FOUND: 'User not found. Please sign in again.',
        INVALID_INPUT: 'Invalid input. Please check your data.',
        SERVER_ERROR: 'Server error. Please try again later.'
    },
    
    // Success Messages
    SUCCESS: {
        LOGIN: 'Welcome back!',
        LOGOUT: 'Signed out successfully',
        DATA_SAVED: 'Data saved successfully',
        COMMENT_ADDED: 'Comment added successfully',
        ANIME_ADDED: 'Anime added successfully',
        EPISODE_ADDED: 'Episode added successfully',
        SETTINGS_SAVED: 'Settings saved successfully'
    },
    
    // Development Mode
    DEBUG: true,
    
    // Feature Flags
    FEATURES: {
        COMMENTS: true,
        SEARCH: true,
        ADMIN_PANEL: true,
        USER_PROFILES: true,
        FAVORITES: true,
        WATCH_HISTORY: true,
        SUBTITLES: true,
        QUALITY_SELECTOR: true,
        SPEED_CONTROL: true,
        FULLSCREEN: true,
        PIP: true,
        DOWNLOAD: false, // Disabled for legal reasons
        SOCIAL_SHARING: true
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make available globally
window.CONFIG = CONFIG;
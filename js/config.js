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
    VERSION: '1.0.1',
    
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
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            startLevel: -1,
            capLevelToPlayerSize: true
        },
        DASH_CONFIG: {
            streaming: {
                bufferTimeAtTopQuality: 30,
                bufferTimeAtTopQualityLongForm: 60,
                bufferTimeDefault: 12,
                bufferTimeMax: 30,
                lowLatencyEnabled: true
            }
        }
    },
    
    // UI Settings
    UI: {
        TOAST_DURATION: 5000,
        SEARCH_DEBOUNCE: 500,
        ANIMATION_DURATION: 300,
        ITEMS_PER_PAGE: 20,
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000
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
        anime: [
            {
                id: 1,
                title: "Sample Anime",
                thumbnail: "https://via.placeholder.com/240x320/333/fff?text=Sample+Anime",
                rating: 4.5,
                year: 2024,
                genre: "Action, Adventure",
                status: "ongoing",
                description: "This is a sample anime for testing the AnimeFlow application. It demonstrates the basic structure and functionality of the system.",
                episodes: [
                    {
                        id: 1,
                        title: "Episode 1: The Beginning",
                        thumbnail: "https://via.placeholder.com/240x135/333/fff?text=EP1",
                        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                        duration: "24:30",
                        releaseDate: new Date().toISOString()
                    },
                    {
                        id: 2,
                        title: "Episode 2: The Journey Continues",
                        thumbnail: "https://via.placeholder.com/240x135/333/fff?text=EP2",
                        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                        duration: "23:45",
                        releaseDate: new Date().toISOString()
                    }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ],
        comments: [],
        users: [],
        settings: {
            lastUpdated: null,
            version: '1.0.1'
        }
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        USER_DATA: 'animeflow_user',
        SETTINGS: 'animeflow_settings',
        WATCH_HISTORY: 'animeflow_history',
        FAVORITES: 'animeflow_favorites',
        SEARCH_HISTORY: 'animeflow_search_history',
        THEME: 'animeflow_theme',
        CACHE: 'animeflow_cache'
    },
    
    // Error Messages
    ERRORS: {
        AUTH_FAILED: 'Authentication failed. Please try again.',
        NETWORK_ERROR: 'Network error. Please check your connection and try again.',
        DATA_LOAD_FAILED: 'Failed to load data. Please refresh the page.',
        DATA_SAVE_FAILED: 'Failed to save data. Please try again.',
        VIDEO_LOAD_FAILED: 'Failed to load video. Please try another episode or check your connection.',
        ADMIN_REQUIRED: 'Admin access required to perform this action.',
        USER_NOT_FOUND: 'User not found. Please sign in again.',
        INVALID_INPUT: 'Invalid input. Please check your data and try again.',
        SERVER_ERROR: 'Server error. Please try again later.',
        TIMEOUT_ERROR: 'Request timed out. Please try again.',
        VALIDATION_ERROR: 'Please fill in all required fields correctly.',
        DUPLICATE_ERROR: 'This item already exists.',
        NOT_FOUND_ERROR: 'Requested item not found.',
        PERMISSION_ERROR: 'You do not have permission to perform this action.',
        RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
        MAINTENANCE_ERROR: 'Service is temporarily unavailable for maintenance.'
    },
    
    // Success Messages
    SUCCESS: {
        LOGIN: 'Welcome back!',
        LOGOUT: 'Signed out successfully',
        DATA_SAVED: 'Data saved successfully',
        DATA_LOADED: 'Data loaded successfully',
        COMMENT_ADDED: 'Comment added successfully',
        COMMENT_DELETED: 'Comment deleted successfully',
        ANIME_ADDED: 'Anime added successfully',
        ANIME_UPDATED: 'Anime updated successfully',
        ANIME_DELETED: 'Anime deleted successfully',
        EPISODE_ADDED: 'Episode added successfully',
        EPISODE_UPDATED: 'Episode updated successfully',
        EPISODE_DELETED: 'Episode deleted successfully',
        SETTINGS_SAVED: 'Settings saved successfully',
        SYNC_COMPLETE: 'Database synchronized successfully',
        EXPORT_COMPLETE: 'Data exported successfully',
        IMPORT_COMPLETE: 'Data imported successfully',
        CACHE_CLEARED: 'Cache cleared successfully',
        PASSWORD_UPDATED: 'Password updated successfully',
        PROFILE_UPDATED: 'Profile updated successfully'
    },
    
    // Development Mode
    DEBUG: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.search.includes('debug=true'),
    
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
        PIP: true, // Picture-in-Picture
        DOWNLOAD: false, // Disabled for legal reasons
        SOCIAL_SHARING: true,
        OFFLINE_MODE: false, // Future feature
        PUSH_NOTIFICATIONS: false, // Future feature
        THEMES: true,
        ANALYTICS: CONFIG?.DEBUG ? false : true,
        AUTO_SYNC: true,
        BACKUP: true
    },
    
    // Cache Settings
    CACHE: {
        ENABLED: true,
        DURATION: 24 * 60 * 60 * 1000, // 24 hours
        MAX_SIZE: 50 * 1024 * 1024, // 50MB
        CLEANUP_INTERVAL: 60 * 60 * 1000 // 1 hour
    },
    
    // Performance Settings
    PERFORMANCE: {
        IMAGE_LAZY_LOADING: true,
        VIRTUAL_SCROLLING: false, // For large lists
        PREFETCH_EPISODES: true,
        COMPRESS_DATA: true,
        DEBOUNCE_SAVE: true
    },
    
    // Security Settings
    SECURITY: {
        CSRF_PROTECTION: true,
        XSS_PROTECTION: true,
        CONTENT_SECURITY: true,
        RATE_LIMITING: true,
        MAX_LOGIN_ATTEMPTS: 5,
        SESSION_TIMEOUT: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    
    // Validation Rules
    VALIDATION: {
        ANIME: {
            TITLE_MIN_LENGTH: 1,
            TITLE_MAX_LENGTH: 100,
            DESCRIPTION_MAX_LENGTH: 1000,
            RATING_MIN: 0,
            RATING_MAX: 10,
            YEAR_MIN: 1900,
            YEAR_MAX: new Date().getFullYear() + 2
        },
        EPISODE: {
            TITLE_MIN_LENGTH: 1,
            TITLE_MAX_LENGTH: 100,
            DURATION_PATTERN: /^[0-9]{1,2}:[0-9]{2}$/
        },
        COMMENT: {
            MIN_LENGTH: 1,
            MAX_LENGTH: 500
        },
        USERNAME: {
            MIN_LENGTH: 3,
            MAX_LENGTH: 20,
            PATTERN: /^[a-zA-Z0-9_]+$/
        }
    },
    
    // Themes
    THEMES: {
        DARK: 'dark',
        LIGHT: 'light',
        AUTO: 'auto'
    },
    
    // Supported Languages
    LANGUAGES: {
        EN: 'English',
        ID: 'Bahasa Indonesia',
        JA: '日本語'
    },
    
    // File Upload Settings
    UPLOAD: {
        MAX_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        QUALITY: 0.8
    },
    
    // Animation Settings
    ANIMATIONS: {
        DURATION: {
            FAST: 150,
            NORMAL: 300,
            SLOW: 500
        },
        EASING: {
            EASE: 'ease',
            EASE_IN: 'ease-in',
            EASE_OUT: 'ease-out',
            EASE_IN_OUT: 'ease-in-out'
        }
    },
    
    // Keyboard Shortcuts
    SHORTCUTS: {
        SEARCH: ['ctrl+k', 'cmd+k'],
        HOME: ['ctrl+h', 'cmd+h'],
        REFRESH: ['ctrl+r', 'cmd+r'],
        HELP: ['?'],
        ESCAPE: ['escape'],
        PLAY_PAUSE: ['space'],
        FULLSCREEN: ['f'],
        MUTE: ['m'],
        VOLUME_UP: ['arrowup'],
        VOLUME_DOWN: ['arrowdown'],
        SEEK_FORWARD: ['arrowright'],
        SEEK_BACKWARD: ['arrowleft']
    },
    
    // URL Patterns for video sources
    VIDEO_PATTERNS: {
        HLS: /\.m3u8$/i,
        DASH: /\.mpd$/i,
        MP4: /\.mp4$/i,
        WEBM: /\.webm$/i,
        OGG: /\.ogg$/i
    },
    
    // Social Media
    SOCIAL: {
        TWITTER: 'https://twitter.com/animeflow',
        DISCORD: 'https://discord.gg/animeflow',
        REDDIT: 'https://reddit.com/r/animeflow'
    },
    
    // Contact Information
    CONTACT: {
        EMAIL: 'support@animeflow.app',
        GITHUB: 'https://github.com/animeflow/animeflow'
    },
    
    // Legal
    LEGAL: {
        PRIVACY_POLICY: '/privacy',
        TERMS_OF_SERVICE: '/terms',
        DMCA: '/dmca'
    }
};

// Environment-specific overrides
if (CONFIG.DEBUG) {
    console.log('🔧 Debug mode enabled');
    
    // Override settings for development
    CONFIG.UI.TOAST_DURATION = 3000; // Shorter toasts in dev
    CONFIG.FEATURES.ANALYTICS = false; // No analytics in dev
    CONFIG.CACHE.ENABLED = false; // No caching in dev for fresh data
}

// Validate required configurations
const validateConfig = () => {
    const required = [
        'JSONBIN_API_KEY',
        'JSONBIN_BIN_ID', 
        'GOOGLE_CLIENT_ID',
        'VERSION'
    ];
    
    const missing = required.filter(key => !CONFIG[key]);
    if (missing.length > 0) {
        console.error('Missing required configuration:', missing);
        throw new Error('Configuration validation failed');
    }
    
    console.log('✅ Configuration validated successfully');
};

// Initialize configuration
try {
    validateConfig();
} catch (error) {
    console.error('Configuration error:', error);
}

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make available globally
window.CONFIG = CONFIG;

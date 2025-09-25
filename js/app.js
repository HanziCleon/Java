// Main application initialization for AnimeFlow
const App = {
    isInitialized: false,
    
    // Initialize the entire application
    init: async () => {
        try {
            console.log('Initializing AnimeFlow...');
            
            // Show loading
            Utils.showLoading();
            
            // Initialize core modules in sequence
            await App.initializeCore();
            
            // Set app as initialized
            App.isInitialized = true;
            
            console.log('AnimeFlow initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize AnimeFlow:', error);
            App.handleInitializationError(error);
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Initialize core application modules
    initializeCore: async () => {
        // 1. Initialize Database first
        console.log('1. Initializing Database...');
        await Database.init();
        
        // 2. Initialize Authentication
        console.log('2. Initializing Authentication...');
        await Auth.init();
        
        // 3. Initialize Search
        console.log('3. Initializing Search...');
        Search.init();
        
        // 4. Initialize Router
        console.log('4. Initializing Router...');
        Router.init();
        
        // 5. Set up global error handling
        App.setupErrorHandling();
        
        // 6. Set up periodic tasks
        App.setupPeriodicTasks();
        
        // 7. Set up keyboard shortcuts
        App.setupKeyboardShortcuts();
        
        console.log('Core modules initialized successfully');
    },
    
    // Handle initialization errors
    handleInitializationError: (error) => {
        const container = Utils.select('#mainContent');
        if (container) {
            container.innerHTML = `
                <div class="error-page">
                    <div class="error-card">
                        <h1>🚨 Initialization Failed</h1>
                        <p>AnimeFlow failed to start properly. Please try refreshing the page.</p>
                        <p class="error-details">${error.message}</p>
                        <div class="error-actions">
                            <button class="btn btn-primary" onclick="location.reload()">🔄 Refresh Page</button>
                            <button class="btn btn-secondary" onclick="App.init()">🔄 Retry</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Show error toast
        Utils.showToast('Failed to initialize application', 'error');
    },
    
    // Set up global error handling
    setupErrorHandling: () => {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            if (CONFIG.DEBUG) {
                Utils.showToast('Unhandled Error: ' + event.reason?.message, 'error');
            } else {
                Utils.showToast('An unexpected error occurred', 'error');
            }
            
            // Prevent the default behavior (logging to console)
            event.preventDefault();
        });
        
        // Handle global JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            
            if (CONFIG.DEBUG) {
                Utils.showToast('Script Error: ' + event.error?.message, 'error');
            }
        });
        
        // Handle resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                console.error('Resource loading error:', event.target.src || event.target.href);
            }
        }, true);
    },
    
    // Set up periodic tasks
    setupPeriodicTasks: () => {
        // Auto-save user data every 5 minutes
        setInterval(() => {
            if (Auth.isAuthenticated() && Auth.currentUser) {
                Utils.storage.set(CONFIG.STORAGE_KEYS.USER_DATA, Auth.currentUser);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        // Clean up old search history every hour
        setInterval(() => {
            const searchHistory = Utils.storage.get('search_history', []);
            if (searchHistory.length > 100) {
                const cleaned = searchHistory.slice(0, 50);
                Utils.storage.set('search_history', cleaned);
            }
        }, 60 * 60 * 1000); // 1 hour
        
        // Sync database every 10 minutes if user is authenticated and on admin page
        setInterval(async () => {
            if (Auth.isAdmin() && Router.currentRoute === '/admin') {
                try {
                    await Database.sync();
                    console.log('Auto-sync completed');
                } catch (error) {
                    console.error('Auto-sync failed:', error);
                }
            }
        }, 10 * 60 * 1000); // 10 minutes
    },
    
    // Set up global keyboard shortcuts
    setupKeyboardShortcuts: () => {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Global shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k': // Ctrl/Cmd + K = Focus search
                        e.preventDefault();
                        const searchInput = Utils.select('#searchInput');
                        if (searchInput && searchInput.style.display !== 'none') {
                            searchInput.focus();
                        }
                        break;
                        
                    case '/': // Ctrl/Cmd + / = Focus search (alternative)
                        e.preventDefault();
                        const searchInput2 = Utils.select('#searchInput');
                        if (searchInput2 && searchInput2.style.display !== 'none') {
                            searchInput2.focus();
                        }
                        break;
                        
                    case 'h': // Ctrl/Cmd + H = Go home
                        e.preventDefault();
                        if (Auth.isAuthenticated()) {
                            Router.navigate('/browse');
                        } else {
                            Router.navigate('/');
                        }
                        break;
                        
                    case 'r': // Ctrl/Cmd + R = Refresh data
                        if (Auth.isAdmin()) {
                            e.preventDefault();
                            Database.sync();
                        }
                        break;
                }
            }
            
            // Navigation shortcuts
            switch (e.key) {
                case 'Escape':
                    // Close modals, overlays, etc.
                    const modal = Utils.select('.modal-overlay[style*="flex"]');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                    
                    // Hide search suggestions
                    Search.hideSuggestions();
                    break;
                    
                case '1':
                    if (!e.ctrlKey && !e.metaKey && Auth.isAuthenticated()) {
                        Router.navigate('/browse');
                    }
                    break;
                    
                case '2':
                    if (!e.ctrlKey && !e.metaKey && Auth.isAuthenticated()) {
                        Router.navigate('/trending');
                    }
                    break;
                    
                case '9':
                    if (!e.ctrlKey && !e.metaKey && Auth.isAdmin()) {
                        Router.navigate('/admin');
                    }
                    break;
            }
        });
    },
    
    // Check for application updates
    checkForUpdates: () => {
        const currentVersion = CONFIG.VERSION;
        const lastCheckedVersion = Utils.storage.get('last_version_check', '0.0.0');
        
        if (currentVersion !== lastCheckedVersion) {
            Utils.storage.set('last_version_check', currentVersion);
            
            if (lastCheckedVersion !== '0.0.0') {
                Utils.showToast('AnimeFlow has been updated to v' + currentVersion, 'success');
            }
        }
    },
    
    // Get application statistics
    getStats: () => {
        return {
            version: CONFIG.VERSION,
            isInitialized: App.isInitialized,
            currentUser: Auth.getCurrentUser()?.name || 'Guest',
            currentRoute: Router.currentRoute,
            totalAnime: Database.stats.getTotalAnime(),
            totalEpisodes: Database.stats.getTotalEpisodes(),
            totalComments: Database.stats.getTotalComments(),
            lastSync: Database.lastSync,
            uptime: Date.now() - App.startTime
        };
    },
    
    // Reset application to default state
    reset: async () => {
        if (!confirm('Are you sure you want to reset AnimeFlow? This will sign you out and clear all local data.')) {
            return;
        }
        
        try {
            // Sign out user
            Auth.signOut();
            
            // Clear all local storage
            Utils.storage.clear();
            
            // Reset modules
            Database.data = CONFIG.DEFAULT_DATA;
            Search.clearResults();
            
            // Reload application
            location.reload();
            
        } catch (error) {
            console.error('Reset failed:', error);
            Utils.showToast('Failed to reset application', 'error');
        }
    },
    
    // Export application data
    exportAppData: () => {
        const exportData = {
            version: CONFIG.VERSION,
            exportDate: new Date().toISOString(),
            userData: Auth.getCurrentUser(),
            settings: Utils.storage.get(CONFIG.STORAGE_KEYS.SETTINGS),
            watchHistory: Utils.storage.get(CONFIG.STORAGE_KEYS.WATCH_HISTORY),
            favorites: Utils.storage.get(CONFIG.STORAGE_KEYS.FAVORITES),
            searchHistory: Utils.storage.get('search_history'),
            stats: App.getStats()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `animeflow-userdata-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        Utils.showToast('User data exported successfully', 'success');
    },
    
    // Debug information
    getDebugInfo: () => {
        return {
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink
            } : null,
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
                total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
            } : null,
            appStats: App.getStats()
        };
    },
    
    // Performance monitoring
    startTime: Date.now(),
    
    // Service Worker registration (for future PWA features)
    registerServiceWorker: async () => {
        if ('serviceWorker' in navigator) {
            try {
                // Service worker would be implemented later
                console.log('Service Worker support detected');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
};

// Development helpers (only available in debug mode)
if (CONFIG.DEBUG) {
    window.App = App;
    window.DEBUG = {
        getStats: App.getStats,
        getDebugInfo: App.getDebugInfo,
        reset: App.reset,
        exportData: App.exportAppData,
        
        // Quick access to modules
        auth: Auth,
        database: Database,
        router: Router,
        search: Search,
        player: Player,
        utils: Utils,
        config: CONFIG,
        
        // Development utilities
        addSampleData: () => {
            Database.loadDefaultData();
            Utils.showToast('Sample data loaded', 'success');
        },
        
        simulateError: () => {
            throw new Error('Simulated error for testing');
        },
        
        clearStorage: () => {
            Utils.storage.clear();
            Utils.showToast('Local storage cleared', 'success');
        },
        
        showAllToasts: () => {
            Utils.showToast('Success message', 'success');
            setTimeout(() => Utils.showToast('Info message', 'info'), 500);
            setTimeout(() => Utils.showToast('Warning message', 'warning'), 1000);
            setTimeout(() => Utils.showToast('Error message', 'error'), 1500);
        }
    };
    
    console.log('🚀 AnimeFlow Debug Mode Enabled');
    console.log('Use DEBUG object for development utilities');
    console.log('Available methods:', Object.keys(window.DEBUG));
}

// Make App available globally
window.App = App;
// Database management module for AnimeFlow
const Database = {
    data: {
        anime: [],
        comments: [],
        users: [],
        settings: {}
    },
    
    isLoaded: false,
    lastSync: null,

    // Initialize database
    init: async () => {
        try {
            await Database.load();
            Database.isLoaded = true;
            Utils.showToast('Database loaded successfully', 'success');
        } catch (error) {
            console.error('Database initialization failed:', error);
            Database.loadDefaultData();
            Utils.showToast('Using offline data', 'warning');
        }
    },

    // Load data from JSONBin
    load: async () => {
        try {
            const response = await fetch(`${CONFIG.ENDPOINTS.JSONBIN_BASE}/b/${CONFIG.JSONBIN_BIN_ID}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': CONFIG.JSONBIN_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status}`);
            }

            const result = await response.json();
            Database.data = { ...CONFIG.DEFAULT_DATA, ...result.record };
            Database.lastSync = new Date().toISOString();
            
            return Database.data;
        } catch (error) {
            console.error('Load error:', error);
            throw error;
        }
    },

    // Save data to JSONBin
    save: async () => {
        try {
            const dataToSave = {
                ...Database.data,
                settings: {
                    ...Database.data.settings,
                    lastUpdated: new Date().toISOString(),
                    version: CONFIG.VERSION
                }
            };

            const response = await fetch(`${CONFIG.ENDPOINTS.JSONBIN_BASE}/b/${CONFIG.JSONBIN_BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'X-Master-Key': CONFIG.JSONBIN_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave)
            });

            if (!response.ok) {
                throw new Error(`Failed to save data: ${response.status}`);
            }

            Database.lastSync = new Date().toISOString();
            return await response.json();
        } catch (error) {
            console.error('Save error:', error);
            throw error;
        }
    },

    // Load default/sample data
    loadDefaultData: () => {
        Database.data = {
        };
        Database.isLoaded = true;
    },

    // Anime CRUD operations
    anime: {
        // Get all anime
        getAll: () => Database.data.anime,

        // Get anime by ID
        getById: (id) => Database.data.anime.find(anime => anime.id === parseInt(id)),

        // Search anime
        search: (query) => {
            const searchTerm = query.toLowerCase();
            return Database.data.anime.filter(anime =>
                anime.title.toLowerCase().includes(searchTerm) ||
                anime.genre.toLowerCase().includes(searchTerm) ||
                anime.description.toLowerCase().includes(searchTerm)
            );
        },

        // Filter anime
        filter: (filters = {}) => {
            let filtered = [...Database.data.anime];

            if (filters.year) {
                filtered = filtered.filter(anime => anime.year === parseInt(filters.year));
            }

            if (filters.genre) {
                filtered = filtered.filter(anime => 
                    anime.genre.toLowerCase().includes(filters.genre.toLowerCase())
                );
            }

            if (filters.status) {
                filtered = filtered.filter(anime => anime.status === filters.status);
            }

            if (filters.rating) {
                filtered = filtered.filter(anime => anime.rating >= parseFloat(filters.rating));
            }

            return filtered;
        },

        // Sort anime
        sort: (anime, sortBy = 'title', order = 'asc') => {
            const sorted = [...anime];
            
            sorted.sort((a, b) => {
                let aVal = a[sortBy];
                let bVal = b[sortBy];

                if (sortBy === 'episodes') {
                    aVal = a.episodes?.length || 0;
                    bVal = b.episodes?.length || 0;
                }

                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (order === 'desc') {
                    return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                } else {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                }
            });

            return sorted;
        },

        // Add anime
        add: async (animeData) => {
            try {
                const newAnime = {
                    id: Date.now(),
                    ...animeData,
                    episodes: animeData.episodes || [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                Database.data.anime.push(newAnime);
                await Database.save();
                
                return newAnime;
            } catch (error) {
                console.error('Add anime error:', error);
                throw error;
            }
        },

        // Update anime
        update: async (id, updates) => {
            try {
                const index = Database.data.anime.findIndex(anime => anime.id === parseInt(id));
                if (index === -1) {
                    throw new Error('Anime not found');
                }

                Database.data.anime[index] = {
                    ...Database.data.anime[index],
                    ...updates,
                    id: parseInt(id), // Keep original ID
                    updatedAt: new Date().toISOString()
                };

                await Database.save();
                return Database.data.anime[index];
            } catch (error) {
                console.error('Update anime error:', error);
                throw error;
            }
        },

        // Delete anime
        delete: async (id) => {
            try {
                const index = Database.data.anime.findIndex(anime => anime.id === parseInt(id));
                if (index === -1) {
                    throw new Error('Anime not found');
                }

                // Also delete related comments
                Database.data.comments = Database.data.comments.filter(
                    comment => comment.animeId !== parseInt(id)
                );

                Database.data.anime.splice(index, 1);
                await Database.save();
                
                return true;
            } catch (error) {
                console.error('Delete anime error:', error);
                throw error;
            }
        },

        // Get trending anime (most viewed/commented)
        getTrending: () => {
            return Database.data.anime
                .map(anime => ({
                    ...anime,
                    commentCount: Database.data.comments.filter(c => c.animeId === anime.id).length
                }))
                .sort((a, b) => b.commentCount - a.commentCount)
                .slice(0, 10);
        },

        // Get recently added anime
        getRecent: (limit = 10) => {
            return Database.data.anime
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit);
        }
    },

    // Episode operations
    episodes: {
        // Get episodes for anime
        getByAnimeId: (animeId) => {
            const anime = Database.anime.getById(animeId);
            return anime ? anime.episodes || [] : [];
        },

        // Get episode by ID
        getById: (animeId, episodeId) => {
            const episodes = Database.episodes.getByAnimeId(animeId);
            return episodes.find(ep => ep.id === parseInt(episodeId));
        },

        // Add episode
        add: async (animeId, episodeData) => {
            try {
                const animeIndex = Database.data.anime.findIndex(anime => anime.id === parseInt(animeId));
                if (animeIndex === -1) {
                    throw new Error('Anime not found');
                }

                if (!Database.data.anime[animeIndex].episodes) {
                    Database.data.anime[animeIndex].episodes = [];
                }

                const newEpisode = {
                    id: Date.now(),
                    ...episodeData,
                    releaseDate: new Date().toISOString()
                };

                Database.data.anime[animeIndex].episodes.push(newEpisode);
                Database.data.anime[animeIndex].updatedAt = new Date().toISOString();
                
                await Database.save();
                return newEpisode;
            } catch (error) {
                console.error('Add episode error:', error);
                throw error;
            }
        },

        // Update episode
        update: async (animeId, episodeId, updates) => {
            try {
                const animeIndex = Database.data.anime.findIndex(anime => anime.id === parseInt(animeId));
                if (animeIndex === -1) {
                    throw new Error('Anime not found');
                }

                const episodeIndex = Database.data.anime[animeIndex].episodes.findIndex(
                    ep => ep.id === parseInt(episodeId)
                );
                if (episodeIndex === -1) {
                    throw new Error('Episode not found');
                }

                Database.data.anime[animeIndex].episodes[episodeIndex] = {
                    ...Database.data.anime[animeIndex].episodes[episodeIndex],
                    ...updates,
                    id: parseInt(episodeId)
                };

                Database.data.anime[animeIndex].updatedAt = new Date().toISOString();
                await Database.save();
                
                return Database.data.anime[animeIndex].episodes[episodeIndex];
            } catch (error) {
                console.error('Update episode error:', error);
                throw error;
            }
        },

        // Delete episode
        delete: async (animeId, episodeId) => {
            try {
                const animeIndex = Database.data.anime.findIndex(anime => anime.id === parseInt(animeId));
                if (animeIndex === -1) {
                    throw new Error('Anime not found');
                }

                const episodeIndex = Database.data.anime[animeIndex].episodes.findIndex(
                    ep => ep.id === parseInt(episodeId)
                );
                if (episodeIndex === -1) {
                    throw new Error('Episode not found');
                }

                Database.data.anime[animeIndex].episodes.splice(episodeIndex, 1);
                Database.data.anime[animeIndex].updatedAt = new Date().toISOString();
                
                await Database.save();
                return true;
            } catch (error) {
                console.error('Delete episode error:', error);
                throw error;
            }
        }
    },

    // Comments operations
    comments: {
        // Get comments for anime
        getByAnimeId: (animeId) => {
            return Database.data.comments
                .filter(comment => comment.animeId === parseInt(animeId))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        },

        // Add comment
        add: async (commentData) => {
            try {
                const newComment = {
                    id: Utils.generateId(),
                    ...commentData,
                    timestamp: new Date().toISOString(),
                    likes: 0,
                    replies: []
                };

                Database.data.comments.push(newComment);
                await Database.save();
                
                return newComment;
            } catch (error) {
                console.error('Add comment error:', error);
                throw error;
            }
        },

        // Delete comment
        delete: async (commentId) => {
            try {
                const index = Database.data.comments.findIndex(comment => comment.id === commentId);
                if (index === -1) {
                    throw new Error('Comment not found');
                }

                Database.data.comments.splice(index, 1);
                await Database.save();
                
                return true;
            } catch (error) {
                console.error('Delete comment error:', error);
                throw error;
            }
        },

        // Like comment
        like: async (commentId) => {
            try {
                const comment = Database.data.comments.find(c => c.id === commentId);
                if (!comment) {
                    throw new Error('Comment not found');
                }

                comment.likes = (comment.likes || 0) + 1;
                await Database.save();
                
                return comment.likes;
            } catch (error) {
                console.error('Like comment error:', error);
                throw error;
            }
        }
    },

    // Statistics
    stats: {
        getTotalAnime: () => Database.data.anime.length,
        getTotalEpisodes: () => Database.data.anime.reduce((sum, anime) => sum + (anime.episodes?.length || 0), 0),
        getTotalComments: () => Database.data.comments.length,
        
        getAnimeByYear: () => {
            const years = {};
            Database.data.anime.forEach(anime => {
                const year = anime.year;
                if (year) {
                    years[year] = (years[year] || 0) + 1;
                }
            });
            return years;
        },

        getAnimeByGenre: () => {
            const genres = {};
            Database.data.anime.forEach(anime => {
                if (anime.genre) {
                    anime.genre.split(',').forEach(g => {
                        const genre = g.trim();
                        genres[genre] = (genres[genre] || 0) + 1;
                    });
                }
            });
            return genres;
        }
    },

    // Sync with remote
    sync: async () => {
        try {
            Utils.showLoading();
            await Database.load();
            Database.lastSync = new Date().toISOString();
            Utils.showToast('Database synchronized', 'success');
        } catch (error) {
            Utils.showToast('Sync failed', 'error');
            throw error;
        } finally {
            Utils.hideLoading();
        }
    },

    // Export data
    export: () => {
        const dataStr = JSON.stringify(Database.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `animeflow-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        Utils.showToast('Data exported successfully', 'success');
    },

    // Import data
    import: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // Validate data structure
                    if (!importedData.anime || !Array.isArray(importedData.anime)) {
                        throw new Error('Invalid data format');
                    }

                    Database.data = { ...CONFIG.DEFAULT_DATA, ...importedData };
                    await Database.save();
                    
                    Utils.showToast('Data imported successfully', 'success');
                    resolve(Database.data);
                } catch (error) {
                    Utils.showToast('Import failed: ' + error.message, 'error');
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }
};

// Make available globally
window.Database = Database;
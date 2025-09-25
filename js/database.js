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
            console.log('Database loaded successfully');
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
                throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            // Ensure proper data structure
            Database.data = {
                anime: result.record?.anime || [],
                comments: result.record?.comments || [],
                users: result.record?.users || [],
                settings: result.record?.settings || {
                    lastUpdated: new Date().toISOString(),
                    version: CONFIG.VERSION
                }
            };
            
            Database.lastSync = new Date().toISOString();
            console.log('Data loaded from JSONBin:', Database.data);
            
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
                anime: Database.data.anime || [],
                comments: Database.data.comments || [],
                users: Database.data.users || [],
                settings: {
                    lastUpdated: new Date().toISOString(),
                    version: CONFIG.VERSION,
                    totalAnime: Database.data.anime?.length || 0,
                    totalComments: Database.data.comments?.length || 0
                }
            };

            console.log('Saving data to JSONBin:', dataToSave);

            const response = await fetch(`${CONFIG.ENDPOINTS.JSONBIN_BASE}/b/${CONFIG.JSONBIN_BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'X-Master-Key': CONFIG.JSONBIN_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save data: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            Database.lastSync = new Date().toISOString();
            console.log('Data saved successfully:', result);
            
            return result;
        } catch (error) {
            console.error('Save error:', error);
            throw error;
        }
    },

    // Load default/sample data
    loadDefaultData: () => {
        Database.data = {
            anime: [
                {
                    id: 1,
                    title: "Sample Anime",
                    thumbnail: "https://via.placeholder.com/240x320/333/fff?text=Sample",
                    rating: 4.5,
                    year: 2024,
                    genre: "Action, Adventure",
                    status: "ongoing",
                    description: "This is a sample anime for testing purposes.",
                    episodes: [
                        {
                            id: 1,
                            title: "Episode 1: The Beginning",
                            thumbnail: "https://via.placeholder.com/240x135/333/fff?text=EP1",
                            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                            duration: "24:30"
                        }
                    ],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ],
            comments: [],
            users: [],
            settings: {
                lastUpdated: new Date().toISOString(),
                version: CONFIG.VERSION
            }
        };
        Database.isLoaded = true;
        console.log('Default data loaded:', Database.data);
    },

    // Anime CRUD operations
    anime: {
        // Get all anime
        getAll: () => Database.data.anime || [],

        // Get anime by ID
        getById: (id) => {
            const anime = (Database.data.anime || []).find(anime => anime.id === parseInt(id));
            return anime || null;
        },

        // Search anime
        search: (query) => {
            if (!query || !Database.data.anime) return [];
            
            const searchTerm = query.toLowerCase();
            return Database.data.anime.filter(anime =>
                (anime.title && anime.title.toLowerCase().includes(searchTerm)) ||
                (anime.genre && anime.genre.toLowerCase().includes(searchTerm)) ||
                (anime.description && anime.description.toLowerCase().includes(searchTerm))
            );
        },

        // Filter anime
        filter: (filters = {}) => {
            let filtered = [...(Database.data.anime || [])];

            if (filters.year) {
                filtered = filtered.filter(anime => anime.year === parseInt(filters.year));
            }

            if (filters.genre) {
                filtered = filtered.filter(anime => 
                    anime.genre && anime.genre.toLowerCase().includes(filters.genre.toLowerCase())
                );
            }

            if (filters.status) {
                filtered = filtered.filter(anime => anime.status === filters.status);
            }

            if (filters.rating) {
                filtered = filtered.filter(anime => (anime.rating || 0) >= parseFloat(filters.rating));
            }

            return filtered;
        },

        // Sort anime
        sort: (anime, sortBy = 'title', order = 'asc') => {
            if (!anime || !Array.isArray(anime)) return [];
            
            const sorted = [...anime];
            
            sorted.sort((a, b) => {
                let aVal = a[sortBy];
                let bVal = b[sortBy];

                if (sortBy === 'episodes') {
                    aVal = (a.episodes && Array.isArray(a.episodes)) ? a.episodes.length : 0;
                    bVal = (b.episodes && Array.isArray(b.episodes)) ? b.episodes.length : 0;
                }

                // Handle null/undefined values
                if (aVal == null) aVal = '';
                if (bVal == null) bVal = '';

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
                // Generate unique ID
                const newId = Date.now();
                
                const newAnime = {
                    id: newId,
                    title: animeData.title || 'Untitled',
                    thumbnail: animeData.thumbnail || '',
                    rating: parseFloat(animeData.rating) || 4.5,
                    year: parseInt(animeData.year) || new Date().getFullYear(),
                    genre: animeData.genre || '',
                    status: animeData.status || 'ongoing',
                    description: animeData.description || '',
                    episodes: animeData.episodes || [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Ensure data.anime exists
                if (!Database.data.anime) {
                    Database.data.anime = [];
                }

                Database.data.anime.push(newAnime);
                
                // Save to JSONBin
                await Database.save();
                
                console.log('Anime added successfully:', newAnime);
                return newAnime;
            } catch (error) {
                console.error('Add anime error:', error);
                throw error;
            }
        },

        // Update anime
        update: async (id, updates) => {
            try {
                if (!Database.data.anime) {
                    Database.data.anime = [];
                }

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
                console.log('Anime updated successfully:', Database.data.anime[index]);
                return Database.data.anime[index];
            } catch (error) {
                console.error('Update anime error:', error);
                throw error;
            }
        },

        // Delete anime
        delete: async (id) => {
            try {
                if (!Database.data.anime) {
                    Database.data.anime = [];
                }

                const index = Database.data.anime.findIndex(anime => anime.id === parseInt(id));
                if (index === -1) {
                    throw new Error('Anime not found');
                }

                // Also delete related comments
                if (Database.data.comments) {
                    Database.data.comments = Database.data.comments.filter(
                        comment => comment.animeId !== parseInt(id)
                    );
                }

                Database.data.anime.splice(index, 1);
                await Database.save();
                
                console.log('Anime deleted successfully:', id);
                return true;
            } catch (error) {
                console.error('Delete anime error:', error);
                throw error;
            }
        },

        // Get trending anime (most viewed/commented)
        getTrending: () => {
            if (!Database.data.anime || !Database.data.comments) return [];
            
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
            if (!Database.data.anime) return [];
            
            return Database.data.anime
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, limit);
        }
    },

    // Episode operations
    episodes: {
        // Get episodes for anime
        getByAnimeId: (animeId) => {
            const anime = Database.anime.getById(animeId);
            return (anime && anime.episodes) ? anime.episodes : [];
        },

        // Get episode by ID
        getById: (animeId, episodeId) => {
            const episodes = Database.episodes.getByAnimeId(animeId);
            return episodes.find(ep => ep.id === parseInt(episodeId));
        },

        // Add episode
        add: async (animeId, episodeData) => {
            try {
                if (!Database.data.anime) {
                    Database.data.anime = [];
                }

                const animeIndex = Database.data.anime.findIndex(anime => anime.id === parseInt(animeId));
                if (animeIndex === -1) {
                    throw new Error('Anime not found');
                }

                if (!Database.data.anime[animeIndex].episodes) {
                    Database.data.anime[animeIndex].episodes = [];
                }

                const newEpisode = {
                    id: Date.now(),
                    title: episodeData.title || 'Untitled Episode',
                    thumbnail: episodeData.thumbnail || '',
                    videoUrl: episodeData.videoUrl || '',
                    duration: episodeData.duration || '24:00',
                    releaseDate: new Date().toISOString()
                };

                Database.data.anime[animeIndex].episodes.push(newEpisode);
                Database.data.anime[animeIndex].updatedAt = new Date().toISOString();
                
                await Database.save();
                console.log('Episode added successfully:', newEpisode);
                return newEpisode;
            } catch (error) {
                console.error('Add episode error:', error);
                throw error;
            }
        },

        // Update episode
        update: async (animeId, episodeId, updates) => {
            try {
                if (!Database.data.anime) {
                    throw new Error('No anime data');
                }

                const animeIndex = Database.data.anime.findIndex(anime => anime.id === parseInt(animeId));
                if (animeIndex === -1) {
                    throw new Error('Anime not found');
                }

                if (!Database.data.anime[animeIndex].episodes) {
                    throw new Error('No episodes found');
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
                if (!Database.data.anime) {
                    throw new Error('No anime data');
                }

                const animeIndex = Database.data.anime.findIndex(anime => anime.id === parseInt(animeId));
                if (animeIndex === -1) {
                    throw new Error('Anime not found');
                }

                if (!Database.data.anime[animeIndex].episodes) {
                    throw new Error('No episodes found');
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
            if (!Database.data.comments) return [];
            
            return Database.data.comments
                .filter(comment => comment.animeId === parseInt(animeId))
                .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        },

        // Add comment
        add: async (commentData) => {
            try {
                if (!Database.data.comments) {
                    Database.data.comments = [];
                }

                const newComment = {
                    id: Utils.generateId(),
                    animeId: parseInt(commentData.animeId),
                    author: commentData.author || 'Anonymous',
                    avatar: commentData.avatar || '',
                    text: commentData.text || '',
                    timestamp: new Date().toISOString(),
                    likes: 0,
                    replies: []
                };

                Database.data.comments.push(newComment);
                await Database.save();
                
                console.log('Comment added successfully:', newComment);
                return newComment;
            } catch (error) {
                console.error('Add comment error:', error);
                throw error;
            }
        },

        // Delete comment
        delete: async (commentId) => {
            try {
                if (!Database.data.comments) {
                    Database.data.comments = [];
                }

                const index = Database.data.comments.findIndex(comment => comment.id === commentId);
                if (index === -1) {
                    throw new Error('Comment not found');
                }

                Database.data.comments.splice(index, 1);
                await Database.save();
                
                console.log('Comment deleted successfully:', commentId);
                return true;
            } catch (error) {
                console.error('Delete comment error:', error);
                throw error;
            }
        },

        // Like comment
        like: async (commentId) => {
            try {
                if (!Database.data.comments) {
                    Database.data.comments = [];
                }

                const comment = Database.data.comments.find(c => c.id === commentId);
                if (!comment) {
                    throw new Error('Comment not found');
                }

                comment.likes = (comment.likes || 0) + 1;
                await Database.save();
                
                console.log('Comment liked:', commentId, comment.likes);
                return comment.likes;
            } catch (error) {
                console.error('Like comment error:', error);
                throw error;
            }
        }
    },

    // Statistics
    stats: {
        getTotalAnime: () => Database.data.anime ? Database.data.anime.length : 0,
        getTotalEpisodes: () => {
            if (!Database.data.anime) return 0;
            return Database.data.anime.reduce((sum, anime) => sum + (anime.episodes?.length || 0), 0);
        },
        getTotalComments: () => Database.data.comments ? Database.data.comments.length : 0,
        
        getAnimeByYear: () => {
            if (!Database.data.anime) return {};
            
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
            if (!Database.data.anime) return {};
            
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
            console.error('Sync error:', error);
            Utils.showToast('Sync failed: ' + error.message, 'error');
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
                        throw new Error('Invalid data format: anime array missing');
                    }

                    Database.data = {
                        anime: importedData.anime || [],
                        comments: importedData.comments || [],
                        users: importedData.users || [],
                        settings: importedData.settings || {}
                    };
                    
                    await Database.save();
                    
                    Utils.showToast('Data imported successfully', 'success');
                    resolve(Database.data);
                } catch (error) {
                    console.error('Import error:', error);
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
// Search module for AnimeFlow
const Search = {
    currentQuery: '',
    lastResults: [],
    isSearching: false,
    searchTimeout: null,

    // Initialize search functionality
    init: () => {
        const searchInput = Utils.select('#searchInput');
        if (searchInput) {
            // Set up search input event listeners
            searchInput.addEventListener('input', Search.handleInput);
            searchInput.addEventListener('keypress', Search.handleKeyPress);
            searchInput.addEventListener('focus', Search.handleFocus);
            searchInput.addEventListener('blur', Search.handleBlur);
        }
    },

    // Handle search input changes
    handleInput: Utils.debounce((e) => {
        const query = e.target.value.trim();
        
        if (query.length === 0) {
            Search.clearResults();
            return;
        }

        if (query.length >= 2) {
            Search.performSearch(query, false);
        }
    }, CONFIG.UI.SEARCH_DEBOUNCE),

    // Handle enter key press
    handleKeyPress: (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = e.target.value.trim();
            if (query) {
                Search.performSearch(query, true);
            }
        }
    },

    // Handle search input focus
    handleFocus: (e) => {
        const query = e.target.value.trim();
        if (query && Search.lastResults.length > 0) {
            Search.showSuggestions();
        }
    },

    // Handle search input blur
    handleBlur: (e) => {
        // Delay hiding suggestions to allow for clicks
        setTimeout(() => {
            Search.hideSuggestions();
        }, 200);
    },

    // Perform search
    performSearch: (query = null, navigate = false) => {
        if (query === null) {
            const searchInput = Utils.select('#searchInput');
            query = searchInput ? searchInput.value.trim() : '';
        }

        if (!query) {
            Utils.showToast('Please enter a search term', 'warning');
            return;
        }

        if (Search.isSearching) return;

        Search.currentQuery = query;
        Search.isSearching = true;

        try {
            // Perform the search
            const results = Database.anime.search(query);
            Search.lastResults = results;

            if (navigate) {
                // Navigate to search results page
                Router.navigate('/search', { query: query });
            } else {
                // Show inline suggestions
                Search.showSuggestions();
            }

            // Analytics/tracking
            Search.trackSearch(query, results.length);

        } catch (error) {
            console.error('Search error:', error);
            Utils.showToast('Search failed. Please try again.', 'error');
        } finally {
            Search.isSearching = false;
        }
    },

    // Advanced search with filters
    advancedSearch: (query, filters = {}) => {
        let results = Database.anime.search(query);

        // Apply filters
        if (filters.genre) {
            results = results.filter(anime => 
                anime.genre && anime.genre.toLowerCase().includes(filters.genre.toLowerCase())
            );
        }

        if (filters.year) {
            results = results.filter(anime => anime.year === parseInt(filters.year));
        }

        if (filters.status) {
            results = results.filter(anime => anime.status === filters.status);
        }

        if (filters.rating) {
            const minRating = parseFloat(filters.rating);
            results = results.filter(anime => anime.rating >= minRating);
        }

        // Sort results
        if (filters.sortBy) {
            results = Database.anime.sort(results, filters.sortBy, filters.sortOrder || 'desc');
        }

        return results;
    },

    // Show search suggestions
    showSuggestions: () => {
        if (!Search.lastResults || Search.lastResults.length === 0) return;

        const searchInput = Utils.select('#searchInput');
        if (!searchInput) return;

        // Remove existing suggestions
        Search.hideSuggestions();

        // Create suggestions dropdown
        const suggestions = Utils.create('div', {
            className: 'search-suggestions',
            id: 'searchSuggestions'
        });

        // Add suggestion items
        const limitedResults = Search.lastResults.slice(0, 8); // Limit to 8 suggestions
        limitedResults.forEach(anime => {
            const suggestion = Utils.create('div', {
                className: 'search-suggestion-item',
                innerHTML: `
                    <div class="suggestion-poster">
                        <img src="${anime.thumbnail}" alt="${anime.title}" 
                             onerror="this.src='https://via.placeholder.com/40x56/333/fff?text=A'">
                    </div>
                    <div class="suggestion-info">
                        <div class="suggestion-title">${anime.title}</div>
                        <div class="suggestion-meta">${anime.year || 'N/A'} • ${anime.episodes?.length || 0} Episodes</div>
                    </div>
                `
            });

            suggestion.addEventListener('click', () => {
                Router.watchAnime(anime.id);
                Search.hideSuggestions();
                searchInput.value = '';
            });

            suggestions.appendChild(suggestion);
        });

        // Add "View all results" option if there are more results
        if (Search.lastResults.length > 8) {
            const viewAll = Utils.create('div', {
                className: 'search-suggestion-item search-view-all',
                innerHTML: `
                    <div class="suggestion-info">
                        <div class="suggestion-title">View all ${Search.lastResults.length} results</div>
                    </div>
                `
            });

            viewAll.addEventListener('click', () => {
                Search.performSearch(Search.currentQuery, true);
                Search.hideSuggestions();
            });

            suggestions.appendChild(viewAll);
        }

        // Position and show suggestions
        const searchContainer = searchInput.parentElement;
        searchContainer.appendChild(suggestions);
        suggestions.style.display = 'block';
    },

    // Hide search suggestions
    hideSuggestions: () => {
        const existing = Utils.select('#searchSuggestions');
        if (existing) {
            existing.remove();
        }
    },

    // Clear search results
    clearResults: () => {
        Search.currentQuery = '';
        Search.lastResults = [];
        Search.hideSuggestions();
    },

    // Get search suggestions based on query
    getSuggestions: (query) => {
        const suggestions = new Set();
        
        // Add anime titles that match
        Database.anime.getAll().forEach(anime => {
            if (anime.title.toLowerCase().includes(query.toLowerCase())) {
                suggestions.add(anime.title);
            }
            
            // Add genres
            if (anime.genre) {
                anime.genre.split(',').forEach(genre => {
                    const trimmedGenre = genre.trim();
                    if (trimmedGenre.toLowerCase().includes(query.toLowerCase())) {
                        suggestions.add(trimmedGenre);
                    }
                });
            }
        });
        
        return Array.from(suggestions).slice(0, 5);
    },

    // Get popular search terms
    getPopularSearches: () => {
        return ['Action', 'Romance', 'Comedy', 'Drama', 'Fantasy', 'School', 'Slice of Life', 'Supernatural'];
    },

    // Track search analytics
    trackSearch: (query, resultCount) => {
        // In a real app, this would send to analytics service
        if (CONFIG.DEBUG) {
            console.log(`Search: "${query}" returned ${resultCount} results`);
        }
        
        // Could store search history locally for suggestions
        const searchHistory = Utils.storage.get('search_history', []);
        searchHistory.unshift({
            query: query,
            timestamp: new Date().toISOString(),
            resultCount: resultCount
        });
        
        // Keep only last 50 searches
        if (searchHistory.length > 50) {
            searchHistory.splice(50);
        }
        
        Utils.storage.set('search_history', searchHistory);
    },

    // Get search history
    getSearchHistory: () => {
        return Utils.storage.get('search_history', []);
    },

    // Clear search history
    clearSearchHistory: () => {
        Utils.storage.remove('search_history');
        Utils.showToast('Search history cleared', 'success');
    },

    // Search filters
    filters: {
        // Apply genre filter
        byGenre: (results, genre) => {
            return results.filter(anime => 
                anime.genre && anime.genre.toLowerCase().includes(genre.toLowerCase())
            );
        },

        // Apply year filter
        byYear: (results, year) => {
            return results.filter(anime => anime.year === parseInt(year));
        },

        // Apply rating filter
        byRating: (results, minRating) => {
            return results.filter(anime => anime.rating >= parseFloat(minRating));
        },

        // Apply status filter
        byStatus: (results, status) => {
            return results.filter(anime => anime.status === status);
        },

        // Apply episode count filter
        byEpisodeCount: (results, min, max) => {
            return results.filter(anime => {
                const episodeCount = anime.episodes?.length || 0;
                return episodeCount >= min && (max ? episodeCount <= max : true);
            });
        }
    },

    // Sort options
    sort: {
        // Sort by relevance (default)
        byRelevance: (results, query) => {
            return results.sort((a, b) => {
                const aScore = Search.calculateRelevanceScore(a, query);
                const bScore = Search.calculateRelevanceScore(b, query);
                return bScore - aScore;
            });
        },

        // Sort by rating
        byRating: (results, order = 'desc') => {
            return Database.anime.sort(results, 'rating', order);
        },

        // Sort by year
        byYear: (results, order = 'desc') => {
            return Database.anime.sort(results, 'year', order);
        },

        // Sort by title
        byTitle: (results, order = 'asc') => {
            return Database.anime.sort(results, 'title', order);
        },

        // Sort by episode count
        byEpisodeCount: (results, order = 'desc') => {
            return results.sort((a, b) => {
                const aCount = a.episodes?.length || 0;
                const bCount = b.episodes?.length || 0;
                return order === 'desc' ? bCount - aCount : aCount - bCount;
            });
        }
    },

    // Calculate relevance score for search results
    calculateRelevanceScore: (anime, query) => {
        const queryLower = query.toLowerCase();
        let score = 0;

        // Title matches get highest score
        if (anime.title.toLowerCase().includes(queryLower)) {
            score += 100;
            // Exact match gets bonus
            if (anime.title.toLowerCase() === queryLower) {
                score += 50;
            }
            // Title starts with query gets bonus
            if (anime.title.toLowerCase().startsWith(queryLower)) {
                score += 25;
            }
        }

        // Genre matches
        if (anime.genre && anime.genre.toLowerCase().includes(queryLower)) {
            score += 50;
        }

        // Description matches
        if (anime.description && anime.description.toLowerCase().includes(queryLower)) {
            score += 25;
        }

        // Rating bonus (higher rated anime get slight boost)
        if (anime.rating) {
            score += anime.rating;
        }

        // Episode count bonus (more episodes = slight boost)
        if (anime.episodes) {
            score += Math.min(anime.episodes.length * 0.5, 10);
        }

        return score;
    },

    // Search within episodes
    searchEpisodes: (animeId, query) => {
        const anime = Database.anime.getById(animeId);
        if (!anime || !anime.episodes) return [];

        const queryLower = query.toLowerCase();
        return anime.episodes.filter(episode => 
            episode.title.toLowerCase().includes(queryLower) ||
            (episode.description && episode.description.toLowerCase().includes(queryLower))
        );
    },

    // Global search (anime + episodes + comments)
    globalSearch: (query) => {
        const results = {
            anime: Database.anime.search(query),
            episodes: [],
            comments: []
        };

        // Search episodes
        Database.anime.getAll().forEach(anime => {
            const matchingEpisodes = Search.searchEpisodes(anime.id, query);
            matchingEpisodes.forEach(episode => {
                results.episodes.push({
                    ...episode,
                    animeTitle: anime.title,
                    animeId: anime.id
                });
            });
        });

        // Search comments
        const queryLower = query.toLowerCase();
        results.comments = Database.data.comments.filter(comment => 
            comment.text.toLowerCase().includes(queryLower) ||
            comment.author.toLowerCase().includes(queryLower)
        );

        return results;
    },

    // Get trending searches
    getTrendingSearches: () => {
        // In a real app, this would come from analytics
        const trending = [
            'demon slayer',
            'attack on titan',
            'one piece',
            'naruto',
            'dragon ball',
            'jujutsu kaisen',
            'my hero academia',
            'tokyo revengers'
        ];

        return trending;
    },

    // Smart search suggestions
    getSmartSuggestions: (query) => {
        const suggestions = [];
        const queryLower = query.toLowerCase();

        // Add direct matches
        Database.anime.getAll().forEach(anime => {
            if (anime.title.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    type: 'anime',
                    text: anime.title,
                    data: anime
                });
            }
        });

        // Add genre suggestions
        const genres = Database.stats.getAnimeByGenre();
        Object.keys(genres).forEach(genre => {
            if (genre.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    type: 'genre',
                    text: `${genre} anime`,
                    data: { genre }
                });
            }
        });

        // Add year suggestions
        if (query.match(/^\d{4}$/)) {
            suggestions.push({
                type: 'year',
                text: `Anime from ${query}`,
                data: { year: parseInt(query) }
            });
        }

        return suggestions.slice(0, 8);
    }
};

// Make available globally
window.Search = Search;
        
// server.js - DongTube (enhanced)
// Features:
// - Color console logs + file logging (log/server.log)
// - Request logging middleware
// - GitHub database.json auto-update using SHA cache (no restart needed)
// - /api/status endpoint for System Status (dashboard)
// - Auth / Login / Comments (with multer for profile upload)
// - Save/upload helpers to GitHub

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const multer = require('multer');
const upload = multer();

const app = express();
const PORT = process.env.PORT || 5000;

const isVercel = process.env.VERCEL === '1';
const isDev = process.env.NODE_ENV === 'development';

// ==== SETUP LOG FILE ====
const LOG_DIR = path.join(__dirname, 'log');
const LOG_FILE = path.join(LOG_DIR, 'server.log');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ===== LOGGING HELPERS =====
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function timestampISO() {
  return new Date().toISOString();
}

function writeFileLog(line) {
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (err) {
    // best-effort: if logging fails, print to console
    console.error('Failed to write log file:', err.message);
  }
}

function log(title, message, type = 'info') {
  const ts = new Date().toLocaleTimeString('id-ID');
  let color = colors.blue;
  if (type === 'error') color = colors.red;
  if (type === 'success') color = colors.green;
  if (type === 'warning') color = colors.yellow;
  if (type === 'debug') color = colors.cyan;

  const consoleLine = `${color}[${ts}] ${title}:${colors.reset} ${message}`;
  console.log(consoleLine);

  const fileLine = `[${timestampISO()}] ${title.toUpperCase()} (${type.toUpperCase()}): ${message}`;
  writeFileLog(fileLine);
}

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// HTTP request logging middleware (method, path, status, duration)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const msg = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    const type = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warning' : 'info';
    log('HTTP', msg, type);
  });
  next();
});

// ===== GITHUB CONFIG =====
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'HanziCleon';
const GITHUB_REPO = process.env.GITHUB_REPO || 'dongtube-db';

log('CONFIG', `GitHub: ${GITHUB_USERNAME}/${GITHUB_REPO}`, 'info');
log('CONFIG', `Token: ${GITHUB_TOKEN ? '✓ SET' : '✗ NOT SET'}`, GITHUB_TOKEN ? 'success' : 'warning');

// ===== CACHE FOR DATABASE.JSON =====
let animeCache = {
  sha: null,
  data: [],
  lastFetched: null
};

// ===== GITHUB HELPERS =====
async function fetchGitHubApi(url, options = {}) {
  const headers = options.headers || {};
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  headers['Accept'] = headers['Accept'] || 'application/vnd.github+json';
  const resp = await fetch(url, { ...options, headers });
  return resp;
}

/**
 * Fetch a file metadata from GitHub repository contents API.
 * Returns parsed JSON (raw response from GitHub API) or null if not found.
 */
async function getFileMetadata(filePath) {
  try {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filePath}`;
    log('GITHUB_FETCH', `GET ${filePath} (metadata)`, 'debug');
    const resp = await fetchGitHubApi(url);
    if (resp.status === 404) {
      log('GITHUB_FETCH', `File not found: ${filePath}`, 'warning');
      return null;
    }
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    const json = await resp.json();
    return json;
  } catch (err) {
    log('GITHUB_FETCH', `✗ Error fetching metadata ${filePath}: ${err.message}`, 'error');
    return null;
  }
}

/**
 * Fetch raw file content (decoded) from GitHub repository contents API.
 * Returns decoded string or null.
 */
async function fetchRawFileContent(filePath) {
  try {
    const meta = await getFileMetadata(filePath);
    if (!meta) return null;
    if (meta.encoding === 'base64' && meta.content) {
      const decoded = Buffer.from(meta.content, 'base64').toString('utf-8');
      return { content: decoded, sha: meta.sha };
    }
    // fallback: try to fetch raw via raw.githubusercontent (if available)
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${filePath}`;
    const resp = await fetch(rawUrl);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} fetching raw`);
    }
    const text = await resp.text();
    return { content: text, sha: meta.sha || null };
  } catch (err) {
    log('GITHUB_FETCH', `✗ Error fetching raw ${filePath}: ${err.message}`, 'error');
    return null;
  }
}

async function saveToGitHub(filePath, contentObj, message = 'Update from server') {
  try {
    log('GITHUB_SAVE', `Saving ${filePath}...`, 'debug');
    const contentStr = JSON.stringify(contentObj, null, 2);
    const contentBase64 = Buffer.from(contentStr).toString('base64');
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filePath}`;

    // Get current sha (if exists)
    let sha = null;
    try {
      const meta = await getFileMetadata(filePath);
      if (meta && meta.sha) sha = meta.sha;
    } catch (e) {
      // ignore
    }

    const body = {
      message,
      content: contentBase64,
      ...(sha ? { sha } : {})
    };

    const resp = await fetchGitHubApi(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }

    log('GITHUB_SAVE', `✓ Successfully saved ${filePath}`, 'success');
    return true;
  } catch (err) {
    log('GITHUB_SAVE', `✗ Error saving ${filePath}: ${err.message}`, 'error');
    return false;
  }
}

async function uploadFileToGitHub(file, pathInRepo) {
  try {
    log('GITHUB_UPLOAD', `Uploading ${file.originalname} to ${pathInRepo}...`, 'debug');
    const contentBase64 = file.buffer.toString('base64');
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${pathInRepo}`;

    // Check if exists to include sha
    let sha = null;
    try {
      const meta = await getFileMetadata(pathInRepo);
      if (meta && meta.sha) sha = meta.sha;
    } catch (_) {}

    const body = {
      message: `Upload ${file.originalname}`,
      content: contentBase64,
      ...(sha ? { sha } : {})
    };

    const resp = await fetchGitHubApi(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }

    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${pathInRepo}`;
    log('GITHUB_UPLOAD', `✓ Uploaded: ${rawUrl}`, 'success');
    return rawUrl;
  } catch (err) {
    log('GITHUB_UPLOAD', `✗ Error uploading: ${err.message}`, 'error');
    throw err;
  }
}

// ===== AUTH ROUTES =====
app.post('/api/auth/register', upload.single('profilePicture'), async (req, res) => {
  try {
    log('AUTH_REGISTER', 'New registration request', 'debug');
    const { username, password } = req.body;

    if (!username || !password) {
      log('AUTH_REGISTER', 'Missing username or password', 'error');
      return res.status(400).json({ error: 'Username dan password harus diisi' });
    }
    if (username.length < 3) return res.status(400).json({ error: 'Username minimal 3 karakter' });
    if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });

    let users = await (async () => {
      const raw = await fetchRawFileContent('user.json');
      if (!raw) return [];
      try { return JSON.parse(raw.content); } catch (e) { return []; }
    })();

    if (users.some(u => u.username === username)) {
      log('AUTH_REGISTER', `Username exists: ${username}`, 'warning');
      return res.status(400).json({ error: 'Username sudah terdaftar' });
    }

    let profilePictureUrl = `https://via.placeholder.com/100?text=${encodeURIComponent(username)}`;
    if (req.file) {
      try {
        profilePictureUrl = await uploadFileToGitHub(
          req.file,
          `avatars/${username}_${Date.now()}.${req.file.originalname.split('.').pop()}`
        );
      } catch (err) {
        log('AUTH_REGISTER', 'Profile picture upload failed; using placeholder', 'warning');
      }
    }

    const newUser = {
      id: Date.now().toString(),
      username,
      password, // NOTE: consider hashing (bcrypt) later
      profilePicture: profilePictureUrl,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    const saved = await saveToGitHub('user.json', users, `Register new user: ${username}`);
    if (!saved) {
      log('AUTH_REGISTER', 'Failed to save user.json', 'error');
      return res.status(500).json({ error: 'Gagal menyimpan data user' });
    }

    log('AUTH_REGISTER', `✓ Registered ${username}`, 'success');
    res.json({
      success: true,
      user: { id: newUser.id, username: newUser.username, profilePicture: newUser.profilePicture }
    });
  } catch (err) {
    log('AUTH_REGISTER', `✗ ${err.message}`, 'error');
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    log('AUTH_LOGIN', 'New login request', 'debug');
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password harus diisi' });

    const raw = await fetchRawFileContent('user.json');
    if (!raw) {
      log('AUTH_LOGIN', 'No users found', 'warning');
      return res.status(401).json({ error: 'Username atau password salah' });
    }
    let users = [];
    try { users = JSON.parse(raw.content); } catch (e) { users = []; }

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      log('AUTH_LOGIN', `Login failed for ${username}`, 'warning');
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    log('AUTH_LOGIN', `✓ Login: ${username}`, 'success');
    res.json({ success: true, user: { id: user.id, username: user.username, profilePicture: user.profilePicture } });
  } catch (err) {
    log('AUTH_LOGIN', `✗ ${err.message}`, 'error');
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ===== COMMENTS ROUTES =====
app.get('/api/comments', async (req, res) => {
  try {
    log('COMMENTS_GET', 'Fetching comments...', 'debug');
    const raw = await fetchRawFileContent('command.json');
    if (!raw) return res.json([]);
    const parsed = JSON.parse(raw.content);
    res.json(parsed.comments || []);
  } catch (err) {
    log('COMMENTS_GET', `✗ ${err.message}`, 'error');
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    log('COMMENTS_ADD', 'New comment request', 'debug');
    const { username, animeId, episodeNum, content, userAvatar, parentId } = req.body;
    if (!username || !content || !animeId || !episodeNum) {
      return res.status(400).json({ error: 'Field tidak lengkap' });
    }

    let commandsObj = { comments: [] };
    const raw = await fetchRawFileContent('command.json');
    if (raw) {
      try { commandsObj = JSON.parse(raw.content); } catch (e) { commandsObj = { comments: [] }; }
    }

    const newComment = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      animeId: parseInt(animeId),
      episodeNum: parseInt(episodeNum),
      content,
      userAvatar: userAvatar || `https://via.placeholder.com/100?text=${encodeURIComponent(username)}`,
      timestamp: new Date().toISOString(),
      replies: [],
      parentId: parentId || null
    };

    if (parentId) {
      const findAndReply = (comments, pId) => {
        for (let comment of comments) {
          if (comment.id === pId) {
            if (!comment.replies) comment.replies = [];
            comment.replies.push(newComment);
            return true;
          }
          if (comment.replies && findAndReply(comment.replies, pId)) {
            return true;
          }
        }
        return false;
      };
      
      if (!findAndReply(commandsObj.comments, parentId)) {
        commandsObj.comments.push(newComment);
      }
    } else {
      commandsObj.comments.push(newComment);
    }

    const saved = await saveToGitHub('command.json', commandsObj, `Add comment from ${username}`);
    if (!saved) {
      return res.status(500).json({ error: 'Gagal menyimpan komentar' });
    }

    log('COMMENTS_ADD', `✓ Comment saved by ${username}`, 'success');
    res.json({ success: true, comment: newComment });
  } catch (err) {
    log('COMMENTS_ADD', `✗ ${err.message}`, 'error');
    res.status(500).json({ error: 'Gagal menambah komentar' });
  }
});

app.delete('/api/comments/:id', async (req, res) => {
  try {
    log('COMMENTS_DELETE', `Delete request for comment ${req.params.id}`, 'debug');
    const commentId = req.params.id;

    let commandsObj = { comments: [] };
    const raw = await fetchRawFileContent('command.json');
    if (raw) {
      try { commandsObj = JSON.parse(raw.content); } catch (e) { commandsObj = { comments: [] }; }
    }

    const deleteCommentRecursive = (comments, id) => {
      const index = comments.findIndex(c => c.id === id);
      if (index !== -1) {
        comments.splice(index, 1);
        return true;
      }
      for (let comment of comments) {
        if (comment.replies && deleteCommentRecursive(comment.replies, id)) {
          return true;
        }
      }
      return false;
    };

    const deleted = deleteCommentRecursive(commandsObj.comments, commentId);
    if (!deleted) {
      log('COMMENTS_DELETE', `Comment not found: ${commentId}`, 'warning');
      return res.status(404).json({ error: 'Komentar tidak ditemukan' });
    }

    const saved = await saveToGitHub('command.json', commandsObj, `Delete comment ${commentId}`);
    if (!saved) {
      return res.status(500).json({ error: 'Gagal menghapus komentar' });
    }

    log('COMMENTS_DELETE', `✓ Comment deleted`, 'success');
    res.json({ success: true, message: 'Komentar berhasil dihapus' });
  } catch (err) {
    log('COMMENTS_DELETE', `✗ ${err.message}`, 'error');
    res.status(500).json({ error: 'Gagal menghapus komentar' });
  }
});




// Get user interactions
app.get('/api/interactions/:userId', async (req, res) => {
  try {
    log('INTERACTIONS_GET', `Fetching interactions for user ${req.params.userId}`, 'debug');
    const raw = await fetchRawFileContent('interactions.json');
    if (!raw) {
      return res.json({ likes: [], dislikes: [], favorites: [] });
    }
    
    let interactions = [];
    try { 
      interactions = JSON.parse(raw.content); 
    } catch (e) { 
      interactions = []; 
    }
    
    const userInteractions = interactions.find(i => i.userId === req.params.userId);
    if (!userInteractions) {
      return res.json({ likes: [], dislikes: [], favorites: [] });
    }
    
    res.json(userInteractions);
  } catch (err) {
    log('INTERACTIONS_GET', `❌ Error: ${err.message}`, 'error');
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

// ===== INTERACTIONS STATS ENDPOINT =====

// Get stats for a specific anime
app.get('/api/interactions/stats/:animeId', async (req, res) => {
  try {
    log('INTERACTIONS_STATS', `Getting stats for anime ${req.params.animeId}`, 'debug');
    const animeId = parseInt(req.params.animeId);
    
    let interactions = [];
    const raw = await fetchRawFileContent('interactions.json');
    if (raw) {
      try { 
        interactions = JSON.parse(raw.content); 
      } catch (e) { 
        interactions = []; 
      }
    }

    // Calculate stats
    const stats = {};

    // Count likes per episode
    interactions.forEach(userInt => {
      userInt.likes.forEach(like => {
        if (like.animeId === animeId) {
          const key = like.episodeNum ? `${animeId}_${like.episodeNum}` : animeId;
          if (!stats[key]) stats[key] = { likes: 0, dislikes: 0, favorites: 0 };
          stats[key].likes++;
        }
      });

      // Count dislikes per episode
      userInt.dislikes.forEach(dislike => {
        if (dislike.animeId === animeId) {
          const key = dislike.episodeNum ? `${animeId}_${dislike.episodeNum}` : animeId;
          if (!stats[key]) stats[key] = { likes: 0, dislikes: 0, favorites: 0 };
          stats[key].dislikes++;
        }
      });

      // Count favorites
      userInt.favorites.forEach(fav => {
        if (fav.animeId === animeId) {
          if (!stats[animeId]) stats[animeId] = { likes: 0, dislikes: 0, favorites: 0 };
          stats[animeId].favorites++;
        }
      });
    });

    log('INTERACTIONS_STATS', `Stats calculated for anime ${animeId}`, 'success');
    res.json(stats);
  } catch (err) {
    log('INTERACTIONS_STATS', `❌ Error: ${err.message}`, 'error');
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get user interactions
app.get('/api/interactions/:userId', async (req, res) => {
  try {
    log('INTERACTIONS_GET', `Fetching interactions for user ${req.params.userId}`, 'debug');
    const raw = await fetchRawFileContent('interactions.json');
    if (!raw) {
      return res.json({ likes: [], dislikes: [], favorites: [] });
    }
    
    let interactions = [];
    try { 
      interactions = JSON.parse(raw.content); 
    } catch (e) { 
      interactions = []; 
    }
    
    const userInteractions = interactions.find(i => i.userId === req.params.userId);
    if (!userInteractions) {
      return res.json({ likes: [], dislikes: [], favorites: [] });
    }
    
    res.json(userInteractions);
  } catch (err) {
    log('INTERACTIONS_GET', `❌ Error: ${err.message}`, 'error');
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

// Save interaction (like, dislike, favorite)
app.post('/api/interactions', async (req, res) => {
  try {
    log('INTERACTIONS_SAVE', 'Saving interaction...', 'debug');
    const { userId, username, type, animeId, episodeNum } = req.body;

    if (!userId || !username || !type || !animeId) {
      log('INTERACTIONS_SAVE', 'Missing required fields', 'warning');
      return res.status(400).json({ error: 'Field tidak lengkap' });
    }

    let interactions = [];
    const raw = await fetchRawFileContent('interactions.json');
    if (raw) {
      try { 
        interactions = JSON.parse(raw.content); 
      } catch (e) { 
        interactions = []; 
      }
    }

    let userInteractions = interactions.find(i => i.userId === userId);
    if (!userInteractions) {
      userInteractions = {
        userId,
        username,
        likes: [],
        dislikes: [],
        favorites: [],
        createdAt: new Date().toISOString()
      };
      interactions.push(userInteractions);
    }

    // Handle likes
    if (type === 'like') {
      const existingLike = userInteractions.likes.find(l => 
        episodeNum ? (l.animeId === animeId && l.episodeNum === episodeNum) : (l.animeId === animeId && !l.episodeNum)
      );
      
      if (existingLike) {
        userInteractions.likes = userInteractions.likes.filter(l => 
          episodeNum ? !(l.animeId === animeId && l.episodeNum === episodeNum) : !(l.animeId === animeId && !l.episodeNum)
        );
        log('INTERACTIONS_SAVE', `Like removed for anime ${animeId}`, 'success');
      } else {
        if (episodeNum) {
          userInteractions.dislikes = userInteractions.dislikes.filter(d => 
            !(d.animeId === animeId && d.episodeNum === episodeNum)
          );
        }
        userInteractions.likes.push({
          animeId,
          episodeNum: episodeNum || null,
          timestamp: new Date().toISOString()
        });
        log('INTERACTIONS_SAVE', `Like added for anime ${animeId}`, 'success');
      }
    }

    // Handle dislikes
    if (type === 'dislike') {
      const existingDislike = userInteractions.dislikes.find(d => 
        episodeNum ? (d.animeId === animeId && d.episodeNum === episodeNum) : (d.animeId === animeId && !d.episodeNum)
      );
      
      if (existingDislike) {
        userInteractions.dislikes = userInteractions.dislikes.filter(d => 
          episodeNum ? !(d.animeId === animeId && d.episodeNum === episodeNum) : !(d.animeId === animeId && !d.episodeNum)
        );
        log('INTERACTIONS_SAVE', `Dislike removed for anime ${animeId}`, 'success');
      } else {
        if (episodeNum) {
          userInteractions.likes = userInteractions.likes.filter(l => 
            !(l.animeId === animeId && l.episodeNum === episodeNum)
          );
        }
        userInteractions.dislikes.push({
          animeId,
          episodeNum: episodeNum || null,
          timestamp: new Date().toISOString()
        });
        log('INTERACTIONS_SAVE', `Dislike added for anime ${animeId}`, 'success');
      }
    }

    // Handle favorites
    if (type === 'favorite') {
      const existingFavorite = userInteractions.favorites.find(f => f.animeId === animeId);
      
      if (existingFavorite) {
        userInteractions.favorites = userInteractions.favorites.filter(f => f.animeId !== animeId);
        log('INTERACTIONS_SAVE', `Favorite removed for anime ${animeId}`, 'success');
      } else {
        userInteractions.favorites.push({
          animeId,
          timestamp: new Date().toISOString()
        });
        log('INTERACTIONS_SAVE', `Favorite added for anime ${animeId}`, 'success');
      }
    }

    const saved = await saveToGitHub('interactions.json', interactions, `Update interactions for user ${username}`);
    if (!saved) {
      log('INTERACTIONS_SAVE', 'Failed to save interactions.json', 'error');
      return res.status(500).json({ error: 'Gagal menyimpan interaksi' });
    }

    res.json({ success: true, interactions: userInteractions });
  } catch (err) {
    log('INTERACTIONS_SAVE', `❌ Error: ${err.message}`, 'error');
    res.status(500).json({ error: 'Gagal menyimpan interaksi' });
  }
});

// Delete interaction
app.delete('/api/interactions/:userId/:type/:animeId', async (req, res) => {
  try {
    log('INTERACTIONS_DELETE', `Delete ${req.params.type} for user ${req.params.userId}`, 'debug');
    const { userId, type, animeId } = req.params;
    const { episodeNum } = req.query;

    let interactions = [];
    const raw = await fetchRawFileContent('interactions.json');
    if (raw) {
      try { 
        interactions = JSON.parse(raw.content); 
      } catch (e) { 
        interactions = []; 
      }
    }

    const userInteractions = interactions.find(i => i.userId === userId);
    if (!userInteractions) {
      return res.status(404).json({ error: 'User interactions not found' });
    }

    if (type === 'like') {
      userInteractions.likes = userInteractions.likes.filter(l => 
        episodeNum ? !(l.animeId === animeId && l.episodeNum === episodeNum) : !(l.animeId === animeId)
      );
    } else if (type === 'dislike') {
      userInteractions.dislikes = userInteractions.dislikes.filter(d => 
        episodeNum ? !(d.animeId === animeId && d.episodeNum === episodeNum) : !(d.animeId === animeId)
      );
    } else if (type === 'favorite') {
      userInteractions.favorites = userInteractions.favorites.filter(f => f.animeId !== animeId);
    }

    const saved = await saveToGitHub('interactions.json', interactions, `Delete ${type} for user ${userId}`);
    if (!saved) {
      return res.status(500).json({ error: 'Gagal menghapus interaksi' });
    }

    log('INTERACTIONS_DELETE', `✓ ${type} deleted`, 'success');
    res.json({ success: true, interactions: userInteractions });
  } catch (err) {
    log('INTERACTIONS_DELETE', `❌ Error: ${err.message}`, 'error');
    res.status(500).json({ error: 'Gagal menghapus interaksi' });
  }
});


// ==================== ANIME LIST (AUTO-UPDATE with SHA check) ====================
app.get('/api/anime', async (req, res) => {
  try {
    log('ANIME_GET', 'Request: GET /api/anime', 'debug');

    const meta = await getFileMetadata('database.json');
    if (!meta) {
      log('ANIME_GET', 'database.json not found in repo', 'warning');
      animeCache = { sha: null, data: [], lastFetched: new Date().toISOString() };
      return res.json([]);
    }

    // If sha differs -> update cache
    if (animeCache.sha !== meta.sha) {
      log('DATABASE_UPDATE', 'database.json changed or cache empty. Updating cache...', 'warning');
      const fetched = await fetchRawFileContent('database.json');
      if (!fetched) {
        log('DATABASE_UPDATE', 'Failed to fetch raw database.json', 'error');
        return res.status(500).json({ error: 'Failed to load database' });
      }
      try {
        const parsed = JSON.parse(fetched.content);
        animeCache.data = Array.isArray(parsed) ? parsed : parsed;
        animeCache.sha = fetched.sha || meta.sha;
        animeCache.lastFetched = new Date().toISOString();
        log('DATABASE_UPDATE', `New anime count: ${animeCache.data.length}`, 'success');
      } catch (err) {
        log('DATABASE_UPDATE', `✗ Error parsing database.json: ${err.message}`, 'error');
        return res.status(500).json({ error: 'Invalid database.json format' });
      }
    } else {
      log('DATABASE_CACHE', 'database.json unchanged. Returning cached data.', 'debug');
    }

    res.json(animeCache.data);
  } catch (err) {
    log('ANIME_GET', `✗ ${err.message}`, 'error');
    res.status(500).json({ error: 'Failed to fetch anime' });
  }
});

// Additional convenience: fetch single anime by id (reads from cache)
app.get('/api/anime/:id', async (req, res) => {
  try {
    if (!animeCache || !animeCache.data || animeCache.data.length === 0) {
      // ensure cache loaded
      await (async () => { await app.handle({ method: 'GET', url: '/api/anime' }, { end: () => {} }); })().catch(()=>{});
    }
    const id = parseInt(req.params.id);
    const anime = (animeCache.data || []).find(a => a.id === id || a.id === String(id));
    if (!anime) return res.status(404).json({ error: 'Anime not found' });
    res.json(anime);
  } catch (err) {
    log('ANIME_GET_BY_ID', `✗ ${err.message}`, 'error');
    res.status(500).json({ error: 'Failed to fetch anime' });
  }
});

// ===== SYSTEM STATUS ENDPOINT =====
app.get('/api/status', (req, res) => {
  try {
    const uptime = process.uptime(); // seconds
    const status = {
      uptime_seconds: Math.floor(uptime),
      node_version: process.version,
      github: {
        username: GITHUB_USERNAME,
        repo: GITHUB_REPO,
        token_set: !!GITHUB_TOKEN
      },
      anime_cache: {
        sha: animeCache.sha,
        anime_count: animeCache.data ? animeCache.data.length : 0,
        last_fetched: animeCache.lastFetched
      },
      server_time: new Date().toISOString()
    };
    log('STATUS', 'Returned system status', 'debug');
    res.json(status);
  } catch (err) {
    log('STATUS', `✗ ${err.message}`, 'error');
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ===== STATIC ROUTES =====
app.get('/', (req, res) => {
  log('ROUTE', 'GET /', 'debug');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/watch', (req, res) => {
  log('ROUTE', 'GET /watch', 'debug');
  res.sendFile(path.join(__dirname, 'public', 'watch.html'));
});
app.get('/auth', (req, res) => {
  log('ROUTE', 'GET /auth', 'debug');
  res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// Error handler
app.use((err, req, res, next) => {
  log('ERROR', `Unhandled error: ${err.message}`, 'error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  log('SERVER', `DongTube running on http://localhost:${PORT}`, 'success');
  log('SERVER', `Environment: ${process.env.NODE_ENV || 'development'}`, 'info');
  log('SERVER', '='.repeat(50), 'info');
});

               startServer();

export default app;

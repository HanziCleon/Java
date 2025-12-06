const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.static('public'));

// Penyimpanan data
let animeData = [];
let etag = null;

// Fungsi untuk load data dari GitHub dgn ETag
async function loadAnimeData() {
  try {
    const url = 'https://raw.githubusercontent.com/HanziCleon/Java/refs/heads/main/anime.json';

    const response = await fetch(url, {
      headers: etag ? { "If-None-Match": etag } : {}
    });

    // Kalau file belum berubah
    if (response.status === 304) {
      console.log("✔ Anime.json tidak berubah, data tetap dipakai");
      return;
    }

    // Simpan ETag terbaru
    etag = response.headers.get("etag");

    // Ambil data
    const text = await response.text();
    animeData = JSON.parse(text);

    console.log(`🔥 Data anime diperbarui: ${animeData.length} item (ETag baru)`);
  } catch (error) {
    console.error("❌ Gagal memuat data:", error);
  }
}

// API
app.get('/api/anime', (req, res) => {
  res.json(animeData);
});

app.get('/api/anime/:id', (req, res) => {
  const anime = animeData.find(a => a.id == req.params.id);
  if (anime) {
    res.json(anime);
  } else {
    res.status(404).json({ error: 'Anime not found' });
  }
});

// Routing
app.get('/watch', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'watch.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server setelah load pertama
loadAnimeData().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Dongtube server running at http://localhost:${PORT}`);
  });
});

// Auto cek perubahan tiap 3 detik
setInterval(loadAnimeData, 3000);
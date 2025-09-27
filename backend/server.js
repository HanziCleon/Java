import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;
const API_BASE = "https://www.sankavollerei.com/api";

app.use(cors());

// Proxy contoh endpoint
app.get("/api/home", async (req, res) => {
  try {
    const { data } = await axios.get(\`\${API_BASE}/home\`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/anime/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await axios.get(\`\${API_BASE}/anime/\${id}\`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(\`✅ Backend running on port \${PORT}\`));

import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [animes, setAnimes] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/api/home").then((res) => {
      setAnimes(res.data || []);
    });
  }, []);

  return (
    <div>
      <h1>Anime Streaming</h1>
      <ul>
        {animes.map((anime, idx) => (
          <li key={idx}>{anime.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;

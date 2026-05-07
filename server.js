require("dotenv").config(); //loads .env file into process.env ('require' similar to 'import')
const express = require("express");
const path = require("path");

const app = express(); //create node express app

//Port and api key variables in .env file
const PORT = process.env.PORT || 3000; //default to port 3000 if environment doesn't specify
const TMDB_API_KEY = process.env.TMDB_API_KEY;

//links to movie databases
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

if (!TMDB_API_KEY) {
  console.warn(
    "Warning: TMDB_API_KEY is not set. Add it to a .env file before making requests.",
  );
}

app.use(express.static(path.join(__dirname))); //serve files in current dir

app.listen(PORT, () => {
  console.log(`Movie recommender running at http://localhost:${PORT}`);
});

//Creates and returns movie object using only necessary details for frontend
function shapeMovie(movie, genreMap) {
  //Get genre names (from id to genre name) for movie using genreMap function
  const genreNames = (movie.genre_ids || [])
    .map((id) => genreMap.get(id)) // map through genre ids for movie and return genre name from genreMap
    .filter(Boolean); // filter out any undefined values (in case genre id doesn't exist in genreMap)

  return {
    title: movie.title,
    year: (movie.release_date || "").slice(0, 4) || "Unknown", //get year from release date (only 4 char eg. '1994')
    genres: genreNames.length ? genreNames.join(", ") : "Unknown", //join genre names if more than 0 or 1 with , (ternary operator)
    rating: movie.vote_average, // 0-10 scale, frontend converts to stars
    description: movie.overview || "No description available.",
    poster: movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : null,
  };
}

//getgenreMap Fetches the {id -> name} genre map from TMDB. Cached in memory after because genres stay sam3
let genreMapCache = null;
async function getGenreMap() {
  if (genreMapCache) return genreMapCache; //if genreMapCache not null, exit function

  const url = `${TMDB_BASE}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`; //url to fetch genre list from TMDB
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB genre list failed: ${response.status}`);
  }
  const data = await response.json();

  //data.genres returns [{id: 28, name: "Action"}, {id: 12, name: "Adventure"}, ...]
  genreMapCache = new Map(data.genres.map((g) => [g.id, g.name])); //for every item in genres array insert id and name of genre in genreMapCache

  return genreMapCache;
}

// GET /api/genres to populate dropdown by fetching ("/api/genres") on frontend
app.get("/api/genres", async (req, res) => {
  //req & res given by express
  try {
    const url = `${TMDB_BASE}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB responded with ${response.status}`);
    }
    const data = await response.json(); //convert to object
    res.json(data.genres); // [{ id: 28, name: "Action" }, ...] | convert response to json
  } catch (error) {
    console.error("Failed to fetch genres:", error.message);
    res.status(502).json({ error: "Could not reach TMDB for genres." }); //502 = bad gateway
  }
});

// GET /api/movie to get random movie based on filters from frontend (genre, year, rating)
// eg. /api/movie?genre=28&year=1995&rating=4
app.get("/api/movie", async (req, res) => {
  try {
    //for filters if provided in url by client, add to params for TMDB discover endpoint
    const { genre, year, rating } = req.query; //destructuring. get genre, year, rating from req query parameters eg. /api/movie?genre=28&year=1995 = then req.query is {genre: "28", year: "1995"}

    const params = new URLSearchParams({
      //let js generate url parameters eg. https://api.themoviedb.org/3/discover/movie?api_key=abc123&include_adult=false&language=en-US
      api_key: TMDB_API_KEY,
      include_adult: "false",
      language: "en-US",
    });

    // if filter provided add TMDB discover parameters for that filter
    if (genre) params.set("with_genres", genre);
    if (year) params.set("primary_release_year", year);
    if (rating) params.set("vote_average.gte", String(Number(rating) * 2)); //convert 1-5 star rating to 0-10 scale for TMDB

    // First call: find out how many pages of results exist.
    const url = `${TMDB_BASE}/discover/movie?${params.toString()}&page=1`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB discover failed: ${response.status}`);
    }
    const data = await response.json();

    if (!data.total_pages || data.total_pages === 0) {
      return res.status(404).json({
        error: "No movies matched those filters. Try widening them.",
      });
    }
    res.json(data); //testing
  } catch (error) {
    console.error("Failed to fetch movie:", error.message);
    res.status(502).json({ error: "Could not reach TMDB for a movie." });
  }
});

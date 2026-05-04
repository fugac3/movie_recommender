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

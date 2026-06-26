// Handles GET /api/movie?genre=28&year=1995&rating=4
// Returns one shaped movie object: { title, year, genres, rating, description, poster }

const TMDB_API_KEY = process.env.TMDB_API_KEY; //set in Netlify dashboard
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500"; // base URL for TMDB poster images

// ─── Genre map cache ────────────────────────────────────────────────────────
// Genres almost never change so we cache them
let genreMapCache = null;

async function getGenreMap() {
  if (genreMapCache) return genreMapCache; // return cached map if it exists

  const url = `${TMDB_BASE}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB genre list failed: ${response.status}`);
  }
  const data = await response.json();

  // new Map([[ key, value ], ...]) — builds a Map from an array of pairs.
  // data.genres.map((g) => [g.id, g.name]) turns each genre object into a pair.
  // returns: Map { 28 => "Action", 12 => "Adventure", ... }
  genreMapCache = new Map(data.genres.map((g) => [g.id, g.name]));
  return genreMapCache;
}

// ── Movie shaper ──
// Takes a raw TMDB movie object and a genre Map, returns only the fields needed for frontend
function shapeMovie(movie, genreMap) {
  const genreNames = (movie.genre_ids || []) // genre_ids is an array of numbers e.g. [28, 12]
    .map((id) => genreMap.get(id)) // look up each id in the Map to get its name string
    .filter(Boolean); // remove any undefined values (ids not found in the map)

  return {
    title: movie.title,
    year: (movie.release_date || "").slice(0, 4) || "Unknown", // "1994-09-23" -> "1994"
    genres: genreNames.length ? genreNames.join(", ") : "Unknown", // "Action, Adventure" or "Unknown"
    rating: movie.vote_average, // 0-10 number, frontend converts to stars via formatStars()
    description: movie.overview || "No description available.",
    poster: movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : null, // full image URL or null
  };
}

// ── Main function handler ───
export default async (req) => {
  try {
    // In Netlify Functions, req is a standard Web API Request object.
    // Unlike Express (req.query.genre), query params parsed via the URL class.
    const url = new URL(req.url); // parse the full URL string into a structured object
    const genre = url.searchParams.get("genre"); // e.g. "28", or null if not provided
    const year = url.searchParams.get("year"); // e.g. "1995", or null
    const rating = url.searchParams.get("rating"); // e.g. "4", or null

    // Build TMDB discover query params. Start with the ones always included.
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      include_adult: "false",
      language: "en-US",
    });

    // add a filter param if frontend sent one.
    // A null value here means user left that filter as "Any" so skip it.
    if (genre) params.set("with_genres", genre);
    if (year) params.set("primary_release_year", year);
    if (rating) params.set("vote_average.gte", String(Number(rating) * 2)); // 1-5 stars -> 2-10 TMDB scale

    // ── First TMDB call: get page count ─-
    // 20 movies per page
    const firstUrl = `${TMDB_BASE}/discover/movie?${params.toString()}&page=1`;
    const firstResponse = await fetch(firstUrl);
    if (!firstResponse.ok) {
      throw new Error(`TMDB discover failed: ${firstResponse.status}`);
    }
    const firstData = await firstResponse.json();

    // total_pages === 0. filter combo matched nothing in TMDB's database.
    if (!firstData.total_pages || firstData.total_pages === 0) {
      return Response.json(
        { error: "No movies matched those filters. Try widening them." },
        { status: 404 },
      );
    }

    // ── Pick a random page ──
    // TMDB caps pagination at 500 pages regardless of total_pages value
    const maxPage = Math.min(firstData.total_pages, 500);
    // Math.random() -> 0 to 0.999..., * maxPage -> 0 to maxPage-0.001, Math.floor -> 0 to maxPage-1, +1 -> 1 to maxPage
    const randomPage = Math.floor(Math.random() * maxPage) + 1;

    // ── Second TMDB call: fetch randomly chosen page ──
    //if the random page happens to be 1, reuse firstData to avoid repeat request
    let results = firstData.results;
    if (randomPage !== 1) {
      const pageUrl = `${TMDB_BASE}/discover/movie?${params.toString()}&page=${randomPage}`;
      const pageResponse = await fetch(pageUrl);
      if (!pageResponse.ok) {
        throw new Error(`TMDB page fetch failed: ${pageResponse.status}`);
      }
      const pageData = await pageResponse.json();
      results = pageData.results; // overwrite with the random page's 20 movies
    }

    // Guard against an empty results array
    if (!results || results.length === 0) {
      return Response.json(
        { error: "No movies matched those filters. Try widening them." },
        { status: 404 },
      );
    }

    // ── Pick one random movie from the page's 20 results ──
    const randomMovie = results[Math.floor(Math.random() * results.length)];

    // Fetch the genre map (cached after first call) and shape the movie object
    const genreMap = await getGenreMap();
    return Response.json(shapeMovie(randomMovie, genreMap));
  } catch (error) {
    console.error("Failed to fetch movie:", error.message);
    return Response.json(
      { error: "Could not reach TMDB for a movie." },
      { status: 502 },
    );
  }
};

// Serve this function at /api/movie instead of /.netlify/functions/get-movie
export const config = { path: "/api/movie" };

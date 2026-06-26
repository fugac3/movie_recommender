// Netlify runs this file as a serverless function — it only executes when a request hits /api/genres, and never runs in the browser

const TMDB_API_KEY = process.env.TMDB_API_KEY; //injected by Netlify at runtime
const TMDB_BASE = "https://api.themoviedb.org/3";

export default async (req) => {
  //ES modules syntax coz Netlify uses that style
  try {
    const url = `${TMDB_BASE}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB responded with ${response.status}`);
    }

    const data = await response.json(); // parse TMDB's response body as JSON
    // data.genres is an array like [{ id: 28, name: "Action" }, ...]
    // Response.json() is Netlify equivalent of Express's res.json()
    return Response.json(data.genres);
  } catch (error) {
    console.error("Failed to fetch genres:", error.message);
    return Response.json(
      { error: "Could not reach TMDB for genres." },
      { status: 502 }, // 502 = bad gateway
    );
  }
};

//tells Netlify to serve this function at /api/genres instead of the default /.netlify/functions/get-genres — keeps script.js fetch calls unchanged
export const config = { path: "/api/genres" };

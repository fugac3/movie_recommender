document.addEventListener("DOMContentLoaded", () => {
  populateGenresDropdown();
  wireUpRandomButton(); // attach the click listener to Random Movie button
  showRandomMovie();
});

// Reads the current filter values from the DOM and puts them into one object.
function getActiveFilters() {
  const genre = document.getElementById("genre-btn").value; //selected genre id or "" for Any genre
  const yearEnabled = document.getElementById("year-filter-enabled").checked; //only read slider's value if checkbox is checked
  const year = yearEnabled ? document.getElementById("year-slider").value : "";
  const rating = document.getElementById("rating-btn").value;
  return { genre, year, rating }; // object shorthand eg. { genre: genre }
}

//Builds a query string from whatever filters are non-empty, then calls server. only network call script.js ever makes.
async function fetchRandomMovie(filters = {}) {
  const params = new URLSearchParams(); // builds a query string like "genre=28&year=1995" safely

  //only add param if filter actually has a value
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.year) params.set("year", filters.year);
  if (filters.rating) params.set("rating", filters.rating);

  //browser sends this to my express server
  const response = await fetch(`/api/movie?${params.toString()}`);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})); //parse error JSON, fall back to {} if that fails
    throw new Error(
      errorBody.error || "Something went wrong fetching a movie.", //use server's message if present, else a generic one
    );
  }

  return response.json(); // parse and return the successful movie JSON response
}

//Converts 0-10 TMDB rating into a 1-5 star display string, e.g. 7.8 -> "★★★★☆"
function formatStars(rating) {
  if (typeof rating !== "number") return "Not yet rated"; //guards against null/undefined ratings
  const stars = Math.round(rating / 2); //round to nearest whole star
  return "★".repeat(stars) + "☆".repeat(5 - stars); // filled stars + empty stars
}

//Clears the card and shows a temporary message while the network request is busy
function showLoadingState() {
  document.getElementById("movie-title").textContent = "Loading...";
  document.getElementById("movie-description").textContent = "";
}

// Displays an error message in place of movie details
function showErrorState(message) {
  document.getElementById("movie-title").textContent = "No match found";
  document.getElementById("movie-description").textContent = message; //actual reason from thrown Error
  document.getElementById("movie-genre").textContent = "";
  document.getElementById("movie-year").textContent = "";
  document.getElementById("movie-rating").textContent = "";
}

// Takes a shaped movie object from our server and writes its fields into the page.
function renderMovie(movie) {
  document.getElementById("movie-title").textContent = movie.title;
  document.getElementById("movie-genre").textContent = movie.genres;
  document.getElementById("movie-year").textContent = movie.year;
  document.getElementById("movie-description").textContent = movie.description;
  document.getElementById("movie-rating").textContent = formatStars(
    movie.rating, //convert the raw 0-10 number into a star string before displaying
  );

  const posterEl = document.getElementById("movie-poster");
  posterEl.src = movie.poster || "content/poster-placeholder.jpg"; //fallback placeholder if TMDB has no poster
  posterEl.alt = `${movie.title} poster`; //accessible alt text
}

// MAIN ORCHESTRATOR: reads filters, fetches a movie, renders it, and handles any failures
async function showRandomMovie() {
  showLoadingState(); // runs immediately, outside try
  try {
    const filters = getActiveFilters(); // read genre/year/rating from the page right now
    const movie = await fetchRandomMovie(filters); // pause until my server responds
    renderMovie(movie);
  } catch (error) {
    showErrorState(error.message);
  }
}

//Attaches the click listener once, on page load, so every click re-runs the full cycle.
function wireUpRandomButton() {
  document
    .getElementById("random-movie")
    .addEventListener("click", showRandomMovie); //passed by reference
}

//Populates the genre dropdown from my own /api/genres route on page load
async function populateGenresDropdown() {
  const genreSelect = document.getElementById("genre-btn");
  try {
    const response = await fetch("/api/genres");
    if (!response.ok) throw new Error("Could not load genres.");
    const genres = await response.json(); // [{ id, name }, ...]

    // add a default "Any genre" option first, with an empty value for "no filter"
    const allOption = document.createElement("option"); //builds <option> element
    allOption.value = ""; //"no filter" when sent to the server
    allOption.textContent = "Any genre";
    genreSelect.appendChild(allOption);

    for (const genre of genres) {
      const option = document.createElement("option");
      option.value = genre.id; //TMDBs genre id, sent back to our server later as a filter
      option.textContent = genre.name; //name shown in dropdown
      genreSelect.appendChild(option);
    }
  } catch (error) {
    //show in logs so a broken dropdown doesn't break rest of the app
    console.error(error.message);
  }
}

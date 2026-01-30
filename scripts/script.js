document.addEventListener("DOMContentLoaded", () => {
  movieElements();
  populateGenresDropdown();
});

async function loadMovies() {
  const response = await fetch("scripts/movies.csv");
  const csvText = await response.text(); //turn csv response to text
  const parsed = Papa.parse(csvText, { header: true }); //turn into object || header makes headings keys
  const movies = parsed.data;
  return movies;
}

console.log(loadMovies());

async function randomMovieGenerator() {
  const movies = await loadMovies(); //wait for promise to be fulfilled
  let randomMovieIndex = Math.floor(Math.random() * movies.length); //get random index in array of movies
  return movies[randomMovieIndex];
}

console.log(randomMovieGenerator());

async function movieElements() {
  const movieTitleHtml = document.getElementById("movie-title");
  const movieGenreHtml = document.getElementById("movie-genre");
  const movieYearHtml = document.getElementById("movie-year");

  const movie = await randomMovieGenerator(); //get random movie

  let movieTitle;
  let movieYear;

  const regex = /^(.*?)\s*\((\d{4})\)\s*$/; //structure for title: return movie title and year "(Totoro (Studio Ghibli) (1990))"
  const match = movie.title.match(regex); //if title and regex matches...

  //title will be first part and year second
  if (match) {
    movieTitle = match[1].trim();
    movieYear = match[2].trim();
  }

  movieTitleHtml.textContent = movieTitle;
  movieGenreHtml.textContent = movie.genres;
  movieYearHtml.textContent = movieYear;
}

function populateMovie() {
  randomMovieButton = document.getElementById("random-movie");
  randomMovieButton.addEventListener("click", () => {
    movieElements(); // populate movie card by calling movieElements
  });
}

populateMovie();

async function listGenres() {
  const movies = await loadMovies(); //get movies first (await promise)

  const genreSet = new Set();
  for (const movie of movies) {
    if (!movie.genres) continue; //skip if no genres
    const genres = movie.genres.split("|");
    for (const genre of genres) {
      genreSet.add(genre);
    }
  }
  return genreSet;
}

console.log(listGenres());

async function populateGenresDropdown() {
  const genreOptions = await listGenres();
  const genreSelect = document.getElementById("genre-btn");

  for (const genre of genreOptions) {
    const option = document.createElement("option");
    option.textContent = genre;
    option.value = genre.toLowerCase();
    genreSelect.appendChild(option);
  }
}

document.addEventListener("DOMContentLoaded", () => movieElements());

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
  //   document.addEventListener("DOMContentLoaded", () => randomMovieGenerator());
  const movieTitleHtml = document.getElementById("movie-title");
  const movieGenreHtml = document.getElementById("movie-genre");
  const movieYearHtml = document.getElementById("movie-year");

  const movie = await randomMovieGenerator();

  const movieParts = movie.title.split("(");
  const movieTitle = movieParts[0].trim();
  const movieYear = movieParts[1].replace(")", "").trim();

  movieTitleHtml.textContent = movieTitle;
  movieGenreHtml.textContent = movie.genres;
  movieYearHtml.textContent = movieYear;
}

function populateMovie() {
  randomMovieButton = document.getElementById("random-movie");
  randomMovieButton.addEventListener("click", () => {
    movieElements();
  });
}

populateMovie();

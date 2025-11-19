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


// =====================================
// STREAMFLIX - TMDB MOVIE DATABASE
// =====================================


// =====================================
// STREAMFLIX API CONFIGURATION
// =====================================

// TMDB API KEY
const API_KEY = "fcdb251ef4d0f443e529b4a5b2c71dda";

// SUPABASE CONNECTION
const SUPABASE_URL = "https://auukqhbhuxxsoaoivegi.supabase.co";

const SUPABASE_KEY = "sb_publishable_nNT8CkzgwoImt_lrXoSmHQ_X6GusFpr";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_URL = "https://image.tmdb.org/t/p/original";

const app = document.getElementById("content");
const hero = document.getElementById("hero");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("movieModal");

let currentPage = "home";
let searchTimer;

// Save movies in browser storage
let myList = JSON.parse(localStorage.getItem("streamflixList")) || [];

// Fetch data from TMDB
async function fetchMovies(endpoint) {
    const response = await fetch(
        `${BASE_URL}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${API_KEY}`
    );

    if (!response.ok) {
        throw new Error("Unable to load movie data");
    }

    return await response.json();
}

// Display movie cards
function createMovieCard(movie, type = "movie") {
    if (!movie.poster_path) return "";

    return `
        <div class="movie-card"
             data-id="${movie.id}"
             data-type="${type}">
            <img src="${IMAGE_URL}${movie.poster_path}"
                 alt="${movie.title || movie.name}"
                 loading="lazy">
            <h3>${movie.title || movie.name}</h3>
            <p>⭐ ${movie.vote_average?.toFixed(1) || "N/A"} / 10</p>
        </div>
    `;
}

// Display a horizontal movie section
function createSection(title, movies, type = "movie") {
    if (!movies || movies.length === 0) return "";

    return `
        <section class="movie-section">
            <h2>${title}</h2>
            <div class="movie-row">
                ${movies.map(movie => createMovieCard(movie, type)).join("")}
            </div>
        </section>
    `;
}

// Load homepage
async function loadHome() {
    currentPage = "home";
    app.innerHTML = `<p class="loading">Loading your entertainment...</p>`;

    try {
        const [trending, popular, topRated, upcoming, tv] =
            await Promise.all([
                fetchMovies("/trending/all/week"),
                fetchMovies("/movie/popular"),
                fetchMovies("/movie/top_rated"),
                fetchMovies("/movie/upcoming"),
                fetchMovies("/tv/popular")
            ]);

        const featured = trending.results[0];

        if (featured) {
            hero.style.backgroundImage = `
                linear-gradient(90deg, #000 5%, transparent),
                linear-gradient(0deg, #0b0b0b, transparent 65%),
                url("${BACKDROP_URL}${featured.backdrop_path}")
            `;

            hero.innerHTML = `
                <h2>${featured.title || featured.name}</h2>
                <p>${featured.overview || "Discover something amazing to watch."}</p>
                <button onclick="openDetails(${featured.id}, '${featured.media_type || "movie"}')">
                    ▶ More Details
                </button>
            `;
        }

        app.innerHTML =
            createSection("Trending This Week", trending.results) +
            createSection("Popular Movies", popular.results) +
            createSection("Top Rated Movies", topRated.results) +
            createSection("Upcoming Movies", upcoming.results) +
            createSection("Popular TV Shows", tv.results, "tv");

    } catch (error) {
        app.innerHTML = `
            <p class="loading">
                Could not load movies. Check your API key and internet connection.
            </p>
        `;
        console.error(error);
    }
}

// Movies page
async function loadMovies() {
    currentPage = "movies";
    hero.style.backgroundImage = "none";
    hero.innerHTML = `
        <h2>Explore Movies</h2>
        <p>Discover thousands of movies from around the world.</p>
    `;

    app.innerHTML = `<p class="loading">Loading movies...</p>`;

    try {
        const [popular, action, comedy, horror, romance, topRated] =
            await Promise.all([
                fetchMovies("/movie/popular"),
                fetchMovies("/discover/movie?with_genres=28"),
                fetchMovies("/discover/movie?with_genres=35"),
                fetchMovies("/discover/movie?with_genres=27"),
                fetchMovies("/discover/movie?with_genres=10749"),
                fetchMovies("/movie/top_rated")
            ]);

        app.innerHTML =
            createSection("Popular Movies", popular.results) +
            createSection("Action Movies", action.results) +
            createSection("Comedy Movies", comedy.results) +
            createSection("Horror Movies", horror.results) +
            createSection("Romantic Movies", romance.results) +
            createSection("Top Rated", topRated.results);

    } catch (error) {
        showError();
    }
}

// TV Shows page
async function loadTV() {
    currentPage = "tv";
    hero.style.backgroundImage = "none";
    hero.innerHTML = `
        <h2>TV Shows</h2>
        <p>Explore popular series and television entertainment.</p>
    `;

    app.innerHTML = `<p class="loading">Loading TV shows...</p>`;

    try {
        const [popular, topRated, airing] = await Promise.all([
            fetchMovies("/tv/popular"),
            fetchMovies("/tv/top_rated"),
            fetchMovies("/tv/on_the_air")
        ]);

        app.innerHTML =
            createSection("Popular TV Shows", popular.results, "tv") +
            createSection("Top Rated Series", topRated.results, "tv") +
            createSection("Currently Airing", airing.results, "tv");

    } catch (error) {
        showError();
    }
}

// My List page
function loadMyList() {
    currentPage = "mylist";
    hero.style.backgroundImage = "none";
    hero.innerHTML = `
        <h2>My List ❤️</h2>
        <p>Your personal movie collection.</p>
    `;

    if (myList.length === 0) {
        app.innerHTML = `<p class="loading">Your list is empty. Add some movies!</p>`;
        return;
    }

    app.innerHTML = createSection("Your Saved Movies", myList);
}

// Search movies and TV shows
async function searchMovies(query) {
    currentPage = "search";
    hero.style.backgroundImage = "none";
    hero.innerHTML = `
        <h2>Search Results</h2>
        <p>Searching for: ${query.replace(/[&<>"']/g, "")}</p>
    `;

    app.innerHTML = `<p class="loading">Searching...</p>`;

    try {
        const data = await fetchMovies(
            `/search/multi?query=${encodeURIComponent(query)}`
        );

        const results = data.results.filter(item =>
            item.media_type === "movie" || item.media_type === "tv"
        );

        app.innerHTML = createSection("Search Results", results, "mixed");

        if (!results.length) {
            app.innerHTML = `<p class="loading">No results found.</p>`;
        }

    } catch (error) {
        showError();
    }
}

// Movie or TV show details
async function openDetails(id, type = "movie") {
    try {
        const actualType = type === "tv" ? "tv" : "movie";

        const [details, videos] = await Promise.all([
            fetchMovies(`/${actualType}/${id}`),
            fetchMovies(`/${actualType}/${id}/videos`)
        ]);

        const trailer = videos.results.find(video =>
            video.site === "YouTube" &&
            video.type === "Trailer" &&
            video.official
        ) || videos.results.find(video =>
            video.site === "YouTube" && video.type === "Trailer"
        );

        const title = details.title || details.name;
        const saved = myList.some(item => item.id === details.id);

        modal.innerHTML = `
            <div class="modal-content">
                <button class="close-modal" onclick="closeModal()">✕ Close</button>

                <h2>${title}</h2>

                ${details.backdrop_path ?
                    `<img style="width:100%;max-width:100%;"
                    src="${BACKDROP_URL}${details.backdrop_path}">` : ""}

                <p>⭐ Rating: ${details.vote_average?.toFixed(1) || "N/A"} / 10</p>
                <p>Release: ${details.release_date || details.first_air_date || "Unknown"}</p>
                <p>${details.overview || "No description available."}</p>

                <button onclick="toggleMyList(${details.id}, '${actualType}')">
                    ${saved ? "✓ Remove from My List" : "+ Add to My List"}
                </button>

                ${trailer ? `
                    <button onclick="window.open('https://www.youtube.com/watch?v=${trailer.key}', '_blank')">
                        ▶ Watch Trailer
                    </button>
                ` : ""}
            </div>
        `;

        modal.style.display = "flex";

    } catch (error) {
        alert("Could not load details. Please try again.");
        console.error(error);
    }
}

// Close details popup
function closeModal() {
    modal.style.display = "none";
}

// Add or remove movies from My List
async function toggleMyList(id, type) {
    const index = myList.findIndex(item => item.id === id);

    if (index !== -1) {
        myList.splice(index, 1);
    } else {
        try {
            const movie = await fetchMovies(`/${type}/${id}`);
            movie.media_type = type;
            myList.push(movie);
        } catch (error) {
            alert("Unable to save this title.");
            return;
        }
    }

    localStorage.setItem("streamflixList", JSON.stringify(myList));

    if (currentPage === "mylist") {
        loadMyList();
    }

    openDetails(id, type);
}

// Navigation
document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        const page = link.textContent.trim().toLowerCase();

        searchInput.value = "";

        if (page === "home") loadHome();
        if (page === "movies") loadMovies();
        if (page === "tv shows") loadTV();
        if (page === "my list") loadMyList();
    });
});

// Search input
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);

    const query = searchInput.value.trim();

    if (!query) {
        loadHome();
        return;
    }

    searchTimer = setTimeout(() => searchMovies(query), 500);
});

// Movie poster click
app.addEventListener("click", event => {
    const card = event.target.closest(".movie-card");

    if (card) {
        openDetails(Number(card.dataset.id), card.dataset.type);
    }
});

// Close modal when clicking outside
modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
});

function showError() {
    app.innerHTML = `
        <p class="loading">
            Something went wrong. Please check your API key and internet connection.
        </p>
    `;
}

// Start website
loadHome();

// =====================================
// SUPABASE AUTHENTICATION
// =====================================

// Open Login or Signup window
function showAuth(type) {
    const authModal = document.getElementById("authModal");
    const authTitle = document.getElementById("authTitle");
    const authSubmit = document.getElementById("authSubmit");
    const authSwitch = document.getElementById("authSwitch");
    const authMessage = document.getElementById("authMessage");

    authModal.style.display = "flex";
    authMessage.textContent = "";

    if (type === "signup") {
        authTitle.textContent = "Create Account";
        authSubmit.textContent = "Sign Up";
        authSwitch.innerHTML =
            'Already have an account? <a href="#" onclick="showAuth(\'login\'); return false;">Sign In</a>';
    } else {
        authTitle.textContent = "Welcome Back";
        authSubmit.textContent = "Sign In";
        authSwitch.innerHTML =
            'Don\'t have an account? <a href="#" onclick="showAuth(\'signup\'); return false;">Sign Up</a>';
    }

    document.getElementById("authForm").dataset.mode = type;
}

// Close authentication window
function closeAuth() {
    document.getElementById("authModal").style.display = "none";
}

// Handle Login and Signup
document.getElementById("authForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const mode = this.dataset.mode;
    const message = document.getElementById("authMessage");
    const submitButton = document.getElementById("authSubmit");

    submitButton.disabled = true;
    message.textContent = "Please wait...";

    try {
        let result;

        if (mode === "signup") {
            result = await supabaseClient.auth.signUp({
                email: email,
                password: password
            });
        } else {
            result = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
        }

        if (result.error) {
            throw result.error;
        }

        if (mode === "signup" && !result.data.session) {
            message.textContent = "Account created! Check your email to confirm your account, then sign in.";
        } else {
            message.textContent = "Successfully logged in!";
            document.getElementById("authForm").reset();
            closeAuth();
        }

    } catch (error) {
        message.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

// Update the website when login status changes
async function updateAuthUI(session) {
    const buttons = document.getElementById("authButtons");

    if (!buttons) return;

    if (session) {
        const email = session.user.email;

        buttons.innerHTML = `
            <span style="color:white;font-size:13px;">
                ${email}
            </span>
            <button onclick="logoutUser()">Logout</button>
        `;
    } else {
        buttons.innerHTML = `
            <button onclick="showAuth('login')">Sign In</button>
            <button onclick="showAuth('signup')">Sign Up</button>
        `;
    }
}

// Logout
async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert(error.message);
    }
}

// Check existing login session
supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
});

// Check login when website opens
supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.error(error);
        return;
    }

    updateAuthUI(data.session);
});

// Close login window when clicking outside
document.getElementById("authModal").addEventListener("click", function(event) {
    if (event.target === this) {
        closeAuth();
    }
});


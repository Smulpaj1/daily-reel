    import { initializeApp } from "firebase/app";
    import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";

    // --- INSTRUCTIONS ---
    // 1. You MUST replace "PASTE_YOUR_TMDB_API_KEY_HERE" with your actual API Key
    // 2. Ensure you have installed firebase: npm install firebase
    // 3. Run this script: node scripts/seedFromTMDB.mjs

    // --- API KEYS ---
    const TMDB_API_KEY = "63350f178ce50f6527a164a0a0ae8ba8"; // <--- PASTE TMDB KEY HERE

    // Firebase Config (Pre-filled with your provided details)
    const firebaseConfig = {
        apiKey: "AIzaSyAX2G32MkT-S3ugT2MTCyXBdwxIazM6_0A",
        authDomain: "daily-reel-7439a.firebaseapp.com",
        projectId: "daily-reel-7439a",
        storageBucket: "daily-reel-7439a.firebasestorage.app",
        messagingSenderId: "342026612733",
        appId: "1:342026612733:web:c7fce866266cda8d3bb394"
    };

    // --- START DATE ---
    // The date for the first movie
    const START_DATE = new Date('2026-01-01');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Helper to format date as YYYY-MM-DD
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    // Helper to shuffle an array (Fisher-Yates shuffle)
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const fetchAndUploadMovies = async () => {
        console.log("🎬 Fetching movie mix (English Only + Verified Popularity)...");

        if (TMDB_API_KEY === "PASTE_YOUR_TMDB_API_KEY_HERE") {
            console.error("❌ ERROR: You must paste your TMDB API Key in the script file first!");
            process.exit(1);
        }

        try {
            let rawMoviesMap = new Map();

            // 1. Fetch "Most Voted" (Classics/Blockbusters) - 3 Pages
            // sort_by=vote_count.desc ensures we get the most famous movies of all time
            // with_original_language=en ensures English movies only
            console.log("   ...Fetching All-Time Famous (English)...");
            for (let page = 1; page <= 3; page++) {
                const response = await fetch(
                    `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=vote_count.desc&with_original_language=en&page=${page}`
                );
                const data = await response.json();
                if (data.results) {
                    data.results.forEach(movie => rawMoviesMap.set(movie.id, movie));
                }
            }

            // 2. Fetch "Popular Now" (Trending) - 2 Pages
            // Using /discover instead of /popular to apply filters
            // sort_by=popularity.desc gets current hits
            // with_original_language=en ensures English movies only
            // vote_count.gte=200 ensures the movie has at least 200 ratings (filters out obscure/fake hits)
            console.log("   ...Fetching Trending Now (English + >200 votes)...");
            for (let page = 1; page <= 2; page++) {
                const response = await fetch(
                    `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&with_original_language=en&vote_count.gte=200&page=${page}`
                );
                const data = await response.json();
                if (data.results) {
                    data.results.forEach(movie => rawMoviesMap.set(movie.id, movie));
                }
            }

            // Convert Map to Array to remove duplicates automatically
            let distinctMovies = Array.from(rawMoviesMap.values());
            console.log(`✅ Found ${distinctMovies.length} unique movies.`);

            // 3. SHUFFLE THE LIST
            // This ensures the order is not predictable (e.g., #1 movie isn't always Day 1)
            distinctMovies = shuffleArray(distinctMovies);
            console.log("🔀 List shuffled for randomness.");

            // 4. Process a subset (e.g., first 50 after shuffle)
            const processedMovies = [];
            const moviesToProcess = distinctMovies.slice(0, 50);

            console.log(`⚙️ Processing details for ${moviesToProcess.length} movies...`);

            for (const movie of moviesToProcess) {
                // Fetch credits
                const creditsRes = await fetch(
                    `https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`
                );
                const creditsData = await creditsRes.json();

                // Fetch details
                const detailsRes = await fetch(
                    `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}`
                );
                const detailsData = await detailsRes.json();

                const director = creditsData.crew?.find(p => p.job === "Director")?.name || "Unknown";

                // Filter Cast
                const cast = creditsData.cast
                    ?.filter(actor => actor.profile_path)
                    .slice(0, 4)
                    .map(actor => ({
                        name: actor.name,
                        image: `https://image.tmdb.org/t/p/w200${actor.profile_path}`
                    })) || [];

                if (cast.length < 4) continue;

                const genres = detailsData.genres?.map(g => g.name).slice(0, 3) || [];

                processedMovies.push({
                    title: movie.title,
                    poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                    director: director,
                    releaseYear: movie.release_date ? movie.release_date.split('-')[0] : "N/A",
                    boxOffice: detailsData.revenue > 0
                        ? `$${detailsData.revenue.toLocaleString()}`
                        : "N/A",
                    productionCompany: detailsData.production_companies?.[0]?.name || "N/A",
                    genres: genres,
                    cast: cast
                });

                // Tiny delay to respect API limits
                await new Promise(r => setTimeout(r, 50));
            }

            console.log(`✨ ${processedMovies.length} valid movies ready to upload.`);

            // 5. Upload to Firebase
            const batch = writeBatch(db);
            let currentDate = new Date(START_DATE);

            processedMovies.forEach((movie) => {
                const docId = formatDate(currentDate);
                const docRef = doc(db, "movies", docId);

                batch.set(docRef, { ...movie, id: docId });

                console.log(`Queued: ${docId} - ${movie.title}`);

                currentDate.setDate(currentDate.getDate() + 1);
            });

            await batch.commit();
            console.log("🚀 SUCCESS! Database populated with a shuffled mix of movies.");
            process.exit(0);

        } catch (error) {
            console.error("❌ An error occurred:", error);
            process.exit(1);
        }
    };

    fetchAndUploadMovies();
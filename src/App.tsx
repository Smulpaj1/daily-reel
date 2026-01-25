import React, { useState, useEffect, useRef } from 'react';
import {
    Clapperboard,
    Play,
    ArrowLeft,
    Search,
    User,
    Film,
    Tag,
    Check,
    X,
    Loader2 // Imported Loader for loading state
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from "firebase/firestore";

// --- Types ---

interface Actor {
    name: string;
    image: string;
}

interface Movie {
    id: string; // YYYY-MM-DD
    title: string;
    poster: string;
    cast: Actor[];
    director: string;
    releaseYear: string;
    boxOffice: string;
    productionCompany: string;
    genres: string[];
}

interface SavedGameState {
    status: 'won' | 'lost' | 'playing';
    guesses: string[];
}

// --- Firebase Configuration ---
// TODO: Replace with your actual config from Firebase Console -> Project Settings
const firebaseConfig = {

    apiKey: "AIzaSyAX2G32MkT-S3ugT2MTCyXBdwxIazM6_0A",

    authDomain: "daily-reel-7439a.firebaseapp.com",

    projectId: "daily-reel-7439a",

    storageBucket: "daily-reel-7439a.firebasestorage.app",

    messagingSenderId: "342026612733",

    appId: "1:342026612733:web:c7fce866266cda8d3bb394",

    measurementId: "G-8MCHGD2HRP"

};


// Initialize Firebase
// We use a try-catch block to prevent crashes if config is missing during development
let db: any;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.warn("Firebase not initialized. Using fallback data. Check firebaseConfig.");
}

// --- Mock Data (Database for Autocomplete) ---
const MOVIE_DATABASE_TITLES = [
    "Inception", "The Godfather", "Barbie", "Interstellar", "Pulp Fiction",
    "The Dark Knight", "Fight Club", "Forrest Gump", "The Matrix", "Goodfellas",
    "Star Wars", "Parasite", "Avengers: Endgame", "Spider-Man: No Way Home", "Titanic",
    "The Shawshank Redemption", "Gladiator", "Joker", "The Wolf of Wall Street", "Dune",
    "Oppenheimer", "Spirited Away", "The Silence of the Lambs", "Se7en", "Back to the Future",
    "Jurassic Park", "The Lion King", "Avatar", "Top Gun: Maverick", "Black Panther"
];

// --- Fallback Data (Used if Database is empty or fails) ---
const FALLBACK_MOVIES: Movie[] = [
    {
        id: '2026-01-25',
        title: 'Oppenheimer',
        poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        director: 'Christopher Nolan',
        releaseYear: '2023',
        boxOffice: '$952,000,000',
        productionCompany: 'Universal Pictures',
        genres: ['Drama', 'History'],
        cast: [
            { name: 'Cillian Murphy', image: 'https://image.tmdb.org/t/p/w200/3W1W9XJ3n9X0n5n5.jpg' },
            { name: 'Emily Blunt', image: 'https://image.tmdb.org/t/p/w200/n5.jpg' },
            { name: 'Matt Damon', image: 'https://image.tmdb.org/t/p/w200/el.jpg' },
            { name: 'Robert Downey Jr.', image: 'https://image.tmdb.org/t/p/w200/im.jpg' },
        ]
    },
    // ... (You can keep the rest of the 25 movies here as backup if you want)
    {
        id: '2026-01-24',
        title: 'Dune',
        poster: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
        director: 'Denis Villeneuve',
        releaseYear: '2021',
        boxOffice: '$402,027,830',
        productionCompany: 'Legendary Pictures',
        genres: ['Science Fiction', 'Adventure'],
        cast: [
            { name: 'Timothée Chalamet', image: 'https://image.tmdb.org/t/p/w200/tc.jpg' },
            { name: 'Rebecca Ferguson', image: 'https://image.tmdb.org/t/p/w200/rf.jpg' },
            { name: 'Oscar Isaac', image: 'https://image.tmdb.org/t/p/w200/oi.jpg' },
            { name: 'Josh Brolin', image: 'https://image.tmdb.org/t/p/w200/jb.jpg' },
        ]
    },
    {
        id: '2026-01-09',
        title: 'Inception',
        poster: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKqWDUXfF89WnUSKTb.jpg',
        director: 'Christopher Nolan',
        releaseYear: '2010',
        boxOffice: '$836,836,967',
        productionCompany: 'Warner Bros. Pictures',
        genres: ['Action', 'Science Fiction', 'Adventure'],
        cast: [
            { name: 'Leonardo DiCaprio', image: 'https://image.tmdb.org/t/p/w200/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg' },
            { name: 'Joseph Gordon-Levitt', image: 'https://image.tmdb.org/t/p/w200/4X1X1tV8k3E2H7e6r0O9w1W4.jpg' },
            { name: 'Elliot Page', image: 'https://image.tmdb.org/t/p/w200/tp5PF4kE7yq7q5q5.jpg' },
            { name: 'Tom Hardy', image: 'https://image.tmdb.org/t/p/w200/d81K0RH8UX7tZj49tZaQhZ9ewH.jpg' },
        ]
    }
];

// --- Components ---

const AdSidebar = () => {
    return (
        <div className="hidden lg:flex flex-col w-64 bg-gray-900 border-x border-gray-800 p-6 items-center justify-center sticky top-0 h-screen">
            <div className="w-full h-96 bg-gray-800 rounded flex flex-col items-center justify-center border border-gray-700">
                <span className="text-gray-500 font-bold text-xl">Web Ad Space</span>
                <span className="text-gray-600 text-sm mt-2">Targeted Movie Ads</span>
            </div>
        </div>
    );
};

const InterstitialAd = ({ onAdFinished }: { onAdFinished: () => void }) => {
    const [secondsLeft, setSecondsLeft] = useState(3);

    useEffect(() => {
        if (secondsLeft > 0) {
            const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(onAdFinished, 500);
            return () => clearTimeout(timer);
        }
    }, [secondsLeft, onAdFinished]);

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">
            <div className="w-full max-w-md bg-gray-900 h-full md:h-auto md:rounded-xl p-8 flex flex-col justify-between items-center border border-gray-800">
                <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">Sponsored Video</span>

                <div className="w-full aspect-video bg-gray-800 rounded-lg flex flex-col items-center justify-center my-8 border border-gray-700">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                    <span className="text-white font-medium">Playing Video Ad...</span>
                </div>

                <button
                    className="bg-gray-800 text-white px-6 py-2 rounded-full font-mono text-sm border border-gray-700"
                    disabled
                >
                    {secondsLeft > 0 ? `Reward in ${secondsLeft}s` : 'Closing...'}
                </button>
            </div>
        </div>
    );
};

// Autocomplete Input Component
const AutoCompleteInput = ({
                               onGuess,
                               remainingGuesses,
                               onEnter
                           }: {
    onGuess: (val: string) => void,
    remainingGuesses: number,
    onEnter: () => void
}) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleChange = (text: string) => {
        setQuery(text);
        onGuess(text);
        if (text.length > 1) {
            const filtered = MOVIE_DATABASE_TITLES.filter(title =>
                title.toLowerCase().includes(text.toLowerCase())
            );
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelect = (title: string) => {
        setQuery(title);
        onGuess(title);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    return (
        <div className="w-full" ref={wrapperRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    className="w-full bg-gray-800 text-white p-4 pl-12 rounded-lg border border-gray-700 focus:border-red-600 focus:outline-none placeholder-gray-500"
                    placeholder="Search for a movie..."
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onEnter();
                            setShowSuggestions(false);
                            setQuery('');
                        }
                    }}
                />
                <Search className="absolute left-4 top-4 text-gray-500 w-5 h-5" />

                {/* Suggestions appearing upwards because this component is at the bottom */}
                {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute bottom-full left-0 z-20 w-full bg-gray-800 border border-gray-700 rounded-t-lg mb-1 max-h-48 overflow-y-auto shadow-xl">
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={index}
                                onClick={() => handleSelect(suggestion)}
                                className="p-3 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-700 last:border-0"
                            >
                                {suggestion}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <button
                onClick={() => {
                    onEnter();
                    setQuery('');
                    setShowSuggestions(false);
                }}
                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg transition-colors shadow-lg shadow-red-900/20"
            >
                GUESS ({remainingGuesses} left)
            </button>
        </div>
    );
};

const GameScreen = ({
                        movie,
                        goBack,
                        onNext,
                        initialState,
                        onSaveProgress
                    }: {
    movie: Movie;
    goBack: () => void;
    onNext: () => void;
    initialState?: SavedGameState;
    onSaveProgress: (status: 'won' | 'lost' | 'playing', guesses: string[]) => void;
}) => {
    const [guess, setGuess] = useState('');
    const [guesses, setGuesses] = useState<string[]>(initialState?.guesses || []);
    const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>(initialState?.status || 'playing');
    const [showAd, setShowAd] = useState(false);

    // RESET LOGIC when movie changes
    useEffect(() => {
        if (initialState) {
            setGuesses(initialState.guesses);
            setGameState(initialState.status);
        } else {
            setGuesses([]);
            setGameState('playing');
        }
        setShowAd(false);
    }, [movie.id, initialState]);

    const maxGuesses = 5;
    const incorrectGuesses = guesses.length;

    const handleGuess = () => {
        if (!guess.trim()) return;

        const isCorrect = guess.toLowerCase() === movie.title.toLowerCase();
        const newGuesses = [...guesses, guess];
        setGuesses(newGuesses);
        setGuess('');

        let newStatus: 'won' | 'lost' | 'playing' = 'playing';

        if (isCorrect) {
            newStatus = 'won';
            setGameState('won');
        } else if (newGuesses.length >= maxGuesses) {
            newStatus = 'lost';
            setGameState('lost');
        }

        onSaveProgress(newStatus, newGuesses);
    };

    const handleNextMovie = () => {
        setShowAd(true);
    };

    const handleAdFinished = () => {
        setShowAd(false);
        onNext();
    };

    // Clue Order: Box Office -> Year -> Genres -> Director
    const showBoxOffice = incorrectGuesses >= 1 || gameState !== 'playing';
    const showReleaseYear = incorrectGuesses >= 2 || gameState !== 'playing';
    const showGenres = incorrectGuesses >= 3 || gameState !== 'playing';
    const showDirector = incorrectGuesses >= 4 || gameState !== 'playing';

    return (
        <div className="flex flex-col h-full bg-black min-h-screen">
            {showAd && <InterstitialAd onAdFinished={handleAdFinished} />}

            {/* Header - Fixed Top */}
            <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-black z-10 shrink-0">
                <button onClick={goBack} className="flex items-center text-white hover:text-gray-300 transition-colors">
                    <ArrowLeft className="w-6 h-6 mr-2" />
                    <span className="hidden sm:inline font-medium">Archive</span>
                </button>
                <h1 className="text-white font-bold text-lg tracking-wide">Daily Reel</h1>
                <div className="w-16" />
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-4">

                {/* Game Area */}
                {gameState === 'won' ? (
                    <div className="flex flex-col items-center mb-8 animate-fade-in">
                        <div className="relative w-48 h-72 mb-6 shadow-2xl shadow-green-900/50">
                            <img
                                src={movie.poster}
                                alt={movie.title}
                                className="w-full h-full object-cover rounded-lg border-2 border-green-500"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x300?text=No+Poster';
                                }}
                            />
                            <div className="absolute -bottom-4 -right-4 bg-green-500 rounded-full p-2 border-4 border-black">
                                <Clapperboard className="text-black w-6 h-6" />
                            </div>
                        </div>
                        <h2 className="text-green-500 text-3xl font-bold text-center mb-2">Correct!</h2>
                        <p className="text-white text-xl mb-4">It was <span className="font-bold border-b-2 border-green-500">{movie.title}</span></p>

                        <div className="bg-gray-900 px-6 py-3 rounded-full border border-gray-800">
                            <span className="text-gray-400">Solved in </span>
                            <span className="text-white font-bold text-lg">{guesses.length}</span>
                            <span className="text-gray-400"> guesses</span>
                        </div>
                    </div>
                ) : gameState === 'lost' ? (
                    <div className="flex flex-col items-center mb-8 animate-fade-in">
                        <div className="relative w-48 h-72 mb-6 shadow-2xl shadow-red-900/50">
                            <img
                                src={movie.poster}
                                alt={movie.title}
                                className="w-full h-full object-cover rounded-lg border-2 border-red-600 grayscale"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x300?text=No+Poster';
                                }}
                            />
                        </div>
                        <h2 className="text-red-500 text-3xl font-bold text-center mb-2">Game Over!</h2>
                        <p className="text-white text-xl">It was <span className="font-bold border-b-2 border-red-600">{movie.title}</span></p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {movie.cast.map((actor, index) => (
                            <div key={index} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 flex flex-col items-center pb-3 shadow-lg">
                                <div className="w-full h-64 bg-gray-800 mb-2 overflow-hidden relative group">
                                    <img
                                        src={actor.image}
                                        alt={actor.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (target.src.includes('ui-avatars.com')) return;
                                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&background=333&color=fff&size=200&font-size=0.4`;
                                        }}
                                    />
                                </div>
                                <span className="text-white text-sm font-medium text-center px-2 leading-tight">{actor.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Clues Section */}
                <div className="bg-gray-900/50 rounded-xl p-5 mb-4 border border-gray-800 backdrop-blur-sm">
                    <div className="flex items-center mb-4">
                        <Film className="w-4 h-4 text-red-500 mr-2" />
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Movie Details</h3>
                    </div>

                    <div className="space-y-3">
                        {/* Clue 1 */}
                        <div className={`flex justify-between items-center py-2 border-b ${showBoxOffice ? 'border-red-900/30' : 'border-gray-800'}`}>
                            <span className="text-gray-400 text-sm">Box Office / Production</span>
                            <span className={`font-medium text-right text-sm ${showBoxOffice ? 'text-white' : 'text-gray-600'}`}>
                {showBoxOffice ? (
                    <div className="flex flex-col items-end">
                        <span>{movie.boxOffice}</span>
                        <span className="text-xs text-gray-400">{movie.productionCompany}</span>
                    </div>
                ) : 'Locked 🔒'}
              </span>
                        </div>

                        {/* Clue 2 */}
                        <div className={`flex justify-between items-center py-2 border-b ${showReleaseYear ? 'border-red-900/30' : 'border-gray-800'}`}>
                            <span className="text-gray-400 text-sm">Release Year</span>
                            <span className={`font-medium text-sm ${showReleaseYear ? 'text-white' : 'text-gray-600'}`}>
                {showReleaseYear ? movie.releaseYear : 'Locked 🔒'}
              </span>
                        </div>

                        {/* Clue 3 (Genres) */}
                        <div className={`flex justify-between items-center py-2 border-b ${showGenres ? 'border-red-900/30' : 'border-gray-800'}`}>
                            <span className="text-gray-400 text-sm">Genres</span>
                            <span className={`font-medium text-sm ${showGenres ? 'text-white' : 'text-gray-600'}`}>
                {showGenres ? (
                    <div className="flex gap-1 flex-wrap justify-end">
                        {movie.genres.map((g, i) => (
                            <span key={i} className="bg-red-900/40 text-red-200 px-2 py-0.5 rounded text-xs border border-red-900/50">
                                {g}
                            </span>
                        ))}
                    </div>
                ) : 'Locked 🔒'}
              </span>
                        </div>

                        {/* Clue 4 (Director) */}
                        <div className={`flex justify-between items-center py-2 ${showDirector ? 'border-b border-red-900/30' : ''}`}>
                            <span className="text-gray-400 text-sm">Director</span>
                            <span className={`font-medium text-sm ${showDirector ? 'text-white' : 'text-gray-600'}`}>
                {showDirector ? movie.director : 'Locked 🔒'}
              </span>
                        </div>
                    </div>
                </div>

                {/* Guesses History */}
                {guesses.length > 0 && gameState === 'playing' && (
                    <div className="mb-4">
                        <p className="text-gray-500 text-xs uppercase font-bold mb-2 text-center">Previous Guesses</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {guesses.map((g, i) => (
                                <span key={i} className="px-3 py-1 bg-gray-800 rounded text-gray-400 text-sm line-through decoration-red-500 decoration-2">
                       {g}
                    </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* FIXED FOOTER for Input/Button */}
            <div className="border-t border-gray-800 bg-black p-4 shrink-0 pb-6 z-20">
                {gameState === 'playing' ? (
                    <AutoCompleteInput
                        onGuess={setGuess}
                        remainingGuesses={maxGuesses - incorrectGuesses}
                        onEnter={handleGuess}
                    />
                ) : (
                    <button
                        onClick={handleNextMovie}
                        className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02]"
                    >
                        <span className="text-lg">Play Next Movie</span>
                        <Play className="w-5 h-5 fill-current" />
                    </button>
                )}
            </div>

        </div>
    );
};

// --- Main App Component ---

export default function App() {
    const [currentScreen, setCurrentScreen] = useState<'archive' | 'game'>('loading');
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [progress, setProgress] = useState<Record<string, SavedGameState>>({});

    // State for fetched movies
    const [moviesList, setMoviesList] = useState<Movie[]>([]);
    const [loadingMovies, setLoadingMovies] = useState(true);

    // Fetch movies from Firebase on init
    useEffect(() => {
        const fetchMovies = async () => {
            // If DB not initialized, fallback immediately
            if (!db) {
                setMoviesList(FALLBACK_MOVIES);
                setLoadingMovies(false);
                return;
            }

            try {
                const today = new Date().toISOString().split('T')[0];
                // Fetch movies with date <= today, ordered by newest first
                const q = query(
                    collection(db, "movies"),
                    where("id", "<=", today),
                    orderBy("id", "desc"),
                    limit(50)
                );

                const querySnapshot = await getDocs(q);
                const fetchedMovies: Movie[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedMovies.push(doc.data() as Movie);
                });

                if (fetchedMovies.length > 0) {
                    setMoviesList(fetchedMovies);
                } else {
                    // If no movies found (empty DB), use fallback
                    setMoviesList(FALLBACK_MOVIES);
                }
            } catch (error) {
                console.error("Error fetching movies:", error);
                setMoviesList(FALLBACK_MOVIES);
            } finally {
                setLoadingMovies(false);
            }
        };

        fetchMovies();
    }, []);

    // Check progress logic once movies are loaded
    useEffect(() => {
        if (loadingMovies) return;

        const saved = localStorage.getItem('dailyreel-progress');
        let loadedProgress = {};
        if (saved) {
            try {
                loadedProgress = JSON.parse(saved);
                setProgress(loadedProgress);
            } catch (e) {
                console.error("Failed to parse progress", e);
            }
        }

        if (moviesList.length > 0) {
            const todayMovie = moviesList[0];
            const todayStatus = (loadedProgress as any)[todayMovie.id];

            if (!todayStatus || todayStatus.status === 'playing') {
                setSelectedMovie(todayMovie);
                setCurrentScreen('game');
            } else {
                setCurrentScreen('archive');
            }
        } else {
            // Should not happen due to fallback, but safe guard
            setCurrentScreen('archive');
        }
    }, [loadingMovies, moviesList]);

    const saveProgress = (movieId: string, status: 'won' | 'lost' | 'playing', guesses: string[]) => {
        const newProgress = {
            ...progress,
            [movieId]: { status, guesses }
        };
        setProgress(newProgress);
        localStorage.setItem('dailyreel-progress', JSON.stringify(newProgress));
    };

    const startMovie = (movie: Movie) => {
        setSelectedMovie(movie);
        setCurrentScreen('game');
    };

    const handleNext = () => {
        if (!selectedMovie) return;
        const otherMovies = moviesList.filter(m => m.id !== selectedMovie.id);
        const unplayed = otherMovies.find(m => !progress[m.id] || progress[m.id].status === 'playing');

        if (unplayed) {
            setSelectedMovie(unplayed);
        } else {
            const random = otherMovies[Math.floor(Math.random() * otherMovies.length)];
            setSelectedMovie(random);
        }
    };

    if (loadingMovies || currentScreen === 'loading') {
        return (
            <div className="h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-black text-white font-sans flex justify-center selection:bg-red-500 selection:text-white overflow-hidden">
            <div className="flex w-full max-w-[1200px] h-full">

                {/* Left Ad (Web) */}
                <AdSidebar />

                {/* Center Content */}
                <div className="flex-1 max-w-xl mx-auto border-x border-gray-800 h-full bg-black relative shadow-2xl shadow-black flex flex-col">
                    {currentScreen === 'archive' ? (
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex items-center justify-center mb-2">
                                <div className="bg-red-600 p-2 rounded mr-3">
                                    <Clapperboard className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-3xl font-extrabold tracking-tight">Daily Reel</h1>
                            </div>
                            <p className="text-gray-500 text-center mb-8 text-sm">Test your film knowledge against the top cast.</p>

                            <div className="space-y-3">
                                {moviesList.map((movie, index) => {
                                    const status = progress[movie.id]?.status;
                                    const puzzleNumber = moviesList.length - index; // Numbering based on list size
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => startMovie(movie)}
                                            className={`w-full flex items-center bg-gray-900 hover:bg-gray-800 p-4 rounded-xl border transition-all group text-left
                            ${status === 'won' ? 'border-green-900/50' : status === 'lost' ? 'border-red-900/50' : 'border-gray-800'}
                        `}
                                        >
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 font-bold transition-colors shrink-0
                             ${status === 'won' ? 'bg-green-900/20 text-green-500' :
                                                status === 'lost' ? 'bg-red-900/20 text-red-500' :
                                                    'bg-gray-800 text-gray-500 group-hover:bg-red-600 group-hover:text-white'}
                        `}>
                                                {status === 'won' ? <Check className="w-6 h-6" /> :
                                                    status === 'lost' ? <X className="w-6 h-6" /> :
                                                        puzzleNumber}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className={`font-semibold text-lg transition-colors ${status ? 'text-gray-300' : 'text-white group-hover:text-red-500'}`}>
                                                    Daily Puzzle #{puzzleNumber}
                                                </h3>
                                                <p className="text-gray-500 text-xs font-mono mt-1">{movie.id}</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center border border-gray-700 group-hover:border-red-500">
                                                <Play className={`w-3 h-3 transition-colors fill-current ${status ? 'text-gray-600' : 'text-gray-400 group-hover:text-red-500'}`} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="h-24"></div>
                        </div>
                    ) : (
                        selectedMovie && (
                            <GameScreen
                                movie={selectedMovie}
                                initialState={progress[selectedMovie.id]}
                                goBack={() => setCurrentScreen('archive')}
                                onNext={handleNext}
                                onSaveProgress={(s, g) => saveProgress(selectedMovie.id, s, g)}
                            />
                        )
                    )}
                </div>

                {/* Right Ad (Web) */}
                <AdSidebar />

            </div>
        </div>
    );
}
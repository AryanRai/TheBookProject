// API Configuration Template for The Book Project
// 
// SETUP INSTRUCTIONS:
// 1. Copy this file and rename it to 'api-config.js'
// 2. Replace the placeholder API keys with your real keys
// 3. Set enabled: true for the APIs you want to use
// 4. Never commit api-config.js to version control!

const API_CONFIG = {
    // Google Books API - Free with 1,000 requests/day
    // Get your key: https://console.developers.google.com/
    googleBooks: {
        apiKey: 'YOUR_GOOGLE_BOOKS_API_KEY_HERE',
        baseUrl: 'https://www.googleapis.com/books/v1',
        enabled: false // Set to true when you have a valid API key
    },
    
    // Open Library API - Always free, no key required
    openLibrary: {
        baseUrl: 'https://openlibrary.org',
        enabled: true // Always available
    },
    
    // NY Times Books API - Free with 4,000 requests/day
    // Get your key: https://developer.nytimes.com/
    nyTimes: {
        apiKey: 'YOUR_NYTIMES_API_KEY_HERE',
        baseUrl: 'https://api.nytimes.com/svc/books/v3',
        enabled: false // Set to true when you have a valid API key
    },
    
    // Goodreads API Alternative (Optional)
    goodreads: {
        apiKey: 'YOUR_GOODREADS_API_KEY_HERE',
        baseUrl: 'https://www.goodreads.com/api',
        enabled: false // Currently not implemented
    },
    
    // Internet Archive API - Free, no key required
    internetArchive: {
        baseUrl: 'https://archive.org/advancedsearch.php',
        enabled: true
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
} else if (typeof module !== 'undefined') {
    module.exports = API_CONFIG;
} 
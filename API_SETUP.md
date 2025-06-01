# 📚 Book APIs Setup Guide

This guide explains how to set up multiple book APIs to get real dynamic book data, ratings, and statistics for The Book Project.

## 🔑 API Keys Required

### 1. Google Books API (Recommended)
- **Free tier**: 1,000 requests/day
- **Get API Key**: https://console.developers.google.com/
- **Steps**:
  1. Create a new project or select existing
  2. Enable "Books API"
  3. Go to "Credentials" → "Create Credentials" → "API Key"
  4. Copy the API key

### 2. New York Times Books API
- **Free tier**: 4,000 requests/day
- **Get API Key**: https://developer.nytimes.com/
- **Steps**:
  1. Create a developer account
  2. Create a new app
  3. Enable "Books API"
  4. Copy the API key

### 3. Open Library (Free - No Key Required)
- **Always enabled** - no setup needed
- **Provides**: Classic literature, public domain books
- **Rate limit**: Self-imposed 100 requests/day

## ⚙️ Configuration

1. **Copy the template**:
   ```bash
   cp api-config.js api-config-personal.js
   ```

2. **Edit `api-config-personal.js`** with your API keys:
   ```javascript
   const API_CONFIG = {
       googleBooks: {
           apiKey: 'YOUR_ACTUAL_GOOGLE_BOOKS_API_KEY',
           baseUrl: 'https://www.googleapis.com/books/v1',
           enabled: true // Change to true
       },
       
       nyTimes: {
           apiKey: 'YOUR_ACTUAL_NYTIMES_API_KEY',
           baseUrl: 'https://api.nytimes.com/svc/books/v3',
           enabled: true // Change to true
       },
       
       // Open Library is always enabled (free)
       openLibrary: {
           baseUrl: 'https://openlibrary.org',
           enabled: true
       }
   };
   ```

3. **Update HTML** to use your personal config:
   ```html
   <script src="api-config-personal.js"></script>
   ```

## 🚀 Features Enabled

With APIs configured, you get:

### 📖 **Real Popular Books**
- Google Books: Fiction, bestsellers, popular titles
- NY Times: Current bestseller lists
- Open Library: Classic literature, public domain

### 🔍 **Book Search**
- Search across multiple databases
- Real book covers and metadata
- Ratings and review counts

### 📊 **Rich Book Data**
- Real ratings and review counts
- Publication dates and page counts
- Multiple book categories
- Author information
- Book descriptions

### 🎯 **Smart Fallbacks**
- Works offline with curated books
- Graceful degradation when APIs fail
- Cached results for performance

## 🛡️ Security

### API Key Protection
- `api-config.js` is in `.gitignore`
- Never commit API keys to git
- Use personal config files locally

### Rate Limiting
- Built-in rate limiting per API
- Automatic throttling and caching
- Usage tracking and monitoring

## 📊 API Usage Monitoring

Check your API usage in the app:
1. Open menu → "Usage Dashboard"
2. View rate limits and usage stats
3. Monitor enabled/disabled APIs

## 🔧 Troubleshooting

### No Books Loading?
1. Check browser console for API errors
2. Verify API keys are correct
3. Check if APIs are enabled in config
4. Try refreshing the page

### Rate Limits Exceeded?
- App will automatically fallback to cached data
- Rate limits reset every 24 hours
- Consider upgrading API plans for higher limits

### CORS Errors?
- Google Books and NY Times APIs support CORS
- Open Library supports CORS
- If issues persist, check API documentation

## 🌟 Benefits

### With APIs Enabled:
- ✅ Real, up-to-date book data
- ✅ Current bestsellers and popular books
- ✅ Rich metadata and descriptions
- ✅ Real ratings and review counts
- ✅ Search functionality

### Without APIs (Fallback):
- ✅ Still works with curated book list
- ✅ Basic functionality maintained
- ✅ No external dependencies

## 🎯 Next Steps

1. Get at least Google Books API key (most important)
2. Optionally add NY Times for bestsellers
3. Test with real books in the homepage
4. Monitor usage in the dashboard

**The app works great even without API keys, but real data makes it amazing!** 🚀 
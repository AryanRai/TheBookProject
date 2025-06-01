# 📁 **Cloud Integration Setup Guide**

This guide will help you set up real cloud integration with rate limits and proper authentication for The Book Project.

## 🔧 **Supabase Setup (Database & Authentication)**

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" → "New Project"
3. Choose organization and create project
4. Wait for setup to complete

### Step 2: Get API Credentials
1. Go to Project Settings → API
2. Copy your **Project URL** and **anon public key**
3. Update `supabase-config.js`:
```javascript
this.SUPABASE_URL = 'https://your-project-ref.supabase.co';
this.SUPABASE_ANON_KEY = 'eyJhbGci...your-anon-key';
```

### Step 3: Set Up Database Tables
Run these SQL commands in Supabase SQL Editor:

```sql
-- User Statistics Table
CREATE TABLE user_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    books_read INTEGER DEFAULT 0,
    reading_time INTEGER DEFAULT 0,
    reading_streak INTEGER DEFAULT 0,
    avg_rating DECIMAL DEFAULT 0.0,
    storage_used BIGINT DEFAULT 0,
    plan VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Library Table
CREATE TABLE user_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255),
    cover_url TEXT,
    file_path TEXT,
    file_size BIGINT DEFAULT 0,
    added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'reading',
    current_page INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    progress DECIMAL DEFAULT 0.0
);

-- Annotations Table
CREATE TABLE annotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'highlight', 'note', 'bookmark'
    text TEXT NOT NULL,
    note TEXT,
    page_index INTEGER NOT NULL,
    chapter_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reading Progress Table
CREATE TABLE reading_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id VARCHAR(255) NOT NULL,
    page_index INTEGER NOT NULL,
    chapter_index INTEGER,
    reading_time INTEGER DEFAULT 0, -- in seconds
    last_read TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- Social Features (Reviews, Comments)
CREATE TABLE book_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Step 4: Set Up Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only access their own data)
CREATE POLICY "Users can access own stats" ON user_stats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own library" ON user_library
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own annotations" ON annotations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own progress" ON reading_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own reviews" ON book_reviews
    FOR ALL USING (auth.uid() = user_id);
```

### Step 5: Set Up Storage Bucket
1. Go to Storage in Supabase dashboard
2. Create new bucket called `books`
3. Set it to public if you want file sharing
4. Add policy for authenticated users:
```sql
-- Storage policy for books bucket
CREATE POLICY "Users can upload books" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can access own books" ON storage.objects
    FOR SELECT USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 🔗 **Google Drive Setup (File Storage)**

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Enable Google Drive API:
   - Go to APIs & Services → Library
   - Search "Google Drive API" → Enable

### Step 2: Create Credentials
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Configure OAuth consent screen first if prompted
4. Select "Web application"
5. Add your domain to authorized origins:
   - `http://localhost:3000` (for development)
   - `https://your-domain.com` (for production)
6. Add redirect URIs:
   - `http://localhost:3000`
   - `https://your-domain.com`

### Step 3: Get API Credentials
1. Copy **Client ID** and update `supabase-config.js`:
```javascript
this.CLIENT_ID = 'your-client-id.apps.googleusercontent.com';
```

2. Create API Key:
   - Go to Credentials → "Create Credentials" → "API Key"
   - Copy key and update:
```javascript
this.API_KEY = 'AIzaSy...your-api-key';
```

### Step 4: Add Google API Script
Add to your HTML `<head>`:
```html
<script src="https://apis.google.com/js/api.js"></script>
```

## ⚡ **Rate Limits & Usage**

### Current Limits (Free Tier)
- **Supabase**: 100 API calls/hour, 10 uploads/day, 500 annotations/day
- **Google Drive**: 100 queries/100 seconds, 10 uploads/hour, 50 downloads/hour
- **Storage**: 500MB total, 50MB per file, 50 books max

### Monitoring Usage
Check usage in browser console:
```javascript
// Supabase usage
const supabaseService = new SupabaseService();
console.log(supabaseService.getUsageDashboard());

// Google Drive usage
const driveService = new GoogleDriveService();
console.log(driveService.getUsageInfo());
```

### Error Handling
The system will:
- Show rate limit warnings
- Fall back to local storage when limits exceeded
- Display helpful error messages
- Auto-retry after rate limit windows reset

## 🔒 **Security Best Practices**

1. **Environment Variables**: Store keys in environment variables
2. **Domain Restrictions**: Restrict API keys to your domains
3. **HTTPS Only**: Use HTTPS in production
4. **User Permissions**: Enable RLS in Supabase
5. **Rate Limiting**: Monitor usage and implement client-side caching

## 🚀 **Production Deployment**

### Update for Production:
1. Replace localhost URLs with your domain
2. Use environment variables for API keys
3. Enable HTTPS
4. Set up proper CORS policies
5. Monitor usage and upgrade plans as needed

### Upgrade Plans:
- **Supabase Pro**: $25/month - More database storage and higher limits
- **Google Workspace**: $6-18/month - Higher API quotas
- **Custom Enterprise**: Contact for unlimited usage

## 🐛 **Troubleshooting**

### Common Issues:
1. **"API not initialized"**: Check if scripts are loaded and credentials are correct
2. **Rate limit errors**: Wait for reset window or implement caching
3. **CORS errors**: Check domain settings in API console
4. **RLS errors**: Verify database policies are set correctly

### Debug Mode:
Enable detailed logging:
```javascript
localStorage.setItem('debug', 'true');
```

## 📞 **Support**

- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Google Drive API**: [developers.google.com/drive](https://developers.google.com/drive)
- **The Book Project**: Create an issue on GitHub

---

**⚠️ Important**: Always test in development first and monitor your usage to avoid unexpected charges! 
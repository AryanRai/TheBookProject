-- The Book Project - Supabase Database Setup
-- Run this script in your Supabase SQL Editor

-- User Statistics Table
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    books_read INTEGER DEFAULT 0,
    reading_time INTEGER DEFAULT 0,
    reading_streak INTEGER DEFAULT 0,
    avg_rating DECIMAL DEFAULT 0.0,
    storage_used BIGINT DEFAULT 0,
    plan VARCHAR(20) DEFAULT 'free',
    favorite_genre VARCHAR(50) DEFAULT 'Fiction',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Library Table
CREATE TABLE IF NOT EXISTS user_library (
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
CREATE TABLE IF NOT EXISTS annotations (
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
CREATE TABLE IF NOT EXISTS reading_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id VARCHAR(255) NOT NULL,
    page_index INTEGER NOT NULL,
    chapter_index INTEGER,
    reading_time INTEGER DEFAULT 0, -- in seconds
    last_read TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- Bookmarks Table (separate from annotations for better organization)
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id VARCHAR(255) NOT NULL,
    page_index INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Features (Reviews, Comments)
CREATE TABLE IF NOT EXISTS book_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Users can access own bookmarks" ON bookmarks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own reviews" ON book_reviews
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_library_user_id ON user_library(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_user_id ON book_reviews(user_id);

-- Success message
SELECT 'Database setup completed successfully!' as message; 
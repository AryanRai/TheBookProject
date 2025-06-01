// Supabase Configuration for The Book Project
// This file contains the setup for cloud integration features

class SupabaseService {
    constructor() {
        // Supabase credentials - Replace with your actual Supabase project details
        this.SUPABASE_URL = 'https://your-project.supabase.co';
        this.SUPABASE_ANON_KEY = 'your-anon-key';
        
        // Initialize Supabase client when available
        this.supabase = null;
        this.user = null;
        this.isConnected = false;
        
        this.initializeSupabase();
    }

    async initializeSupabase() {
        try {
            // Check if Supabase is available
            if (typeof window !== 'undefined' && window.supabase) {
                this.supabase = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
                console.log('Supabase initialized successfully');
                return true;
            } else {
                console.warn('Supabase not available. Install Supabase JS SDK.');
                return false;
            }
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            return false;
        }
    }

    // Authentication Methods
    async signUp(email, password, metadata = {}) {
        if (!this.supabase) return { error: 'Supabase not initialized' };
        
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });
            
            if (error) throw error;
            
            this.user = data.user;
            return { user: data.user, session: data.session };
        } catch (error) {
            console.error('Sign up error:', error);
            return { error: error.message };
        }
    }

    async signIn(email, password) {
        if (!this.supabase) return { error: 'Supabase not initialized' };
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            this.user = data.user;
            this.isConnected = true;
            return { user: data.user, session: data.session };
        } catch (error) {
            console.error('Sign in error:', error);
            return { error: error.message };
        }
    }

    async signOut() {
        if (!this.supabase) return { error: 'Supabase not initialized' };
        
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.user = null;
            this.isConnected = false;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { error: error.message };
        }
    }

    async getCurrentUser() {
        if (!this.supabase) return null;
        
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            this.user = user;
            this.isConnected = !!user;
            return user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    // Book Library Methods
    async saveBookProgress(bookId, progress) {
        if (!this.supabase || !this.user) return { error: 'Not authenticated' };
        
        try {
            const { data, error } = await this.supabase
                .from('reading_progress')
                .upsert({
                    user_id: this.user.id,
                    book_id: bookId,
                    current_page: progress.currentPage,
                    total_pages: progress.totalPages,
                    percentage: progress.percentage,
                    last_read: new Date().toISOString(),
                    chapter_index: progress.chapterIndex
                });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Save progress error:', error);
            return { error: error.message };
        }
    }

    async getBookProgress(bookId) {
        if (!this.supabase || !this.user) return { error: 'Not authenticated' };
        
        try {
            const { data, error } = await this.supabase
                .from('reading_progress')
                .select('*')
                .eq('user_id', this.user.id)
                .eq('book_id', bookId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
            return { progress: data };
        } catch (error) {
            console.error('Get progress error:', error);
            return { error: error.message };
        }
    }

    async saveBookToLibrary(bookData) {
        if (!this.supabase || !this.user) return { error: 'Not authenticated' };
        
        try {
            const { data, error } = await this.supabase
                .from('user_library')
                .upsert({
                    user_id: this.user.id,
                    book_id: bookData.id,
                    title: bookData.title,
                    author: bookData.author,
                    cover_url: bookData.coverUrl,
                    file_path: bookData.filePath,
                    added_date: new Date().toISOString(),
                    status: 'reading'
                });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Save book error:', error);
            return { error: error.message };
        }
    }

    async getUserLibrary() {
        if (!this.supabase || !this.user) return { error: 'Not authenticated' };
        
        try {
            const { data, error } = await this.supabase
                .from('user_library')
                .select('*')
                .eq('user_id', this.user.id)
                .order('added_date', { ascending: false });
            
            if (error) throw error;
            return { library: data };
        } catch (error) {
            console.error('Get library error:', error);
            return { error: error.message };
        }
    }

    async saveBookmark(bookId, pageIndex, note = '') {
        if (!this.supabase || !this.user) return { error: 'Not authenticated' };
        
        try {
            const { data, error } = await this.supabase
                .from('bookmarks')
                .insert({
                    user_id: this.user.id,
                    book_id: bookId,
                    page_index: pageIndex,
                    note: note,
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Save bookmark error:', error);
            return { error: error.message };
        }
    }

    async getBookmarks(bookId) {
        if (!this.supabase || !this.user) return { error: 'Not authenticated' };
        
        try {
            const { data, error } = await this.supabase
                .from('bookmarks')
                .select('*')
                .eq('user_id', this.user.id)
                .eq('book_id', bookId)
                .order('page_index', { ascending: true });
            
            if (error) throw error;
            return { bookmarks: data };
        } catch (error) {
            console.error('Get bookmarks error:', error);
            return { error: error.message };
        }
    }

    // User Statistics Methods
    async updateReadingStats(stats) {
        if (!this.supabase || !this.user) return { error: 'Not authenticated' };
        
        try {
            const { data, error } = await this.supabase
                .from('user_stats')
                .upsert({
                    user_id: this.user.id,
                    books_read: stats.booksRead,
                    reading_time: stats.readingTime,
                    reading_streak: stats.readingStreak,
                    avg_rating: stats.avgRating,
                    favorite_genre: stats.favoriteGenre,
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update stats error:', error);
            return { error: error.message };
        }
    }

    async getUserStats() {
        if (!this.supabase || !this.user) return { error: 'Not authenticated' };
        
        try {
            const { data, error } = await this.supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', this.user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return { stats: data };
        } catch (error) {
            console.error('Get stats error:', error);
            return { error: error.message };
        }
    }
}

// Google Drive Integration
class GoogleDriveService {
    constructor() {
        this.CLIENT_ID = 'your-google-client-id';
        this.API_KEY = 'your-google-api-key';
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        
        this.gapi = null;
        this.isSignedIn = false;
    }

    async initializeGoogleDrive() {
        try {
            // Load Google API
            if (typeof gapi !== 'undefined') {
                await gapi.load('auth2', () => {
                    gapi.auth2.init({
                        client_id: this.CLIENT_ID
                    });
                });
                
                await gapi.load('client', async () => {
                    await gapi.client.init({
                        apiKey: this.API_KEY,
                        clientId: this.CLIENT_ID,
                        discoveryDocs: [this.DISCOVERY_DOC],
                        scope: this.SCOPES
                    });
                });
                
                this.gapi = gapi;
                return true;
            } else {
                console.warn('Google API not loaded');
                return false;
            }
        } catch (error) {
            console.error('Google Drive initialization error:', error);
            return false;
        }
    }

    async signIn() {
        if (!this.gapi) return { error: 'Google API not initialized' };
        
        try {
            const authInstance = this.gapi.auth2.getAuthInstance();
            const user = await authInstance.signIn();
            this.isSignedIn = true;
            return { success: true, user };
        } catch (error) {
            console.error('Google Drive sign in error:', error);
            return { error: error.message };
        }
    }

    async uploadFile(file, fileName) {
        if (!this.gapi || !this.isSignedIn) return { error: 'Not authenticated' };
        
        try {
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";
            
            const metadata = {
                'name': fileName,
                'parents': ['your-folder-id'] // Optional: specify folder
            };
            
            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/epub+zip\r\n\r\n' +
                file +
                close_delim;
            
            const request = this.gapi.client.request({
                'path': 'https://www.googleapis.com/upload/drive/v3/files',
                'method': 'POST',
                'params': {'uploadType': 'multipart'},
                'headers': {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                },
                'body': multipartRequestBody
            });
            
            const response = await request;
            return { success: true, fileId: response.result.id };
        } catch (error) {
            console.error('Google Drive upload error:', error);
            return { error: error.message };
        }
    }

    async listEpubFiles() {
        if (!this.gapi || !this.isSignedIn) return { error: 'Not authenticated' };
        
        try {
            const response = await this.gapi.client.drive.files.list({
                q: "mimeType='application/epub+zip'",
                fields: 'files(id, name, modifiedTime, size)'
            });
            
            return { files: response.result.files };
        } catch (error) {
            console.error('Google Drive list error:', error);
            return { error: error.message };
        }
    }
}

// Export services
window.SupabaseService = SupabaseService;
window.GoogleDriveService = GoogleDriveService; 
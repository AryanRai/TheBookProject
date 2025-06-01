// Supabase Configuration for The Book Project
// This file contains the setup for cloud integration features

class SupabaseService {
    constructor() {
        // Real Supabase setup - users need to replace these
        this.SUPABASE_URL = 'https://fiodwdhcxafxugwcmcou.supabase.co'; // Replace with your project URL
        this.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb2R3ZGhjeGFmeHVnd2NtY291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3ODAzNjksImV4cCI6MjA2NDM1NjM2OX0.NL55ayzyzLLXsBPLyEggwhH4UNpoEsCWEwWmPgry1UQ'; // Replace with your anon key
        
        // Rate limiting configuration
        this.rateLimits = {
            apiCalls: { limit: 100, window: 3600000, current: 0, resetTime: 0 }, // 100 calls per hour
            fileUploads: { limit: 10, window: 86400000, current: 0, resetTime: 0 }, // 10 uploads per day
            annotations: { limit: 500, window: 86400000, current: 0, resetTime: 0 }, // 500 annotations per day
            socialActions: { limit: 50, window: 3600000, current: 0, resetTime: 0 } // 50 social actions per hour
        };
        
        // Storage limits
        this.storageLimits = {
            maxFileSize: 50 * 1024 * 1024, // 50MB per file
            totalStorage: 500 * 1024 * 1024, // 500MB total per user
            maxBooks: 50, // Maximum 50 books per user
            maxAnnotations: 1000 // Maximum 1000 annotations per user
        };
        
        this.supabase = null;
        this.user = null;
        this.isConnected = false;
        this.currentUsage = null;
        
        this.initializeSupabase();
        this.loadRateLimits();
    }

    async initializeSupabase() {
        try {
            console.log('🔧 Starting Supabase initialization...');
            console.log('📍 URL:', this.SUPABASE_URL);
            console.log('🔑 Key (first 20 chars):', this.SUPABASE_ANON_KEY.substring(0, 20) + '...');
            
            // Check if Supabase SDK is loaded
            if (typeof window !== 'undefined') {
                console.log('🌐 Window object available');
                
                if (window.supabase) {
                    console.log('✅ Supabase SDK loaded');
                } else {
                    console.error('❌ Supabase SDK not found. Make sure the script is loaded.');
                    return false;
                }
                
                if (this.SUPABASE_URL.includes('supabase.co')) {
                    console.log('✅ Valid Supabase URL format');
                    
                    this.supabase = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
                    console.log('✅ Supabase client created successfully');
                    
                    // Test connection with a simple query
                    console.log('🔍 Testing connection...');
                    const { data, error } = await this.supabase.from('user_stats').select('count').limit(1);
                    
                    if (error) {
                        console.warn('⚠️ Connection test failed:', error.message);
                        console.log('💡 This might be normal if tables don\'t exist yet');
                        
                        // Check if it's a "relation does not exist" error (expected if tables not created)
                        if (error.message.includes('relation') && error.message.includes('does not exist')) {
                            console.log('📋 Tables not created yet. Please run the SQL from CLOUD_SETUP.md');
                            this.isConnected = true; // Still consider it connected, just missing tables
                            return true;
                        } else {
                            console.error('❌ Unexpected connection error:', error);
                            return false;
                        }
                    } else {
                        console.log('✅ Supabase connection verified successfully');
                        this.isConnected = true;
                        return true;
                    }
                } else {
                    console.error('❌ Invalid Supabase URL format. Expected: https://xxx.supabase.co');
                    return false;
                }
            } else {
                console.error('❌ Window object not available');
                return false;
            }
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            console.log('🔍 Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    // Rate Limiting System
    loadRateLimits() {
        const saved = localStorage.getItem('rateLimits');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Reset counters if windows have expired
            Object.keys(this.rateLimits).forEach(key => {
                if (Date.now() > parsed[key]?.resetTime) {
                    this.rateLimits[key].current = 0;
                    this.rateLimits[key].resetTime = Date.now() + this.rateLimits[key].window;
                } else {
                    this.rateLimits[key] = { ...this.rateLimits[key], ...parsed[key] };
                }
            });
        } else {
            // Initialize reset times
            Object.keys(this.rateLimits).forEach(key => {
                this.rateLimits[key].resetTime = Date.now() + this.rateLimits[key].window;
            });
        }
    }

    saveRateLimits() {
        localStorage.setItem('rateLimits', JSON.stringify(this.rateLimits));
    }

    checkRateLimit(action) {
        const limit = this.rateLimits[action];
        if (!limit) return true;

        // Reset if window expired
        if (Date.now() > limit.resetTime) {
            limit.current = 0;
            limit.resetTime = Date.now() + limit.window;
        }

        if (limit.current >= limit.limit) {
            const resetIn = Math.ceil((limit.resetTime - Date.now()) / 60000); // minutes
            throw new Error(`Rate limit exceeded. Try again in ${resetIn} minutes.`);
        }

        limit.current++;
        this.saveRateLimits();
        return true;
    }

    getRateLimitStatus() {
        const status = {};
        Object.keys(this.rateLimits).forEach(key => {
            const limit = this.rateLimits[key];
            const resetIn = Math.max(0, Math.ceil((limit.resetTime - Date.now()) / 60000));
            status[key] = {
                used: limit.current,
                total: limit.limit,
                remaining: limit.limit - limit.current,
                resetInMinutes: resetIn
            };
        });
        return status;
    }

    // Enhanced Authentication with User Management
    async signUp(email, password, metadata = {}) {
        if (!this.supabase) return { error: 'Cloud features not available offline' };
        
        try {
            this.checkRateLimit('apiCalls');
            
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        ...metadata,
                        plan: 'free', // Default free plan
                        joinedAt: new Date().toISOString()
                    }
                }
            });
            
            if (error) throw error;
            
            this.user = data.user;
            await this.initializeUserLimits();
            return { user: data.user, session: data.session };
        } catch (error) {
            console.error('Sign up error:', error);
            return { error: error.message };
        }
    }

    async initializeUserLimits() {
        if (!this.user) return;
        
        // Create initial user stats and limits
        await this.supabase.from('user_stats').upsert({
            user_id: this.user.id,
            books_read: 0,
            reading_time: 0,
            reading_streak: 0,
            avg_rating: 0.0,
            storage_used: 0,
            plan: 'free',
            created_at: new Date().toISOString()
        });
    }

    // Enhanced File Management with Size Limits
    async saveBookToLibrary(bookData, fileBuffer = null) {
        if (!this.supabase || !this.user) return { error: 'Not authenticated' };
        
        try {
            this.checkRateLimit('fileUploads');
            
            // Check file size
            if (fileBuffer && fileBuffer.byteLength > this.storageLimits.maxFileSize) {
                throw new Error(`File too large. Maximum size: ${this.storageLimits.maxFileSize / (1024*1024)}MB`);
            }
            
            // Check total storage
            const usage = await this.getCurrentUsage();
            if (usage.storageUsed + (fileBuffer?.byteLength || 0) > this.storageLimits.totalStorage) {
                throw new Error('Storage limit exceeded. Please upgrade your plan.');
            }
            
            // Check book count
            if (usage.bookCount >= this.storageLimits.maxBooks) {
                throw new Error('Maximum number of books reached. Please upgrade your plan.');
            }
            
            let filePath = null;
            
            // Upload file if provided
            if (fileBuffer) {
                const fileName = `${this.user.id}/${bookData.id}.epub`;
                const { data: uploadData, error: uploadError } = await this.supabase.storage
                    .from('books')
                    .upload(fileName, fileBuffer, {
                        contentType: 'application/epub+zip',
                        upsert: true
                    });
                
                if (uploadError) throw uploadError;
                filePath = uploadData.path;
            }
            
            // Save book metadata
            const { data, error } = await this.supabase
                .from('user_library')
                .upsert({
                    user_id: this.user.id,
                    book_id: bookData.id,
                    title: bookData.title,
                    author: bookData.author,
                    cover_url: bookData.coverUrl,
                    file_path: filePath,
                    file_size: fileBuffer?.byteLength || 0,
                    added_date: new Date().toISOString(),
                    status: 'reading'
                });
            
            if (error) throw error;
            
            // Update storage usage
            await this.updateStorageUsage();
            
            return { success: true, data };
        } catch (error) {
            console.error('Save book error:', error);
            return { error: error.message };
        }
    }

    async getCurrentUsage() {
        if (!this.supabase || !this.user) return null;
        
        try {
            const [libraryResult, statsResult] = await Promise.all([
                this.supabase
                    .from('user_library')
                    .select('file_size')
                    .eq('user_id', this.user.id),
                this.supabase
                    .from('user_stats')
                    .select('storage_used, plan')
                    .eq('user_id', this.user.id)
                    .single()
            ]);
            
            const totalFileSize = libraryResult.data?.reduce((sum, book) => sum + (book.file_size || 0), 0) || 0;
            const bookCount = libraryResult.data?.length || 0;
            
            return {
                storageUsed: totalFileSize,
                bookCount: bookCount,
                plan: statsResult.data?.plan || 'free'
            };
        } catch (error) {
            console.error('Get usage error:', error);
            return { storageUsed: 0, bookCount: 0, plan: 'free' };
        }
    }

    async updateStorageUsage() {
        const usage = await this.getCurrentUsage();
        if (usage) {
            await this.supabase
                .from('user_stats')
                .update({ storage_used: usage.storageUsed })
                .eq('user_id', this.user.id);
        }
    }

    // Enhanced Annotations with Limits
    async saveAnnotation(annotation) {
        if (!this.supabase || !this.user) {
            // Save locally if offline
            return this.saveAnnotationLocally(annotation);
        }
        
        try {
            this.checkRateLimit('annotations');
            
            // Check annotation count limit
            const { count } = await this.supabase
                .from('annotations')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', this.user.id);
            
            if (count >= this.storageLimits.maxAnnotations) {
                throw new Error('Maximum annotations reached. Please upgrade your plan.');
            }
            
            const { data, error } = await this.supabase
                .from('annotations')
                .insert({
                    ...annotation,
                    user_id: this.user.id,
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Save annotation error:', error);
            // Fallback to local storage
            return this.saveAnnotationLocally(annotation);
        }
    }

    saveAnnotationLocally(annotation) {
        const annotations = JSON.parse(localStorage.getItem('annotations') || '[]');
        annotations.push(annotation);
        localStorage.setItem('annotations', JSON.stringify(annotations));
        return { success: true, local: true };
    }

    // Usage Dashboard
    getUsageDashboard() {
        const rateLimitStatus = this.getRateLimitStatus();
        
        return {
            rateLimits: rateLimitStatus,
            storageLimits: this.storageLimits,
            isConnected: this.isConnected,
            user: this.user,
            planFeatures: this.getPlanFeatures()
        };
    }

    getPlanFeatures() {
        return {
            free: {
                storage: '500MB',
                books: '50',
                annotations: '1000',
                apiCalls: '100/hour',
                features: ['Basic reading', 'Local annotations', 'Limited cloud sync']
            },
            pro: {
                storage: '5GB',
                books: '500',
                annotations: '10000',
                apiCalls: '1000/hour',
                features: ['Advanced reading', 'Full cloud sync', 'Social features', 'Priority support']
            }
        };
    }

    // Authentication Methods
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

// Enhanced Google Drive Integration with Rate Limiting
class GoogleDriveService {
    constructor() {
        // Real Google Drive API configuration
        this.CLIENT_ID = '123456789-abcdefghijklmnop.apps.googleusercontent.com'; // Replace with your client ID
        this.API_KEY = 'AIzaSyABC-DEF123GHI456JKL789MNO'; // Replace with your API key
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        
        // Rate limits for Google Drive API
        this.rateLimits = {
            queries: { limit: 100, window: 100000, current: 0, resetTime: 0 }, // 100 queries per 100 seconds
            uploads: { limit: 10, window: 3600000, current: 0, resetTime: 0 }, // 10 uploads per hour
            downloads: { limit: 50, window: 3600000, current: 0, resetTime: 0 } // 50 downloads per hour
        };
        
        // Storage limits
        this.storageLimits = {
            maxFileSize: 100 * 1024 * 1024, // 100MB per file (Google Drive's limit for some operations)
            maxFiles: 1000, // 1000 files max for free accounts
            folderName: 'TheBookProject' // Dedicated folder for our app
        };
        
        this.gapi = null;
        this.isSignedIn = false;
        this.authInstance = null;
        this.folderId = null;
        
        this.loadRateLimits();
    }

    loadRateLimits() {
        const saved = localStorage.getItem('driveRateLimits');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.keys(this.rateLimits).forEach(key => {
                if (Date.now() > parsed[key]?.resetTime) {
                    this.rateLimits[key].current = 0;
                    this.rateLimits[key].resetTime = Date.now() + this.rateLimits[key].window;
                } else {
                    this.rateLimits[key] = { ...this.rateLimits[key], ...parsed[key] };
                }
            });
        }
    }

    saveRateLimits() {
        localStorage.setItem('driveRateLimits', JSON.stringify(this.rateLimits));
    }

    checkRateLimit(action) {
        const limit = this.rateLimits[action];
        if (!limit) return true;

        if (Date.now() > limit.resetTime) {
            limit.current = 0;
            limit.resetTime = Date.now() + limit.window;
        }

        if (limit.current >= limit.limit) {
            const resetIn = Math.ceil((limit.resetTime - Date.now()) / 60000);
            throw new Error(`Google Drive rate limit exceeded. Try again in ${resetIn} minutes.`);
        }

        limit.current++;
        this.saveRateLimits();
        return true;
    }

    async initializeGoogleDrive() {
        try {
            // Check if client ID is configured
            if (!this.CLIENT_ID.includes('googleusercontent.com')) {
                console.warn('⚠️ Google Drive not configured. Please set up API credentials.');
                return false;
            }

            if (typeof gapi !== 'undefined') {
                await new Promise((resolve) => {
                    gapi.load('auth2:client', resolve);
                });
                
                await gapi.client.init({
                    apiKey: this.API_KEY,
                    clientId: this.CLIENT_ID,
                    discoveryDocs: [this.DISCOVERY_DOC],
                    scope: this.SCOPES
                });
                
                this.authInstance = gapi.auth2.getAuthInstance();
                this.isSignedIn = this.authInstance.isSignedIn.get();
                
                if (this.isSignedIn) {
                    await this.setupAppFolder();
                }
                
                console.log('✅ Google Drive API initialized');
                return true;
            } else {
                console.warn('⚠️ Google API not loaded. Include the Google API script.');
                return false;
            }
        } catch (error) {
            console.error('❌ Google Drive initialization error:', error);
            return false;
        }
    }

    async signIn() {
        if (!this.authInstance) {
            throw new Error('Google Drive not initialized');
        }
        
        try {
            const user = await this.authInstance.signIn();
            this.isSignedIn = true;
            await this.setupAppFolder();
            
            return { 
                success: true, 
                user: {
                    name: user.getBasicProfile().getName(),
                    email: user.getBasicProfile().getEmail()
                }
            };
        } catch (error) {
            console.error('Google Drive sign in error:', error);
            return { error: error.message };
        }
    }

    async setupAppFolder() {
        try {
            this.checkRateLimit('queries');
            
            // Check if our app folder exists
            const response = await gapi.client.drive.files.list({
                q: `name='${this.storageLimits.folderName}' and mimeType='application/vnd.google-apps.folder'`,
                fields: 'files(id, name)'
            });
            
            if (response.result.files.length > 0) {
                this.folderId = response.result.files[0].id;
            } else {
                // Create the folder
                const folderResponse = await gapi.client.drive.files.create({
                    resource: {
                        name: this.storageLimits.folderName,
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                });
                this.folderId = folderResponse.result.id;
            }
            
            console.log(`📁 App folder ready: ${this.folderId}`);
        } catch (error) {
            console.error('Setup folder error:', error);
        }
    }

    async uploadEpub(file, fileName) {
        if (!this.isSignedIn) {
            throw new Error('Not signed in to Google Drive');
        }
        
        try {
            this.checkRateLimit('uploads');
            
            // Check file size
            if (file.size > this.storageLimits.maxFileSize) {
                throw new Error(`File too large. Maximum size: ${this.storageLimits.maxFileSize / (1024*1024)}MB`);
            }
            
            // Check file count
            const fileCount = await this.getFileCount();
            if (fileCount >= this.storageLimits.maxFiles) {
                throw new Error(`Maximum files exceeded. Limit: ${this.storageLimits.maxFiles}`);
            }
            
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";
            
            const metadata = {
                name: fileName,
                parents: this.folderId ? [this.folderId] : undefined,
                description: `EPUB file uploaded by The Book Project on ${new Date().toISOString()}`
            };
            
            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/epub+zip\r\n\r\n' +
                await this.fileToString(file) +
                close_delim;
            
            const request = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`,
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                },
                body: multipartRequestBody
            });
            
            if (!request.ok) {
                throw new Error(`Upload failed: ${request.statusText}`);
            }
            
            const response = await request.json();
            
            return { 
                success: true, 
                fileId: response.id,
                fileName: response.name,
                size: file.size
            };
        } catch (error) {
            console.error('Google Drive upload error:', error);
            return { error: error.message };
        }
    }

    async fileToString(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async getFileCount() {
        try {
            this.checkRateLimit('queries');
            
            const response = await gapi.client.drive.files.list({
                q: this.folderId ? `parents in '${this.folderId}'` : "mimeType='application/epub+zip'",
                fields: 'files(id)',
                pageSize: 1000
            });
            
            return response.result.files.length;
        } catch (error) {
            console.error('Get file count error:', error);
            return 0;
        }
    }

    async listEpubFiles() {
        if (!this.isSignedIn) {
            throw new Error('Not signed in to Google Drive');
        }
        
        try {
            this.checkRateLimit('queries');
            
            const response = await gapi.client.drive.files.list({
                q: this.folderId ? 
                    `parents in '${this.folderId}' and mimeType='application/epub+zip'` : 
                    "mimeType='application/epub+zip'",
                fields: 'files(id, name, modifiedTime, size, webViewLink)',
                orderBy: 'modifiedTime desc',
                pageSize: 100
            });
            
            return { 
                files: response.result.files.map(file => ({
                    ...file,
                    sizeFormatted: this.formatFileSize(file.size)
                }))
            };
        } catch (error) {
            console.error('List files error:', error);
            return { error: error.message };
        }
    }

    async downloadFile(fileId) {
        if (!this.isSignedIn) {
            throw new Error('Not signed in to Google Drive');
        }
        
        try {
            this.checkRateLimit('downloads');
            
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            return { success: true, file: blob };
        } catch (error) {
            console.error('Download error:', error);
            return { error: error.message };
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getUsageInfo() {
        const rateLimitStatus = {};
        Object.keys(this.rateLimits).forEach(key => {
            const limit = this.rateLimits[key];
            const resetIn = Math.max(0, Math.ceil((limit.resetTime - Date.now()) / 60000));
            rateLimitStatus[key] = {
                used: limit.current,
                total: limit.limit,
                remaining: limit.limit - limit.current,
                resetInMinutes: resetIn
            };
        });

        return {
            rateLimits: rateLimitStatus,
            storageLimits: this.storageLimits,
            isSignedIn: this.isSignedIn,
            folderId: this.folderId
        };
    }

    async signOut() {
        if (this.authInstance) {
            await this.authInstance.signOut();
            this.isSignedIn = false;
            this.folderId = null;
        }
    }
}

// Export services
window.SupabaseService = SupabaseService;
window.GoogleDriveService = GoogleDriveService; 
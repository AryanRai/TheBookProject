class EpubReelsReader {
    constructor() {
        this.currentPageIndex = 0;
        this.pages = [];
        this.bookTitle = '';
        this.chapters = [];
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.isAnimating = false;
        this.fontSize = 18;
        this.pageHeight = window.innerHeight - 110; // Account for header
        this.isFullscreen = false;
        this.darkMode = this.getPreferredTheme();
        this.currentView = 'homepage'; // 'homepage', 'upload', 'reader'
        this.popularBooks = this.getPopularBooks();
        this.userStats = this.getUserStats();
        
        this.initializeElements();
        this.initializeTheme();
        this.bindEvents();
        this.hideLoading(); // Hide loading screen on startup
        this.showHomepage(); // Start with homepage
        this.populateHomepage();
        
        // Phase 3: Initialize advanced features
        this.annotations = this.getAnnotations();
        this.challenges = this.getChallenges();
        this.currentAnnotationMode = null;
        this.selectedText = '';
        this.selectionRange = null;
        
        // Phase 3 elements
        this.annotationsPanel = document.getElementById('annotationsPanel');
        this.socialPanel = document.getElementById('socialPanel');
        this.challengesModal = document.getElementById('challengesModal');
        this.settingsModal = document.getElementById('settingsModal');
        this.annotationsList = document.getElementById('annotationsList');
        this.socialContent = document.getElementById('socialContent');
        this.challengesGrid = document.getElementById('challengesGrid');
        
        // Initialize custom cursor
        this.initializeCustomCursor();
        
        // Initialize voting system BEFORE populating homepage
        this.initializeVotingSystem();
        
        // Initialize Book API Service
        this.initializeBookAPI();
        
        // Initialize Material You theming
        this.initializeMaterialYouTheming();
    }

    initializeElements() {
        this.reelsContainer = document.getElementById('reelsContainer');
        this.uploadArea = document.getElementById('uploadArea');
        this.loadingScreen = document.getElementById('loadingScreen');
        this.bookTitleElement = document.getElementById('bookTitle');
        this.progressFill = document.getElementById('progressFill');
        this.progressBar = document.getElementById('progressBar');
        this.chapterMarkers = document.getElementById('chapterMarkers');
        this.fileInput = document.getElementById('fileInput');
        this.sidePanel = document.getElementById('sidePanel');
        this.menuOverlay = document.getElementById('menuOverlay');
        this.chaptersList = document.getElementById('chaptersList');
        this.header = document.getElementById('header');
        this.controlsOverlay = document.querySelector('.controls-overlay');
        this.homepage = document.getElementById('homepage');
        this.popularBooksGrid = document.getElementById('popularBooksGrid');
        this.backBtn = document.getElementById('backBtn');
    }

    getPreferredTheme() {
        const saved = localStorage.getItem('theme');
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.darkMode);
        this.updateThemeToggle();
    }

    updateThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const isDark = this.darkMode === 'dark';
        themeToggle.innerHTML = isDark 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }

    bindEvents() {
        // File upload
        document.getElementById('uploadBtn').addEventListener('click', () => {
            this.fileInput.click();
        });
        
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadEpub(e.target.files[0]);
            }
        });

        // Demo book
        document.getElementById('demoBtn').addEventListener('click', () => {
            this.loadDemoBook();
        });

        // Navigation controls
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.previousPage();
        });
        
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextPage();
        });

        // Header controls
        document.getElementById('backBtn').addEventListener('click', () => {
            if (this.currentView === 'reader') {
                this.backToHomepage();
            } else {
                this.showHomepage();
            }
        });

        document.getElementById('menuBtn').addEventListener('click', () => {
            this.toggleMenu();
        });

        // New controls
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Progress bar click navigation
        this.progressBar.addEventListener('click', (e) => {
            this.handleProgressBarClick(e);
        });

        // Menu items
        document.getElementById('chaptersBtn').addEventListener('click', () => {
            this.toggleSidePanel();
            this.hideMenu();
        });

        document.getElementById('bookmarksBtn').addEventListener('click', () => {
            this.saveBookmark();
            this.hideMenu();
        });

        document.getElementById('fontBtn').addEventListener('click', () => {
            this.toggleFontSize();
            this.hideMenu();
        });

        // Side panel
        document.getElementById('closePanel').addEventListener('click', () => {
            this.hideSidePanel();
        });

        // Touch and swipe events
        this.reelsContainer.addEventListener('touchstart', (e) => {
            this.handleTouchStart(e);
        });

        this.reelsContainer.addEventListener('touchmove', (e) => {
            this.handleTouchMove(e);
        });

        this.reelsContainer.addEventListener('touchend', (e) => {
            this.handleTouchEnd(e);
        });

        // Mouse wheel for desktop
        this.reelsContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY > 0) {
                this.nextPage();
            } else {
                this.previousPage();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                this.previousPage();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                this.nextPage();
            } else if (e.key === 'Escape') {
                this.hideMenu();
                this.hideSidePanel();
                if (this.isFullscreen) {
                    this.toggleFullscreen();
                }
            } else if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            } else if (e.key === 'd' || e.key === 'D') {
                this.toggleTheme();
            }
        });

        // Close menu when clicking outside
        this.menuOverlay.addEventListener('click', (e) => {
            if (e.target === this.menuOverlay) {
                this.hideMenu();
            }
        });

        // Resize handler
        window.addEventListener('resize', () => {
            this.pageHeight = window.innerHeight - 110;
            if (this.pages.length > 0) {
                this.redistributeContent();
            }
        });

        // Theme change detection
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.darkMode = e.matches ? 'dark' : 'light';
                this.initializeTheme();
            }
        });

        // Homepage navigation
        document.getElementById('startReadingBtn').addEventListener('click', () => {
            this.showUploadArea();
        });

        document.getElementById('browseLibraryBtn').addEventListener('click', () => {
            this.showLibrary();
        });

        // Homepage theme toggle
        document.getElementById('homepageThemeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Cloud integration
        document.getElementById('googleDriveBtn').addEventListener('click', () => {
            this.connectGoogleDrive();
        });

        document.getElementById('supabaseBtn').addEventListener('click', () => {
            this.connectSupabase();
        });

        // Categories
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.browseCategory(category);
            });
        });

        // Phase 3: Advanced features event listeners
        document.getElementById('annotationsBtn').addEventListener('click', () => {
            this.toggleAnnotationsPanel();
            this.hideMenu();
        });

        document.getElementById('shareBtn').addEventListener('click', () => {
            this.shareProgress();
            this.hideMenu();
        });

        document.getElementById('challengesBtn').addEventListener('click', () => {
            this.showChallengesModal();
            this.hideMenu();
        });

        document.getElementById('usageBtn').addEventListener('click', () => {
            this.showUsageDashboard();
            this.hideMenu();
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettingsModal();
            this.hideMenu();
        });

        // Annotations panel controls
        document.getElementById('closeAnnotations').addEventListener('click', () => {
            this.closeAnnotationsPanel();
        });

        document.querySelectorAll('.annotation-tool').forEach(tool => {
            tool.addEventListener('click', () => {
                this.setAnnotationMode(tool.dataset.type);
            });
        });

        // Social panel controls
        document.getElementById('closeSocial').addEventListener('click', () => {
            this.closeSocialPanel();
        });

        document.querySelectorAll('.social-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchSocialTab(tab.dataset.tab);
            });
        });

        // Modal controls
        document.getElementById('closeChallenges').addEventListener('click', () => {
            this.closeChallengesModal();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettingsModal();
        });

        // Settings controls
        document.getElementById('fontFamily').addEventListener('change', (e) => {
            this.updateFontFamily(e.target.value);
        });

        document.getElementById('lineHeight').addEventListener('input', (e) => {
            this.updateLineHeight(e.target.value);
        });

        document.getElementById('readingWidth').addEventListener('input', (e) => {
            this.updateReadingWidth(e.target.value);
        });

        document.getElementById('autoScrollSpeed').addEventListener('input', (e) => {
            this.updateAutoScrollSpeed(e.target.value);
        });

        document.getElementById('pageAnimation').addEventListener('change', (e) => {
            this.updatePageAnimation(e.target.value);
        });

        // Text selection for annotations
        document.addEventListener('mouseup', () => {
            this.handleTextSelection();
        });

        document.addEventListener('touchend', () => {
            setTimeout(() => this.handleTextSelection(), 100);
        });
    }

    async loadEpub(file) {
        try {
            this.showLoading();
            
            const arrayBuffer = await file.arrayBuffer();
            const zip = new JSZip();
            const epub = await zip.loadAsync(arrayBuffer);
            
            // Parse EPUB structure
            const opfFile = await this.findOpfFile(epub);
            const opfContent = await epub.file(opfFile).async('text');
            const parser = new DOMParser();
            const opfDoc = parser.parseFromString(opfContent, 'text/xml');
            
            // Extract metadata
            this.bookTitle = this.extractTitle(opfDoc);
            this.bookTitleElement.textContent = this.bookTitle;
            
            // Extract chapters
            const chapters = await this.extractChapters(epub, opfDoc);
            this.processChapters(chapters);
            
            this.hideUploadArea();
            this.hideLoading();
            this.createPages();
            this.populateChaptersList();
            
        } catch (error) {
            console.error('Error loading EPUB:', error);
            alert('Error loading EPUB file. Please try another file.');
            this.hideLoading();
        }
    }

    async findOpfFile(epub) {
        const container = await epub.file('META-INF/container.xml').async('text');
        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(container, 'text/xml');
        const rootfile = containerDoc.querySelector('rootfile');
        return rootfile.getAttribute('full-path');
    }

    extractTitle(opfDoc) {
        const titleElement = opfDoc.querySelector('title');
        return titleElement ? titleElement.textContent : 'Untitled Book';
    }

    async extractChapters(epub, opfDoc) {
        const spine = opfDoc.querySelector('spine');
        const manifest = opfDoc.querySelector('manifest');
        const chapters = [];
        
        // Get the base path from the OPF file location
        const opfPath = await this.findOpfFile(epub);
        const basePath = this.getBasePath(opfPath);
        
        for (const itemref of spine.querySelectorAll('itemref')) {
            const idref = itemref.getAttribute('idref');
            const item = manifest.querySelector(`item[id="${idref}"]`);
            
            if (item) {
                let href = item.getAttribute('href');
                
                // Try different path combinations
                const possiblePaths = [
                    href,
                    basePath ? `${basePath}/${href}` : href,
                    href.startsWith('/') ? href.substring(1) : href
                ];
                
                let content = null;
                let successfulPath = null;
                
                // Try each possible path until we find the file
                for (const path of possiblePaths) {
                    try {
                        const file = epub.file(path);
                        if (file) {
                            content = await file.async('text');
                            successfulPath = path;
                            break;
                        }
                    } catch (error) {
                        // Continue to next path
                        continue;
                    }
                }
                
                if (content && successfulPath) {
                    // Process relative paths in content
                    content = this.processRelativePaths(content, this.getBasePath(successfulPath));
                    
                    // Only add chapters with meaningful content
                    if (this.isContentMeaningful(content)) {
                        const chapterTitle = this.extractChapterTitle(content);
                        
                        chapters.push({
                            title: chapterTitle,
                            content: content,
                            href: successfulPath
                        });
                    }
                } else {
                    console.warn(`Could not find file for chapter: ${href}`);
                }
            }
        }
        
        return chapters;
    }

    getBasePath(href) {
        const parts = href.split('/');
        parts.pop();
        return parts.join('/');
    }

    processRelativePaths(content, basePath) {
        // This is a simplified version - in a full implementation,
        // you'd want to properly handle images and other assets
        return content;
    }

    extractChapterTitle(content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        
        // Try different title extraction methods
        const h1 = doc.querySelector('h1');
        const h2 = doc.querySelector('h2');
        const h3 = doc.querySelector('h3');
        const title = doc.querySelector('title');
        
        // Get text content and clean it up
        let titleText = '';
        if (h1 && h1.textContent.trim()) {
            titleText = h1.textContent.trim();
        } else if (h2 && h2.textContent.trim()) {
            titleText = h2.textContent.trim();
        } else if (h3 && h3.textContent.trim()) {
            titleText = h3.textContent.trim();
        } else if (title && title.textContent.trim()) {
            titleText = title.textContent.trim();
        } else {
            // Try to find first paragraph with substantial content
            const paragraphs = doc.querySelectorAll('p');
            for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (text.length > 10 && text.length < 100) {
                    titleText = text.substring(0, 50) + (text.length > 50 ? '...' : '');
                    break;
                }
            }
        }
        
        // Clean up the title
        titleText = titleText.replace(/\s+/g, ' ').trim();
        
        // Provide meaningful default if no title found
        if (!titleText || titleText.length < 3) {
            return 'Chapter';
        }
        
        return titleText;
    }

    isContentMeaningful(content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        
        // Remove script and style elements
        const scripts = doc.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        // Get all text content
        const textContent = doc.body ? doc.body.textContent : doc.textContent;
        const cleanText = textContent.replace(/\s+/g, ' ').trim();
        
        // Check if content has meaningful length and isn't just navigation/metadata
        if (cleanText.length < 100) return false;
        
        // Check for actual paragraphs or headings
        const meaningfulElements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div');
        let meaningfulTextLength = 0;
        
        for (const el of meaningfulElements) {
            const text = el.textContent.trim();
            if (text.length > 20) {
                meaningfulTextLength += text.length;
            }
        }
        
        return meaningfulTextLength > 200;
    }

    processChapters(chapters) {
        this.chapters = chapters;
        this.pages = [];
        
        chapters.forEach((chapter, chapterIndex) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(chapter.content, 'text/html');
            const body = doc.body || doc.documentElement;
            
            // Clean up the content
            this.cleanContent(body);
            
            // Split chapter into pages
            const chapterPages = this.splitIntoPages(body.innerHTML, chapter.title, chapterIndex);
            this.pages.push(...chapterPages);
        });
    }

    cleanContent(element) {
        // Remove scripts and styles
        const scripts = element.querySelectorAll('script');
        const styles = element.querySelectorAll('style');
        
        scripts.forEach(script => script.remove());
        styles.forEach(style => style.remove());
        
        // Clean up attributes that might interfere with styling
        const allElements = element.querySelectorAll('*');
        allElements.forEach(el => {
            el.removeAttribute('style');
            el.removeAttribute('class');
        });
    }

    splitIntoPages(content, chapterTitle, chapterIndex) {
        const pages = [];
        const tempDiv = document.createElement('div');
        tempDiv.className = 'page-content';
        tempDiv.style.fontSize = `${this.fontSize}px`;
        tempDiv.style.lineHeight = '1.8';
        tempDiv.innerHTML = content;
        
        // Create a temporary container to measure content
        const measureContainer = document.createElement('div');
        measureContainer.style.position = 'absolute';
        measureContainer.style.visibility = 'hidden';
        measureContainer.style.width = `${Math.min(600, window.innerWidth - 60)}px`;
        measureContainer.style.fontSize = `${this.fontSize}px`;
        measureContainer.style.lineHeight = '1.8';
        document.body.appendChild(measureContainer);
        
        const paragraphs = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        let currentPageContent = '';
        let currentHeight = 0;
        let pageNumber = 1;
        
        for (const paragraph of paragraphs) {
            measureContainer.innerHTML = currentPageContent + paragraph.outerHTML;
            const newHeight = measureContainer.scrollHeight;
            
            if (newHeight > this.pageHeight && currentPageContent) {
                // Create page with current content
                pages.push({
                    content: currentPageContent,
                    pageNumber: pages.length + 1,
                    chapterIndex: chapterIndex,
                    chapterTitle: chapterTitle
                });
                
                currentPageContent = paragraph.outerHTML;
                currentHeight = 0;
            } else {
                currentPageContent += paragraph.outerHTML;
                currentHeight = newHeight;
            }
        }
        
        // Add remaining content as last page
        if (currentPageContent) {
            pages.push({
                content: currentPageContent,
                pageNumber: pages.length + 1,
                chapterIndex: chapterIndex,
                chapterTitle: chapterTitle
            });
        }
        
        document.body.removeChild(measureContainer);
        return pages;
    }

    createPages() {
        this.reelsContainer.innerHTML = '';
        
        this.pages.forEach((page, index) => {
            const pageElement = document.createElement('div');
            pageElement.className = 'book-page';
            pageElement.innerHTML = `
                <div class="page-content" style="font-size: ${this.fontSize}px;">
                    ${page.content}
                </div>
                <div class="page-number ${this.isFullscreen ? 'fullscreen' : ''}">${page.pageNumber} of ${this.pages.length}</div>
            `;
            
            // Position pages
            if (index === 0) {
                pageElement.classList.add('slide-current');
            } else {
                pageElement.classList.add('slide-down');
            }
            
            this.reelsContainer.appendChild(pageElement);
        });
        
        this.updateProgress();
        this.createChapterMarkers();
    }

    redistributeContent() {
        if (this.chapters.length === 0) return;
        
        const currentPage = this.currentPageIndex;
        this.processChapters(this.chapters);
        this.createPages();
        
        // Try to maintain reading position
        const newPageIndex = Math.min(currentPage, this.pages.length - 1);
        this.goToPage(newPageIndex);
    }

    populateChaptersList() {
        this.chaptersList.innerHTML = '';
        
        this.chapters.forEach((chapter, index) => {
            const chapterButton = document.createElement('button');
            chapterButton.className = 'chapter-item';
            chapterButton.textContent = chapter.title;
            chapterButton.addEventListener('click', () => {
                this.goToChapter(index);
                this.hideSidePanel();
            });
            this.chaptersList.appendChild(chapterButton);
        });
    }

    goToChapter(chapterIndex) {
        const chapterPage = this.pages.find(page => page.chapterIndex === chapterIndex);
        if (chapterPage) {
            const pageIndex = this.pages.indexOf(chapterPage);
            this.goToPage(pageIndex);
        }
    }

    goToPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.pages.length || this.isAnimating) return;
        
        this.isAnimating = true;
        const currentPage = this.reelsContainer.children[this.currentPageIndex];
        const targetPage = this.reelsContainer.children[pageIndex];
        
        if (pageIndex > this.currentPageIndex) {
            // Moving forward
            currentPage.classList.remove('slide-current');
            currentPage.classList.add('slide-up');
            targetPage.classList.remove('slide-down');
            targetPage.classList.add('slide-current');
        } else {
            // Moving backward
            currentPage.classList.remove('slide-current');
            currentPage.classList.add('slide-down');
            targetPage.classList.remove('slide-up');
            targetPage.classList.add('slide-current');
        }
        
        this.currentPageIndex = pageIndex;
        this.updateProgress();
        this.updateChapterSelection();
        
        // Apply annotations to the new page
        setTimeout(() => {
            this.applyAnnotationsToPage();
            this.isAnimating = false;
        }, 200);
    }

    nextPage() {
        if (this.currentPageIndex < this.pages.length - 1) {
            this.goToPage(this.currentPageIndex + 1);
        }
    }

    previousPage() {
        if (this.currentPageIndex > 0) {
            this.goToPage(this.currentPageIndex - 1);
        }
    }

    updateProgress() {
        const progress = ((this.currentPageIndex + 1) / this.pages.length) * 100;
        this.progressFill.style.width = `${progress}%`;
    }

    updateChapterSelection() {
        const currentChapterIndex = this.pages[this.currentPageIndex]?.chapterIndex;
        const chapterItems = this.chaptersList.querySelectorAll('.chapter-item');
        
        chapterItems.forEach((item, index) => {
            if (index === currentChapterIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Touch handling
    handleTouchStart(e) {
        this.touchStartY = e.touches[0].clientY;
        this.addTouchFeedback(e.touches[0].clientX, e.touches[0].clientY);
    }

    handleTouchMove(e) {
        e.preventDefault(); // Prevent scrolling
    }

    handleTouchEnd(e) {
        this.touchEndY = e.changedTouches[0].clientY;
        const deltaY = this.touchStartY - this.touchEndY;
        const threshold = 50;

        if (Math.abs(deltaY) > threshold) {
            if (deltaY > 0) {
                // Swiped up - next page
                this.nextPage();
            } else {
                // Swiped down - previous page
                this.previousPage();
            }
        }
    }

    addTouchFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.className = 'touch-feedback';
        feedback.style.left = `${x - 30}px`;
        feedback.style.top = `${y - 30}px`;
        
        this.reelsContainer.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 600);
    }

    // UI Controls
    showUploadArea() {
        this.uploadArea.classList.remove('hidden');
        this.currentPageIndex = 0;
        this.pages = [];
        this.chapters = [];
    }

    hideUploadArea() {
        this.showReader();
    }

    showLoading() {
        this.loadingScreen.style.display = 'flex';
    }

    hideLoading() {
        this.loadingScreen.style.display = 'none';
    }

    toggleMenu() {
        this.menuOverlay.classList.toggle('active');
    }

    hideMenu() {
        this.menuOverlay.classList.remove('active');
    }

    toggleSidePanel() {
        this.sidePanel.classList.toggle('active');
    }

    hideSidePanel() {
        this.sidePanel.classList.remove('active');
    }

    toggleFontSize() {
        const sizes = [15, 16, 18, 20, 22, 24];
        const currentIndex = sizes.indexOf(this.fontSize);
        const nextIndex = (currentIndex + 1) % sizes.length;
        this.fontSize = sizes[nextIndex];
        
        // Update existing pages
        const pageContents = document.querySelectorAll('.page-content');
        pageContents.forEach(content => {
            content.style.fontSize = `${this.fontSize}px`;
        });
        
        // Redistribute content with new font size
        setTimeout(() => {
            this.redistributeContent();
        }, 100);
    }

    // Demo book functionality
    loadDemoBook() {
        this.showLoading();
        
        setTimeout(() => {
            this.bookTitle = "Alice's Adventures in Wonderland";
            this.bookTitleElement.textContent = this.bookTitle;
            
            // Create demo content
            this.createDemoContent();
            this.hideUploadArea();
            this.hideLoading();
            this.createPages();
            this.populateChaptersList();
        }, 500);
    }

    createDemoContent() {
        this.chapters = [
            {
                title: "Chapter 1: Down the Rabbit Hole",
                content: `
                    <h1>Chapter 1: Down the Rabbit Hole</h1>
                    <p>Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'</p>
                    <p>So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.</p>
                    <p>There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, 'Oh dear! Oh dear! I shall be late!' (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.</p>
                    <p>In another moment down went Alice after it, never once considering how in the world she was to get out again.</p>
                `
            },
            {
                title: "Chapter 2: The Pool of Tears",
                content: `
                    <h1>Chapter 2: The Pool of Tears</h1>
                    <p>'Curiouser and curiouser!' cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); 'now I'm opening out like the largest telescope that ever was! Good-bye, feet!' (for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off). 'Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I'm sure I shan't be able! I shall be a great deal too far off to trouble myself about you: you must manage the best way you can; —but I must be kind to them,' thought Alice, 'or perhaps they won't walk the way I want to go! Let me see: I'll give them a new pair of boots every Christmas.'</p>
                    <p>And she went on planning to herself how she would manage it. 'They must go by the carrier,' she thought; 'and how funny it'll seem, sending presents to one's own feet! And how odd the directions will look!'</p>
                    <p>Just then her head struck against the roof of the hall: in fact she was now more than nine feet high, and she at once took up the little golden key and hurried off to the garden door.</p>
                `
            },
            {
                title: "Chapter 3: A Caucus-Race and a Long Tale",
                content: `
                    <h1>Chapter 3: A Caucus-Race and a Long Tale</h1>
                    <p>They were indeed a queer-looking party that assembled on the bank—the birds with draggled feathers, the animals with their fur clinging close to them, and all dripping wet, cross, and uncomfortable.</p>
                    <p>The first question of course was, how to get dry again: they had a consultation about this, and after a few minutes it seemed quite natural to Alice to find herself talking familiarly with them, as if she had known them all her life. Indeed, she had quite a long argument with the Lory, who at last turned sulky, and would only say, 'I am older than you, and must know better'; and this Alice would not allow without knowing how old it was, and, as the Lory positively refused to tell its age, there was no more to be said.</p>
                    <p>At last the Mouse, who seemed to be a person of authority among them, called out, 'Sit down, all of you, and listen to me! I'll soon make you dry enough!' They all sat down at once, in a large ring, with the Mouse in the middle. Alice kept her eyes anxiously fixed on it, for she felt sure she would catch a bad cold if she did not get dry very soon.</p>
                `
            }
        ];
        
        this.processChapters(this.chapters);
    }

    toggleTheme() {
        this.darkMode = this.darkMode === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.darkMode);
        localStorage.setItem('theme', this.darkMode);
        this.updateThemeToggle();
    }

    toggleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        
        const elements = [this.header, this.controlsOverlay, this.reelsContainer];
        const pageNumbers = document.querySelectorAll('.page-number');
        
        elements.forEach(el => {
            if (this.isFullscreen) {
                el.classList.add('fullscreen');
            } else {
                el.classList.remove('fullscreen');
            }
        });
        
        pageNumbers.forEach(el => {
            if (this.isFullscreen) {
                el.classList.add('fullscreen');
            } else {
                el.classList.remove('fullscreen');
            }
        });

        // Update fullscreen button icon
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        fullscreenBtn.innerHTML = this.isFullscreen 
            ? '<i class="fas fa-compress"></i>' 
            : '<i class="fas fa-expand"></i>';
    }

    handleProgressBarClick(e) {
        if (this.pages.length === 0) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const targetPage = Math.floor(percentage * this.pages.length);
        
        this.goToPage(Math.max(0, Math.min(targetPage, this.pages.length - 1)));
    }

    createChapterMarkers() {
        if (!this.chapterMarkers || this.pages.length === 0) return;
        
        this.chapterMarkers.innerHTML = '';
        
        // Find the first page of each chapter
        const chapterStarts = [];
        let currentChapter = -1;
        
        this.pages.forEach((page, index) => {
            if (page.chapterIndex !== currentChapter) {
                currentChapter = page.chapterIndex;
                chapterStarts.push({
                    pageIndex: index,
                    chapterIndex: currentChapter,
                    title: this.chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`
                });
            }
        });
        
        // Create markers
        chapterStarts.forEach(chapter => {
            const marker = document.createElement('div');
            marker.className = 'chapter-marker';
            marker.style.left = `${(chapter.pageIndex / this.pages.length) * 100}%`;
            marker.title = chapter.title;
            
            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                this.goToPage(chapter.pageIndex);
            });
            
            this.chapterMarkers.appendChild(marker);
        });
    }

    // Popular Books and Homepage Data
    getPopularBooks() {
        return [
            {
                id: 1,
                title: "The Seven Husbands of Evelyn Hugo",
                author: "Taylor Jenkins Reid",
                rating: 4.8,
                cover: "📚",
                category: "fiction"
            },
            {
                id: 2,
                title: "Atomic Habits",
                author: "James Clear",
                rating: 4.7,
                cover: "⚛️",
                category: "non-fiction"
            },
            {
                id: 3,
                title: "Project Hail Mary",
                author: "Andy Weir",
                rating: 4.9,
                cover: "🚀",
                category: "sci-fi"
            },
            {
                id: 4,
                title: "The Silent Patient",
                author: "Alex Michaelides",
                rating: 4.5,
                cover: "🔍",
                category: "mystery"
            },
            {
                id: 5,
                title: "It Ends with Us",
                author: "Colleen Hoover",
                rating: 4.6,
                cover: "💕",
                category: "romance"
            },
            {
                id: 6,
                title: "1984",
                author: "George Orwell",
                rating: 4.8,
                cover: "👁️",
                category: "classic"
            }
        ];
    }

    getUserStats() {
        const saved = localStorage.getItem('userStats');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            booksRead: 0,
            readingTime: 0,
            readingStreak: 0,
            avgRating: 0.0,
            favoriteGenre: 'Fiction'
        };
    }

    saveUserStats() {
        localStorage.setItem('userStats', JSON.stringify(this.userStats));
    }

    populateHomepage() {
        this.populatePopularBooks();
        this.updateUserStats();
        this.updateHomepageTheme();
    }

    populatePopularBooks() {
        this.popularBooksGrid.innerHTML = '';
        
        this.popularBooks.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            bookCard.setAttribute('data-book-id', book.id);
            
            // Handle different cover types (emoji vs image URL)
            const coverContent = book.cover.startsWith('http') 
                ? `<img src="${book.cover}" alt="${book.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div style="display: none; font-size: 48px; align-items: center; justify-content: center; height: 100%;">📚</div>`
                : `<span style="font-size: 48px;">${book.cover}</span>`;
                
            bookCard.innerHTML = `
                <div class="book-cover">${coverContent}</div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author}</p>
                    <div class="book-rating">
                        <div class="stars">${this.renderStars(book.rating)}</div>
                        <span class="rating-number">${book.rating.toFixed(1)}</span>
                        <span class="ratings-count">(${book.ratingsCount || 0})</span>
                    </div>
                    <p class="book-source">${book.source || 'Local'}</p>
                    
                    <div class="book-actions">
                        <div class="vote-buttons">
                            <button class="vote-btn vote-up ${(this.userVotes && this.userVotes[book.id]) === 'up' ? 'active' : ''}" 
                                    onclick="window.bookReader.voteBook('${book.id}', 'up')">
                                <span class="material-icons">thumb_up</span>
                            </button>
                            <button class="vote-btn vote-down ${(this.userVotes && this.userVotes[book.id]) === 'down' ? 'active' : ''}" 
                                    onclick="window.bookReader.voteBook('${book.id}', 'down')">
                                <span class="material-icons">thumb_down</span>
                            </button>
                        </div>
                        <button class="read-btn" onclick="window.bookReader.showDemoBook('${book.id}')">
                            Read Demo
                        </button>
                    </div>
                </div>
            `;
            
            this.popularBooksGrid.appendChild(bookCard);
        });
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    updateUserStats() {
        document.getElementById('booksRead').textContent = this.userStats.booksRead;
        document.getElementById('readingTime').textContent = `${this.userStats.readingTime}h`;
        document.getElementById('readingStreak').textContent = this.userStats.readingStreak;
        document.getElementById('avgRating').textContent = this.userStats.avgRating.toFixed(1);
    }

    updateHomepageTheme() {
        const homepageThemeToggle = document.getElementById('homepageThemeToggle');
        const isDark = this.darkMode === 'dark';
        homepageThemeToggle.innerHTML = isDark 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }

    // Navigation Methods
    showHomepage() {
        this.currentView = 'homepage';
        this.homepage.classList.remove('hidden');
        this.uploadArea.classList.add('hidden');
        this.hideReaderInterface();
    }

    showUploadArea() {
        this.currentView = 'upload';
        this.homepage.classList.add('hidden');
        this.uploadArea.classList.remove('hidden');
        this.hideReaderInterface();
    }

    showReader() {
        this.currentView = 'reader';
        this.homepage.classList.add('hidden');
        this.uploadArea.classList.add('hidden');
        this.showReaderInterface();
    }

    hideReaderInterface() {
        // Hide reader-specific UI elements
        if (this.header) this.header.style.display = 'none';
        if (this.controlsOverlay) this.controlsOverlay.style.display = 'none';
        if (this.sidePanel) this.sidePanel.classList.remove('active');
        this.hideMenu();
    }

    showReaderInterface() {
        // Show reader-specific UI elements
        if (this.header) {
            this.header.style.display = 'block';
            this.header.classList.remove('fullscreen');
        }
        if (this.controlsOverlay) {
            this.controlsOverlay.style.display = 'flex';
            this.controlsOverlay.classList.remove('fullscreen');
        }
        // Ensure page numbers are visible
        const pageNumbers = document.querySelectorAll('.page-number');
        pageNumbers.forEach(el => {
            el.style.display = 'block';
            if (!this.isFullscreen) {
                el.classList.remove('fullscreen');
            }
        });
    }

    navigateBack() {
        if (this.currentView === 'reader') {
            this.showHomepage();
        } else if (this.currentView === 'upload') {
            this.showHomepage();
        }
        // Reset reading state when going back
        this.currentPageIndex = 0;
        this.pages = [];
        this.chapters = [];
    }

    // Cloud Integration Methods
    async connectGoogleDrive() {
        try {
            // Show loading
            this.showNotification('Connecting to Google Drive...', 'info');
            
            // Initialize Google Drive service if not already done
            if (!window.googleDriveService) {
                window.googleDriveService = new GoogleDriveService();
            }
            
            const initialized = await window.googleDriveService.initializeGoogleDrive();
            if (!initialized) {
                throw new Error('Google Drive API not configured. Please check CLOUD_SETUP.md');
            }
            
            const result = await window.googleDriveService.signIn();
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Show usage info
            const usage = window.googleDriveService.getUsageInfo();
            this.showNotification(`Google Drive connected! ${usage.rateLimits.uploads.remaining} uploads remaining today.`, 'success');
            
            // Update UI to show connected state
            document.getElementById('googleDriveBtn').innerHTML = `
                <i class="fas fa-check-circle"></i>
                Connected: ${result.user.name}
            `;
            
        } catch (error) {
            console.error('Google Drive connection failed:', error);
            this.showNotification(`Google Drive connection failed: ${error.message}`, 'error');
        }
    }

    async connectSupabase() {
        try {
            // Show loading
            this.showNotification('Connecting to Library...', 'info');
            
            // Initialize Supabase service if not already done
            if (!window.supabaseService) {
                window.supabaseService = new SupabaseService();
            }
            
            const initialized = await window.supabaseService.initializeSupabase();
            if (!initialized) {
                throw new Error('Supabase not configured. Please check CLOUD_SETUP.md');
            }
            
            // For now, just check connection - in production you'd implement sign up/in flow
            const dashboard = window.supabaseService.getUsageDashboard();
            this.showNotification(`Library connected! ${dashboard.rateLimits.apiCalls.remaining} API calls remaining.`, 'success');
            
            // Update UI to show connected state
            document.getElementById('supabaseBtn').innerHTML = `
                <i class="fas fa-check-circle"></i>
                Library Connected
            `;
            
        } catch (error) {
            console.error('Supabase connection failed:', error);
            this.showNotification(`Library connection failed: ${error.message}`, 'error');
        }
    }

    // Enhanced file upload with cloud integration
    async uploadToCloud(file) {
        if (!file || !file.name.endsWith('.epub')) {
            this.showNotification('Please select a valid EPUB file', 'error');
            return;
        }
        
        try {
            // Try Google Drive first if connected
            if (window.googleDriveService && window.googleDriveService.isSignedIn) {
                this.showNotification('Uploading to Google Drive...', 'info');
                
                const result = await window.googleDriveService.uploadEpub(file, file.name);
                if (result.success) {
                    this.showNotification(`File uploaded successfully! File ID: ${result.fileId}`, 'success');
                    
                    // Also save metadata to Supabase if connected
                    if (window.supabaseService && window.supabaseService.user) {
                        await window.supabaseService.saveBookToLibrary({
                            id: result.fileId,
                            title: file.name.replace('.epub', ''),
                            author: 'Unknown',
                            driveFileId: result.fileId
                        });
                    }
                    
                    return result;
                } else {
                    throw new Error(result.error);
                }
            }
            
            // Fallback to local processing
            this.showNotification('Processing file locally...', 'info');
            return { success: true, local: true };
            
        } catch (error) {
            console.error('Cloud upload error:', error);
            this.showNotification(`Upload failed: ${error.message}`, 'error');
            
            // Always fallback to local processing
            this.showNotification('Falling back to local processing...', 'info');
            return { success: true, local: true };
        }
    }

    // Enhanced annotation saving with cloud sync
    async saveAnnotationToCloud(annotation) {
        try {
            // Save to Supabase if connected
            if (window.supabaseService && window.supabaseService.user) {
                const result = await window.supabaseService.saveAnnotation({
                    ...annotation,
                    book_id: this.bookTitle || 'demo-book'
                });
                
                if (result.success && !result.local) {
                    console.log('Annotation synced to cloud');
                }
            }
        } catch (error) {
            console.warn('Cloud sync failed, saved locally:', error.message);
        }
    }

    // Override the existing saveAnnotations method to include cloud sync
    saveAnnotations() {
        localStorage.setItem('annotations', JSON.stringify(this.annotations));
        
        // Sync latest annotation to cloud
        if (this.annotations.length > 0) {
            const latestAnnotation = this.annotations[this.annotations.length - 1];
            this.saveAnnotationToCloud(latestAnnotation);
        }
    }

    // Usage dashboard
    showUsageDashboard() {
        let dashboardHtml = '<h3>Cloud Usage Dashboard</h3>';
        
        // Add debug section
        dashboardHtml += `
            <div class="usage-section">
                <h4>🐛 Debug Information</h4>
                <div class="debug-controls">
                    <button onclick="window.debugSupabase()" style="padding: 8px 16px; margin: 4px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Test Supabase Connection
                    </button>
                    <button onclick="window.debugGoogleDrive()" style="padding: 8px 16px; margin: 4px; background: var(--secondary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Test Google Drive
                    </button>
                </div>
                <div id="debugOutput" style="background: #1a1a1a; color: #00ff00; padding: 16px; border-radius: 8px; margin-top: 12px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto;">
                    Debug output will appear here...
                </div>
            </div>
        `;
        
        if (window.supabaseService) {
            const supabaseDashboard = window.supabaseService.getUsageDashboard();
            dashboardHtml += `
                <div class="usage-section">
                    <h4>📊 Supabase (Database)</h4>
                    <div class="usage-grid">
                        <div>API Calls: ${supabaseDashboard.rateLimits.apiCalls.used}/${supabaseDashboard.rateLimits.apiCalls.total}</div>
                        <div>Annotations: ${supabaseDashboard.rateLimits.annotations.used}/${supabaseDashboard.rateLimits.annotations.total}</div>
                        <div>Storage Limit: ${(supabaseDashboard.storageLimits.totalStorage / (1024*1024)).toFixed(0)}MB</div>
                        <div>Status: ${window.supabaseService.isConnected ? '✅ Connected' : '❌ Not Connected'}</div>
                    </div>
                </div>
            `;
        }
        
        if (window.googleDriveService) {
            const driveInfo = window.googleDriveService.getUsageInfo();
            dashboardHtml += `
                <div class="usage-section">
                    <h4>💾 Google Drive</h4>
                    <div class="usage-grid">
                        <div>Uploads: ${driveInfo.rateLimits.uploads.used}/${driveInfo.rateLimits.uploads.total}</div>
                        <div>Downloads: ${driveInfo.rateLimits.downloads.used}/${driveInfo.rateLimits.downloads.total}</div>
                        <div>Max File Size: ${(driveInfo.storageLimits.maxFileSize / (1024*1024)).toFixed(0)}MB</div>
                        <div>Status: ${driveInfo.isSignedIn ? '✅ Signed In' : '❌ Not Signed In'}</div>
                    </div>
                </div>
            `;
        }
        
        // Create modal to show dashboard
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Usage Dashboard</h3>
                    <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding: 24px;">
                    ${dashboardHtml}
                    <p style="margin-top: 20px; font-size: 14px; color: var(--on-surface-variant);">
                        📖 See CLOUD_SETUP.md for setup instructions and rate limit details.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set up debug functions
        window.debugSupabase = async () => {
            const output = document.getElementById('debugOutput');
            output.innerHTML = 'Testing Supabase connection...\n';
            
            try {
                if (!window.supabaseService) {
                    window.supabaseService = new SupabaseService();
                    output.innerHTML += 'Created new SupabaseService instance\n';
                }
                
                const result = await window.supabaseService.initializeSupabase();
                output.innerHTML += `Initialization result: ${result}\n`;
                output.innerHTML += `Connection status: ${window.supabaseService.isConnected}\n`;
                
                if (window.supabaseService.supabase) {
                    output.innerHTML += 'Supabase client exists\n';
                    
                    // Test a simple query
                    const { data, error } = await window.supabaseService.supabase.from('user_stats').select('count').limit(1);
                    if (error) {
                        output.innerHTML += `Query error: ${error.message}\n`;
                        output.innerHTML += `Error code: ${error.code}\n`;
                        if (error.message.includes('relation') && error.message.includes('does not exist')) {
                            output.innerHTML += '💡 Tables need to be created. Run SQL from CLOUD_SETUP.md\n';
                        }
                    } else {
                        output.innerHTML += 'Query successful!\n';
                    }
                } else {
                    output.innerHTML += 'Supabase client not created\n';
                }
                
            } catch (error) {
                output.innerHTML += `Debug error: ${error.message}\n`;
            }
        };
        
        window.debugGoogleDrive = async () => {
            const output = document.getElementById('debugOutput');
            output.innerHTML = 'Testing Google Drive connection...\n';
            
            try {
                if (!window.googleDriveService) {
                    window.googleDriveService = new GoogleDriveService();
                    output.innerHTML += 'Created new GoogleDriveService instance\n';
                }
                
                const result = await window.googleDriveService.initializeGoogleDrive();
                output.innerHTML += `Google Drive initialization: ${result}\n`;
                output.innerHTML += `Signed in status: ${window.googleDriveService.isSignedIn}\n`;
                
            } catch (error) {
                output.innerHTML += `Debug error: ${error.message}\n`;
            }
        };
    }

    // Social Features
    toggleSocialPanel() {
        this.socialPanel.classList.toggle('active');
        this.populateSocialContent('reviews');
    }

    closeSocialPanel() {
        this.socialPanel.classList.remove('active');
    }

    switchSocialTab(tab) {
        document.querySelectorAll('.social-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        this.populateSocialContent(tab);
    }

    populateSocialContent(tab) {
        const content = this.getSocialContent(tab);
        this.socialContent.innerHTML = '';
        
        content.forEach(item => {
            const socialItem = document.createElement('div');
            socialItem.className = 'social-item';
            socialItem.innerHTML = `
                <div class="social-user">
                    <div class="user-avatar">${item.user.charAt(0).toUpperCase()}</div>
                    <div class="user-info">
                        <div class="user-name">${item.user}</div>
                        <div class="user-meta">${item.time}</div>
                    </div>
                </div>
                <div class="social-text">${item.content}</div>
                <div class="social-actions">
                    <span class="social-action">
                        <i class="fas fa-heart"></i>
                        ${item.likes}
                    </span>
                    <span class="social-action">
                        <i class="fas fa-comment"></i>
                        ${item.comments}
                    </span>
                    <span class="social-action">
                        <i class="fas fa-share"></i>
                        Share
                    </span>
                </div>
            `;
            this.socialContent.appendChild(socialItem);
        });
    }

    getSocialContent(tab) {
        const mockData = {
            reviews: [
                {
                    user: "Alice Reader",
                    time: "2 days ago",
                    content: "Absolutely brilliant! The reels format makes reading so engaging. I finished this book in one sitting!",
                    likes: 24,
                    comments: 5
                },
                {
                    user: "BookLover99",
                    time: "1 week ago", 
                    content: "Revolutionary reading experience. This is the future of digital books!",
                    likes: 18,
                    comments: 3
                }
            ],
            discussions: [
                {
                    user: "Philosophy Fan",
                    time: "3 hours ago",
                    content: "Chapter 2 really made me think about the nature of reality. What did everyone else think?",
                    likes: 12,
                    comments: 8
                }
            ],
            quotes: [
                {
                    user: "Quote Master",
                    time: "1 day ago",
                    content: '"The best way to predict the future is to create it." - This line hit different in reels format!',
                    likes: 31,
                    comments: 7
                }
            ]
        };
        
        return mockData[tab] || [];
    }

    shareProgress() {
        const progress = Math.round(((this.currentPageIndex + 1) / this.pages.length) * 100);
        const text = `I'm ${progress}% through "${this.bookTitle}" on The Book Project! 📚 The reels format is amazing! #TheBookProject #Reading`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Reading Progress',
                text: text,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(text);
            this.showNotification('Progress copied to clipboard!', 'success');
        }
    }

    // Reading Challenges
    getChallenges() {
        return [
            {
                id: 1,
                title: "Speed Reader",
                description: "Read 5 books this month",
                icon: "🚀",
                progress: 60,
                current: 3,
                target: 5,
                reward: "Speed Badge",
                completed: false
            },
            {
                id: 2,
                title: "Night Owl",
                description: "Read for 7 consecutive days",
                icon: "🦉",
                progress: 100,
                current: 7,
                target: 7,
                reward: "Night Badge",
                completed: true
            },
            {
                id: 3,
                title: "Explorer",
                description: "Read books from 3 different genres",
                icon: "🗺️",
                progress: 33,
                current: 1,
                target: 3,
                reward: "Explorer Badge",
                completed: false
            },
            {
                id: 4,
                title: "Marathon Reader",
                description: "Read for 10 hours this week",
                icon: "⏰",
                progress: 70,
                current: 7,
                target: 10,
                reward: "Marathon Badge",
                completed: false
            }
        ];
    }

    showChallengesModal() {
        this.challengesModal.classList.add('active');
        this.populateChallenges();
    }

    closeChallengesModal() {
        this.challengesModal.classList.remove('active');
    }

    populateChallenges() {
        this.challengesGrid.innerHTML = '';
        
        this.challenges.forEach(challenge => {
            const card = document.createElement('div');
            card.className = `challenge-card ${challenge.completed ? 'completed' : ''}`;
            card.innerHTML = `
                <div class="challenge-icon">${challenge.icon}</div>
                <div class="challenge-title">${challenge.title}</div>
                <div class="challenge-description">${challenge.description}</div>
                <div class="challenge-progress">
                    <div class="challenge-progress-fill" style="width: ${challenge.progress}%"></div>
                </div>
                <div class="challenge-stats">
                    <span>${challenge.current}/${challenge.target}</span>
                    <span class="challenge-reward">${challenge.reward}</span>
                </div>
            `;
            this.challengesGrid.appendChild(card);
        });
    }

    // Advanced Settings
    showSettingsModal() {
        this.settingsModal.classList.add('active');
        this.loadSettings();
        
        // Add theme selection if not already present
        if (!document.querySelector('.theme-options')) {
            const settingsContent = document.querySelector('.settings-content');
            if (settingsContent) {
                settingsContent.insertAdjacentHTML('beforeend', this.themeSelectionHTML);
                
                // Bind theme selection events
                document.querySelectorAll('.theme-option').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const themeName = btn.dataset.theme;
                        this.applyColorTheme(themeName);
                        this.showNotification(`Theme changed to ${themeName}!`, 'success');
                    });
                });
            }
        }
    }

    closeSettingsModal() {
        this.settingsModal.classList.remove('active');
    }

    loadSettings() {
        // Load current settings into the form
        const savedSettings = localStorage.getItem('readerSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            document.getElementById('fontFamily').value = settings.fontFamily || 'Georgia';
            document.getElementById('lineHeight').value = settings.lineHeight || '1.8';
            document.getElementById('readingWidth').value = settings.readingWidth || '650';
            document.getElementById('autoScrollSpeed').value = settings.autoScrollSpeed || '0';
            document.getElementById('pageAnimation').value = settings.pageAnimation || 'slide';
            
            this.updateRangeValues();
        }
    }

    updateRangeValues() {
        document.querySelectorAll('input[type="range"]').forEach(range => {
            const valueSpan = range.nextElementSibling;
            if (valueSpan && valueSpan.classList.contains('range-value')) {
                if (range.id === 'autoScrollSpeed') {
                    valueSpan.textContent = range.value === '0' ? 'Off' : range.value;
                } else if (range.id === 'readingWidth') {
                    valueSpan.textContent = range.value + 'px';
                } else {
                    valueSpan.textContent = range.value;
                }
                
                range.addEventListener('input', () => {
                    if (range.id === 'autoScrollSpeed') {
                        valueSpan.textContent = range.value === '0' ? 'Off' : range.value;
                    } else if (range.id === 'readingWidth') {
                        valueSpan.textContent = range.value + 'px';
                    } else {
                        valueSpan.textContent = range.value;
                    }
                });
            }
        });
    }

    updateFontFamily(fontFamily) {
        document.documentElement.style.setProperty('--font-reading', fontFamily);
        this.saveSettings();
    }

    updateLineHeight(lineHeight) {
        const pageContents = document.querySelectorAll('.page-content');
        pageContents.forEach(content => {
            content.style.lineHeight = lineHeight;
        });
        this.saveSettings();
    }

    updateReadingWidth(width) {
        const pageContents = document.querySelectorAll('.page-content');
        pageContents.forEach(content => {
            content.style.maxWidth = width + 'px';
        });
        this.saveSettings();
    }

    updateAutoScrollSpeed(speed) {
        // TODO: Implement auto-scroll functionality
        this.saveSettings();
    }

    updatePageAnimation(animation) {
        // TODO: Implement different page animations
        this.saveSettings();
    }

    saveSettings() {
        const settings = {
            fontFamily: document.getElementById('fontFamily').value,
            lineHeight: document.getElementById('lineHeight').value,
            readingWidth: document.getElementById('readingWidth').value,
            autoScrollSpeed: document.getElementById('autoScrollSpeed').value,
            pageAnimation: document.getElementById('pageAnimation').value
        };
        localStorage.setItem('readerSettings', JSON.stringify(settings));
        this.showNotification('Settings saved!', 'success');
    }

    populateAnnotationsList() {
        this.annotationsList.innerHTML = '';
        
        this.annotations.forEach(annotation => {
            const item = document.createElement('div');
            item.className = `annotation-item ${annotation.type}`;
            item.innerHTML = `
                <div class="annotation-meta">
                    <span class="annotation-page">Page ${annotation.pageIndex + 1}</span>
                    <span>${new Date(annotation.timestamp).toLocaleDateString()}</span>
                </div>
                <div class="annotation-text">"${annotation.text}"</div>
                ${annotation.note ? `<div class="annotation-note">${annotation.note}</div>` : ''}
            `;
            
            item.addEventListener('click', () => {
                this.goToPage(annotation.pageIndex);
                this.closeAnnotationsPanel();
            });
            
            this.annotationsList.appendChild(item);
        });
    }

    openBook(book) {
        this.showNotification(`Opening "${book.title}"...`, 'info');
        
        // For popular books, load demo content or prompt for upload
        if (book.id === 6) { // 1984 - load as demo
            setTimeout(() => {
                this.loadDemoBook();
                this.showReader();
            }, 500);
        } else {
            // Prompt to upload EPUB for this book
            setTimeout(() => {
                this.showUploadArea();
                this.showNotification('Please upload the EPUB file for this book', 'info');
            }, 500);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Phase 3: Advanced Features Implementation
    
    // Annotations System
    getAnnotations() {
        const saved = localStorage.getItem('annotations');
        return saved ? JSON.parse(saved) : [];
    }

    toggleAnnotationsPanel() {
        this.annotationsPanel.classList.toggle('active');
        this.populateAnnotationsList();
    }

    closeAnnotationsPanel() {
        this.annotationsPanel.classList.remove('active');
        this.currentAnnotationMode = null;
        this.updateAnnotationTools();
        this.updateCustomCursor();
        
        // Disable text selection when closing annotations
        document.body.classList.remove('annotation-mode', 'annotation-highlight', 'annotation-note', 'annotation-bookmark');
    }

    setAnnotationMode(mode) {
        this.currentAnnotationMode = mode;
        this.updateAnnotationTools();
        this.updateCustomCursor();
        
        // Clear previous annotation mode classes
        document.body.classList.remove('annotation-mode', 'annotation-highlight', 'annotation-note', 'annotation-bookmark');
        
        // Enable text selection when annotation mode is active
        if (mode) {
            document.body.classList.add('annotation-mode', `annotation-${mode}`);
        }
        
        this.showNotification(`${mode} mode activated - select text to annotate`, 'info');
    }

    updateAnnotationTools() {
        document.querySelectorAll('.annotation-tool').forEach(tool => {
            if (tool.dataset.type === this.currentAnnotationMode) {
                tool.classList.add('active');
            } else {
                tool.classList.remove('active');
            }
        });
    }

    handleTextSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString().trim();
            
            // Check if selection is within page content
            const pageContent = document.querySelector('.book-page.slide-current .page-content');
            if (!pageContent || !pageContent.contains(range.commonAncestorContainer)) {
                return;
            }
            
            if (selectedText.length > 0 && this.currentAnnotationMode) {
                this.selectedText = selectedText;
                this.selectionRange = range;
                this.createAnnotation();
            }
        }
    }

    createAnnotation() {
        if (!this.selectedText || !this.currentAnnotationMode) return;

        const annotation = {
            id: Date.now(),
            type: this.currentAnnotationMode,
            text: this.selectedText,
            pageIndex: this.currentPageIndex,
            chapterIndex: this.pages[this.currentPageIndex]?.chapterIndex || 0,
            timestamp: new Date().toISOString(),
            note: ''
        };

        if (this.currentAnnotationMode === 'note') {
            const note = prompt('Add your note:');
            if (note) {
                annotation.note = note;
            } else {
                return; // User cancelled
            }
        }

        this.annotations.push(annotation);
        this.saveAnnotations();
        this.applyAnnotationToCurrentPage(annotation);
        this.populateAnnotationsList();
        this.showNotification(`${this.currentAnnotationMode} added successfully!`, 'success');
        
        // Clear selection
        window.getSelection().removeAllRanges();
        this.selectedText = '';
        this.selectionRange = null;
    }

    applyAnnotationToCurrentPage(annotation) {
        const currentPage = document.querySelector('.book-page.slide-current .page-content');
        if (!currentPage) return;

        const text = annotation.text;
        let html = currentPage.innerHTML;
        
        // Create a more specific regex to avoid conflicts
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!<[^>]*)(${escapedText})(?![^<]*>)`, 'gi');
        
        if (annotation.type === 'highlight') {
            html = html.replace(regex, `<span class="highlight" data-annotation="${annotation.id}">$1</span>`);
        } else if (annotation.type === 'note') {
            html = html.replace(regex, `$1<span class="note-marker" data-annotation="${annotation.id}" title="${annotation.note}">📝</span>`);
        } else if (annotation.type === 'bookmark') {
            // For bookmarks, we'll add a bookmark icon at the beginning of the paragraph
            const firstP = currentPage.querySelector('p');
            if (firstP && !firstP.querySelector('.bookmark-marker')) {
                firstP.insertAdjacentHTML('afterbegin', `<span class="bookmark-marker" data-annotation="${annotation.id}" title="Bookmarked">🔖</span> `);
            }
        }
        
        currentPage.innerHTML = html;
        this.bindAnnotationEvents();
    }

    bindAnnotationEvents() {
        // Add click events to annotation markers
        document.querySelectorAll('[data-annotation]').forEach(marker => {
            marker.addEventListener('click', (e) => {
                e.preventDefault();
                const annotationId = marker.dataset.annotation;
                this.showAnnotationDetail(annotationId);
            });
        });
    }

    showAnnotationDetail(annotationId) {
        const annotation = this.annotations.find(a => a.id == annotationId);
        if (annotation) {
            if (annotation.type === 'note' && annotation.note) {
                alert(`Note: ${annotation.note}`);
            } else if (annotation.type === 'bookmark') {
                this.showNotification('Bookmark - page saved to your bookmarks', 'info');
            }
        }
    }

    // Fix bookmarks functionality
    saveBookmark() {
        if (this.pages.length === 0) return;
        
        const bookmark = {
            id: Date.now(),
            type: 'bookmark',
            text: `Page ${this.currentPageIndex + 1}`,
            pageIndex: this.currentPageIndex,
            chapterIndex: this.pages[this.currentPageIndex]?.chapterIndex || 0,
            chapterTitle: this.pages[this.currentPageIndex]?.chapterTitle || 'Unknown Chapter',
            timestamp: new Date().toISOString(),
            note: `Bookmarked at ${new Date().toLocaleString()}`
        };

        this.annotations.push(bookmark);
        this.saveAnnotations();
        this.populateAnnotationsList();
        this.showNotification('Page bookmarked successfully!', 'success');
    }

    // Apply annotations when page changes
    applyAnnotationsToPage() {
        const currentPage = document.querySelector('.book-page.slide-current .page-content');
        if (!currentPage) return;

        // Find annotations for current page
        const pageAnnotations = this.annotations.filter(a => a.pageIndex === this.currentPageIndex);
        
        pageAnnotations.forEach(annotation => {
            this.applyAnnotationToCurrentPage(annotation);
        });
    }

    initializeCustomCursor() {
        // Create custom cursor element
        this.customCursor = document.createElement('div');
        this.customCursor.className = 'custom-cursor';
        document.body.appendChild(this.customCursor);
        
        // Mouse move handler
        document.addEventListener('mousemove', (e) => {
            this.customCursor.style.left = e.clientX + 'px';
            this.customCursor.style.top = e.clientY + 'px';
        });
        
        // Hover effects for interactive elements
        const interactiveElements = 'button, a, input, select, .menu-item, .book-card, .category-card, .control-btn, .annotation-tool';
        
        document.addEventListener('mouseenter', (e) => {
            if (e.target && typeof e.target.matches === 'function' && e.target.matches(interactiveElements)) {
                this.customCursor.classList.add('hover');
            }
        }, true);
        
        document.addEventListener('mouseleave', (e) => {
            if (e.target && typeof e.target.matches === 'function' && e.target.matches(interactiveElements)) {
                this.customCursor.classList.remove('hover');
            }
        }, true);
        
        // Click effects
        document.addEventListener('mousedown', () => {
            this.customCursor.classList.add('click');
        });
        
        document.addEventListener('mouseup', () => {
            this.customCursor.classList.remove('click');
        });
        
        // Hide cursor when mouse leaves window
        document.addEventListener('mouseleave', () => {
            this.customCursor.style.opacity = '0';
        });
        
        document.addEventListener('mouseenter', () => {
            this.customCursor.style.opacity = '1';
        });
    }

    updateCustomCursor() {
        // Remove all annotation classes
        this.customCursor.classList.remove('annotation-highlight', 'annotation-note', 'annotation-bookmark');
        
        // Add current annotation mode class
        if (this.currentAnnotationMode) {
            this.customCursor.classList.add(`annotation-${this.currentAnnotationMode}`);
        }
    }

    async initializeBookAPI() {
        try {
            this.bookAPIService = new BookAPIService();
            console.log('📚 Book API Service initialized');
            
            // Try to load real popular books
            await this.loadRealPopularBooks();
        } catch (error) {
            console.error('Book API initialization failed:', error);
            // Fall back to static books
            this.popularBooks = this.getFallbackPopularBooks();
        }
    }

    async loadRealPopularBooks() {
        try {
            if (this.bookAPIService) {
                console.log('🔄 Loading popular books from APIs...');
                const apiBooks = await this.bookAPIService.getPopularBooks(24);
                
                if (apiBooks && apiBooks.length > 0) {
                    // Convert API format to our format
                    this.popularBooks = apiBooks.map(book => ({
                        id: book.id,
                        title: book.title,
                        author: book.author,
                        rating: parseFloat(book.rating.toFixed(1)),
                        ratingsCount: book.ratingsCount,
                        cover: this.getBookCoverDisplay(book),
                        description: book.description,
                        categories: book.categories,
                        source: book.source,
                        category: this.mapCategory(book.categories)
                    }));
                    
                    console.log(`✅ Loaded ${this.popularBooks.length} books from APIs`);
                    
                    // Update homepage if it's currently visible
                    if (this.currentView === 'homepage') {
                        this.populatePopularBooks();
                    }
                } else {
                    console.log('⚠️ No books from APIs, using fallback');
                    this.popularBooks = this.getFallbackPopularBooks();
                }
            }
        } catch (error) {
            console.error('Failed to load real books:', error);
            this.popularBooks = this.getFallbackPopularBooks();
        }
    }

    getBookCoverDisplay(book) {
        // If it's a real image URL, use it; otherwise use emoji fallback
        if (book.cover && book.cover.startsWith('http')) {
            return book.cover;
        }
        
        // Generate emoji based on category or title
        const categoryEmojis = {
            'Fiction': '📚',
            'Romance': '💕',
            'Mystery': '🔍',
            'Science Fiction': '🚀',
            'Fantasy': '🧙‍♂️',
            'Thriller': '⚡',
            'Self-Help': '⚛️',
            'Biography': '👤',
            'History': '📜',
            'Classic': '👑',
            'Contemporary': '✨',
            'Literature': '📖'
        };
        
        // Try to match category
        for (const [category, emoji] of Object.entries(categoryEmojis)) {
            if (book.categories?.some(cat => cat.toLowerCase().includes(category.toLowerCase()))) {
                return emoji;
            }
        }
        
        // Default fallback
        return '📚';
    }

    mapCategory(categories) {
        if (!categories || categories.length === 0) return 'fiction';
        
        const category = categories[0].toLowerCase();
        
        if (category.includes('romance')) return 'romance';
        if (category.includes('mystery') || category.includes('thriller')) return 'mystery';
        if (category.includes('science') || category.includes('sci-fi')) return 'sci-fi';
        if (category.includes('fantasy')) return 'fantasy';
        if (category.includes('classic')) return 'classic';
        if (category.includes('self-help') || category.includes('productivity')) return 'non-fiction';
        
        return 'fiction';
    }

    // Keep fallback method for when APIs fail
    getFallbackPopularBooks() {
        return [
            {
                id: 1,
                title: "The Seven Husbands of Evelyn Hugo",
                author: "Taylor Jenkins Reid",
                rating: 4.8,
                ratingsCount: 234567,
                cover: "📚",
                category: "fiction",
                source: "Curated"
            },
            {
                id: 2,
                title: "Atomic Habits",
                author: "James Clear",
                rating: 4.7,
                ratingsCount: 187432,
                cover: "⚛️",
                category: "non-fiction",
                source: "Curated"
            },
            {
                id: 3,
                title: "Project Hail Mary",
                author: "Andy Weir",
                rating: 4.9,
                ratingsCount: 156789,
                cover: "🚀",
                category: "sci-fi",
                source: "Curated"
            },
            {
                id: 4,
                title: "The Silent Patient",
                author: "Alex Michaelides",
                rating: 4.5,
                ratingsCount: 298765,
                cover: "🔍",
                category: "mystery",
                source: "Curated"
            },
            {
                id: 5,
                title: "It Ends with Us",
                author: "Colleen Hoover",
                rating: 4.6,
                ratingsCount: 445321,
                cover: "💕",
                category: "romance",
                source: "Curated"
            },
            {
                id: 6,
                title: "1984",
                author: "George Orwell",
                rating: 4.8,
                ratingsCount: 1234567,
                cover: "👁️",
                category: "classic",
                source: "Curated"
            }
        ];
    }

    initializeVotingSystem() {
        this.userVotes = this.loadUserVotes() || {};
        console.log('🗳️ Voting system initialized');
    }

    loadUserVotes() {
        try {
            const saved = localStorage.getItem('bookVotes');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.warn('Error loading user votes:', error);
            return {};
        }
    }

    saveUserVotes() {
        localStorage.setItem('bookVotes', JSON.stringify(this.userVotes));
    }

    voteBook(bookId, voteType) {
        // voteType: 'up' or 'down'
        const previousVote = this.userVotes[bookId];
        
        if (previousVote === voteType) {
            // Remove vote if clicking same vote type
            delete this.userVotes[bookId];
        } else {
            // Set new vote
            this.userVotes[bookId] = voteType;
        }
        
        this.saveUserVotes();
        this.updateBookVoteDisplay(bookId);
        this.showNotification(`Book ${voteType}voted!`, 'success');
    }

    updateBookVoteDisplay(bookId) {
        const bookCard = document.querySelector(`[data-book-id="${bookId}"]`);
        if (bookCard) {
            const upBtn = bookCard.querySelector('.vote-up');
            const downBtn = bookCard.querySelector('.vote-down');
            const vote = this.userVotes[bookId];
            
            // Reset styles
            upBtn?.classList.remove('active');
            downBtn?.classList.remove('active');
            
            // Apply active style
            if (vote === 'up') upBtn?.classList.add('active');
            if (vote === 'down') downBtn?.classList.add('active');
        }
    }

    backToHomepage() {
        // Stop any auto-scrolling
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
        
        // Reset reader state
        this.currentPageIndex = 0;
        this.reelsContainer.innerHTML = '';
        
        // Show homepage
        this.showHomepage();
        this.showNotification('Returned to homepage', 'info');
    }

    showDemoBook(bookId = null) {
        // Find the book if ID is provided
        if (bookId) {
            const book = this.popularBooks.find(b => b.id === bookId);
            if (book) {
                this.showNotification(`Loading "${book.title}"...`, 'info');
                // Here you could load the actual book content
                // For now, we'll show the demo
            }
        }
        
        this.currentView = 'reader';
        this.loadDemoBook();
        this.hideHomepage();
        this.showReaderInterface();
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHTML = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }
        
        // Half star
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }
        
        return starsHTML;
    }

    initializeMaterialYouTheming() {
        // Set up dynamic color theming
        this.currentColorTheme = localStorage.getItem('materialYouTheme') || 'purple';
        this.applyColorTheme(this.currentColorTheme);
        
        // Add theme selection UI to settings
        this.addThemeSelectionToSettings();
        
        console.log('🎨 Material You theming initialized');
    }

    applyColorTheme(themeName) {
        // Remove existing theme classes
        const themes = ['theme-purple', 'theme-blue', 'theme-green', 'theme-orange', 'theme-red'];
        themes.forEach(theme => {
            document.documentElement.classList.remove(theme);
        });
        
        // Apply new theme
        if (themes.includes(`theme-${themeName}`)) {
            document.documentElement.classList.add(`theme-${themeName}`);
            this.currentColorTheme = themeName;
            localStorage.setItem('materialYouTheme', themeName);
            
            // Update any UI elements that need the new colors
            this.updateThemeIndicators();
        }
    }

    updateThemeIndicators() {
        // Update any visual indicators of the current theme
        const themeButtons = document.querySelectorAll('.theme-option');
        themeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.currentColorTheme);
        });
    }

    addThemeSelectionToSettings() {
        // This will be called when settings modal is opened to add theme selection
        const themes = [
            { name: 'purple', label: 'Purple', color: '#6750A4' },
            { name: 'blue', label: 'Blue', color: '#1976D2' },
            { name: 'green', label: 'Green', color: '#388E3C' },
            { name: 'orange', label: 'Orange', color: '#F57C00' },
            { name: 'red', label: 'Red', color: '#D32F2F' }
        ];
        
        this.themeSelectionHTML = `
            <div class="setting-group">
                <h4>🎨 Color Theme</h4>
                <div class="theme-options">
                    ${themes.map(theme => `
                        <button class="theme-option ${theme.name === this.currentColorTheme ? 'active' : ''}" 
                                data-theme="${theme.name}" 
                                style="background-color: ${theme.color}"
                                title="${theme.label}">
                            <span class="theme-check">✓</span>
                        </button>
                    `).join('')}
                </div>
                <p class="setting-description">Choose your preferred accent color for the Material You theme</p>
            </div>
        `;
    }

    // Extract colors from book cover (for future enhancement)
    extractColorsFromCover(imageUrl) {
        // This is a placeholder for future color extraction
        // In a full implementation, you'd use a library like ColorThief
        // to extract dominant colors from book covers
        return new Promise((resolve) => {
            // For now, return a random theme
            const themes = ['purple', 'blue', 'green', 'orange', 'red'];
            const randomTheme = themes[Math.floor(Math.random() * themes.length)];
            resolve(randomTheme);
        });
    }

    // Override existing showSettingsModal to include theme selection
    showSettingsModal() {
        this.settingsModal.classList.add('active');
        this.loadSettings();
        
        // Add theme selection if not already present
        if (!document.querySelector('.theme-options')) {
            const settingsContent = document.querySelector('.settings-content');
            if (settingsContent) {
                settingsContent.insertAdjacentHTML('beforeend', this.themeSelectionHTML);
                
                // Bind theme selection events
                document.querySelectorAll('.theme-option').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const themeName = btn.dataset.theme;
                        this.applyColorTheme(themeName);
                        this.showNotification(`Theme changed to ${themeName}!`, 'success');
                    });
                });
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.bookReader = new EpubReelsReader();
}); 
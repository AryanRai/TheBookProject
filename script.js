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
            this.navigateBack();
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
        
        setTimeout(() => {
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
            bookCard.innerHTML = `
                <div class="book-cover">
                    <span style="font-size: 48px;">${book.cover}</span>
                </div>
                <div class="book-info">
                    <div class="book-title">${book.title}</div>
                    <div class="book-author">by ${book.author}</div>
                    <div class="book-rating">
                        <span class="stars">${'★'.repeat(Math.floor(book.rating))}${'☆'.repeat(5-Math.floor(book.rating))}</span>
                        <span class="rating-number">${book.rating}</span>
                    </div>
                </div>
            `;
            
            bookCard.addEventListener('click', () => {
                this.openBook(book);
            });
            
            this.popularBooksGrid.appendChild(bookCard);
        });
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
            
            // Simulate Google Drive API integration
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // For now, just show success message
            this.showNotification('Google Drive connected successfully!', 'success');
            
            // TODO: Implement actual Google Drive API integration
            // - OAuth 2.0 authentication
            // - File picker for EPUB files
            // - Sync reading progress
            
        } catch (error) {
            console.error('Google Drive connection failed:', error);
            this.showNotification('Failed to connect to Google Drive', 'error');
        }
    }

    async connectSupabase() {
        try {
            // Show loading
            this.showNotification('Connecting to Library...', 'info');
            
            // Simulate Supabase connection
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For now, just show success message
            this.showNotification('Library connected successfully!', 'success');
            
            // TODO: Implement actual Supabase integration
            // - User authentication
            // - Book library management
            // - Reading progress sync
            // - Social features
            
        } catch (error) {
            console.error('Supabase connection failed:', error);
            this.showNotification('Failed to connect to Library', 'error');
        }
    }

    showLibrary() {
        this.showNotification('Library feature coming soon!', 'info');
        // TODO: Implement library view
    }

    browseCategory(category) {
        this.showNotification(`Browsing ${category} books...`, 'info');
        // TODO: Implement category filtering
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EpubReelsReader();
}); 
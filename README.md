# The Book Project - Reels EPUB Reader

A modern, Instagram/TikTok-style swipable EPUB book reader that transforms traditional reading into an engaging, mobile-first experience.

## 🌟 Features

### 📱 Reels-Style Reading
- **Vertical Swipe Navigation**: Swipe up/down to navigate through book pages like social media reels
- **Full-Screen Pages**: Each page takes up the entire screen for immersive reading
- **Smooth Animations**: Fluid transitions between pages with CSS3 animations
- **Touch Feedback**: Visual feedback for touch interactions

### 📖 EPUB Support
- **Full EPUB Parsing**: Complete EPUB file parsing with JSZip
- **Chapter Recognition**: Automatic chapter detection and navigation
- **Content Cleaning**: Removes conflicting styles while preserving formatting
- **Responsive Layout**: Adapts to different screen sizes and orientations

### 🎨 Modern UI/UX
- **Mobile-First Design**: Optimized for touch devices
- **Gradient Backgrounds**: Beautiful color gradients throughout the interface
- **Glassmorphism Effects**: Modern frosted glass effects with backdrop blur
- **Dark Mode Support**: Automatic dark mode based on system preferences

### 🚀 Interactive Controls
- **Touch Gestures**: Swipe up/down for page navigation
- **Button Controls**: Floating navigation buttons for desktop users
- **Keyboard Support**: Arrow keys for navigation, Escape for menus
- **Mouse Wheel**: Desktop scroll wheel support

### ⚙️ Customization
- **Adjustable Font Size**: 6 different font sizes (15px - 24px)
- **Progress Tracking**: Visual progress bar showing reading completion
- **Chapter Navigation**: Side panel with quick chapter access
- **Responsive Text**: Auto-adjusting layout based on screen size

### 🔧 Technical Features
- **Progressive Web App Ready**: Can be installed as a PWA
- **Offline Capable**: Works without internet after initial load
- **Performance Optimized**: Efficient page rendering and memory management
- **Cross-Platform**: Works on iOS, Android, and desktop browsers

## 🎯 How to Use

### Getting Started
1. Open `index.html` in a modern web browser
2. You'll see the welcome screen with two options:
   - **Upload EPUB**: Choose your own EPUB file
   - **Load Demo**: Try Alice in Wonderland demo

### Navigation
- **Touch Devices**: Swipe up for next page, swipe down for previous page
- **Desktop**: Use arrow keys, mouse wheel, or floating control buttons
- **Menu**: Tap the menu button (⋮) in the header for options

### Features Access
- **Chapters**: Access via menu → Chapters or swipe from right edge
- **Font Size**: Menu → Font Size (cycles through 6 sizes)
- **Progress**: Automatic progress tracking in the header bar

## 🛠️ Technical Implementation

### Core Technologies
- **HTML5**: Semantic markup with modern web standards
- **CSS3**: Advanced styling with animations and responsive design
- **Vanilla JavaScript**: ES6+ features for modern browser compatibility
- **JSZip**: EPUB file parsing and extraction

### Architecture
```
EpubReelsReader Class
├── EPUB Parsing (loadEpub, extractChapters)
├── Page Generation (splitIntoPages, createPages)
├── Touch Handling (handleTouchStart, handleTouchEnd)
├── Navigation (nextPage, previousPage, goToPage)
├── UI Controls (toggleMenu, toggleSidePanel)
└── Responsive Handling (redistributeContent)
```

### Page Generation Algorithm
1. **Content Extraction**: Parse EPUB chapters and clean HTML
2. **Height Calculation**: Measure content height using temporary DOM elements
3. **Page Splitting**: Intelligently split content to fit screen height
4. **Dynamic Updates**: Recalculate pages on font size or screen changes

### Touch Gesture Recognition
- **Touch Start**: Record initial touch position
- **Touch Move**: Prevent default scrolling
- **Touch End**: Calculate swipe direction and distance
- **Threshold**: 50px minimum swipe distance for page changes

## 📱 Mobile Optimization

### Responsive Breakpoints
- **Desktop**: > 768px - Full sidebar, larger fonts
- **Tablet**: 481px - 768px - Adapted layout
- **Mobile**: ≤ 480px - Compact design, full-width panels

### Performance Features
- **Lazy Rendering**: Only visible pages are fully rendered
- **Memory Management**: Efficient DOM manipulation
- **Touch Optimization**: Prevents unwanted scrolling and zooming
- **Fast Animations**: Hardware-accelerated CSS transitions

## 🎨 Design System

### Color Palette
```css
--primary-color: #667eea (Soft Blue)
--secondary-color: #764ba2 (Purple)
--accent-color: #f093fb (Pink)
--text-color: #333 (Dark Gray)
--bg-color: #000 (Black)
```

### Typography
- **Font Family**: Inter (Google Fonts)
- **Reading Sizes**: 15px, 16px, 18px, 20px, 22px, 24px
- **Line Height**: 1.8 for optimal readability
- **Text Justification**: Justified text with automatic hyphenation

### Animations
- **Page Transitions**: 300ms cubic-bezier easing
- **Touch Feedback**: Ripple effect on touch
- **Loading States**: Smooth spinners and state changes

## 🔧 Browser Compatibility

### Supported Browsers
- **Chrome**: 60+ ✅
- **Firefox**: 55+ ✅
- **Safari**: 12+ ✅
- **Edge**: 79+ ✅

### Required Features
- CSS Grid & Flexbox
- ES6+ JavaScript
- File API
- Touch Events
- CSS3 Animations

## 🚀 Installation & Setup

### Simple Setup
1. Download/clone the project files
2. Open `index.html` in a web browser
3. No build process or dependencies required!

### Local Development
```bash
# Option 1: Python Simple Server
python -m http.server 8000

# Option 2: Node.js Live Server
npx live-server

# Option 3: VS Code Live Server Extension
```

### PWA Installation
The app can be installed as a Progressive Web App:
1. Open in Chrome/Edge on mobile
2. Tap "Add to Home Screen"
3. Use like a native app

## 📈 Future Enhancements

### Planned Features
- [ ] **Bookmarks**: Save and navigate to specific pages
- [ ] **Reading Statistics**: Track reading time and progress
- [ ] **Themes**: Multiple color themes and reading modes
- [ ] **Text-to-Speech**: Audio narration support
- [ ] **Annotations**: Highlight and note-taking features
- [ ] **Cloud Sync**: Save progress across devices

### Technical Improvements
- [ ] **Web Workers**: Background EPUB processing
- [ ] **Service Worker**: Full offline functionality
- [ ] **Virtual Scrolling**: Better performance for large books
- [ ] **Image Support**: EPUB images and media handling

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- EPUB compatibility (more file formats)
- Performance optimizations
- Accessibility features
- Additional gesture controls
- UI/UX enhancements

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Alice in Wonderland**: Project Gutenberg for demo content
- **Inter Font**: Google Fonts
- **Font Awesome**: Icons
- **JSZip**: EPUB file handling

---

**Made with ❤️ for modern readers who want to experience books in a fresh, engaging way.** 
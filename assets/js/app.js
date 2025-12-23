/**
 * Helianthus Server Website
 * Main Application Entry Point
 *
 * Architecture: Modular ES6+ with Dependency Injection
 * Pattern: Module Pattern + Observer Pattern
 *
 * @author Caelus
 * @version 3.0.0
 */

(function(window, document) {
    'use strict';

    /**
     * Configuration Constants
     */
    const CONFIG = {
        selectors: {
            nav: '.c-nav',
            navLinks: '.c-nav__link',
            lazyImages: '[data-lazy]',
            animateOnScroll: '[data-animate]',
            mainContent: 'main'
        },
        classNames: {
            navLinkActive: 'c-nav__link--active',
            isVisible: 'is-visible',
            isLoaded: 'is-loaded',
            hasError: 'has-error'
        },
        attributes: {
            ariaCurrentPage: 'page'
        },
        performance: {
            debounceDelay: 250,
            throttleDelay: 100
        }
    };

    /**
     * Utility Functions Module
     */
    const Utils = {
        /**
         * Debounce function execution
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in milliseconds
         * @returns {Function} Debounced function
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function execution
         * @param {Function} func - Function to throttle
         * @param {number} limit - Time limit in milliseconds
         * @returns {Function} Throttled function
         */
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Get current page name from URL
         * @returns {string} Current page filename
         */
        getCurrentPage() {
            const path = window.location.pathname;
            return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        },

        /**
         * Query selector with error handling
         * @param {string} selector - CSS selector
         * @param {Element} context - Context element (default: document)
         * @returns {Element|null} Selected element
         */
        qs(selector, context = document) {
            try {
                return context.querySelector(selector);
            } catch (error) {
                console.error(`Error selecting: ${selector}`, error);
                return null;
            }
        },

        /**
         * Query selector all with error handling
         * @param {string} selector - CSS selector
         * @param {Element} context - Context element (default: document)
         * @returns {NodeList} Selected elements
         */
        qsa(selector, context = document) {
            try {
                return context.querySelectorAll(selector);
            } catch (error) {
                console.error(`Error selecting: ${selector}`, error);
                return [];
            }
        }
    };

    /**
     * Navigation Manager Module
     * Handles navigation state and interactions
     */
    class NavigationManager {
        constructor(config) {
            this.config = config;
            this.navElement = Utils.qs(config.selectors.nav);
            this.navLinks = Utils.qsa(config.selectors.navLinks);
            this.currentPage = Utils.getCurrentPage();

            this.init();
        }

        /**
         * Initialize navigation manager
         */
        init() {
            if (!this.navElement || !this.navLinks.length) {
                console.warn('Navigation elements not found');
                return;
            }

            this.setActiveLink();
            this.attachEventListeners();
            console.info('✓ NavigationManager initialized');
        }

        /**
         * Set active navigation link based on current page
         */
        setActiveLink() {
            this.navLinks.forEach(link => {
                const href = link.getAttribute('href');
                const isActive = href === this.currentPage || href === `./${this.currentPage}`;

                if (isActive) {
                    link.classList.add(this.config.classNames.navLinkActive);
                    link.setAttribute('aria-current', this.config.attributes.ariaCurrentPage);
                } else {
                    link.classList.remove(this.config.classNames.navLinkActive);
                    link.removeAttribute('aria-current');
                }
            });
        }

        /**
         * Attach event listeners
         */
        attachEventListeners() {
            this.navLinks.forEach(link => {
                link.addEventListener('mouseenter', this.handleLinkHover.bind(this));
                link.addEventListener('focus', this.handleLinkFocus.bind(this));
            });
        }

        /**
         * Handle link hover
         * @param {Event} event - Mouse event
         */
        handleLinkHover(event) {
            // Add custom hover effects if needed
            event.currentTarget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }

        /**
         * Handle link focus
         * @param {Event} event - Focus event
         */
        handleLinkFocus(event) {
            // Ensure visibility for keyboard navigation
            event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Image Lazy Loading Module
     * Handles progressive image loading with Intersection Observer
     */
    class ImageLazyLoader {
        constructor(config) {
            this.config = config;
            this.images = Utils.qsa(config.selectors.lazyImages);
            this.observer = null;

            this.init();
        }

        /**
         * Initialize lazy loading
         */
        init() {
            if (!this.images.length) {
                return;
            }

            if ('IntersectionObserver' in window) {
                this.createObserver();
                this.observeImages();
            } else {
                this.loadAllImages();
            }

            console.info('✓ ImageLazyLoader initialized');
        }

        /**
         * Create Intersection Observer
         */
        createObserver() {
            const options = {
                root: null,
                rootMargin: '50px',
                threshold: 0.01
            };

            this.observer = new IntersectionObserver(
                this.handleIntersection.bind(this),
                options
            );
        }

        /**
         * Observe all lazy images
         */
        observeImages() {
            this.images.forEach(image => this.observer.observe(image));
        }

        /**
         * Handle intersection
         * @param {IntersectionObserverEntry[]} entries - Observer entries
         */
        handleIntersection(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }

        /**
         * Load single image
         * @param {HTMLImageElement} image - Image element
         */
        loadImage(image) {
            const src = image.dataset.lazy;

            if (!src) return;

            image.addEventListener('load', () => {
                image.classList.add(this.config.classNames.isLoaded);
                image.removeAttribute('data-lazy');
            });

            image.addEventListener('error', () => {
                image.classList.add(this.config.classNames.hasError);
                console.error(`Failed to load image: ${src}`);
            });

            image.src = src;
        }

        /**
         * Fallback: Load all images immediately
         */
        loadAllImages() {
            this.images.forEach(image => this.loadImage(image));
        }
    }

    /**
     * Scroll Animation Module
     * Handles scroll-triggered animations with Intersection Observer
     */
    class ScrollAnimator {
        constructor(config) {
            this.config = config;
            this.elements = Utils.qsa(config.selectors.animateOnScroll);
            this.observer = null;

            this.init();
        }

        /**
         * Initialize scroll animations
         */
        init() {
            if (!this.elements.length) {
                return;
            }

            if ('IntersectionObserver' in window) {
                this.createObserver();
                this.observeElements();
            } else {
                this.showAllElements();
            }

            console.info('✓ ScrollAnimator initialized');
        }

        /**
         * Create Intersection Observer
         */
        createObserver() {
            const options = {
                root: null,
                rootMargin: '-50px',
                threshold: 0.1
            };

            this.observer = new IntersectionObserver(
                this.handleIntersection.bind(this),
                options
            );
        }

        /**
         * Observe all animatable elements
         */
        observeElements() {
            this.elements.forEach(element => this.observer.observe(element));
        }

        /**
         * Handle intersection
         * @param {IntersectionObserverEntry[]} entries - Observer entries
         */
        handleIntersection(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(this.config.classNames.isVisible);
                    // Optionally unobserve after animation
                    // this.observer.unobserve(entry.target);
                }
            });
        }

        /**
         * Fallback: Show all elements
         */
        showAllElements() {
            this.elements.forEach(element => {
                element.classList.add(this.config.classNames.isVisible);
            });
        }
    }

    /**
     * Smooth Scroll Module
     * Handles smooth scrolling for anchor links
     */
    class SmoothScroller {
        constructor(config) {
            this.config = config;
            this.anchorLinks = Utils.qsa('a[href^="#"]');

            this.init();
        }

        /**
         * Initialize smooth scrolling
         */
        init() {
            if (!this.anchorLinks.length) {
                return;
            }

            this.attachEventListeners();
            console.info('✓ SmoothScroller initialized');
        }

        /**
         * Attach event listeners
         */
        attachEventListeners() {
            this.anchorLinks.forEach(link => {
                link.addEventListener('click', this.handleClick.bind(this));
            });
        }

        /**
         * Handle anchor link click
         * @param {Event} event - Click event
         */
        handleClick(event) {
            const href = event.currentTarget.getAttribute('href');

            if (href === '#') return;

            const target = Utils.qs(href);

            if (target) {
                event.preventDefault();

                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Update URL without triggering navigation
                if (window.history.pushState) {
                    window.history.pushState(null, '', href);
                }

                // Set focus for accessibility
                target.setAttribute('tabindex', '-1');
                target.focus();
            }
        }
    }

    /**
     * Accessibility Manager Module
     * Enhances keyboard navigation and ARIA support
     */
    class AccessibilityManager {
        constructor(config) {
            this.config = config;

            this.init();
        }

        /**
         * Initialize accessibility features
         */
        init() {
            this.addSkipLink();
            this.enhanceKeyboardNav();
            this.manageFocus();
            console.info('✓ AccessibilityManager initialized');
        }

        /**
         * Add skip to content link
         */
        addSkipLink() {
            if (Utils.qs('.c-skip-link')) return;

            const skipLink = document.createElement('a');
            skipLink.className = 'c-skip-link';
            skipLink.href = '#main-content';
            skipLink.textContent = 'Skip to main content';

            skipLink.style.cssText = `
        position: absolute;
        top: -100px;
        left: 0;
        background: var(--color-primary);
        color: var(--color-neutral-900);
        padding: var(--space-4);
        z-index: 10000;
        text-decoration: none;
        font-weight: bold;
        transition: top 0.3s;
      `;

            skipLink.addEventListener('focus', () => {
                skipLink.style.top = '0';
            });

            skipLink.addEventListener('blur', () => {
                skipLink.style.top = '-100px';
            });

            document.body.insertBefore(skipLink, document.body.firstChild);

            // Add ID to main content if it doesn't exist
            const mainContent = Utils.qs(this.config.selectors.mainContent);
            if (mainContent && !mainContent.id) {
                mainContent.id = 'main-content';
            }
        }

        /**
         * Enhance keyboard navigation
         */
        enhanceKeyboardNav() {
            document.addEventListener('keydown', (event) => {
                // Add custom keyboard shortcuts if needed
                if (event.key === 'Escape') {
                    // Close modals, dropdowns, etc.
                    const activeElement = document.activeElement;
                    if (activeElement) {
                        activeElement.blur();
                    }
                }
            });
        }

        /**
         * Manage focus for dynamic content
         */
        manageFocus() {
            // Trap focus in modals, ensure visible focus indicators
            const focusableElements = 'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])';

            document.addEventListener('focusin', (event) => {
                const target = event.target;
                if (target.matches(focusableElements)) {
                    target.style.outline = '2px solid var(--color-primary)';
                    target.style.outlineOffset = '2px';
                }
            });

            document.addEventListener('focusout', (event) => {
                const target = event.target;
                if (target.matches(focusableElements)) {
                    target.style.outline = '';
                    target.style.outlineOffset = '';
                }
            });
        }
    }

    /**
     * Performance Monitor Module
     * Tracks and logs performance metrics
     */
    class PerformanceMonitor {
        constructor() {
            this.isDevelopment = this.checkEnvironment();

            if (this.isDevelopment) {
                this.init();
            }
        }

        /**
         * Check if running in development environment
         * @returns {boolean} Is development
         */
        checkEnvironment() {
            return window.location.hostname === 'localhost' ||
                window.location.hostname.includes('127.0.0.1') ||
                window.location.hostname.includes('192.168');
        }

        /**
         * Initialize performance monitoring
         */
        init() {
            this.logPageLoad();
            this.logWebVitals();
            console.info('✓ PerformanceMonitor initialized (dev only)');
        }

        /**
         * Log page load metrics
         */
        logPageLoad() {
            window.addEventListener('load', () => {
                const perfData = performance.getEntriesByType('navigation')[0];

                if (perfData) {
                    console.group('📊 Performance Metrics');
                    console.log(`DOM Load: ${Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart)}ms`);
                    console.log(`Page Load: ${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`);
                    console.log(`DNS Lookup: ${Math.round(perfData.domainLookupEnd - perfData.domainLookupStart)}ms`);
                    console.groupEnd();
                }
            });
        }

        /**
         * Log Web Vitals (LCP, FID, CLS)
         */
        logWebVitals() {
            // Simplified Web Vitals tracking
            if ('PerformanceObserver' in window) {
                // Largest Contentful Paint
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    console.log(`LCP: ${Math.round(lastEntry.renderTime || lastEntry.loadTime)}ms`);
                }).observe({ entryTypes: ['largest-contentful-paint'] });
            }
        }
    }

    /**
     * Application Class
     * Main application controller
     */
    class Application {
        constructor(config) {
            this.config = config;
            this.modules = new Map();

            this.initialize();
        }

        /**
         * Initialize application
         */
        initialize() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.start());
            } else {
                this.start();
            }
        }

        /**
         * Start application
         */
        start() {
            console.group('🌻 Helianthus Website v3.0.0');

            try {
                // Initialize all modules
                this.registerModule('navigation', new NavigationManager(this.config));
                this.registerModule('lazyLoader', new ImageLazyLoader(this.config));
                this.registerModule('scrollAnimator', new ScrollAnimator(this.config));
                this.registerModule('smoothScroller', new SmoothScroller(this.config));
                this.registerModule('accessibility', new AccessibilityManager(this.config));
                this.registerModule('performance', new PerformanceMonitor());

                console.info('✅ Application initialized successfully');
            } catch (error) {
                console.error('❌ Application initialization failed:', error);
            }

            console.groupEnd();
        }

        /**
         * Register module
         * @param {string} name - Module name
         * @param {Object} instance - Module instance
         */
        registerModule(name, instance) {
            this.modules.set(name, instance);
        }

        /**
         * Get module by name
         * @param {string} name - Module name
         * @returns {Object|null} Module instance
         */
        getModule(name) {
            return this.modules.get(name) || null;
        }
    }

    /**
     * Initialize Application
     */
    const app = new Application(CONFIG);

    // Expose to window for debugging (development only)
    if (window.location.hostname === 'localhost') {
        window.HeliantusApp = app;
    }

})(window, document);
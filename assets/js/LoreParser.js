/**
 * LORE MARKDOWN SYSTEM
 * ====================
 * A modular system for loading and rendering markdown content
 * with automatic table of contents generation.
 *
 * USAGE:
 * const lore = new LoreRenderer('lore.md');
 * lore.init();
 *
 * CUSTOM SYNTAX:
 * - # Title           -> Page title
 * - > Subtitle        -> Page subtitle (first blockquote after title)
 * - ## Section        -> Creates a card section
 * - ::: callout       -> Callout box (end with :::)
 */

// ============================================
// MARKDOWN PREPROCESSOR
// Handles custom syntax before marked.js parsing
// ============================================
class MarkdownPreprocessor {
    constructor() {
        this.processors = [];
        this.registerDefaultProcessors();
    }

    registerDefaultProcessors() {
        // Callout blocks: ::: callout ... :::
        this.register(this.processCallouts.bind(this));
    }

    register(processorFn) {
        this.processors.push(processorFn);
    }

    process(markdown) {
        return this.processors.reduce((md, processor) => processor(md), markdown);
    }

    processCallouts(markdown) {
        const calloutRegex = /^::: ?callout\n([\s\S]*?)^:::/gm;
        const calloutTemplate = `<div style="margin: 1.5rem 0; padding: 1rem; background: var(--color-bg-card); border-radius: 8px;">\n\n$1\n\n</div>`;

        return markdown.replace(calloutRegex, (match, content) => {
            return calloutTemplate.replace('$1', content.trim());
        });
    }
}


// ============================================
// CONTENT PARSER
// Extracts structure from markdown
// ============================================
class ContentParser {
    constructor(preprocessor) {
        this.preprocessor = preprocessor;
    }

    parse(markdown) {
        const processed = this.preprocessor.process(markdown);
        const sections = processed.split(/^## /gm);
        const intro = sections.shift();

        return {
            title: this.extractTitle(intro),
            subtitle: this.extractSubtitle(intro),
            sections: sections.map(section => this.parseSection(section))
        };
    }

    extractTitle(intro) {
        const match = intro.match(/^# (.+)$/m);
        return match ? match[1] : 'Untitled';
    }

    extractSubtitle(intro) {
        const match = intro.match(/^> (.+)$/m);
        return match ? match[1] : null;
    }

    parseSection(sectionText) {
        const lines = sectionText.split('\n');
        const title = lines.shift().trim();
        const body = lines.join('\n').trim();
        const slug = this.createSlug(title);

        return { title, body, slug };
    }

    createSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
}


// ============================================
// TABLE OF CONTENTS GENERATOR
// Builds the TOC from parsed sections
// ============================================
class TOCGenerator {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.listSelector = '#toc-list';
    }

    generate(sections) {
        const list = document.querySelector(this.listSelector);
        if (!list) return;

        list.innerHTML = '';

        sections.forEach(section => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${section.slug}`;
            link.textContent = section.title;
            item.appendChild(link);
            list.appendChild(item);
        });

        this.show();
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
}


// ============================================
// SECTION RENDERER
// Creates HTML elements for each section
// ============================================
class SectionRenderer {
    constructor() {
        marked.setOptions({
            breaks: false,
            gfm: true
        });
    }

    render(section, isFirst = false) {
        const element = document.createElement('div');
        element.className = isFirst ? 'c-card' : 'c-card u-mt-8';
        element.setAttribute('data-animate', '');
        element.id = section.slug;

        element.innerHTML = `
      <div class="c-card__header">
        <h2 class="c-card__title">${this.escapeHtml(section.title)}</h2>
      </div>
      <div class="c-card__body">
        ${marked.parse(section.body)}
      </div>
    `;

        return element;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


// ============================================
// PAGE RENDERER
// Updates page elements (title, subtitle, etc.)
// ============================================
class PageRenderer {
    constructor(options = {}) {
        this.titleSelector = options.titleSelector || '#page-title';
        this.subtitleSelector = options.subtitleSelector || '#page-subtitle';
        this.contentSelector = options.contentSelector || '#content';
        this.titleSuffix = options.titleSuffix || ' - Helianthus';
    }

    setTitle(title) {
        const element = document.querySelector(this.titleSelector);
        if (element) {
            element.textContent = title;
        }
        document.title = title + this.titleSuffix;
    }

    setSubtitle(subtitle) {
        const element = document.querySelector(this.subtitleSelector);
        if (element && subtitle) {
            element.textContent = subtitle;
        }
    }

    getContentContainer() {
        return document.querySelector(this.contentSelector);
    }

    clearContent() {
        const container = this.getContentContainer();
        if (container) {
            container.innerHTML = '';
        }
    }

    appendContent(element) {
        const container = this.getContentContainer();
        if (container) {
            container.appendChild(element);
        }
    }

    showError(message, details = '') {
        const container = this.getContentContainer();
        if (container) {
            container.innerHTML = `
        <div class="c-card" data-animate>
          <div class="c-card__header">
            <h2 class="c-card__title">Error Loading Content</h2>
          </div>
          <div class="c-card__body">
            <p>${message}</p>
            ${details ? `<p><small>${details}</small></p>` : ''}
          </div>
        </div>
      `;
        }
    }

    showLoading(message = 'Loading...') {
        const container = this.getContentContainer();
        if (container) {
            container.innerHTML = `<p class="u-text-center">${message}</p>`;
        }
    }
}


// ============================================
// MARKDOWN FETCHER
// Handles loading markdown files
// ============================================
class MarkdownFetcher {
    async fetch(filePath) {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
        }

        return response.text();
    }
}


// ============================================
// LORE RENDERER (Main Controller)
// Orchestrates all components
// ============================================
class LoreRenderer {
    constructor(markdownFile, options = {}) {
        this.markdownFile = markdownFile;

        // Initialize components
        this.fetcher = new MarkdownFetcher();
        this.preprocessor = new MarkdownPreprocessor();
        this.parser = new ContentParser(this.preprocessor);
        this.sectionRenderer = new SectionRenderer();
        this.pageRenderer = new PageRenderer(options);
        this.tocGenerator = new TOCGenerator(options.tocSelector || '#toc');
    }

    async init() {
        this.pageRenderer.showLoading('Loading scriptures...');

        try {
            const markdown = await this.fetcher.fetch(this.markdownFile);
            this.render(markdown);
        } catch (error) {
            this.handleError(error);
        }
    }

    render(markdown) {
        const content = this.parser.parse(markdown);

        // Update page
        this.pageRenderer.setTitle(content.title);
        this.pageRenderer.setSubtitle(content.subtitle);
        this.pageRenderer.clearContent();

        // Generate TOC
        this.tocGenerator.generate(content.sections);

        // Render sections
        content.sections.forEach((section, index) => {
            const element = this.sectionRenderer.render(section, index === 0);
            this.pageRenderer.appendContent(element);
        });
    }

    handleError(error) {
        console.error('LoreRenderer Error:', error);
        this.pageRenderer.showError(
            `Could not load the lore file. Make sure <code>${this.markdownFile}</code> exists in the same directory as this HTML file.`,
            `Error: ${error.message}`
        );
    }
}


// ============================================
// AUTO-INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Default configuration - change MARKDOWN_FILE to your file path
    const MARKDOWN_FILE = './assets/documents/lore.md';

    const lore = new LoreRenderer(MARKDOWN_FILE);
    lore.init();
});
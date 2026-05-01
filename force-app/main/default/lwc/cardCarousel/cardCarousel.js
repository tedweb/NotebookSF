import { LightningElement, api, track } from 'lwc';

export default class CardCarousel extends LightningElement {
    @api sectionTitle = '';
    @api cards = [];

    @track _isOpen = false;
    @track currentIndex = 0;
    @track isFlipped = false;

    _keyHandler = null;

    @api
    get isOpen() { return this._isOpen; }
    set isOpen(val) {
        const wasOpen = this._isOpen;
        this._isOpen = val;
        if (val && !wasOpen) {
            // Reset state on open
            this.currentIndex = 0;
            this.isFlipped = false;
        }
    }

    connectedCallback() {
        this._keyHandler = this._handleKeyDown.bind(this);
        document.addEventListener('keydown', this._keyHandler);
    }

    disconnectedCallback() {
        if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
        if (this._ro) { this._ro.disconnect(); this._ro = null; }
    }

    renderedCallback() {
        if (!this._isOpen) return;
        this._setupResizeObserver();
        this._fitText();
    }

    _setupResizeObserver() {
        if (this._ro) return;
        const face = this.template.querySelector('.card-face.front');
        if (!face) return;
        this._ro = new ResizeObserver(() => this._fitText());
        this._ro.observe(face);
    }

    _fitText() {
        const textEl = this.template.querySelector('.card-front-text');
        if (!textEl) return;
        const container = textEl.parentElement;
        if (!container || container.clientHeight === 0) return;

        let lo = 10, hi = 60;
        textEl.style.fontSize = hi + 'px';
        if (textEl.scrollHeight <= container.clientHeight && textEl.scrollWidth <= container.clientWidth) {
            return; // Fits at max — keep it
        }
        while (hi - lo > 1) {
            const mid = Math.floor((lo + hi) / 2);
            textEl.style.fontSize = mid + 'px';
            if (textEl.scrollHeight <= container.clientHeight && textEl.scrollWidth <= container.clientWidth) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        textEl.style.fontSize = lo + 'px';
    }

    _handleKeyDown(evt) {
        if (!this._isOpen) return;
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        const isInputFocused = ['input', 'textarea', 'select', 'a'].includes(tag) ||
            document.activeElement?.getAttribute('contenteditable') === 'true';

        switch (evt.key) {
            case 'ArrowLeft':
                evt.preventDefault();
                this.handlePrev();
                break;
            case 'ArrowRight':
                evt.preventDefault();
                this.handleNext();
                break;
            case ' ':
                if (!isInputFocused) {
                    evt.preventDefault();
                    this.handleFlip();
                }
                break;
            case 'Escape':
                this.handleClose();
                break;
            default:
                break;
        }
    }

    // ── Computed ──────────────────────────────────────────────────────
    get currentCard() {
        if (!this.cards || this.cards.length === 0) return { Front__c: '', Back__c: '' };
        return this.cards[this.currentIndex] || { Front__c: '', Back__c: '' };
    }

    get cardInnerClass() {
        return `card-inner${this.isFlipped ? ' flipped' : ''}`;
    }

    get currentIndexLabel() {
        if (!this.cards || this.cards.length === 0) return '0 / 0';
        return `${this.currentIndex + 1} / ${this.cards.length}`;
    }

    get isPrevDisabled() { return this.currentIndex === 0; }
    get isNextDisabled() { return !this.cards || this.currentIndex >= this.cards.length - 1; }

    // ── Handlers ──────────────────────────────────────────────────────
    handleFlip() {
        this.isFlipped = !this.isFlipped;
    }

    handlePrev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.isFlipped = false;
        }
    }

    handleNext() {
        if (this.cards && this.currentIndex < this.cards.length - 1) {
            this.currentIndex++;
            this.isFlipped = false;
        }
    }

    handleClose() {
        this.isFlipped = false;
        this.currentIndex = 0;
        this.dispatchEvent(new CustomEvent('carouselclose'));
    }
}

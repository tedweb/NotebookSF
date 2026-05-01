// NOTE: Tests that set showModal=true are intentionally omitted.
// @lwc/engine-dom v8.20.4 crashes the jest worker on Node 25 when
// `this.querySelectorAll('*')` runs in lwcModal's renderedCallback.
// The tests below cover the closed state and public API shape.

import { createElement } from 'lwc';
import LwcModal from 'c/lwcModal';

function createEl(props = {}) {
    const el = createElement('c-lwc-modal', { is: LwcModal });
    Object.assign(el, props);
    document.body.appendChild(el);
    return el;
}

afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
});

describe('c-lwc-modal closed state', () => {
    it('renders nothing when showModal is false', () => {
        const el = createEl({ showModal: false });
        expect(el.shadowRoot.querySelector('section')).toBeNull();
    });

    it('renders nothing when showModal is not set', () => {
        const el = createEl();
        expect(el.shadowRoot.querySelector('section')).toBeNull();
    });
});

describe('c-lwc-modal public API', () => {
    it('exposes an open() method', () => {
        const el = createEl({ showModal: false });
        expect(typeof el.open).toBe('function');
    });

    it('exposes a close() method', () => {
        const el = createEl({ showModal: false });
        expect(typeof el.close).toBe('function');
    });

    it('exposes a validate() method', () => {
        const el = createEl({ showModal: false });
        expect(typeof el.validate).toBe('function');
    });

    it('isValidModal returns true when no errorMessage', () => {
        const el = createEl({ showModal: false });
        expect(el.isValidModal).toBe(true);
    });

    it('isValidModal returns false when errorMessage is set', () => {
        const el = createEl({ showModal: false, errorMessage: 'Something went wrong' });
        expect(el.isValidModal).toBe(false);
    });

    it('default cancelButtonLabel is Cancel', () => {
        const el = createEl({ showModal: false });
        expect(el.cancelButtonLabel).toBe('Cancel');
    });

    it('default confirmButtonVariant is brand', () => {
        const el = createEl({ showModal: false });
        expect(el.confirmButtonVariant).toBe('brand');
    });
});

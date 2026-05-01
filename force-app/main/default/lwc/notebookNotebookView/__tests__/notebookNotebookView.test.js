import { createElement } from 'lwc';
import NotebookNotebookView from 'c/notebookNotebookView';

function createEl(props = {}) {
    const el = createElement('c-notebook-notebook-view', { is: NotebookNotebookView });
    Object.assign(el, props);
    document.body.appendChild(el);
    return el;
}

afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
});

describe('c-notebook-notebook-view render', () => {
    it('renders without errors', () => {
        const el = createEl();
        expect(el.shadowRoot.querySelector('.notebook-view')).not.toBeNull();
    });

    it('renders a tabset', () => {
        const el = createEl();
        expect(el.shadowRoot.querySelector('lightning-tabset')).not.toBeNull();
    });

    it('renders five interaction-mode tabs', () => {
        const el = createEl();
        expect(el.shadowRoot.querySelectorAll('lightning-tab').length).toBe(5);
    });

    it('includes tabs for all five interaction modes', () => {
        const el = createEl();
        // Check by value property (set from template attribute)
        const values = [...el.shadowRoot.querySelectorAll('lightning-tab')].map(t => t.value);
        expect(values).toContain('resources');
        expect(values).toContain('notes');
        expect(values).toContain('cards');
        expect(values).toContain('exams');
        expect(values).toContain('aichat');
    });

    it('shows default notebook title "Notebook"', () => {
        const el = createEl();
        const title = el.shadowRoot.querySelector('.notebook-title');
        expect(title).not.toBeNull();
        expect(title.textContent).toBe('Notebook');
    });

    it('renders notebook icon', () => {
        const el = createEl();
        expect(el.shadowRoot.querySelector('lightning-icon')).not.toBeNull();
    });
});

describe('c-notebook-notebook-view tab interactions', () => {
    it('handles tab select event without errors', () => {
        const el = createEl();
        expect(() => {
            el.shadowRoot.querySelector('lightning-tabset')
                .dispatchEvent(new CustomEvent('select', { detail: { value: 'notes' } }));
        }).not.toThrow();
    });
});

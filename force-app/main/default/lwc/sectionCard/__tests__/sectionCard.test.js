import { createElement } from 'lwc';
import SectionCard from 'c/sectionCard';

function createEl(props = {}) {
    const el = createElement('c-section-card', { is: SectionCard });
    Object.assign(el, props);
    document.body.appendChild(el);
    return el;
}

afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
});

describe('c-section-card render', () => {
    it('displays the section title', () => {
        const el = createEl({ sectionTitle: 'Biology Notes' });
        expect(el.shadowRoot.querySelector('.section-title').textContent).toBe('Biology Notes');
    });

    it('renders three button icons', () => {
        const el = createEl({ sectionTitle: 'Test' });
        expect(el.shadowRoot.querySelectorAll('lightning-button-icon').length).toBe(3);
    });

    it('star icon is utility:favorite when not starred', () => {
        const el = createEl({ isStarred: false });
        // Star button is the first lightning-button-icon in the template
        const starBtn = el.shadowRoot.querySelectorAll('lightning-button-icon')[0];
        expect(starBtn.iconName).toBe('utility:favorite');
    });

    it('star icon is utility:favorite_alt when starred', () => {
        const el = createEl({ isStarred: true });
        const starBtn = el.shadowRoot.querySelectorAll('lightning-button-icon')[0];
        expect(starBtn.iconName).toBe('utility:favorite_alt');
    });

    it('applies starred CSS class when starred', () => {
        const el = createEl({ isStarred: true });
        const starBtn = el.shadowRoot.querySelectorAll('lightning-button-icon')[0];
        expect(starBtn.className).toContain('starred');
    });
});

describe('c-section-card events', () => {
    it('dispatches starsection with sectionId and isStarred', () => {
        const el = createEl({ sectionId: 'sec001', isStarred: false, starId: null });
        const handler = jest.fn();
        el.addEventListener('starsection', handler);

        // Star button is the first button-icon in the template
        el.shadowRoot.querySelectorAll('lightning-button-icon')[0]
            .dispatchEvent(new CustomEvent('click'));

        expect(handler).toHaveBeenCalledTimes(1);
        const { sectionId, isStarred } = handler.mock.calls[0][0].detail;
        expect(sectionId).toBe('sec001');
        expect(isStarred).toBe(false);
    });

    it('dispatches editsection with sectionId', () => {
        const el = createEl({ sectionId: 'sec002' });
        const handler = jest.fn();
        el.addEventListener('editsection', handler);

        // Edit button is the second button-icon (first inside .header-actions)
        el.shadowRoot.querySelectorAll('lightning-button-icon')[1]
            .dispatchEvent(new CustomEvent('click'));

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toBe('sec002');
    });

    it('dispatches deletesection with sectionId', () => {
        const el = createEl({ sectionId: 'sec003' });
        const handler = jest.fn();
        el.addEventListener('deletesection', handler);

        // Delete button is the third button-icon (second inside .header-actions)
        el.shadowRoot.querySelectorAll('lightning-button-icon')[2]
            .dispatchEvent(new CustomEvent('click'));

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toBe('sec003');
    });
});

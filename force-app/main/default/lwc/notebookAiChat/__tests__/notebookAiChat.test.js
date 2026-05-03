import { createElement } from '@lwc/engine-dom';
import NotebookAiChat from 'c/notebookAiChat';
import sendMessage from '@salesforce/apex/NSFChatController.sendMessage';

// Drain the microtask queue — needed for multi-hop promise chains (.then.catch.finally)
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

// sendMessage is the jest.fn() from __mocks__/apex.js via moduleNameMapper
function createEl(props = {}) {
    const el = createElement('c-notebook-ai-chat', { is: NotebookAiChat });
    Object.assign(el, props);
    document.body.appendChild(el);
    return el;
}

afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    sendMessage.mockReset();
});

describe('c-notebook-ai-chat initial state', () => {
    it('renders empty state when there are no messages', () => {
        const el = createEl();
        expect(el.shadowRoot.querySelector('.empty-state')).not.toBeNull();
    });

    it('does not render clear button initially', () => {
        const el = createEl();
        // Clear button is inside if:true={hasMessages} — hidden when no messages
        const btns = el.shadowRoot.querySelectorAll('lightning-button');
        // Only the Send button should be present; no Clear button
        expect(btns.length).toBe(1);
    });

    it('send button is present', () => {
        const el = createEl();
        const sendBtn = el.shadowRoot.querySelector('lightning-button');
        expect(sendBtn).not.toBeNull();
    });

    it('send button is disabled when input is empty', () => {
        const el = createEl();
        // disabled is set via LWC property binding
        const sendBtn = el.shadowRoot.querySelector('lightning-button');
        expect(sendBtn.disabled).toBe(true);
    });
});

describe('c-notebook-ai-chat input handling', () => {
    it('enables send button when input has text', () => {
        const el = createEl();
        el.shadowRoot.querySelector('lightning-textarea')
            .dispatchEvent(new CustomEvent('change', { detail: { value: 'What is this?' } }));

        return Promise.resolve().then(() => {
            expect(el.shadowRoot.querySelector('lightning-button').disabled).toBe(false);
        });
    });

    it('Enter key without Shift triggers send', () => {
        sendMessage.mockResolvedValue('Hello back');
        const el = createEl();
        el.shadowRoot.querySelector('lightning-textarea')
            .dispatchEvent(new CustomEvent('change', { detail: { value: 'Hi' } }));

        return Promise.resolve().then(() => {
            el.shadowRoot.querySelector('lightning-textarea')
                .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true }));
            expect(sendMessage).toHaveBeenCalledTimes(1);
        });
    });
});

describe('c-notebook-ai-chat send / response', () => {
    it('calls sendMessage with notebookId, message, and history containing the user message', () => {
        sendMessage.mockResolvedValue('Biology is the study of life.');
        const el = createEl({ notebookId: 'nb001' });

        el.shadowRoot.querySelector('lightning-textarea')
            .dispatchEvent(new CustomEvent('change', { detail: { value: 'Summarize' } }));

        return Promise.resolve().then(() => {
            el.shadowRoot.querySelector('lightning-button')
                .dispatchEvent(new CustomEvent('click'));

            // _buildHistory() runs after _appendMessage('user', ...) so the user turn is included
            expect(sendMessage).toHaveBeenCalledWith({
                notebookId: 'nb001',
                message: 'Summarize',
                conversationHistory: ['user: Summarize']
            });
        });
    });

    it('appends user and assistant bubbles after successful send', async () => {
        sendMessage.mockResolvedValue('Biology is the study of life.');
        const el = createEl({ notebookId: 'nb001' });

        el.shadowRoot.querySelector('lightning-textarea')
            .dispatchEvent(new CustomEvent('change', { detail: { value: 'Summarize' } }));
        await Promise.resolve();

        el.shadowRoot.querySelector('lightning-button')
            .dispatchEvent(new CustomEvent('click'));

        await Promise.resolve(); // after send (user bubble appended)
        await Promise.resolve(); // after apex resolves (assistant bubble appended)

        const bubbles = el.shadowRoot.querySelectorAll('.bubble-text');
        expect(bubbles.length).toBe(2);
        expect(bubbles[0].textContent).toBe('Summarize');
        expect(bubbles[1].textContent).toBe('Biology is the study of life.');
    });

    it('appends error bubble when apex rejects', async () => {
        sendMessage.mockRejectedValue({ body: { message: 'Service unavailable' } });
        const el = createEl({ notebookId: 'nb001' });

        el.shadowRoot.querySelector('lightning-textarea')
            .dispatchEvent(new CustomEvent('change', { detail: { value: 'Hello' } }));
        await Promise.resolve();

        el.shadowRoot.querySelector('lightning-button')
            .dispatchEvent(new CustomEvent('click'));

        // Use setTimeout-based flush to drain .then/.catch/.finally chains
        await flushPromises();

        const errorBubble = el.shadowRoot.querySelector('.error-bubble');
        expect(errorBubble).not.toBeNull();
        expect(errorBubble.querySelector('.bubble-text').textContent).toBe('Service unavailable');
    });

    it('clear button appears after a message and removes messages when clicked', async () => {
        sendMessage.mockResolvedValue('Response text');
        const el = createEl();

        el.shadowRoot.querySelector('lightning-textarea')
            .dispatchEvent(new CustomEvent('change', { detail: { value: 'Hi' } }));
        await Promise.resolve();

        el.shadowRoot.querySelector('lightning-button')
            .dispatchEvent(new CustomEvent('click'));

        await Promise.resolve();
        await Promise.resolve();

        // Now hasMessages=true — two lightning-buttons: Clear (first) and Send (second)
        const btns = el.shadowRoot.querySelectorAll('lightning-button');
        expect(btns.length).toBe(2);

        // Click Clear (first button, in header)
        btns[0].dispatchEvent(new CustomEvent('click'));
        await Promise.resolve();

        expect(el.shadowRoot.querySelector('.empty-state')).not.toBeNull();
    });
});

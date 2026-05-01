import { LightningElement, api, track } from 'lwc';
import sendMessage from '@salesforce/apex/NSFChatController.sendMessage';

const MAX_HISTORY = 10;

export default class NotebookAiChat extends LightningElement {
    @api notebookId;

    @track messages = [];
    @track inputValue = '';
    @track isLoading = false;

    _msgCounter = 0;
    _shouldScrollToBottom = false;

    get hasMessages() {
        return this.messages.length > 0;
    }

    get isSendDisabled() {
        return this.isLoading || !this.inputValue || !this.inputValue.trim();
    }

    renderedCallback() {
        if (this._shouldScrollToBottom) {
            this._shouldScrollToBottom = false;
            const list = this.template.querySelector('.message-list');
            if (list) list.scrollTop = list.scrollHeight;
        }
    }

    handleInputChange(evt) {
        this.inputValue = evt.detail.value;
    }

    handleKeyDown(evt) {
        if (evt.key === 'Enter' && !evt.shiftKey && !this.isSendDisabled) {
            evt.preventDefault();
            this.handleSend();
        }
    }

    handleSend() {
        const text = (this.inputValue || '').trim();
        if (!text || this.isLoading) return;

        this._appendMessage('user', text);
        this.inputValue = '';
        this.isLoading = true;
        this._shouldScrollToBottom = true;

        const history = this._buildHistory();

        sendMessage({ notebookId: this.notebookId, message: text, conversationHistory: history })
            .then(response => {
                this._appendMessage('assistant', response);
            })
            .catch(err => {
                const errText = (err && err.body && err.body.message) ? err.body.message : 'Something went wrong. Please try again.';
                this._appendMessage('assistant', errText, true);
            })
            .finally(() => {
                this.isLoading = false;
                this._shouldScrollToBottom = true;
            });
    }

    handleClear() {
        this.messages = [];
        this.inputValue = '';
    }

    _appendMessage(role, text, isError = false) {
        const id = ++this._msgCounter;
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const bubbleClass = role === 'user'
            ? 'bubble user-bubble'
            : isError ? 'bubble assistant-bubble error-bubble' : 'bubble assistant-bubble';

        this.messages = [...this.messages, { id, role, text, time, bubbleClass }];
    }

    _buildHistory() {
        const recent = this.messages.slice(-MAX_HISTORY);
        return recent.map(m => `${m.role}: ${m.text}`);
    }
}

import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getSectionsByNotebook from '@salesforce/apex/NSFSectionController.getSectionsByNotebook';
import createSection from '@salesforce/apex/NSFSectionController.createSection';
import updateSection from '@salesforce/apex/NSFSectionController.updateSection';
import deleteSection from '@salesforce/apex/NSFSectionController.deleteSection';
import getCardsBySection from '@salesforce/apex/NSFCardController.getCardsBySection';
import createCard from '@salesforce/apex/NSFCardController.createCard';
import updateCard from '@salesforce/apex/NSFCardController.updateCard';
import reorderCards from '@salesforce/apex/NSFCardController.reorderCards';
import deleteCard from '@salesforce/apex/NSFCardController.deleteCard';
import getStarsByNotebook from '@salesforce/apex/NSFStarController.getStarsByNotebook';
import createStar from '@salesforce/apex/NSFStarController.createStar';
import deleteStar from '@salesforce/apex/NSFStarController.deleteStar';

export default class NotebookCards extends LightningElement {
    @api notebookId;

    @track _sections = { data: null, error: null };
    @track sectionCards = {};
    @track starMap = {};
    _wiredSections;

    @track sectionDraft = { id: null, title: '' };
    sectionModalMode = 'create';
    deleteSectionTarget = { id: null, title: '' };

    @track cardDraft = { id: null, sectionId: null, front: '', back: '' };
    @track wizardPage = 1;
    cardModalMode = 'create';

    deleteCardTarget = { id: null, sectionId: null };

    @track carouselSectionId = null;
    @track carouselSectionTitle = '';

    // ── Wire: Sections ────────────────────────────────────────────────
    @wire(getSectionsByNotebook, { notebookId: '$notebookId' })
    wiredSections(result) {
        this._wiredSections = result;
        if (result.data) {
            this._buildSections(result.data);
            this._loadAllCards(result.data);
            this._loadStars();
        } else {
            this._sections = { data: result.data, error: result.error };
        }
    }

    _buildSections(rawSections) {
        this._sections = {
            data: rawSections.map(s => ({
                ...s,
                isStarred: !!this.starMap[s.Id],
                starId: this.starMap[s.Id] || null,
                cards: this.sectionCards[s.Id] ?? null,
                hasCards: (this.sectionCards[s.Id] ?? []).length > 0
            })),
            error: null
        };
    }

    async _loadAllCards(rawSections) {
        await Promise.all(rawSections.map(s => this._loadCardsForSection(s.Id)));
    }

    async _loadCardsForSection(sectionId) {
        try {
            const cards = await getCardsBySection({ sectionId });
            this.sectionCards = {
                ...this.sectionCards,
                [sectionId]: cards.map((c, idx) => ({
                    ...c,
                    displayOrder: idx + 1,
                    isStarred: !!this.starMap[c.Id],
                    starId: this.starMap[c.Id] || null,
                    starIcon: this.starMap[c.Id] ? 'utility:favorite_alt' : 'utility:favorite'
                }))
            };
            this._rebuildSections();
        } catch (e) {
            this.showToast('Error', 'Failed to load cards for a section.', 'error');
        }
    }

    _rebuildSections() {
        if (!this._sections.data) return;
        this._sections = {
            data: this._sections.data.map(s => ({
                ...s,
                isStarred: !!this.starMap[s.Id],
                starId: this.starMap[s.Id] || null,
                cards: this.sectionCards[s.Id] ?? null,
                hasCards: (this.sectionCards[s.Id] ?? []).length > 0
            })),
            error: null
        };
    }

    get sections() { return this._sections; }
    get hasSections() { return this._sections.data && this._sections.data.length > 0; }
    get hasNoSections() { return this._sections.data && this._sections.data.length === 0; }

    // ── Stars ─────────────────────────────────────────────────────────
    async _loadStars() {
        if (!this.notebookId) return;
        try {
            const stars = await getStarsByNotebook({ notebookId: this.notebookId });
            const map = {};
            stars.forEach(star => {
                const id = star.NSF_CardId__c || star.NSF_SectionId__c;
                if (id) map[id] = star.Id;
            });
            this.starMap = map;
            this._applyStarMap();
        } catch (e) { /* best-effort */ }
    }

    _applyStarMap() {
        const updated = {};
        Object.keys(this.sectionCards).forEach(sid => {
            updated[sid] = (this.sectionCards[sid] || []).map(c => ({
                ...c,
                isStarred: !!this.starMap[c.Id],
                starId: this.starMap[c.Id] || null,
                starIcon: this.starMap[c.Id] ? 'utility:favorite_alt' : 'utility:favorite'
            }));
        });
        this.sectionCards = updated;
        this._rebuildSections();
    }

    async handleStarToggle(evt) {
        evt.stopPropagation();
        const itemId = evt.currentTarget.dataset.itemId;
        await this._toggleStar(itemId, this.starMap[itemId], 'Card');
    }

    async handleStarSection(evt) {
        const { sectionId } = evt.detail;
        await this._toggleStar(sectionId, this.starMap[sectionId], 'Section');
    }

    async _toggleStar(itemId, currentStarId, itemType) {
        if (currentStarId && currentStarId !== '__pending__') {
            const { [itemId]: _, ...rest } = this.starMap;
            this.starMap = rest;
            this._applyStarMap();
            try {
                await deleteStar({ starId: currentStarId });
            } catch (e) {
                this.starMap = { ...this.starMap, [itemId]: currentStarId };
                this._applyStarMap();
                this.showToast('Error', 'Could not remove star.', 'error');
            }
        } else if (!currentStarId) {
            this.starMap = { ...this.starMap, [itemId]: '__pending__' };
            this._applyStarMap();
            try {
                const newId = await createStar({ recordId: itemId, itemType });
                this.starMap = { ...this.starMap, [itemId]: newId };
                this._applyStarMap();
            } catch (e) {
                const { [itemId]: _, ...rest } = this.starMap;
                this.starMap = rest;
                this._applyStarMap();
                this.showToast('Error', 'Could not star item.', 'error');
            }
        }
    }

    // ── Carousel ──────────────────────────────────────────────────────
    get carouselIsOpen() { return this.carouselSectionId !== null; }
    get carouselCards() { return this.sectionCards[this.carouselSectionId] || []; }

    handleOpenDeck(evt) {
        this.carouselSectionId = evt.currentTarget.dataset.sectionId;
        this.carouselSectionTitle = evt.currentTarget.dataset.sectionTitle;
    }

    handleCarouselClose() { this.carouselSectionId = null; }

    stopProp(evt) { evt.stopPropagation(); }

    // ── Wizard computed ───────────────────────────────────────────────
    get isWizardPage1() { return this.wizardPage === 1; }
    get isWizardPage2() { return this.wizardPage === 2; }
    get isWizardPage3() { return this.wizardPage === 3; }
    get showWizardPrevButton() { return this.wizardPage > 1; }
    get cardWizardHeader() { return this.cardModalMode === 'edit' ? 'Edit Card' : 'New Card'; }
    get cardWizardConfirmLabel() {
        return this.wizardPage < 3 ? 'Next →' : (this.cardModalMode === 'edit' ? 'Save' : 'Create');
    }
    get wizardStepLabel() {
        const names = ['Front', 'Back', 'Resources'];
        return `Step ${this.wizardPage} of 3 — ${names[this.wizardPage - 1]}`;
    }
    get deleteCardBodyText() { return 'Delete this card? This cannot be undone.'; }

    // ── Modal headers ─────────────────────────────────────────────────
    get sectionModalHeader() { return this.sectionModalMode === 'edit' ? 'Edit Section' : 'New Section'; }
    get deleteSectionBodyText() {
        return `Delete "${this.deleteSectionTarget.title}" and all its cards? This cannot be undone.`;
    }

    // ── Modal refs ────────────────────────────────────────────────────
    get sectionModal() { return this.template.querySelector('.section-modal'); }
    get deleteSectionModal() { return this.template.querySelector('.delete-section-modal'); }
    get cardWizardModal() { return this.template.querySelector('.card-wizard-modal'); }
    get deleteCardModal() { return this.template.querySelector('.delete-card-modal'); }

    // ── Section handlers ──────────────────────────────────────────────
    handleNewSection() {
        this.sectionDraft = { id: null, title: '' };
        this.sectionModalMode = 'create';
        this.sectionModal.open();
    }

    handleEditSection(evt) {
        const sec = this._sections.data.find(s => s.Id === evt.detail);
        this.sectionDraft = { id: evt.detail, title: sec ? sec.Title__c : '' };
        this.sectionModalMode = 'edit';
        this.sectionModal.open();
    }

    handleDeleteSection(evt) {
        const sec = this._sections.data.find(s => s.Id === evt.detail);
        this.deleteSectionTarget = { id: evt.detail, title: sec ? sec.Title__c : '' };
        this.deleteSectionModal.open();
    }

    handleSectionTitleChange(evt) { this.sectionDraft = { ...this.sectionDraft, title: evt.detail.value }; }

    async handleSectionModalButton(evt) {
        if (evt.detail === 'cancel') { this.sectionModal.close(); return; }
        try {
            if (this.sectionModalMode === 'create') {
                const sec = await createSection({ notebookId: this.notebookId, title: this.sectionDraft.title });
                this.sectionCards = { ...this.sectionCards, [sec.Id]: [] };
                this.showToast('Section created', '', 'success');
            } else {
                await updateSection({ sectionId: this.sectionDraft.id, title: this.sectionDraft.title });
                this.showToast('Section updated', '', 'success');
            }
            this.sectionModal.close();
            await refreshApex(this._wiredSections);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    async handleDeleteSectionConfirm(evt) {
        if (evt.detail === 'cancel') { this.deleteSectionModal.close(); return; }
        try {
            await deleteSection({ sectionId: this.deleteSectionTarget.id });
            const { [this.deleteSectionTarget.id]: _r, ...rest } = this.sectionCards;
            this.sectionCards = rest;
            this.deleteSectionModal.close();
            this.showToast('Section deleted', '', 'success');
            await refreshApex(this._wiredSections);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    // ── Card wizard handlers ──────────────────────────────────────────
    handleNewCard(evt) {
        const sectionId = evt.currentTarget.dataset.sectionId;
        const existingCards = this.sectionCards[sectionId] || [];
        const nextOrder = existingCards.reduce((max, c) => Math.max(max, c.Order__c || 0), 0) + 1;
        this.cardDraft = { id: null, sectionId, front: '', back: '', orderNum: nextOrder };
        this.cardModalMode = 'create';
        this.wizardPage = 1;
        this.cardWizardModal.open();
    }

    handleEditCard(evt) {
        evt.stopPropagation();
        const cardId = evt.currentTarget.dataset.cardId;
        const sectionId = evt.currentTarget.dataset.sectionId;
        const card = (this.sectionCards[sectionId] || []).find(c => c.Id === cardId);
        if (!card) return;
        this.cardDraft = { id: cardId, sectionId, front: card.Front__c || '', back: card.Back__c || '', orderNum: card.Order__c || 1 };
        this.cardModalMode = 'edit';
        this.wizardPage = 1;
        this.cardWizardModal.open();
    }

    handleCardFrontChange(evt) { this.cardDraft = { ...this.cardDraft, front: evt.detail.value }; }
    handleCardBackChange(evt) { this.cardDraft = { ...this.cardDraft, back: evt.target.value }; }

    handleWizardPrev() { if (this.wizardPage > 1) this.wizardPage--; }

    async handleCardWizardButton(evt) {
        if (evt.detail === 'cancel') { this.cardWizardModal.close(); this.wizardPage = 1; return; }
        if (this.wizardPage < 3) { this.wizardPage++; return; }
        try {
            const d = this.cardDraft;
            if (this.cardModalMode === 'create') {
                await createCard({ sectionId: d.sectionId, front: d.front, back: d.back || null, orderNum: d.orderNum });
                this.showToast('Card created', '', 'success');
            } else {
                await updateCard({ cardId: d.id, sectionId: d.sectionId, front: d.front, back: d.back || null, orderNum: d.orderNum });
                this.showToast('Card updated', '', 'success');
            }
            this.cardWizardModal.close();
            this.wizardPage = 1;
            await this._loadCardsForSection(d.sectionId);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    // ── Card sort ─────────────────────────────────────────────────────
    async handleMoveCard(evt) {
        evt.stopPropagation();
        const cardId = evt.currentTarget.dataset.cardId;
        const sectionId = evt.currentTarget.dataset.sectionId;
        const direction = evt.currentTarget.dataset.direction;
        const cards = [...(this.sectionCards[sectionId] || [])];
        const idx = cards.findIndex(c => c.Id === cardId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === cards.length - 1) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [cards[idx], cards[swapIdx]] = [cards[swapIdx], cards[idx]];
        const newOrders = cards.map((c, i) => ({ ...c, Order__c: i + 1, displayOrder: i + 1 }));
        this.sectionCards = { ...this.sectionCards, [sectionId]: newOrders };
        this._rebuildSections();

        try {
            await reorderCards({ cardIds: newOrders.map(c => c.Id), orders: newOrders.map(c => c.Order__c) });
        } catch (e) {
            this.showToast('Error', 'Failed to save order.', 'error');
            await this._loadCardsForSection(sectionId);
        }
    }

    // ── Card delete ───────────────────────────────────────────────────
    handleDeleteCard(evt) {
        evt.stopPropagation();
        this.deleteCardTarget = { id: evt.currentTarget.dataset.cardId, sectionId: evt.currentTarget.dataset.sectionId };
        this.deleteCardModal.open();
    }

    async handleDeleteCardConfirm(evt) {
        if (evt.detail === 'cancel') { this.deleteCardModal.close(); return; }
        try {
            await deleteCard({ cardId: this.deleteCardTarget.id });
            this.deleteCardModal.close();
            this.showToast('Card deleted', '', 'success');
            await this._loadCardsForSection(this.deleteCardTarget.sectionId);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    extractError(e) {
        return (e && e.body && e.body.message) || (e && e.message) || 'An unexpected error occurred.';
    }
}

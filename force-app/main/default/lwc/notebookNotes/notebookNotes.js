import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getSectionsByNotebook from '@salesforce/apex/NSFSectionController.getSectionsByNotebook';
import createSection from '@salesforce/apex/NSFSectionController.createSection';
import updateSection from '@salesforce/apex/NSFSectionController.updateSection';
import deleteSection from '@salesforce/apex/NSFSectionController.deleteSection';
import getNotesBySection from '@salesforce/apex/NSFNoteController.getNotesBySection';
import createNote from '@salesforce/apex/NSFNoteController.createNote';
import updateNote from '@salesforce/apex/NSFNoteController.updateNote';
import deleteNote from '@salesforce/apex/NSFNoteController.deleteNote';
import getStarsByNotebook from '@salesforce/apex/NSFStarController.getStarsByNotebook';
import createStar from '@salesforce/apex/NSFStarController.createStar';
import deleteStar from '@salesforce/apex/NSFStarController.deleteStar';

export default class NotebookNotes extends LightningElement {
    @api notebookId;

    @track _sections = { data: null, error: null };
    @track sectionNotes = {};
    @track starMap = {};

    _wiredSections;

    @track sectionDraft = { id: null, title: '' };
    sectionModalMode = 'create';
    deleteSectionTarget = { id: null, title: '' };

    @track noteDraft = { id: null, sectionId: null, title: '', body: '', link: '' };
    noteModalMode = 'create';
    deleteNoteTarget = { id: null, title: '' };

    // ── Wire: Sections ────────────────────────────────────────────────
    @wire(getSectionsByNotebook, { notebookId: '$notebookId' })
    wiredSections(result) {
        this._wiredSections = result;
        if (result.data) {
            this._buildSections(result.data);
            this._loadAllNotes(result.data);
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
                notes: this.sectionNotes[s.Id] ?? null,
                hasNotes: (this.sectionNotes[s.Id] ?? []).length > 0
            })),
            error: null
        };
    }

    async _loadAllNotes(rawSections) {
        await Promise.all(rawSections.map(s => this._loadNotesForSection(s.Id)));
    }

    async _loadNotesForSection(sectionId) {
        try {
            const notes = await getNotesBySection({ sectionId });
            const existing = this.sectionNotes[sectionId] || [];
            const expandedIds = new Set(existing.filter(n => n.expanded).map(n => n.Id));
            this.sectionNotes = {
                ...this.sectionNotes,
                [sectionId]: notes.map(n => ({
                    ...n,
                    expanded: expandedIds.has(n.Id),
                    hasLink: !!n.Link__c,
                    chevronIcon: expandedIds.has(n.Id) ? 'utility:chevrondown' : 'utility:chevronright',
                    isStarred: !!this.starMap[n.Id],
                    starId: this.starMap[n.Id] || null,
                    starIcon: this.starMap[n.Id] ? 'utility:favorite_alt' : 'utility:favorite'
                }))
            };
            this._rebuildSections();
        } catch (e) {
            this.showToast('Error', 'Failed to load notes for a section.', 'error');
        }
    }

    _rebuildSections() {
        if (!this._sections.data) return;
        this._sections = {
            data: this._sections.data.map(s => ({
                ...s,
                isStarred: !!this.starMap[s.Id],
                starId: this.starMap[s.Id] || null,
                notes: this.sectionNotes[s.Id] ?? null,
                hasNotes: (this.sectionNotes[s.Id] ?? []).length > 0
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
                const id = star.NSF_NoteId__c || star.NSF_SectionId__c;
                if (id) map[id] = star.Id;
            });
            this.starMap = map;
            this._applyStarMap();
        } catch (e) { /* best-effort */ }
    }

    _applyStarMap() {
        const updated = {};
        Object.keys(this.sectionNotes).forEach(sid => {
            updated[sid] = (this.sectionNotes[sid] || []).map(n => ({
                ...n,
                isStarred: !!this.starMap[n.Id],
                starId: this.starMap[n.Id] || null,
                starIcon: this.starMap[n.Id] ? 'utility:favorite_alt' : 'utility:favorite'
            }));
        });
        this.sectionNotes = updated;
        this._rebuildSections();
    }

    async handleStarToggle(evt) {
        evt.stopPropagation();
        const itemId = evt.currentTarget.dataset.itemId;
        await this._toggleStar(itemId, this.starMap[itemId], 'Note');
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

    // ── Modal headers ─────────────────────────────────────────────────
    get sectionModalHeader() { return this.sectionModalMode === 'edit' ? 'Edit Section' : 'New Section'; }
    get noteModalHeader() { return this.noteModalMode === 'edit' ? 'Edit Note' : 'New Note'; }
    get deleteSectionBodyText() {
        return `Delete "${this.deleteSectionTarget.title}" and all its notes? This cannot be undone.`;
    }
    get deleteNoteBodyText() {
        return `Delete note "${this.deleteNoteTarget.title}"? This cannot be undone.`;
    }

    // ── Modal refs ────────────────────────────────────────────────────
    get sectionModal() { return this.template.querySelector('.section-modal'); }
    get deleteSectionModal() { return this.template.querySelector('.delete-section-modal'); }
    get noteModal() { return this.template.querySelector('.note-modal'); }
    get deleteNoteModal() { return this.template.querySelector('.delete-note-modal'); }

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
                this.sectionNotes = { ...this.sectionNotes, [sec.Id]: [] };
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
            const { [this.deleteSectionTarget.id]: _r, ...rest } = this.sectionNotes;
            this.sectionNotes = rest;
            this.deleteSectionModal.close();
            this.showToast('Section deleted', '', 'success');
            await refreshApex(this._wiredSections);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    // ── Note expand/collapse ──────────────────────────────────────────
    handleNoteClick(evt) {
        const noteId = evt.currentTarget.dataset.noteId;
        const sectionId = evt.currentTarget.dataset.sectionId;
        const notes = this.sectionNotes[sectionId];
        if (!notes) return;
        this.sectionNotes = {
            ...this.sectionNotes,
            [sectionId]: notes.map(n => {
                if (n.Id !== noteId) return n;
                const expanded = !n.expanded;
                return { ...n, expanded, chevronIcon: expanded ? 'utility:chevrondown' : 'utility:chevronright' };
            })
        };
        this._rebuildSections();
    }

    handleNoteActionClick(evt) { evt.stopPropagation(); }

    // ── Note CRUD handlers ────────────────────────────────────────────
    handleNewNote(evt) {
        const sectionId = evt.currentTarget.dataset.sectionId;
        this.noteDraft = { id: null, sectionId, title: '', body: '', link: '' };
        this.noteModalMode = 'create';
        this.noteModal.open();
    }

    handleEditNote(evt) {
        evt.stopPropagation();
        const noteId = evt.currentTarget.dataset.noteId;
        const sectionId = evt.currentTarget.dataset.sectionId;
        const note = (this.sectionNotes[sectionId] || []).find(n => n.Id === noteId);
        if (!note) return;
        this.noteDraft = { id: noteId, sectionId, title: note.Title__c || '', body: note.Body__c || '', link: note.Link__c || '' };
        this.noteModalMode = 'edit';
        this.noteModal.open();
    }

    handleDeleteNote(evt) {
        evt.stopPropagation();
        const ds = evt.currentTarget.dataset;
        this.deleteNoteTarget = { id: ds.noteId, title: ds.title };
        this.deleteNoteModal.open();
    }

    handleNoteTitleChange(evt) { this.noteDraft = { ...this.noteDraft, title: evt.detail.value }; }
    handleNoteBodyChange(evt) { this.noteDraft = { ...this.noteDraft, body: evt.target.value }; }
    handleNoteLinkChange(evt) { this.noteDraft = { ...this.noteDraft, link: evt.detail.value }; }

    async handleNoteModalButton(evt) {
        if (evt.detail === 'cancel') { this.noteModal.close(); return; }
        try {
            const d = this.noteDraft;
            if (this.noteModalMode === 'create') {
                await createNote({ sectionId: d.sectionId, title: d.title, body: d.body || null, link: d.link || null });
                this.showToast('Note created', '', 'success');
            } else {
                await updateNote({ noteId: d.id, sectionId: d.sectionId, title: d.title, body: d.body || null, link: d.link || null });
                this.showToast('Note updated', '', 'success');
            }
            this.noteModal.close();
            await this._loadNotesForSection(d.sectionId);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    async handleDeleteNoteConfirm(evt) {
        if (evt.detail === 'cancel') { this.deleteNoteModal.close(); return; }
        try {
            await deleteNote({ noteId: this.deleteNoteTarget.id });
            this.deleteNoteModal.close();
            this.showToast('Note deleted', '', 'success');
            await this._loadAllNotes(this._sections.data);
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
import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getSectionsByNotebook from '@salesforce/apex/NSFSectionController.getSectionsByNotebook';
import createSection from '@salesforce/apex/NSFSectionController.createSection';
import updateSection from '@salesforce/apex/NSFSectionController.updateSection';
import deleteSection from '@salesforce/apex/NSFSectionController.deleteSection';
import getResourcesBySection from '@salesforce/apex/NSFResourceController.getResourcesBySection';
import createResource from '@salesforce/apex/NSFResourceController.createResource';
import updateResource from '@salesforce/apex/NSFResourceController.updateResource';
import deleteResource from '@salesforce/apex/NSFResourceController.deleteResource';
import getStarsByNotebook from '@salesforce/apex/NSFStarController.getStarsByNotebook';
import createStar from '@salesforce/apex/NSFStarController.createStar';
import deleteStar from '@salesforce/apex/NSFStarController.deleteStar';

const TYPE_ICONS = {
    Link: 'utility:link',
    PDF: 'doctype:pdf',
    Video: 'utility:video'
};

export default class NotebookResources extends LightningElement {
    @api notebookId;

    @track _sections = { data: null, error: null };
    @track sectionResources = {};
    @track starMap = {};

    _wiredSections;

    @track sectionDraft = { id: null, title: '' };
    sectionModalMode = 'create';
    deleteSectionTarget = { id: null, title: '' };

    @track resourceDraft = { id: null, sectionId: null, title: '', link: '', type: 'Link' };
    resourceModalMode = 'create';
    deleteResourceTarget = { id: null, title: '' };

    typeOptions = [
        { label: 'Link', value: 'Link' },
        { label: 'PDF', value: 'PDF' },
        { label: 'Video', value: 'Video' }
    ];

    // ── Wire: Sections ────────────────────────────────────────────────
    @wire(getSectionsByNotebook, { notebookId: '$notebookId' })
    wiredSections(result) {
        this._wiredSections = result;
        if (result.data) {
            this._buildSections(result.data);
            this._loadAllResources(result.data);
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
                resources: this.sectionResources[s.Id] ?? null,
                hasResources: (this.sectionResources[s.Id] ?? []).length > 0
            })),
            error: null
        };
    }

    async _loadAllResources(rawSections) {
        await Promise.all(rawSections.map(s => this._loadResourcesForSection(s.Id)));
    }

    async _loadResourcesForSection(sectionId) {
        try {
            const resources = await getResourcesBySection({ sectionId });
            this.sectionResources = {
                ...this.sectionResources,
                [sectionId]: resources.map(r => ({
                    ...r,
                    typeIcon: TYPE_ICONS[r.Type__c] || 'utility:link',
                    isStarred: !!this.starMap[r.Id],
                    starId: this.starMap[r.Id] || null,
                    starIcon: this.starMap[r.Id] ? 'utility:favorite_alt' : 'utility:favorite'
                }))
            };
            this._rebuildSections();
        } catch (e) {
            this.showToast('Error', 'Failed to load resources for a section.', 'error');
        }
    }

    _rebuildSections() {
        if (!this._sections.data) return;
        this._sections = {
            data: this._sections.data.map(s => ({
                ...s,
                isStarred: !!this.starMap[s.Id],
                starId: this.starMap[s.Id] || null,
                resources: this.sectionResources[s.Id] ?? null,
                hasResources: (this.sectionResources[s.Id] ?? []).length > 0
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
                const id = star.NSF_ResourceId__c || star.NSF_SectionId__c;
                if (id) map[id] = star.Id;
            });
            this.starMap = map;
            this._applyStarMap();
        } catch (e) { /* stars are best-effort */ }
    }

    _applyStarMap() {
        const updated = {};
        Object.keys(this.sectionResources).forEach(sid => {
            updated[sid] = (this.sectionResources[sid] || []).map(r => ({
                ...r,
                isStarred: !!this.starMap[r.Id],
                starId: this.starMap[r.Id] || null,
                starIcon: this.starMap[r.Id] ? 'utility:favorite_alt' : 'utility:favorite'
            }));
        });
        this.sectionResources = updated;
        this._rebuildSections();
    }

    async handleStarToggle(evt) {
        evt.stopPropagation();
        const itemId = evt.currentTarget.dataset.itemId;
        await this._toggleStar(itemId, this.starMap[itemId], 'Resource');
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
    get resourceModalHeader() { return this.resourceModalMode === 'edit' ? 'Edit Resource' : 'New Resource'; }
    get deleteSectionBodyText() {
        return `Delete "${this.deleteSectionTarget.title}" and all its resources? This cannot be undone.`;
    }
    get deleteResourceBodyText() {
        return `Delete resource "${this.deleteResourceTarget.title}"? This cannot be undone.`;
    }

    // ── Modal refs ────────────────────────────────────────────────────
    get sectionModal() { return this.template.querySelector('.section-modal'); }
    get deleteSectionModal() { return this.template.querySelector('.delete-section-modal'); }
    get resourceModal() { return this.template.querySelector('.resource-modal'); }
    get deleteResourceModal() { return this.template.querySelector('.delete-resource-modal'); }

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

    handleSectionTitleChange(evt) {
        this.sectionDraft = { ...this.sectionDraft, title: evt.detail.value };
    }

    async handleSectionModalButton(evt) {
        if (evt.detail === 'cancel') { this.sectionModal.close(); return; }
        try {
            if (this.sectionModalMode === 'create') {
                const sec = await createSection({ notebookId: this.notebookId, title: this.sectionDraft.title });
                this.sectionResources = { ...this.sectionResources, [sec.Id]: [] };
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
            const { [this.deleteSectionTarget.id]: _r, ...rest } = this.sectionResources;
            this.sectionResources = rest;
            this.deleteSectionModal.close();
            this.showToast('Section deleted', '', 'success');
            await refreshApex(this._wiredSections);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    // ── Resource handlers ─────────────────────────────────────────────
    handleNewResource(evt) {
        const sectionId = evt.currentTarget.dataset.sectionId;
        this.resourceDraft = { id: null, sectionId, title: '', link: '', type: 'Link' };
        this.resourceModalMode = 'create';
        this.resourceModal.open();
    }

    handleEditResource(evt) {
        evt.stopPropagation();
        const ds = evt.currentTarget.dataset;
        this.resourceDraft = { id: ds.resourceId, sectionId: ds.sectionId, title: ds.title, link: ds.link, type: ds.type };
        this.resourceModalMode = 'edit';
        this.resourceModal.open();
    }

    handleDeleteResource(evt) {
        evt.stopPropagation();
        const ds = evt.currentTarget.dataset;
        this.deleteResourceTarget = { id: ds.resourceId, title: ds.title };
        this.deleteResourceModal.open();
    }

    handleResourceTitleChange(evt) { this.resourceDraft = { ...this.resourceDraft, title: evt.detail.value }; }
    handleResourceLinkChange(evt) { this.resourceDraft = { ...this.resourceDraft, link: evt.detail.value }; }
    handleResourceTypeChange(evt) { this.resourceDraft = { ...this.resourceDraft, type: evt.detail.value }; }
    handleResourceLinkClick(evt) { evt.stopPropagation(); }

    async handleResourceModalButton(evt) {
        if (evt.detail === 'cancel') { this.resourceModal.close(); return; }
        try {
            const d = this.resourceDraft;
            if (this.resourceModalMode === 'create') {
                await createResource({ sectionId: d.sectionId, title: d.title, link: d.link, type: d.type });
                this.showToast('Resource added', '', 'success');
            } else {
                await updateResource({ resourceId: d.id, sectionId: d.sectionId, title: d.title, link: d.link, type: d.type });
                this.showToast('Resource updated', '', 'success');
            }
            this.resourceModal.close();
            await this._loadResourcesForSection(d.sectionId);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    async handleDeleteResourceConfirm(evt) {
        if (evt.detail === 'cancel') { this.deleteResourceModal.close(); return; }
        try {
            await deleteResource({ resourceId: this.deleteResourceTarget.id });
            this.deleteResourceModal.close();
            this.showToast('Resource deleted', '', 'success');
            await this._loadAllResources(this._sections.data);
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

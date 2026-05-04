import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getGroups from '@salesforce/apex/NSFGroupController.getGroups';
import createGroup from '@salesforce/apex/NSFGroupController.createGroup';
import updateGroup from '@salesforce/apex/NSFGroupController.updateGroup';
import deleteGroup from '@salesforce/apex/NSFGroupController.deleteGroup';
import getProjectsByGroup from '@salesforce/apex/NSFProjectController.getProjectsByGroup';
import createProject from '@salesforce/apex/NSFProjectController.createProject';
import updateProject from '@salesforce/apex/NSFProjectController.updateProject';
import deleteProject from '@salesforce/apex/NSFProjectController.deleteProject';
import getNotebooksByProject from '@salesforce/apex/NSFNotebookController.getNotebooksByProject';
import createNotebook from '@salesforce/apex/NSFNotebookController.createNotebook';
import updateNotebook from '@salesforce/apex/NSFNotebookController.updateNotebook';
import deleteNotebook from '@salesforce/apex/NSFNotebookController.deleteNotebook';

export default class NotebookHome extends NavigationMixin(LightningElement) {

    // ── State ────────────────────────────────────────────────────────
    selectedGroupId = null;
    selectedGroupName = '';

    @track expandedProjectIds = new Set();
    @track projectNotebooks = {}; // { [projectId]: NSF_Notebook__c[] | null }

    // Group modal
    @track groupDraft = { id: null, name: '' };
    groupModalMode = 'create'; // 'create' | 'edit'

    // Group delete
    deleteGroupTarget = { id: null, name: '' };

    // Project modal
    @track projectDraft = { id: null, name: '', groupId: null, associatedRecordId: null };
    projectModalMode = 'create';

    // Project delete
    deleteProjectTarget = { id: null, name: '' };

    // Notebook modal
    @track notebookDraft = { id: null, name: '', projectId: null };
    notebookModalMode = 'create';

    // Notebook delete
    deleteNotebookTarget = { id: null, name: '' };

    // Wire results stored for refreshApex
    _wiredGroups;
    _wiredProjects;

    // ── Wire: Groups ─────────────────────────────────────────────────
    @track _groups = { data: null, error: null };

    @wire(getGroups)
    wiredGroups(result) {
        this._wiredGroups = result;
        this._applyGroupWireResult(result);
    }

    _applyGroupWireResult(result) {
        if (result && result.data) {
            this._groups = {
                data: result.data.map(g => ({
                    ...g,
                    isSelected: g.Id === this.selectedGroupId,
                    itemClass: `group-item${g.Id === this.selectedGroupId ? ' selected' : ''}`
                })),
                error: null
            };
        } else {
            this._groups = { data: result ? result.data : null, error: result ? result.error : null };
        }
    }

    get groups() {
        return this._groups;
    }

    get hasGroups() {
        return this._groups.data && this._groups.data.length > 0;
    }

    // ── Wire: Projects (reactive on selectedGroupId) ─────────────────
    @track projects = { data: null, error: null };

    @wire(getProjectsByGroup, { groupId: '$selectedGroupId' })
    wiredProjects(result) {
        this._wiredProjects = result;
        if (result.data) {
            this.projects = {
                data: result.data.map(p => ({
                    ...p,
                    expanded: this.expandedProjectIds.has(p.Id),
                    chevronIcon: this.expandedProjectIds.has(p.Id) ? 'utility:chevrondown' : 'utility:chevronright',
                    notebooks: this.projectNotebooks[p.Id] ?? null,
                    hasNotebooks: (this.projectNotebooks[p.Id] ?? []).length > 0
                })),
                error: null
            };
        } else {
            this.projects = { data: result.data, error: result.error };
        }
    }

    get hasProjects() {
        return this.projects.data && this.projects.data.length > 0;
    }

    // ── Modal header labels ──────────────────────────────────────────
    get groupModalHeader() {
        return this.groupModalMode === 'edit' ? 'Edit Group' : 'New Group';
    }
    get projectModalHeader() {
        return this.projectModalMode === 'edit' ? 'Edit Project' : 'New Project';
    }
    get groupPickerDisplayInfo() {
        return { primaryField: 'Title__c' };
    }
    get notebookModalHeader() {
        return this.notebookModalMode === 'edit' ? 'Edit Notebook' : 'New Notebook';
    }
    get deleteGroupBodyText() {
        return `Delete "${this.deleteGroupTarget.name}" and all its projects and notebooks? This cannot be undone.`;
    }
    get deleteProjectBodyText() {
        return `Delete "${this.deleteProjectTarget.name}" and all its notebooks? This cannot be undone.`;
    }
    get deleteNotebookBodyText() {
        return `Delete notebook "${this.deleteNotebookTarget.name}"? This cannot be undone.`;
    }

    // ── Modal refs ───────────────────────────────────────────────────
    get groupModal() { return this.template.querySelector('.group-modal'); }
    get deleteGroupModal() { return this.template.querySelector('.delete-group-modal'); }
    get projectModal() { return this.template.querySelector('.project-modal'); }
    get deleteProjectModal() { return this.template.querySelector('.delete-project-modal'); }
    get notebookModal() { return this.template.querySelector('.notebook-modal'); }
    get deleteNotebookModal() { return this.template.querySelector('.delete-notebook-modal'); }

    // ── Group handlers ───────────────────────────────────────────────
    handleNewGroup() {
        this.groupDraft = { id: null, name: '' };
        this.groupModalMode = 'create';
        this.groupModal.open();
    }

    handleEditGroup(evt) {
        evt.stopPropagation();
        this.groupDraft = { id: evt.currentTarget.dataset.id, name: evt.currentTarget.dataset.name };
        this.groupModalMode = 'edit';
        this.groupModal.open();
    }

    handleDeleteGroup(evt) {
        evt.stopPropagation();
        this.deleteGroupTarget = { id: evt.currentTarget.dataset.id, name: evt.currentTarget.dataset.name };
        this.deleteGroupModal.open();
    }

    handleGroupNameChange(evt) {
        this.groupDraft = { ...this.groupDraft, name: evt.detail.value };
    }

    async handleGroupModalButton(evt) {
        const action = evt.detail;
        if (action === 'cancel') {
            this.groupModal.close();
            return;
        }
        try {
            if (this.groupModalMode === 'create') {
                await createGroup({ title: this.groupDraft.name });
                this.showToast('Group created', '', 'success');
            } else {
                await updateGroup({ groupId: this.groupDraft.id, title: this.groupDraft.name });
                this.showToast('Group updated', '', 'success');
                if (this.selectedGroupId === this.groupDraft.id) {
                    this.selectedGroupName = this.groupDraft.name;
                }
            }
            this.groupModal.close();
            await refreshApex(this._wiredGroups);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    async handleDeleteGroupConfirm(evt) {
        if (evt.detail === 'cancel') {
            this.deleteGroupModal.close();
            return;
        }
        try {
            await deleteGroup({ groupId: this.deleteGroupTarget.id });
            if (this.selectedGroupId === this.deleteGroupTarget.id) {
                this.selectedGroupId = null;
                this.selectedGroupName = '';
                this.projects = { data: null, error: null };
            }
            this.deleteGroupModal.close();
            this.showToast('Group deleted', '', 'success');
            await refreshApex(this._wiredGroups);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    async handleSelectGroup(evt) {
        const id = evt.currentTarget.dataset.id;
        if (this.selectedGroupId === id) return;
        this.selectedGroupId = id;
        this.selectedGroupName = evt.currentTarget.querySelector('.group-name').textContent.trim();
        this.expandedProjectIds = new Set();
        this.projectNotebooks = {};
        // Re-map to update selected class
        this._applyGroupWireResult(this._wiredGroups);
        // Refresh projects wire so project list updates immediately for the selected group
        if (this._wiredProjects) {
            try {
                await refreshApex(this._wiredProjects);
            } catch (e) {
                // Non-fatal: log and continue
                // eslint-disable-next-line no-console
                console.warn('Failed to refresh projects after selecting group', e);
            }
        }
    }

    // ── Project handlers ─────────────────────────────────────────────
    handleNewProject() {
        this.projectDraft = { id: null, name: '', groupId: this.selectedGroupId };
        this.projectModalMode = 'create';
        this.projectModal.open();
        this._focusProjectNameInput();
    }

    handleEditProject(evt) {
        evt.stopPropagation();
        this.projectDraft = {
            id: evt.currentTarget.dataset.id,
            name: evt.currentTarget.dataset.name,
            groupId: this.selectedGroupId
        };
        this.projectModalMode = 'edit';
        this.projectModal.open();
        this._focusProjectNameInput();
    }

    _focusProjectNameInput() {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        requestAnimationFrame(() => {
            const input = this.template.querySelector('[data-id="project-name-input"]');
            if (input) input.focus();
        });
    }

    handleDeleteProject(evt) {
        evt.stopPropagation();
        this.deleteProjectTarget = { id: evt.currentTarget.dataset.id, name: evt.currentTarget.dataset.name };
        this.deleteProjectModal.open();
    }

    handleProjectNameChange(evt) {
        this.projectDraft = { ...this.projectDraft, name: evt.detail.value };
    }

    handleProjectNameKeydown(evt) {
        if (evt.key === 'Enter') {
            this.handleProjectModalButton({ detail: 'confirm' });
        }
    }

    // Handler for lightning-record-picker selection in the project modal
    handleProjectRecordPick(evt) {
        // The lightning-record-picker returns the selected record id in evt.detail.selectedRecordId
        const selectedId = evt.detail && evt.detail.selectedRecordId ? evt.detail.selectedRecordId : null;
        this.projectDraft = { ...this.projectDraft, associatedRecordId: selectedId };
    }

    async handleProjectModalButton(evt) {
        const action = evt.detail;
        if (action === 'cancel') {
            this.projectModal.close();
            return;
        }
        try {
            if (this.projectModalMode === 'create') {
                await createProject({ groupId: this.projectDraft.groupId, title: this.projectDraft.name });
                this.showToast('Project created', '', 'success');
            } else {
                await updateProject({ projectId: this.projectDraft.id, groupId: this.projectDraft.groupId, title: this.projectDraft.name });
                this.showToast('Project updated', '', 'success');
            }
            this.projectModal.close();
            await refreshApex(this._wiredProjects);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    async handleDeleteProjectConfirm(evt) {
        if (evt.detail === 'cancel') {
            this.deleteProjectModal.close();
            return;
        }
        try {
            await deleteProject({ projectId: this.deleteProjectTarget.id });
            // Remove the deleted project's notebooks entry without creating an unused variable
            const rest = { ...this.projectNotebooks };
            delete rest[this.deleteProjectTarget.id];
            this.projectNotebooks = rest;
            const nextSet = new Set(this.expandedProjectIds);
            nextSet.delete(this.deleteProjectTarget.id);
            this.expandedProjectIds = nextSet;
            this.deleteProjectModal.close();
            this.showToast('Project deleted', '', 'success');
            await refreshApex(this._wiredProjects);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    handleToggleProject(evt) {
        const id = evt.currentTarget.dataset.id;
        const next = new Set(this.expandedProjectIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
            if (!this.projectNotebooks[id]) {
                this.loadNotebooks(id);
            }
        }
        this.expandedProjectIds = next;
        this.refreshProjectList();
    }

    handleProjectActionClick(evt) {
        // Prevent project toggle from firing when action buttons are clicked
        evt.stopPropagation();
    }

    // ── Notebook loading ─────────────────────────────────────────────
    async loadNotebooks(projectId) {
        try {
            const nbs = await getNotebooksByProject({ projectId });
            this.projectNotebooks = { ...this.projectNotebooks, [projectId]: nbs };
            this.refreshProjectList();
        } catch (err) {
            // Non-fatal: log for diagnostics and preserve original behavior
            // eslint-disable-next-line no-console
            console.debug('loadNotebooks error', err);
            this.showToast('Error', 'Failed to load notebooks.', 'error');
        }
    }

    refreshProjectList() {
        if (!this.projects.data) return;
        this.projects = {
            data: this.projects.data.map(p => ({
                ...p,
                expanded: this.expandedProjectIds.has(p.Id),
                chevronIcon: this.expandedProjectIds.has(p.Id) ? 'utility:chevrondown' : 'utility:chevronright',
                notebooks: this.projectNotebooks[p.Id] ?? null,
                hasNotebooks: (this.projectNotebooks[p.Id] ?? []).length > 0
            })),
            error: null
        };
    }

    // ── Notebook handlers ────────────────────────────────────────────
    handleNewNotebook(evt) {
        evt.stopPropagation();
        const projectId = evt.currentTarget.dataset.projectId;
        this.notebookDraft = { id: null, name: '', projectId };
        this.notebookModalMode = 'create';
        this.notebookModal.open();
    }

    handleEditNotebook(evt) {
        evt.stopPropagation();
        this.notebookDraft = {
            id: evt.currentTarget.dataset.id,
            name: evt.currentTarget.dataset.name,
            projectId: evt.currentTarget.dataset.projectId
        };
        this.notebookModalMode = 'edit';
        this.notebookModal.open();
    }

    handleDeleteNotebook(evt) {
        evt.stopPropagation();
        this.deleteNotebookTarget = { id: evt.currentTarget.dataset.id, name: evt.currentTarget.dataset.name };
        this.deleteNotebookModal.open();
    }

    handleNotebookNameChange(evt) {
        this.notebookDraft = { ...this.notebookDraft, name: evt.detail.value };
    }

    handleNotebookActionClick(evt) {
        evt.stopPropagation();
    }

    async handleNotebookModalButton(evt) {
        const action = evt.detail;
        if (action === 'cancel') {
            this.notebookModal.close();
            return;
        }
        try {
            if (this.notebookModalMode === 'create') {
                await createNotebook({ projectId: this.notebookDraft.projectId, title: this.notebookDraft.name });
                this.showToast('Notebook created', '', 'success');
            } else {
                await updateNotebook({ notebookId: this.notebookDraft.id, projectId: this.notebookDraft.projectId, title: this.notebookDraft.name });
                this.showToast('Notebook updated', '', 'success');
            }
            this.notebookModal.close();
            const pid = this.notebookDraft.projectId;
            // Reload notebooks for that project
            const nbs = await getNotebooksByProject({ projectId: pid });
            this.projectNotebooks = { ...this.projectNotebooks, [pid]: nbs };
            this.refreshProjectList();
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    async handleDeleteNotebookConfirm(evt) {
        if (evt.detail === 'cancel') {
            this.deleteNotebookModal.close();
            return;
        }
        try {
            await deleteNotebook({ notebookId: this.deleteNotebookTarget.id });
            // Refresh all expanded project notebook lists that might contain this notebook
            const refreshPromises = [...this.expandedProjectIds].map(pid =>
                getNotebooksByProject({ projectId: pid }).then(nbs => {
                    this.projectNotebooks = { ...this.projectNotebooks, [pid]: nbs };
                })
            );
            await Promise.all(refreshPromises);
            this.refreshProjectList();
            this.deleteNotebookModal.close();
            this.showToast('Notebook deleted', '', 'success');
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    handleOpenNotebook(evt) {
        // Prevent edit/delete button clicks from opening the notebook
        if (evt.target.closest('.notebook-actions')) return;
        const notebookId = evt.currentTarget.dataset.notebookId;
        const notebookName = evt.currentTarget.dataset.notebookName;
        this[NavigationMixin.Navigate]({
            type: 'standard__navItemPage',
            attributes: {
                apiName: 'NSF_Notebook_View'
            },
            state: {
                c__notebookId: notebookId,
                c__notebookName: notebookName
            }
        });
    }

    // ── Utilities ────────────────────────────────────────────────────
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    extractError(e) {
        return (e && e.body && e.body.message) || (e && e.message) || 'An unexpected error occurred.';
    }
}
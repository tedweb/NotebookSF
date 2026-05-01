import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getSectionsByNotebook from '@salesforce/apex/NSFSectionController.getSectionsByNotebook';
import createSection from '@salesforce/apex/NSFSectionController.createSection';
import updateSection from '@salesforce/apex/NSFSectionController.updateSection';
import deleteSection from '@salesforce/apex/NSFSectionController.deleteSection';
import getExamsBySection from '@salesforce/apex/NSFExamController.getExamsBySection';
import saveExamWithCandidates from '@salesforce/apex/NSFExamController.saveExamWithCandidates';
import reorderExams from '@salesforce/apex/NSFExamController.reorderExams';
import deleteExam from '@salesforce/apex/NSFExamController.deleteExam';
import submitAttempt from '@salesforce/apex/NSFExamController.submitAttempt';
import getStarsByNotebook from '@salesforce/apex/NSFStarController.getStarsByNotebook';
import createStar from '@salesforce/apex/NSFStarController.createStar';
import deleteStar from '@salesforce/apex/NSFStarController.deleteStar';

export default class NotebookExams extends LightningElement {
    @api notebookId;

    @track _sections = { data: null, error: null };
    @track sectionExams = {};
    @track starMap = {};
    _wiredSections;

    @track sectionDraft = { id: null, title: '' };
    sectionModalMode = 'create';
    deleteSectionTarget = { id: null, title: '' };

    @track examDraft = { id: null, sectionId: null, question: '', explanation: '', orderNum: 1 };
    @track candidateDrafts = [];
    @track deletedCandidateIds = [];
    @track wizardPage = 1;
    examModalMode = 'create';

    deleteExamTarget = { id: null, sectionId: null };

    // ── Wire: Sections ────────────────────────────────────────────────
    @wire(getSectionsByNotebook, { notebookId: '$notebookId' })
    wiredSections(result) {
        this._wiredSections = result;
        if (result.data) {
            this._buildSections(result.data);
            this._loadAllExams(result.data);
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
                exams: this.sectionExams[s.Id] ?? null,
                hasExams: (this.sectionExams[s.Id] ?? []).length > 0
            })),
            error: null
        };
    }

    async _loadAllExams(rawSections) {
        await Promise.all(rawSections.map(s => this._loadExamsForSection(s.Id)));
    }

    async _loadExamsForSection(sectionId) {
        try {
            const existingExams = this.sectionExams[sectionId] || [];
            const expandedIds = new Set(existingExams.filter(e => e.expanded).map(e => e.Id));
            const selections = {};
            existingExams.forEach(e => { if (e.selectedCandidateId) selections[e.Id] = e.selectedCandidateId; });

            const wrappers = await getExamsBySection({ sectionId });
            this.sectionExams = {
                ...this.sectionExams,
                [sectionId]: wrappers.map((w, idx) => this._mapExam(w, idx, expandedIds, selections))
            };
            this._rebuildSections();
        } catch (e) {
            this.showToast('Error', 'Failed to load questions for a section.', 'error');
        }
    }

    _mapExam(wrapper, idx, expandedIds = new Set(), selections = {}) {
        const exam = wrapper.exam;
        const candidates = wrapper.candidates || [];
        const hasAttempt = wrapper.attemptCandidateId != null;
        const wasCorrect = wrapper.wasCorrect;
        const attemptCandidateId = wrapper.attemptCandidateId;
        const isExpanded = expandedIds.has(exam.Id);
        const selectedCandidateId = selections[exam.Id] || null;

        const mappedCandidates = candidates.map(c => ({
            ...c,
            isCorrect: c.Is_Correct__c,
            wasSelected: c.Id === attemptCandidateId,
            wasSelectedWrong: c.Id === attemptCandidateId && !c.Is_Correct__c,
            itemClass: hasAttempt
                ? (c.Is_Correct__c
                    ? 'candidate-result correct'
                    : c.Id === attemptCandidateId
                        ? 'candidate-result incorrect-selected'
                        : 'candidate-result neutral')
                : 'candidate-result neutral'
        }));

        return {
            ...exam,
            displayOrder: idx + 1,
            candidates: mappedCandidates,
            candidateOptions: candidates.map(c => ({ label: c.Possible_Answer__c || '', value: c.Id })),
            hasAttempt,
            wasCorrect,
            attemptCandidateId,
            selectedCandidateId,
            isSubmitDisabled: !selectedCandidateId,
            expanded: isExpanded,
            chevronIcon: isExpanded ? 'utility:chevrondown' : 'utility:chevronright',
            attemptIcon: hasAttempt ? (wasCorrect ? 'utility:check' : 'utility:close') : null,
            attemptBadgeClass: hasAttempt
                ? (wasCorrect ? 'attempt-badge correct' : 'attempt-badge incorrect')
                : 'attempt-badge hidden',
            resultBannerClass: wasCorrect ? 'result-banner correct' : 'result-banner incorrect',
            resultLabel: hasAttempt ? (wasCorrect ? 'Correct!' : 'Incorrect') : '',
            isStarred: !!this.starMap[exam.Id],
            starId: this.starMap[exam.Id] || null,
            starIcon: this.starMap[exam.Id] ? 'utility:favorite_alt' : 'utility:favorite'
        };
    }

    _rebuildSections() {
        if (!this._sections.data) return;
        this._sections = {
            data: this._sections.data.map(s => ({
                ...s,
                isStarred: !!this.starMap[s.Id],
                starId: this.starMap[s.Id] || null,
                exams: this.sectionExams[s.Id] ?? null,
                hasExams: (this.sectionExams[s.Id] ?? []).length > 0
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
                const id = star.NSF_ExamId__c || star.NSF_SectionId__c;
                if (id) map[id] = star.Id;
            });
            this.starMap = map;
            this._applyStarMap();
        } catch (e) { /* best-effort */ }
    }

    _applyStarMap() {
        const updated = {};
        Object.keys(this.sectionExams).forEach(sid => {
            updated[sid] = (this.sectionExams[sid] || []).map(ex => ({
                ...ex,
                isStarred: !!this.starMap[ex.Id],
                starId: this.starMap[ex.Id] || null,
                starIcon: this.starMap[ex.Id] ? 'utility:favorite_alt' : 'utility:favorite'
            }));
        });
        this.sectionExams = updated;
        this._rebuildSections();
    }

    async handleStarToggle(evt) {
        evt.stopPropagation();
        const itemId = evt.currentTarget.dataset.itemId;
        await this._toggleStar(itemId, this.starMap[itemId], 'Exam');
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

    // ── Exam toggle ───────────────────────────────────────────────────
    handleExamClick(evt) {
        const examId = evt.currentTarget.dataset.examId;
        const sectionId = evt.currentTarget.dataset.sectionId;
        this.sectionExams = {
            ...this.sectionExams,
            [sectionId]: (this.sectionExams[sectionId] || []).map(ex => {
                if (ex.Id !== examId) return ex;
                const expanded = !ex.expanded;
                return { ...ex, expanded, chevronIcon: expanded ? 'utility:chevrondown' : 'utility:chevronright' };
            })
        };
        this._rebuildSections();
    }

    stopProp(evt) { evt.stopPropagation(); }

    // ── Candidate selection ───────────────────────────────────────────
    handleCandidateSelect(evt) {
        const examId = evt.currentTarget.dataset.examId;
        const sectionId = evt.currentTarget.dataset.sectionId;
        const candidateId = evt.detail.value;
        this.sectionExams = {
            ...this.sectionExams,
            [sectionId]: (this.sectionExams[sectionId] || []).map(ex =>
                ex.Id === examId ? { ...ex, selectedCandidateId: candidateId, isSubmitDisabled: false } : ex
            )
        };
        this._rebuildSections();
    }

    async handleSubmitAttempt(evt) {
        const examId = evt.currentTarget.dataset.examId;
        const sectionId = evt.currentTarget.dataset.sectionId;
        const sectionExamList = this.sectionExams[sectionId] || [];
        const exam = sectionExamList.find(e => e.Id === examId);
        if (!exam || !exam.selectedCandidateId) return;

        try {
            const attempt = await submitAttempt({ examId, candidateId: exam.selectedCandidateId });
            this.sectionExams = {
                ...this.sectionExams,
                [sectionId]: sectionExamList.map(ex =>
                    ex.Id === examId
                        ? this._applyAttemptResult(ex, exam.selectedCandidateId, attempt.Was_Correct__c)
                        : ex
                )
            };
            this._rebuildSections();
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    _applyAttemptResult(exam, selectedCandidateId, wasCorrect) {
        return {
            ...exam,
            hasAttempt: true,
            wasCorrect,
            attemptCandidateId: selectedCandidateId,
            attemptIcon: wasCorrect ? 'utility:check' : 'utility:close',
            attemptBadgeClass: wasCorrect ? 'attempt-badge correct' : 'attempt-badge incorrect',
            resultBannerClass: wasCorrect ? 'result-banner correct' : 'result-banner incorrect',
            resultLabel: wasCorrect ? 'Correct!' : 'Incorrect',
            candidates: exam.candidates.map(c => ({
                ...c,
                wasSelected: c.Id === selectedCandidateId,
                wasSelectedWrong: c.Id === selectedCandidateId && !c.Is_Correct__c,
                itemClass: c.Is_Correct__c
                    ? 'candidate-result correct'
                    : c.Id === selectedCandidateId
                        ? 'candidate-result incorrect-selected'
                        : 'candidate-result neutral'
            }))
        };
    }

    // ── Exam sort ─────────────────────────────────────────────────────
    async handleMoveExam(evt) {
        evt.stopPropagation();
        const examId = evt.currentTarget.dataset.examId;
        const sectionId = evt.currentTarget.dataset.sectionId;
        const direction = evt.currentTarget.dataset.direction;
        const exams = [...(this.sectionExams[sectionId] || [])];
        const idx = exams.findIndex(e => e.Id === examId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === exams.length - 1) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [exams[idx], exams[swapIdx]] = [exams[swapIdx], exams[idx]];
        const newOrders = exams.map((e, i) => ({ ...e, Order__c: i + 1, displayOrder: i + 1 }));
        this.sectionExams = { ...this.sectionExams, [sectionId]: newOrders };
        this._rebuildSections();

        try {
            await reorderExams({ examIds: newOrders.map(e => e.Id), orders: newOrders.map(e => e.Order__c) });
        } catch (e) {
            this.showToast('Error', 'Failed to save order.', 'error');
            await this._loadExamsForSection(sectionId);
        }
    }

    // ── Exam delete ───────────────────────────────────────────────────
    handleDeleteExam(evt) {
        evt.stopPropagation();
        this.deleteExamTarget = { id: evt.currentTarget.dataset.examId, sectionId: evt.currentTarget.dataset.sectionId };
        this.deleteExamModal.open();
    }

    async handleDeleteExamConfirm(evt) {
        if (evt.detail === 'cancel') { this.deleteExamModal.close(); return; }
        try {
            await deleteExam({ examId: this.deleteExamTarget.id });
            this.deleteExamModal.close();
            this.showToast('Question deleted', '', 'success');
            await this._loadExamsForSection(this.deleteExamTarget.sectionId);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    get deleteExamBodyText() { return 'Delete this question and all its answer choices? This cannot be undone.'; }

    // ── Wizard computed ───────────────────────────────────────────────
    get isWizardPage1() { return this.wizardPage === 1; }
    get isWizardPage2() { return this.wizardPage === 2; }
    get showWizardPrevButton() { return this.wizardPage > 1; }
    get examWizardHeader() { return this.examModalMode === 'edit' ? 'Edit Question' : 'New Question'; }
    get examWizardConfirmLabel() {
        return this.wizardPage < 2 ? 'Next →' : (this.examModalMode === 'edit' ? 'Save' : 'Create');
    }
    get wizardStepLabel() {
        return `Step ${this.wizardPage} of 2 — ${this.wizardPage === 1 ? 'Question' : 'Answer Choices'}`;
    }

    // ── Exam wizard handlers ──────────────────────────────────────────
    handleNewExam(evt) {
        const sectionId = evt.currentTarget.dataset.sectionId;
        const existingExams = this.sectionExams[sectionId] || [];
        const nextOrder = existingExams.reduce((max, e) => Math.max(max, e.Order__c || 0), 0) + 1;
        this.examDraft = { id: null, sectionId, question: '', explanation: '', orderNum: nextOrder };
        this.candidateDrafts = [
            { key: 'new-1', id: null, possibleAnswer: '', isCorrect: false },
            { key: 'new-2', id: null, possibleAnswer: '', isCorrect: false }
        ];
        this.deletedCandidateIds = [];
        this.examModalMode = 'create';
        this.wizardPage = 1;
        this.examWizardModal.open();
    }

    handleEditExam(evt) {
        evt.stopPropagation();
        const examId = evt.currentTarget.dataset.examId;
        const sectionId = evt.currentTarget.dataset.sectionId;
        const exam = (this.sectionExams[sectionId] || []).find(e => e.Id === examId);
        if (!exam) return;
        this.examDraft = { id: examId, sectionId, question: exam.Question__c || '', explanation: exam.Explanation__c || '', orderNum: exam.Order__c || 1 };
        this.candidateDrafts = exam.candidates.map(c => ({
            key: c.Id, id: c.Id, possibleAnswer: c.Possible_Answer__c || '', isCorrect: c.Is_Correct__c || false
        }));
        this.deletedCandidateIds = [];
        this.examModalMode = 'edit';
        this.wizardPage = 1;
        this.examWizardModal.open();
    }

    handleExamQuestionChange(evt) { this.examDraft = { ...this.examDraft, question: evt.detail.value }; }
    handleExamExplanationChange(evt) { this.examDraft = { ...this.examDraft, explanation: evt.detail.value }; }

    handleCandidateAnswerChange(evt) {
        const key = evt.currentTarget.dataset.key;
        this.candidateDrafts = this.candidateDrafts.map(cd =>
            cd.key === key ? { ...cd, possibleAnswer: evt.detail.value } : cd
        );
    }

    handleCandidateCorrectToggle(evt) {
        const key = evt.currentTarget.dataset.key;
        this.candidateDrafts = this.candidateDrafts.map(cd =>
            cd.key === key ? { ...cd, isCorrect: evt.detail.checked } : cd
        );
    }

    handleRemoveCandidate(evt) {
        const key = evt.currentTarget.dataset.key;
        const cd = this.candidateDrafts.find(c => c.key === key);
        if (cd && cd.id) this.deletedCandidateIds = [...this.deletedCandidateIds, cd.id];
        this.candidateDrafts = this.candidateDrafts.filter(c => c.key !== key);
    }

    handleAddCandidate() {
        const newKey = `new-${Date.now()}`;
        this.candidateDrafts = [...this.candidateDrafts, { key: newKey, id: null, possibleAnswer: '', isCorrect: false }];
    }

    handleWizardPrev() { if (this.wizardPage > 1) this.wizardPage--; }

    async handleExamWizardButton(evt) {
        if (evt.detail === 'cancel') { this.examWizardModal.close(); this.wizardPage = 1; return; }
        if (this.wizardPage < 2) { this.wizardPage++; return; }
        if (this.candidateDrafts.length < 2) {
            this.showToast('Validation', 'Add at least two answer choices.', 'warning'); return;
        }
        if (!this.candidateDrafts.some(c => c.isCorrect)) {
            this.showToast('Validation', 'Mark at least one answer as correct.', 'warning'); return;
        }
        if (this.candidateDrafts.some(c => !c.possibleAnswer.trim())) {
            this.showToast('Validation', 'All answer choices must have text.', 'warning'); return;
        }
        try {
            const d = this.examDraft;
            await saveExamWithCandidates({
                examId: d.id,
                sectionId: d.sectionId,
                question: d.question,
                explanation: d.explanation || null,
                orderNum: d.orderNum,
                candidates: this.candidateDrafts.map(c => ({ id: c.id || null, possibleAnswer: c.possibleAnswer, isCorrect: c.isCorrect })),
                deleteCandidateIds: this.deletedCandidateIds
            });
            this.examWizardModal.close();
            this.wizardPage = 1;
            this.showToast(this.examModalMode === 'create' ? 'Question created' : 'Question updated', '', 'success');
            await this._loadExamsForSection(d.sectionId);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

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
                this.sectionExams = { ...this.sectionExams, [sec.Id]: [] };
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
            const { [this.deleteSectionTarget.id]: _r, ...rest } = this.sectionExams;
            this.sectionExams = rest;
            this.deleteSectionModal.close();
            this.showToast('Section deleted', '', 'success');
            await refreshApex(this._wiredSections);
        } catch (e) {
            this.showToast('Error', this.extractError(e), 'error');
        }
    }

    get sectionModalHeader() { return this.sectionModalMode === 'edit' ? 'Edit Section' : 'New Section'; }
    get deleteSectionBodyText() {
        return `Delete "${this.deleteSectionTarget.title}" and all its questions? This cannot be undone.`;
    }

    // ── Modal refs ────────────────────────────────────────────────────
    get sectionModal() { return this.template.querySelector('.section-modal'); }
    get deleteSectionModal() { return this.template.querySelector('.delete-section-modal'); }
    get examWizardModal() { return this.template.querySelector('.exam-wizard-modal'); }
    get deleteExamModal() { return this.template.querySelector('.delete-exam-modal'); }

    // ── Utilities ─────────────────────────────────────────────────────
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    extractError(e) {
        return (e && e.body && e.body.message) || (e && e.message) || 'An unexpected error occurred.';
    }
}
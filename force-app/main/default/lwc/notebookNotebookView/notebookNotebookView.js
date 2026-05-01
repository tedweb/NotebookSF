import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class NotebookNotebookView extends LightningElement {
    @track activeTab = 'resources';
    @track notebookId;
    @track notebookName = 'Notebook';

    @wire(CurrentPageReference)
    handlePageRef(pageRef) {
        if (pageRef && pageRef.state) {
            this.notebookId = pageRef.state.c__notebookId || null;
            this.notebookName = pageRef.state.c__notebookName || 'Notebook';
        }
    }

    handleTabSelect(evt) {
        this.activeTab = evt.target.value;
    }
}
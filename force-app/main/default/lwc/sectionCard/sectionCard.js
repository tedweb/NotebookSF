import { LightningElement, api } from 'lwc';

export default class SectionCard extends LightningElement {
    @api sectionId;
    @api sectionTitle;
    @api isStarred = false;
    @api starId;

    get starIcon() { return this.isStarred ? 'utility:favorite_alt' : 'utility:favorite'; }
    get starTitle() { return this.isStarred ? 'Unstar section' : 'Star section'; }
    get starBtnClass() { return this.isStarred ? 'star-btn starred' : 'star-btn'; }

    handleStar(evt) {
        evt.stopPropagation();
        this.dispatchEvent(new CustomEvent('starsection', {
            detail: { sectionId: this.sectionId, isStarred: this.isStarred, starId: this.starId },
            bubbles: true
        }));
    }

    handleEdit(evt) {
        evt.stopPropagation();
        this.dispatchEvent(new CustomEvent('editsection', { detail: this.sectionId, bubbles: true }));
    }

    handleDelete(evt) {
        evt.stopPropagation();
        this.dispatchEvent(new CustomEvent('deletesection', { detail: this.sectionId, bubbles: true }));
    }
}
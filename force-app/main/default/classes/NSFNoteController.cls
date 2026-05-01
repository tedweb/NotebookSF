public with sharing class NSFNoteController {

    @AuraEnabled
    public static List<NSF_Note__c> getNotesBySection(Id sectionId) {
        return [
            SELECT Id, Title__c, Body__c, Link__c, NSF_SectionId__c
            FROM NSF_Note__c
            WHERE NSF_SectionId__c = :sectionId
            WITH USER_MODE
            ORDER BY Title__c ASC
        ];
    }

    @AuraEnabled
    public static NSF_Note__c createNote(Id sectionId, String title, String body, String link) {
        NSF_Note__c note = new NSF_Note__c(
            Title__c = title,
            Body__c = body,
            Link__c = link,
            NSF_SectionId__c = sectionId
        );
        try {
            insert as user note;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
        return note;
    }

    @AuraEnabled
    public static void updateNote(Id noteId, Id sectionId, String title, String body, String link) {
        NSF_Note__c note = new NSF_Note__c(
            Id = noteId,
            Title__c = title,
            Body__c = body,
            Link__c = link,
            NSF_SectionId__c = sectionId
        );
        try {
            update as user note;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    @AuraEnabled
    public static void deleteNote(Id noteId) {
        NSF_Note__c note = new NSF_Note__c(Id = noteId);
        try {
            delete as user note;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }
}

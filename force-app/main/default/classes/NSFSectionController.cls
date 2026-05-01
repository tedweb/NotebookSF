public with sharing class NSFSectionController {

    @AuraEnabled(cacheable=true)
    public static List<NSF_Section__c> getSectionsByNotebook(Id notebookId) {
        return [
            SELECT Id, Title__c, Is_Starred_Section__c
            FROM NSF_Section__c
            WHERE NSF_NotebookId__c = :notebookId
            WITH USER_MODE
            ORDER BY Title__c ASC
        ];
    }

    @AuraEnabled
    public static NSF_Section__c createSection(Id notebookId, String title) {
        NSF_Section__c sec = new NSF_Section__c(
            Title__c = title,
            NSF_NotebookId__c = notebookId
        );
        try {
            insert as user sec;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
        return sec;
    }

    @AuraEnabled
    public static void updateSection(Id sectionId, String title) {
        NSF_Section__c sec = new NSF_Section__c(Id = sectionId, Title__c = title);
        try {
            update as user sec;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    @AuraEnabled
    public static void deleteSection(Id sectionId) {
        NSF_Section__c sec = new NSF_Section__c(Id = sectionId);
        try {
            delete as user sec;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }
}

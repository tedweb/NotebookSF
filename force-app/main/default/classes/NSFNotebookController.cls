public with sharing class NSFNotebookController {

    @AuraEnabled
    public static List<NSF_Notebook__c> getNotebooksByProject(Id projectId) {
        return [
            SELECT Id, Title__c, NSF_ProjectId__c
            FROM NSF_Notebook__c
            WHERE NSF_ProjectId__c = :projectId
            WITH USER_MODE
            ORDER BY Title__c ASC
        ];
    }

    @AuraEnabled
    public static NSF_Notebook__c createNotebook(Id projectId, String title) {
        NSF_Notebook__c nb = new NSF_Notebook__c(
            Title__c = title,
            NSF_ProjectId__c = projectId
        );
        try {
            insert as user nb;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
        return nb;
    }

    @AuraEnabled
    public static void updateNotebook(Id notebookId, Id projectId, String title) {
        NSF_Notebook__c nb = new NSF_Notebook__c(
            Id = notebookId,
            Title__c = title,
            NSF_ProjectId__c = projectId
        );
        try {
            update as user nb;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    @AuraEnabled
    public static void deleteNotebook(Id notebookId) {
        NSF_Notebook__c nb = new NSF_Notebook__c(Id = notebookId);
        try {
            delete as user nb;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }
}
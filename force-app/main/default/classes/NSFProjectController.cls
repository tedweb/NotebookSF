public with sharing class NSFProjectController {

    @AuraEnabled(cacheable=true)
    public static List<NSF_Project__c> getProjectsByGroup(Id groupId) {
        return [
            SELECT Id, Title__c, NSF_GroupId__c
            FROM NSF_Project__c
            WHERE NSF_GroupId__c = :groupId
            WITH USER_MODE
            ORDER BY Title__c ASC
        ];
    }

    @AuraEnabled
    public static NSF_Project__c createProject(Id groupId, String title) {
        NSF_Project__c proj = new NSF_Project__c(
            Title__c = title,
            NSF_GroupId__c = groupId
        );
        try {
            insert as user proj;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
        return proj;
    }

    @AuraEnabled
    public static void updateProject(Id projectId, Id groupId, String title) {
        NSF_Project__c proj = new NSF_Project__c(
            Id = projectId,
            Title__c = title,
            NSF_GroupId__c = groupId
        );
        try {
            update as user proj;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    @AuraEnabled
    public static void deleteProject(Id projectId) {
        NSF_Project__c proj = new NSF_Project__c(Id = projectId);
        try {
            delete as user proj;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }
}

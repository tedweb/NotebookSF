public with sharing class NSFGroupController {

    @AuraEnabled(cacheable=true)
    public static List<NSF_Group__c> getGroups() {
        return [
            SELECT Id, Title__c
            FROM NSF_Group__c
            WITH USER_MODE
            ORDER BY Title__c ASC
        ];
    }

    @AuraEnabled
    public static NSF_Group__c createGroup(String title) {
        NSF_Group__c grp = new NSF_Group__c(Title__c = title);
        try {
            insert as user grp;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
        return grp;
    }

    @AuraEnabled
    public static void updateGroup(Id groupId, String title) {
        NSF_Group__c grp = new NSF_Group__c(Id = groupId, Title__c = title);
        try {
            update as user grp;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    @AuraEnabled
    public static void deleteGroup(Id groupId) {
        // Cascade-delete all child Projects (and their descendants) via trigger
        NSF_Group__c grp = new NSF_Group__c(Id = groupId);
        try {
            delete as user grp;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }
}
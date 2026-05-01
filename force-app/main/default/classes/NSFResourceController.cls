public with sharing class NSFResourceController {

    @AuraEnabled
    public static List<NSF_Resource__c> getResourcesBySection(Id sectionId) {
        return [
            SELECT Id, Title__c, Link__c, Type__c, NSF_SectionId__c
            FROM NSF_Resource__c
            WHERE NSF_SectionId__c = :sectionId
            WITH USER_MODE
            ORDER BY Title__c ASC
        ];
    }

    @AuraEnabled
    public static NSF_Resource__c createResource(
        Id sectionId, String title, String link, String type
    ) {
        NSF_Resource__c res = new NSF_Resource__c(
            Title__c = title,
            Link__c = link,
            Type__c = type,
            NSF_SectionId__c = sectionId
        );
        try {
            insert as user res;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
        return res;
    }

    @AuraEnabled
    public static void updateResource(
        Id resourceId, Id sectionId, String title, String link, String type
    ) {
        NSF_Resource__c res = new NSF_Resource__c(
            Id = resourceId,
            Title__c = title,
            Link__c = link,
            Type__c = type,
            NSF_SectionId__c = sectionId
        );
        try {
            update as user res;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    @AuraEnabled
    public static void deleteResource(Id resourceId) {
        NSF_Resource__c res = new NSF_Resource__c(Id = resourceId);
        try {
            delete as user res;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }
}
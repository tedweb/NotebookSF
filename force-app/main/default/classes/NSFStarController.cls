public with sharing class NSFStarController {

    @AuraEnabled(cacheable=false)
    public static List<NSF_Star_Listing__c> getStarsByNotebook(Id notebookId) {
        try {
            Set<Id> sectionIds = new Set<Id>();
            for (NSF_Section__c s : [
                SELECT Id FROM NSF_Section__c WHERE NSF_NotebookId__c = :notebookId WITH USER_MODE
            ]) sectionIds.add(s.Id);

            if (sectionIds.isEmpty()) return new List<NSF_Star_Listing__c>();

            Set<Id> cardIds = new Set<Id>();
            Set<Id> examIds = new Set<Id>();
            Set<Id> noteIds = new Set<Id>();
            Set<Id> resourceIds = new Set<Id>();

            for (NSF_Card__c c : [SELECT Id FROM NSF_Card__c WHERE NSF_SectionId__c IN :sectionIds WITH USER_MODE])
                cardIds.add(c.Id);
            for (NSF_Exam__c e : [SELECT Id FROM NSF_Exam__c WHERE NSF_SectionId__c IN :sectionIds WITH USER_MODE])
                examIds.add(e.Id);
            for (NSF_Note__c n : [SELECT Id FROM NSF_Note__c WHERE NSF_SectionId__c IN :sectionIds WITH USER_MODE])
                noteIds.add(n.Id);
            for (NSF_Resource__c r : [SELECT Id FROM NSF_Resource__c WHERE NSF_SectionId__c IN :sectionIds WITH USER_MODE])
                resourceIds.add(r.Id);

            return [
                SELECT Id, NSF_CardId__c, NSF_ExamId__c, NSF_NoteId__c, NSF_ResourceId__c, NSF_SectionId__c
                FROM NSF_Star_Listing__c
                WHERE OwnerId = :UserInfo.getUserId()
                AND (
                    NSF_CardId__c IN :cardIds
                    OR NSF_ExamId__c IN :examIds
                    OR NSF_NoteId__c IN :noteIds
                    OR NSF_ResourceId__c IN :resourceIds
                    OR NSF_SectionId__c IN :sectionIds
                )
                WITH USER_MODE
            ];
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static Id createStar(Id recordId, String itemType) {
        try {
            NSF_Star_Listing__c star = new NSF_Star_Listing__c();
            if (itemType == 'Card') star.NSF_CardId__c = recordId;
            else if (itemType == 'Exam') star.NSF_ExamId__c = recordId;
            else if (itemType == 'Note') star.NSF_NoteId__c = recordId;
            else if (itemType == 'Resource') star.NSF_ResourceId__c = recordId;
            else if (itemType == 'Section') star.NSF_SectionId__c = recordId;
            else throw new AuraHandledException('Unknown item type: ' + itemType);
            insert as user star;
            return star.Id;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteStar(Id starId) {
        try {
            delete as user [SELECT Id FROM NSF_Star_Listing__c WHERE Id = :starId WITH USER_MODE];
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
}
public with sharing class NSFCardController {

    @AuraEnabled
    public static List<NSF_Card__c> getCardsBySection(Id sectionId) {
        return [
            SELECT Id, Front__c, Back__c, Order__c, NSF_SectionId__c
            FROM NSF_Card__c
            WHERE NSF_SectionId__c = :sectionId
            WITH USER_MODE
            ORDER BY Order__c ASC NULLS LAST, Id ASC
        ];
    }

    @AuraEnabled
    public static NSF_Card__c createCard(
        Id sectionId, String front, String back, Decimal orderNum
    ) {
        NSF_Card__c card = new NSF_Card__c(
            Front__c = front,
            Back__c = back,
            Order__c = orderNum,
            NSF_SectionId__c = sectionId
        );
        try {
            insert as user card;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
        return card;
    }

    @AuraEnabled
    public static void updateCard(
        Id cardId, Id sectionId, String front, String back, Decimal orderNum
    ) {
        NSF_Card__c card = new NSF_Card__c(
            Id = cardId,
            Front__c = front,
            Back__c = back,
            Order__c = orderNum,
            NSF_SectionId__c = sectionId
        );
        try {
            update as user card;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    @AuraEnabled
    public static void reorderCards(List<Id> cardIds, List<Decimal> orders) {
        List<NSF_Card__c> toUpdate = new List<NSF_Card__c>();
        for (Integer i = 0; i < cardIds.size(); i++) {
            toUpdate.add(new NSF_Card__c(Id = cardIds[i], Order__c = orders[i]));
        }
        try {
            update as user toUpdate;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }

    @AuraEnabled
    public static void deleteCard(Id cardId) {
        NSF_Card__c card = new NSF_Card__c(Id = cardId);
        try {
            delete as user card;
        } catch (DmlException e) {
            throw new AuraHandledException(e.getDmlMessage(0));
        }
    }
}

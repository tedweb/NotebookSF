@IsTest
private class NSFCardControllerTest {

    @TestSetup
    static void makeData() {
        NSF_Group__c grp = new NSF_Group__c(Title__c = 'G');
        insert grp;
        NSF_Project__c proj = new NSF_Project__c(Title__c = 'P', NSF_GroupId__c = grp.Id);
        insert proj;
        NSF_Notebook__c nb = new NSF_Notebook__c(Title__c = 'NB', NSF_ProjectId__c = proj.Id);
        insert nb;
        NSF_Section__c sec = new NSF_Section__c(Title__c = 'Sec', NSF_NotebookId__c = nb.Id);
        insert sec;
        insert new NSF_Card__c(
            Front__c = 'Front 1', Back__c = 'Back 1',
            Order__c = 1, NSF_SectionId__c = sec.Id
        );
    }

    @IsTest
    static void testGetCardsBySection() {
        NSF_Section__c sec = [SELECT Id FROM NSF_Section__c LIMIT 1];
        Assert.isFalse(NSFCardController.getCardsBySection(sec.Id).isEmpty());
    }

    @IsTest
    static void testCreateCard() {
        NSF_Section__c sec = [SELECT Id FROM NSF_Section__c LIMIT 1];
        NSF_Card__c card = NSFCardController.createCard(sec.Id, 'Front', 'Back', 2);
        Assert.isNotNull(card.Id);
    }

    @IsTest
    static void testUpdateCard() {
        NSF_Card__c card = [SELECT Id, NSF_SectionId__c FROM NSF_Card__c LIMIT 1];
        NSFCardController.updateCard(card.Id, card.NSF_SectionId__c, 'Updated', 'New Back', 1);
        Assert.areEqual('Updated', [SELECT Front__c FROM NSF_Card__c WHERE Id = :card.Id].Front__c);
    }

    @IsTest
    static void testReorderCards() {
        NSF_Card__c card = [SELECT Id FROM NSF_Card__c LIMIT 1];
        NSFCardController.reorderCards(new List<Id>{ card.Id }, new List<Decimal>{ 5 });
        Assert.areEqual(5, [SELECT Order__c FROM NSF_Card__c WHERE Id = :card.Id].Order__c);
    }

    @IsTest
    static void testDeleteCard() {
        NSF_Card__c card = [SELECT Id FROM NSF_Card__c LIMIT 1];
        NSFCardController.deleteCard(card.Id);
        Assert.isTrue([SELECT Id FROM NSF_Card__c WHERE Id = :card.Id].isEmpty());
    }
}

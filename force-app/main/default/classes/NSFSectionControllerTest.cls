@IsTest
private class NSFSectionControllerTest {

    @TestSetup
    static void makeData() {
        NSF_Group__c grp = new NSF_Group__c(Title__c = 'G');
        insert grp;
        NSF_Project__c proj = new NSF_Project__c(Title__c = 'P', NSF_GroupId__c = grp.Id);
        insert proj;
        NSF_Notebook__c nb = new NSF_Notebook__c(Title__c = 'NB', NSF_ProjectId__c = proj.Id);
        insert nb;
        insert new NSF_Section__c(Title__c = 'Test Section', NSF_NotebookId__c = nb.Id);
    }

    @IsTest
    static void testGetSectionsByNotebook() {
        NSF_Notebook__c nb = [SELECT Id FROM NSF_Notebook__c LIMIT 1];
        List<NSF_Section__c> result = NSFSectionController.getSectionsByNotebook(nb.Id);
        Assert.isFalse(result.isEmpty());
    }

    @IsTest
    static void testCreateSection() {
        NSF_Notebook__c nb = [SELECT Id FROM NSF_Notebook__c LIMIT 1];
        NSF_Section__c sec = NSFSectionController.createSection(nb.Id, 'New Section');
        Assert.isNotNull(sec.Id);
    }

    @IsTest
    static void testUpdateSection() {
        NSF_Section__c sec = [SELECT Id FROM NSF_Section__c LIMIT 1];
        NSFSectionController.updateSection(sec.Id, 'Renamed');
        NSF_Section__c updated = [SELECT Title__c FROM NSF_Section__c WHERE Id = :sec.Id];
        Assert.areEqual('Renamed', updated.Title__c);
    }

    @IsTest
    static void testDeleteSection() {
        NSF_Section__c sec = [SELECT Id FROM NSF_Section__c LIMIT 1];
        NSFSectionController.deleteSection(sec.Id);
        Assert.isTrue([SELECT Id FROM NSF_Section__c WHERE Id = :sec.Id].isEmpty());
    }
}
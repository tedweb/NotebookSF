@IsTest
private class NSFNotebookControllerTest {

    @TestSetup
    static void makeData() {
        NSF_Group__c grp = new NSF_Group__c(Title__c = 'Test Group');
        insert grp;
        NSF_Project__c proj = new NSF_Project__c(Title__c = 'Test Project', NSF_GroupId__c = grp.Id);
        insert proj;
        insert new NSF_Notebook__c(Title__c = 'Test Notebook', NSF_ProjectId__c = proj.Id);
    }

    @IsTest
    static void testGetNotebooksByProject() {
        NSF_Project__c proj = [SELECT Id FROM NSF_Project__c LIMIT 1];
        List<NSF_Notebook__c> result = NSFNotebookController.getNotebooksByProject(proj.Id);
        Assert.isFalse(result.isEmpty());
    }

    @IsTest
    static void testCreateNotebook() {
        NSF_Project__c proj = [SELECT Id FROM NSF_Project__c LIMIT 1];
        NSF_Notebook__c nb = NSFNotebookController.createNotebook(proj.Id, 'New Notebook');
        Assert.isNotNull(nb.Id);
    }

    @IsTest
    static void testUpdateNotebook() {
        NSF_Notebook__c nb = [SELECT Id, NSF_ProjectId__c FROM NSF_Notebook__c LIMIT 1];
        NSFNotebookController.updateNotebook(nb.Id, nb.NSF_ProjectId__c, 'Renamed Notebook');
        NSF_Notebook__c updated = [SELECT Title__c FROM NSF_Notebook__c WHERE Id = :nb.Id];
        Assert.areEqual('Renamed Notebook', updated.Title__c);
    }

    @IsTest
    static void testDeleteNotebook() {
        NSF_Notebook__c nb = [SELECT Id FROM NSF_Notebook__c LIMIT 1];
        NSFNotebookController.deleteNotebook(nb.Id);
        List<NSF_Notebook__c> remaining = [SELECT Id FROM NSF_Notebook__c WHERE Id = :nb.Id];
        Assert.isTrue(remaining.isEmpty());
    }
}
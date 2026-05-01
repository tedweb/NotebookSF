@IsTest
private class NSFProjectControllerTest {

    @TestSetup
    static void makeData() {
        NSF_Group__c grp = new NSF_Group__c(Title__c = 'Test Group');
        insert grp;
        insert new NSF_Project__c(Title__c = 'Test Project', NSF_GroupId__c = grp.Id);
    }

    @IsTest
    static void testGetProjectsByGroup() {
        NSF_Group__c grp = [SELECT Id FROM NSF_Group__c LIMIT 1];
        List<NSF_Project__c> result = NSFProjectController.getProjectsByGroup(grp.Id);
        Assert.isFalse(result.isEmpty(), 'Expected at least one project');
    }

    @IsTest
    static void testCreateProject() {
        NSF_Group__c grp = [SELECT Id FROM NSF_Group__c LIMIT 1];
        NSF_Project__c proj = NSFProjectController.createProject(grp.Id, 'New Project');
        Assert.isNotNull(proj.Id);
    }

    @IsTest
    static void testUpdateProject() {
        NSF_Project__c proj = [SELECT Id, NSF_GroupId__c FROM NSF_Project__c LIMIT 1];
        NSFProjectController.updateProject(proj.Id, proj.NSF_GroupId__c, 'Renamed Project');
        NSF_Project__c updated = [SELECT Title__c FROM NSF_Project__c WHERE Id = :proj.Id];
        Assert.areEqual('Renamed Project', updated.Title__c);
    }

    @IsTest
    static void testDeleteProject() {
        NSF_Project__c proj = [SELECT Id FROM NSF_Project__c LIMIT 1];
        NSFProjectController.deleteProject(proj.Id);
        List<NSF_Project__c> remaining = [SELECT Id FROM NSF_Project__c WHERE Id = :proj.Id];
        Assert.isTrue(remaining.isEmpty());
    }
}
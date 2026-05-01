@IsTest
private class NSFGroupControllerTest {

    @TestSetup
    static void makeData() {
        insert new NSF_Group__c(Title__c = 'Test Group');
    }

    @IsTest
    static void testGetGroups() {
        List<NSF_Group__c> result = NSFGroupController.getGroups();
        Assert.isFalse(result.isEmpty(), 'Expected at least one group');
    }

    @IsTest
    static void testCreateGroup() {
        NSF_Group__c grp = NSFGroupController.createGroup('New Group');
        Assert.isNotNull(grp.Id, 'Created group should have an Id');
    }

    @IsTest
    static void testUpdateGroup() {
        NSF_Group__c grp = [SELECT Id FROM NSF_Group__c LIMIT 1];
        NSFGroupController.updateGroup(grp.Id, 'Renamed Group');
        NSF_Group__c updated = [SELECT Title__c FROM NSF_Group__c WHERE Id = :grp.Id];
        Assert.areEqual('Renamed Group', updated.Title__c);
    }

    @IsTest
    static void testDeleteGroup() {
        NSF_Group__c grp = [SELECT Id FROM NSF_Group__c LIMIT 1];
        NSFGroupController.deleteGroup(grp.Id);
        List<NSF_Group__c> remaining = [SELECT Id FROM NSF_Group__c WHERE Id = :grp.Id];
        Assert.isTrue(remaining.isEmpty(), 'Group should have been deleted');
    }
}
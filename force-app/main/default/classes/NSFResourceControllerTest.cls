@IsTest
private class NSFResourceControllerTest {

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
        insert new NSF_Resource__c(
            Title__c = 'Test Resource', Link__c = 'https://example.com',
            Type__c = 'Link', NSF_SectionId__c = sec.Id
        );
    }

    @IsTest
    static void testGetResourcesBySection() {
        NSF_Section__c sec = [SELECT Id FROM NSF_Section__c LIMIT 1];
        List<NSF_Resource__c> result = NSFResourceController.getResourcesBySection(sec.Id);
        Assert.isFalse(result.isEmpty());
    }

    @IsTest
    static void testCreateResource() {
        NSF_Section__c sec = [SELECT Id FROM NSF_Section__c LIMIT 1];
        NSF_Resource__c res = NSFResourceController.createResource(sec.Id, 'New', 'https://test.com', 'Link');
        Assert.isNotNull(res.Id);
    }

    @IsTest
    static void testUpdateResource() {
        NSF_Resource__c res = [SELECT Id, NSF_SectionId__c FROM NSF_Resource__c LIMIT 1];
        NSFResourceController.updateResource(res.Id, res.NSF_SectionId__c, 'Updated', 'https://updated.com', 'PDF');
        NSF_Resource__c updated = [SELECT Title__c FROM NSF_Resource__c WHERE Id = :res.Id];
        Assert.areEqual('Updated', updated.Title__c);
    }

    @IsTest
    static void testDeleteResource() {
        NSF_Resource__c res = [SELECT Id FROM NSF_Resource__c LIMIT 1];
        NSFResourceController.deleteResource(res.Id);
        Assert.isTrue([SELECT Id FROM NSF_Resource__c WHERE Id = :res.Id].isEmpty());
    }
}

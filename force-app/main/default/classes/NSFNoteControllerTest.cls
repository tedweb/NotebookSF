@IsTest
private class NSFNoteControllerTest {

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
        insert new NSF_Note__c(
            Title__c = 'Test Note',
            Body__c = '<p>Hello</p>',
            Link__c = 'https://example.com',
            NSF_SectionId__c = sec.Id
        );
    }

    @IsTest
    static void testGetNotesBySection() {
        NSF_Section__c sec = [SELECT Id FROM NSF_Section__c LIMIT 1];
        List<NSF_Note__c> result = NSFNoteController.getNotesBySection(sec.Id);
        Assert.isFalse(result.isEmpty());
    }

    @IsTest
    static void testCreateNote() {
        NSF_Section__c sec = [SELECT Id FROM NSF_Section__c LIMIT 1];
        NSF_Note__c note = NSFNoteController.createNote(sec.Id, 'New Note', '<p>body</p>', null);
        Assert.isNotNull(note.Id);
    }

    @IsTest
    static void testUpdateNote() {
        NSF_Note__c note = [SELECT Id, NSF_SectionId__c FROM NSF_Note__c LIMIT 1];
        NSFNoteController.updateNote(note.Id, note.NSF_SectionId__c, 'Updated', '<p>updated</p>', null);
        NSF_Note__c updated = [SELECT Title__c FROM NSF_Note__c WHERE Id = :note.Id];
        Assert.areEqual('Updated', updated.Title__c);
    }

    @IsTest
    static void testDeleteNote() {
        NSF_Note__c note = [SELECT Id FROM NSF_Note__c LIMIT 1];
        NSFNoteController.deleteNote(note.Id);
        Assert.isTrue([SELECT Id FROM NSF_Note__c WHERE Id = :note.Id].isEmpty());
    }
}
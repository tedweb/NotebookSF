@isTest
private class NSFStarControllerTest {

    @TestSetup
    static void setup() {
        NSF_Group__c g = new NSF_Group__c(Title__c = 'G');
        insert g;
        NSF_Project__c p = new NSF_Project__c(Title__c = 'P', NSF_GroupId__c = g.Id);
        insert p;
        NSF_Notebook__c nb = new NSF_Notebook__c(Title__c = 'NB', NSF_ProjectId__c = p.Id);
        insert nb;
        NSF_Section__c sec = new NSF_Section__c(Title__c = 'Sec', NSF_NotebookId__c = nb.Id);
        insert sec;
    }

    static NSF_Notebook__c getNotebook() { return [SELECT Id FROM NSF_Notebook__c LIMIT 1]; }
    static NSF_Section__c getSection() { return [SELECT Id FROM NSF_Section__c LIMIT 1]; }

    @isTest
    static void testCreateAndDeleteStar_Section() {
        NSF_Notebook__c nb = getNotebook();
        NSF_Section__c sec = getSection();

        Test.startTest();
        Id starId = NSFStarController.createStar(sec.Id, 'Section');
        List<NSF_Star_Listing__c> stars = NSFStarController.getStarsByNotebook(nb.Id);
        NSFStarController.deleteStar(starId);
        List<NSF_Star_Listing__c> starsAfter = NSFStarController.getStarsByNotebook(nb.Id);
        Test.stopTest();

        System.assertNotEquals(null, starId);
        System.assertEquals(1, stars.size());
        System.assertEquals(0, starsAfter.size());
    }

    @isTest
    static void testCreateStar_Card() {
        NSF_Notebook__c nb = getNotebook();
        NSF_Section__c sec = getSection();
        NSF_Card__c card = new NSF_Card__c(Front__c = 'Q', NSF_SectionId__c = sec.Id, Order__c = 1);
        insert card;

        Test.startTest();
        Id starId = NSFStarController.createStar(card.Id, 'Card');
        List<NSF_Star_Listing__c> stars = NSFStarController.getStarsByNotebook(nb.Id);
        Test.stopTest();

        System.assertNotEquals(null, starId);
        System.assertEquals(1, stars.size());
        System.assertEquals(card.Id, stars[0].NSF_CardId__c);
    }

    @isTest
    static void testCreateStar_Note() {
        NSF_Notebook__c nb = getNotebook();
        NSF_Section__c sec = getSection();
        NSF_Note__c note = new NSF_Note__c(Title__c = 'N', NSF_SectionId__c = sec.Id);
        insert note;

        Test.startTest();
        Id starId = NSFStarController.createStar(note.Id, 'Note');
        List<NSF_Star_Listing__c> stars = NSFStarController.getStarsByNotebook(nb.Id);
        Test.stopTest();

        System.assertNotEquals(null, starId);
        System.assertEquals(note.Id, stars[0].NSF_NoteId__c);
    }

    @isTest
    static void testCreateStar_Resource() {
        NSF_Notebook__c nb = getNotebook();
        NSF_Section__c sec = getSection();
        NSF_Resource__c res = new NSF_Resource__c(Title__c = 'R', NSF_SectionId__c = sec.Id, Type__c = 'Link');
        insert res;

        Test.startTest();
        Id starId = NSFStarController.createStar(res.Id, 'Resource');
        List<NSF_Star_Listing__c> stars = NSFStarController.getStarsByNotebook(nb.Id);
        Test.stopTest();

        System.assertNotEquals(null, starId);
        System.assertEquals(res.Id, stars[0].NSF_ResourceId__c);
    }

    @isTest
    static void testCreateStar_Exam() {
        NSF_Notebook__c nb = getNotebook();
        NSF_Section__c sec = getSection();
        NSF_Exam__c exam = new NSF_Exam__c(Question__c = 'Q?', NSF_SectionId__c = sec.Id, Order__c = 1);
        insert exam;

        Test.startTest();
        Id starId = NSFStarController.createStar(exam.Id, 'Exam');
        List<NSF_Star_Listing__c> stars = NSFStarController.getStarsByNotebook(nb.Id);
        Test.stopTest();

        System.assertNotEquals(null, starId);
        System.assertEquals(exam.Id, stars[0].NSF_ExamId__c);
    }

    @isTest
    static void testGetStarsByNotebook_EmptyWhenNoSections() {
        NSF_Notebook__c nb = [SELECT Id FROM NSF_Notebook__c LIMIT 1];
        // Delete the section to simulate empty notebook
        delete [SELECT Id FROM NSF_Section__c LIMIT 1];

        Test.startTest();
        List<NSF_Star_Listing__c> stars = NSFStarController.getStarsByNotebook(nb.Id);
        Test.stopTest();

        System.assertEquals(0, stars.size());
    }
}
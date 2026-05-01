@isTest
private class NSFChatControllerTest {

    @TestSetup
    static void setup() {
        NSF_Group__c g = new NSF_Group__c(Title__c = 'G');
        insert g;
        NSF_Project__c p = new NSF_Project__c(Title__c = 'P', NSF_GroupId__c = g.Id);
        insert p;
        NSF_Notebook__c nb = new NSF_Notebook__c(Title__c = 'My Notebook', NSF_ProjectId__c = p.Id);
        insert nb;
    }

    @isTest
    static void testSendMessageWithNotebook() {
        NSF_Notebook__c nb = [SELECT Id FROM NSF_Notebook__c LIMIT 1];

        Test.startTest();
        String response = NSFChatController.sendMessage(nb.Id, 'What is in this notebook?', new List<String>());
        Test.stopTest();

        System.assertNotEquals(null, response, 'Response should not be null');
        System.assert(response.length() > 0, 'Response should not be empty');
        System.assert(response.contains('My Notebook'), 'Response should reference the notebook title');
    }

    @isTest
    static void testSendMessageNullNotebook() {
        Test.startTest();
        String response = NSFChatController.sendMessage(null, 'Hello', null);
        Test.stopTest();

        System.assertNotEquals(null, response);
        System.assert(response.length() > 0);
    }

    @isTest
    static void testSendMessageWithHistory() {
        NSF_Notebook__c nb = [SELECT Id FROM NSF_Notebook__c LIMIT 1];
        List<String> history = new List<String>{ 'user: hi', 'assistant: hello' };

        Test.startTest();
        String response = NSFChatController.sendMessage(nb.Id, 'Follow-up question', history);
        Test.stopTest();

        System.assertNotEquals(null, response);
    }
}

public with sharing class NSFChatController {

    @AuraEnabled
    public static String sendMessage(Id notebookId, String message, List<String> conversationHistory) {
        try {
            String notebookTitle = '';
            if (notebookId != null) {
                List<NSF_Notebook__c> nbs = [
                    SELECT Title__c FROM NSF_Notebook__c WHERE Id = :notebookId WITH USER_MODE LIMIT 1
                ];
                if (!nbs.isEmpty()) notebookTitle = nbs[0].Title__c;
            }

            // TODO: Implement RAG retrieval + LLM call.
            // Steps to activate:
            //   1. Query sections/resources/notes/cards/exams for this notebook.
            //   2. Embed the user message and retrieve the top-K relevant chunks.
            //   3. Build a prompt with retrieved context + conversationHistory.
            //   4. Call an LLM via Named Credential (e.g., OpenAI, Claude) or Einstein.
            //   5. Return the model's response text.

            String title = String.isNotBlank(notebookTitle)
                ? '"' + notebookTitle + '"'
                : 'this notebook';
            return 'AI Chat is ready! You asked about ' + title + ': "' + message + '". '
                + 'To activate real responses, implement the RAG pipeline in NSFChatController.sendMessage().';
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
}
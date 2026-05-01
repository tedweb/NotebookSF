@isTest
private class NSFExamControllerTest {

    @TestSetup
    static void setup() {
        NSF_Group__c g = new NSF_Group__c(Title__c = 'Test Group');
        insert g;
        NSF_Project__c p = new NSF_Project__c(Title__c = 'Test Project', NSF_GroupId__c = g.Id);
        insert p;
        NSF_Notebook__c nb = new NSF_Notebook__c(Title__c = 'Test Notebook', NSF_ProjectId__c = p.Id);
        insert nb;
        NSF_Section__c sec = new NSF_Section__c(Title__c = 'Test Section', NSF_NotebookId__c = nb.Id);
        insert sec;
    }

    static NSF_Section__c getSection() {
        return [SELECT Id FROM NSF_Section__c LIMIT 1];
    }

    @isTest
    static void testSaveExamCreate() {
        NSF_Section__c sec = getSection();

        NSFExamController.CandidateInput c1 = new NSFExamController.CandidateInput();
        c1.id = null; c1.possibleAnswer = 'Paris'; c1.isCorrect = true;
        NSFExamController.CandidateInput c2 = new NSFExamController.CandidateInput();
        c2.id = null; c2.possibleAnswer = 'London'; c2.isCorrect = false;

        Test.startTest();
        Id examId = NSFExamController.saveExamWithCandidates(
            null, sec.Id, 'Capital of France?', 'Paris is the capital.', 1,
            new List<NSFExamController.CandidateInput>{ c1, c2 },
            new List<Id>()
        );
        Test.stopTest();

        System.assertNotEquals(null, examId, 'Exam Id should be returned');
        System.assertEquals(2, [SELECT COUNT() FROM NSF_Exam_Answer_Candidates__c WHERE NSF_Exam_ItemId__c = :examId]);
    }

    @isTest
    static void testSaveExamUpdate() {
        NSF_Section__c sec = getSection();
        NSF_Exam__c exam = new NSF_Exam__c(Question__c = 'Q?', NSF_SectionId__c = sec.Id, Order__c = 1);
        insert exam;
        NSF_Exam_Answer_Candidates__c cand = new NSF_Exam_Answer_Candidates__c(
            NSF_Exam_ItemId__c = exam.Id, Possible_Answer__c = 'Old', Is_Correct__c = true
        );
        insert cand;

        NSFExamController.CandidateInput newCand = new NSFExamController.CandidateInput();
        newCand.id = null; newCand.possibleAnswer = 'New Answer'; newCand.isCorrect = true;

        Test.startTest();
        NSFExamController.saveExamWithCandidates(
            exam.Id, sec.Id, 'Updated Q?', 'Explanation.', 1,
            new List<NSFExamController.CandidateInput>{ newCand },
            new List<Id>{ cand.Id }
        );
        Test.stopTest();

        NSF_Exam__c updated = [SELECT Question__c FROM NSF_Exam__c WHERE Id = :exam.Id];
        System.assertEquals('Updated Q?', updated.Question__c);
        System.assertEquals(0, [SELECT COUNT() FROM NSF_Exam_Answer_Candidates__c WHERE Id = :cand.Id]);
        System.assertEquals(1, [SELECT COUNT() FROM NSF_Exam_Answer_Candidates__c WHERE NSF_Exam_ItemId__c = :exam.Id]);
    }

    @isTest
    static void testGetExamsBySection() {
        NSF_Section__c sec = getSection();
        NSF_Exam__c exam = new NSF_Exam__c(Question__c = 'Q?', NSF_SectionId__c = sec.Id, Order__c = 1);
        insert exam;
        insert new NSF_Exam_Answer_Candidates__c(
            NSF_Exam_ItemId__c = exam.Id, Possible_Answer__c = 'A', Is_Correct__c = true
        );

        Test.startTest();
        List<NSFExamController.ExamWrapper> wrappers = NSFExamController.getExamsBySection(sec.Id);
        Test.stopTest();

        System.assertEquals(1, wrappers.size());
        System.assertEquals(1, wrappers[0].candidates.size());
        System.assertEquals(null, wrappers[0].attemptCandidateId);
    }

    @isTest
    static void testSubmitAttempt() {
        NSF_Section__c sec = getSection();
        NSF_Exam__c exam = new NSF_Exam__c(Question__c = 'Q?', NSF_SectionId__c = sec.Id, Order__c = 1);
        insert exam;
        NSF_Exam_Answer_Candidates__c correct = new NSF_Exam_Answer_Candidates__c(
            NSF_Exam_ItemId__c = exam.Id, Possible_Answer__c = 'Right', Is_Correct__c = true
        );
        NSF_Exam_Answer_Candidates__c wrong = new NSF_Exam_Answer_Candidates__c(
            NSF_Exam_ItemId__c = exam.Id, Possible_Answer__c = 'Wrong', Is_Correct__c = false
        );
        insert new List<NSF_Exam_Answer_Candidates__c>{ correct, wrong };

        Test.startTest();
        NSF_Exam_Attempt__c att1 = NSFExamController.submitAttempt(exam.Id, correct.Id);
        NSF_Exam_Attempt__c att2 = NSFExamController.submitAttempt(exam.Id, wrong.Id);
        Test.stopTest();

        System.assertEquals(true, att1.Was_Correct__c);
        System.assertEquals(false, att2.Was_Correct__c);
    }

    @isTest
    static void testDeleteExam() {
        NSF_Section__c sec = getSection();
        NSF_Exam__c exam = new NSF_Exam__c(Question__c = 'Q?', NSF_SectionId__c = sec.Id, Order__c = 1);
        insert exam;
        NSF_Exam_Answer_Candidates__c cand = new NSF_Exam_Answer_Candidates__c(
            NSF_Exam_ItemId__c = exam.Id, Possible_Answer__c = 'A', Is_Correct__c = true
        );
        insert cand;
        NSF_Exam_Attempt__c att = new NSF_Exam_Attempt__c(
            NSF_ExamId__c = exam.Id, NSF_Answer_CandidateId__c = cand.Id,
            Was_Correct__c = true, Submitted_At__c = System.now()
        );
        insert att;

        Test.startTest();
        NSFExamController.deleteExam(exam.Id);
        Test.stopTest();

        System.assertEquals(0, [SELECT COUNT() FROM NSF_Exam__c WHERE Id = :exam.Id]);
        System.assertEquals(0, [SELECT COUNT() FROM NSF_Exam_Attempt__c WHERE NSF_ExamId__c = :exam.Id]);
    }

    @isTest
    static void testReorderExams() {
        NSF_Section__c sec = getSection();
        NSF_Exam__c e1 = new NSF_Exam__c(Question__c = 'Q1?', NSF_SectionId__c = sec.Id, Order__c = 1);
        NSF_Exam__c e2 = new NSF_Exam__c(Question__c = 'Q2?', NSF_SectionId__c = sec.Id, Order__c = 2);
        insert new List<NSF_Exam__c>{ e1, e2 };

        Test.startTest();
        NSFExamController.reorderExams(
            new List<Id>{ e2.Id, e1.Id },
            new List<Decimal>{ 1, 2 }
        );
        Test.stopTest();

        System.assertEquals(2, [SELECT Order__c FROM NSF_Exam__c WHERE Id = :e1.Id].Order__c);
        System.assertEquals(1, [SELECT Order__c FROM NSF_Exam__c WHERE Id = :e2.Id].Order__c);
    }
}
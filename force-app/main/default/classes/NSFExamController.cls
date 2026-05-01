public with sharing class NSFExamController {

    public class CandidateInput {
        @AuraEnabled public Id id;
        @AuraEnabled public String possibleAnswer;
        @AuraEnabled public Boolean isCorrect;
    }

    public class ExamWrapper {
        @AuraEnabled public NSF_Exam__c exam;
        @AuraEnabled public List<NSF_Exam_Answer_Candidates__c> candidates;
        @AuraEnabled public Id attemptCandidateId;
        @AuraEnabled public Boolean wasCorrect;
        @AuraEnabled public Id attemptId;
    }

    @AuraEnabled(cacheable=false)
    public static List<ExamWrapper> getExamsBySection(Id sectionId) {
        try {
            List<NSF_Exam__c> exams = [
                SELECT Id, Question__c, Explanation__c, Order__c, NSF_SectionId__c,
                    (SELECT Id, Possible_Answer__c, Is_Correct__c
                     FROM NSF_Answer_Candidates__r
                     ORDER BY Id ASC)
                FROM NSF_Exam__c
                WHERE NSF_SectionId__c = :sectionId
                WITH USER_MODE
                ORDER BY Order__c ASC NULLS LAST, Id ASC
            ];

            Set<Id> examIds = new Set<Id>();
            for (NSF_Exam__c e : exams) examIds.add(e.Id);

            Map<Id, NSF_Exam_Attempt__c> latestByExam = new Map<Id, NSF_Exam_Attempt__c>();
            if (!examIds.isEmpty()) {
                for (NSF_Exam_Attempt__c att : [
                    SELECT Id, NSF_ExamId__c, NSF_Answer_CandidateId__c, Was_Correct__c
                    FROM NSF_Exam_Attempt__c
                    WHERE NSF_ExamId__c IN :examIds
                      AND OwnerId = :UserInfo.getUserId()
                    WITH USER_MODE
                    ORDER BY Submitted_At__c DESC NULLS LAST
                ]) {
                    if (!latestByExam.containsKey(att.NSF_ExamId__c)) {
                        latestByExam.put(att.NSF_ExamId__c, att);
                    }
                }
            }

            List<ExamWrapper> result = new List<ExamWrapper>();
            for (NSF_Exam__c e : exams) {
                ExamWrapper w = new ExamWrapper();
                w.exam = e;
                w.candidates = e.NSF_Answer_Candidates__r;
                NSF_Exam_Attempt__c att = latestByExam.get(e.Id);
                w.attemptCandidateId = att != null ? att.NSF_Answer_CandidateId__c : null;
                w.wasCorrect = att != null ? att.Was_Correct__c : null;
                w.attemptId = att != null ? att.Id : null;
                result.add(w);
            }
            return result;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static Id saveExamWithCandidates(
        Id examId,
        Id sectionId,
        String question,
        String explanation,
        Decimal orderNum,
        List<CandidateInput> candidates,
        List<Id> deleteCandidateIds
    ) {
        try {
            NSF_Exam__c exam;
            if (examId == null) {
                exam = new NSF_Exam__c(
                    NSF_SectionId__c = sectionId,
                    Question__c = question,
                    Explanation__c = explanation,
                    Order__c = orderNum
                );
                insert as user exam;
            } else {
                exam = new NSF_Exam__c(
                    Id = examId,
                    NSF_SectionId__c = sectionId,
                    Question__c = question,
                    Explanation__c = explanation,
                    Order__c = orderNum
                );
                update as user exam;
            }

            if (deleteCandidateIds != null && !deleteCandidateIds.isEmpty()) {
                List<NSF_Exam_Attempt__c> attemptsToDelete = [
                    SELECT Id FROM NSF_Exam_Attempt__c
                    WHERE NSF_Answer_CandidateId__c IN :deleteCandidateIds
                    WITH USER_MODE
                ];
                if (!attemptsToDelete.isEmpty()) delete as user attemptsToDelete;
                List<NSF_Exam_Answer_Candidates__c> toDelete = [
                    SELECT Id FROM NSF_Exam_Answer_Candidates__c
                    WHERE Id IN :deleteCandidateIds
                    WITH USER_MODE
                ];
                if (!toDelete.isEmpty()) delete as user toDelete;
            }

            if (candidates != null && !candidates.isEmpty()) {
                List<NSF_Exam_Answer_Candidates__c> toInsert = new List<NSF_Exam_Answer_Candidates__c>();
                List<NSF_Exam_Answer_Candidates__c> toUpdate = new List<NSF_Exam_Answer_Candidates__c>();
                for (CandidateInput ci : candidates) {
                    if (ci.id == null) {
                        toInsert.add(new NSF_Exam_Answer_Candidates__c(
                            NSF_Exam_ItemId__c = exam.Id,
                            Possible_Answer__c = ci.possibleAnswer,
                            Is_Correct__c = ci.isCorrect != null && ci.isCorrect
                        ));
                    } else {
                        toUpdate.add(new NSF_Exam_Answer_Candidates__c(
                            Id = ci.id,
                            Possible_Answer__c = ci.possibleAnswer,
                            Is_Correct__c = ci.isCorrect != null && ci.isCorrect
                        ));
                    }
                }
                if (!toInsert.isEmpty()) insert as user toInsert;
                if (!toUpdate.isEmpty()) update as user toUpdate;
            }

            return exam.Id;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void reorderExams(List<Id> examIds, List<Decimal> orders) {
        try {
            List<NSF_Exam__c> toUpdate = new List<NSF_Exam__c>();
            for (Integer i = 0; i < examIds.size(); i++) {
                toUpdate.add(new NSF_Exam__c(Id = examIds[i], Order__c = orders[i]));
            }
            update as user toUpdate;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteExam(Id examId) {
        try {
            List<NSF_Exam_Attempt__c> attempts = [
                SELECT Id FROM NSF_Exam_Attempt__c
                WHERE NSF_ExamId__c = :examId
                WITH USER_MODE
            ];
            if (!attempts.isEmpty()) delete as user attempts;
            delete as user [SELECT Id FROM NSF_Exam__c WHERE Id = :examId WITH USER_MODE];
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static NSF_Exam_Attempt__c submitAttempt(Id examId, Id candidateId) {
        try {
            NSF_Exam_Answer_Candidates__c cand = [
                SELECT Id, Is_Correct__c FROM NSF_Exam_Answer_Candidates__c
                WHERE Id = :candidateId
                WITH USER_MODE
                LIMIT 1
            ];
            NSF_Exam_Attempt__c attempt = new NSF_Exam_Attempt__c(
                NSF_ExamId__c = examId,
                NSF_Answer_CandidateId__c = candidateId,
                Was_Correct__c = cand.Is_Correct__c,
                Submitted_At__c = System.now()
            );
            insert as user attempt;
            return attempt;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
}

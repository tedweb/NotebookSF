// Seed a sample Group → Project → Notebook → Sections with Resources, Notes, Cards, and Exams.
// Run via: sf apex run -f scripts/apex/seed-sample-notebook.apex

// ── Group ──────────────────────────────────────────────────────────────────
NSF_Group__c g = new NSF_Group__c(Title__c = 'Biology 101');
insert g;

// ── Project ────────────────────────────────────────────────────────────────
NSF_Project__c proj = new NSF_Project__c(Title__c = 'Cell Biology', NSF_GroupId__c = g.Id);
insert proj;

// ── Notebook ───────────────────────────────────────────────────────────────
NSF_Notebook__c nb = new NSF_Notebook__c(Title__c = 'Unit 1: The Cell', NSF_ProjectId__c = proj.Id);
insert nb;

// ── Sections ───────────────────────────────────────────────────────────────
NSF_Section__c secResources = new NSF_Section__c(Title__c = 'Reference Materials', NSF_NotebookId__c = nb.Id);
NSF_Section__c secNotes     = new NSF_Section__c(Title__c = 'Lecture Notes', NSF_NotebookId__c = nb.Id);
NSF_Section__c secCards     = new NSF_Section__c(Title__c = 'Flashcards', NSF_NotebookId__c = nb.Id);
NSF_Section__c secExams     = new NSF_Section__c(Title__c = 'Practice Questions', NSF_NotebookId__c = nb.Id);
insert new List<NSF_Section__c>{ secResources, secNotes, secCards, secExams };

// ── Resources ──────────────────────────────────────────────────────────────
insert new List<NSF_Resource__c>{
    new NSF_Resource__c(
        Title__c = 'Khan Academy: Cell Biology',
        Link__c = 'https://www.khanacademy.org/science/ap-biology/cell-structure-and-function',
        Type__c = 'Video',
        NSF_SectionId__c = secResources.Id
    ),
    new NSF_Resource__c(
        Title__c = 'Campbell Biology, Chapter 6',
        Type__c = 'Book',
        NSF_SectionId__c = secResources.Id
    )
};

// ── Notes ──────────────────────────────────────────────────────────────────
insert new List<NSF_Note__c>{
    new NSF_Note__c(
        Title__c = 'Prokaryotes vs Eukaryotes',
        Body__c = 'Prokaryotes lack a membrane-bound nucleus. Eukaryotes have a nucleus and membrane-bound organelles.',
        NSF_SectionId__c = secNotes.Id
    ),
    new NSF_Note__c(
        Title__c = 'Cell Membrane Structure',
        Body__c = 'The fluid mosaic model describes the cell membrane as a dynamic bilayer of phospholipids with embedded proteins.',
        NSF_SectionId__c = secNotes.Id
    ),
    new NSF_Note__c(
        Title__c = 'Mitochondria',
        Body__c = 'Mitochondria are the powerhouses of the cell. They produce ATP via the electron transport chain.',
        NSF_SectionId__c = secNotes.Id
    )
};

// ── Cards ──────────────────────────────────────────────────────────────────
insert new List<NSF_Card__c>{
    new NSF_Card__c(
        Title__c    = 'Cell Types',
        Front__c    = 'What are the two main types of cells?',
        Back__c     = 'Prokaryotic (no nucleus) and Eukaryotic (has a nucleus)',
        Order__c    = 1,
        NSF_SectionId__c = secCards.Id
    ),
    new NSF_Card__c(
        Title__c    = 'Cell Membrane',
        Front__c    = 'Describe the fluid mosaic model.',
        Back__c     = 'A flexible phospholipid bilayer with embedded proteins that can move laterally.',
        Order__c    = 2,
        NSF_SectionId__c = secCards.Id
    ),
    new NSF_Card__c(
        Title__c    = 'Mitochondria Function',
        Front__c    = 'What is the primary role of the mitochondria?',
        Back__c     = 'ATP synthesis via cellular respiration (electron transport chain).',
        Order__c    = 3,
        NSF_SectionId__c = secCards.Id
    )
};

// ── Exams ──────────────────────────────────────────────────────────────────
NSF_Exam__c q1 = new NSF_Exam__c(
    Title__c      = 'Cell Type Question',
    Question__c   = 'Which cell type contains a membrane-bound nucleus?',
    Explanation__c = 'Eukaryotic cells have a true nucleus enclosed by a nuclear envelope. Prokaryotes do not.',
    Order__c      = 1,
    NSF_SectionId__c = secExams.Id
);
NSF_Exam__c q2 = new NSF_Exam__c(
    Title__c      = 'Organelle Question',
    Question__c   = 'Which organelle is primarily responsible for ATP production in eukaryotes?',
    Explanation__c = 'Mitochondria generate most of the cell\'s ATP through oxidative phosphorylation.',
    Order__c      = 2,
    NSF_SectionId__c = secExams.Id
);
insert new List<NSF_Exam__c>{ q1, q2 };

insert new List<NSF_Exam_Answer_Candidates__c>{
    new NSF_Exam_Answer_Candidates__c(Possible_Answer__c = 'Prokaryotic',  Is_Correct__c = false, NSF_Exam_ItemId__c = q1.Id),
    new NSF_Exam_Answer_Candidates__c(Possible_Answer__c = 'Eukaryotic',   Is_Correct__c = true,  NSF_Exam_ItemId__c = q1.Id),
    new NSF_Exam_Answer_Candidates__c(Possible_Answer__c = 'Both types',   Is_Correct__c = false, NSF_Exam_ItemId__c = q1.Id),
    new NSF_Exam_Answer_Candidates__c(Possible_Answer__c = 'Ribosome',     Is_Correct__c = false, NSF_Exam_ItemId__c = q2.Id),
    new NSF_Exam_Answer_Candidates__c(Possible_Answer__c = 'Mitochondria', Is_Correct__c = true,  NSF_Exam_ItemId__c = q2.Id),
    new NSF_Exam_Answer_Candidates__c(Possible_Answer__c = 'Golgi body',   Is_Correct__c = false, NSF_Exam_ItemId__c = q2.Id),
    new NSF_Exam_Answer_Candidates__c(Possible_Answer__c = 'Nucleus',      Is_Correct__c = false, NSF_Exam_ItemId__c = q2.Id)
};

System.debug('✓ Seed complete. Notebook: ' + nb.Id + ' — ' + nb.Title__c);

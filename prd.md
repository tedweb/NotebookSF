# NotebookSF — Product Requirements Document (v1.0)

> **Source:** `NotebookSF Technical Document Specification.pdf`
> **Status:** Draft, ready for build kickoff
> **Date:** 2026-04-29

---

## 1. Overview

NotebookSF is a research and note-taking assistant built natively on Salesforce, modeled after Google's NotebookLM. The differentiator is a **hierarchical knowledge organization** — `Group → Project → Notebook → Section` — with each Section presenting four **Interaction Modes**:

1. **Resources** — curated URL/PDF/Video links
2. **Notes** — rich-text notes
3. **Cards** — flippable flashcards (manual or AI-generated)
4. **Exams** — multiple-choice exam questions with explanation (manual or AI-generated)

Two cross-cutting capabilities:

- **Starred Items** — any item in any mode can be starred and surfaced in a per-notebook *Starred* section
- **AI Chat (Fetch Agent)** — Retrieval-Augmented Generation across all sections, notebooks, projects, and groups accessible to the user

---

## 2. Goals & Non-Goals

### v1.0 Goals
- Deliver a single Lightning Console app for System Administrators
- Implement full CRUD for the hierarchy and all four interaction modes
- Implement starring and the Fetch Agent AI chat panel
- Hit ≥85% Apex test coverage and have jest tests for every LWC

### Out of Scope for v1.0
- Multi-user collaboration / sharing rules beyond what System Admins inherit
- Mobile-optimized layouts
- Public/external access (Experience Cloud)
- Importing existing notebooks from NotebookLM or other tools
- Bulk export of content
- Internationalization (English-only labels, hardcoded)
- Linking Notes to Resources (`NSF_Resource_Note` junction is dropped for v1.0)
- Non-AI keyword search (rely on AI Chat once wired + browser find)
- List virtualization / pagination (assume small notebooks)
- Optimistic-concurrency or locking (last-write-wins)
- Packaging (2GP / managed) — scratch + sandbox only

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Platform | Salesforce, API version **66.0** |
| Backend | Apex (`with sharing`, `@AuraEnabled`) |
| Storage | Custom Objects (13 total) |
| UI | Lightning **Console** Application + Lightning Web Components |
| Theme | **Salesforce Cosmos** |
| AI | Agentforce / Einstein (preferred) or external LLM via Named Credential (TBD — see Open Questions) |
| Tests | `@salesforce/sfdx-lwc-jest`, Apex unit tests |
| Tooling | `sf` CLI, Husky + lint-staged, Prettier, ESLint |
| Audience | System Administrator profile only |

---

## 4. Information Architecture

```
NSF_Group
  └── NSF_Project
        └── NSF_Notebook
              └── NSF_Section
                    ├── NSF_Resource ──┐
                    ├── NSF_Note   ────┤── NSF_Star_Listing (cross-cutting)
                    ├── NSF_Card   ────┤
                    └── NSF_Exam   ────┘
                          └── NSF_Exam_Answer_Candidates

Junctions (Resource ↔ Card/Exam — Note junction dropped in v1.0):
  NSF_Resource_Card, NSF_Resource_Exam

Per-user state:
  NSF_Star_Listing (per OwnerId), NSF_Exam_Attempt (per OwnerId)
```

---

## 5. Data Model

All custom objects use the `NSF_` prefix. Salesforce will append `__c`. Auto-number fields follow the spec's display formats.

> **v1.0 changes vs. spec:** `NSF_Resource_Note` is **dropped** (no Note↔Resource UI). `NSF_Exam_Attempt` is **added** to persist per-user exam answers. `NSF_Notebook` gets no icon/color fields (fixed icon). `NSF_Section` gets no `Order` field (alphabetical).

### 5.1 Hierarchy objects

| Object | Key fields | Relationship |
|---|---|---|
| **NSF_Group** | `Name` (auto `G-{0000}`), `Title` Text(120) | root |
| **NSF_Project** | `Name` (auto `P-{0000}`), `Title` Text(120), `NSF_GroupId` | Lookup → NSF_Group |
| **NSF_Notebook** | `Name` (auto `NB-{0000}`), `Title` Text(120), `NSF_ProjectId` | Lookup → NSF_Project |
| **NSF_Section** | `Name` (auto `S-{0000}`), `Title` Text(120), `NSF_NotebookId` | Lookup → NSF_Notebook |

### 5.2 Interaction-mode objects

| Object | Key fields | Notes |
|---|---|---|
| **NSF_Resource** | `Link` LongText(1024), `Title` Text(255), `Type` **Picklist** (`Link` / `PDF` / `Video`), `NSF_SectionId` Lookup | Section is Lookup; cascade on delete handled in Apex |
| **NSF_Note** | `Title` Text(120), `Body` Rich Text Area, `NSF_SectionId` Lookup | Spec lists a `Link` field on Note — keep it for parity with the spec; `Body` (rich text) added for the editor |
| **NSF_Card** | `Front` LongText(16448), `Back` LongText(131072), `Order` Number(8,0), `NSF_SectionId` Lookup | Manual sort via `Order` |
| **NSF_Exam** | `Question` LongText(1024), `Explanation` LongText(1024), `Order` Number(8,0), `NSF_SectionId` Lookup | `Order` added for question sort |
| **NSF_Exam_Answer_Candidates** | `Possible_Answer` LongText(1024), `Is_Correct` Checkbox, `NSF_Exam_ItemId` Lookup → NSF_Exam | 3–6 candidates per question |

### 5.3 Resource ↔ Item junctions (master-detail, reparenting allowed)

| Object | Detail to | Detail to | Auto # |
|---|---|---|---|
| **NSF_Resource_Card** | NSF_Resource | NSF_Card | `RC-{0000}` |
| **NSF_Resource_Exam** | NSF_Resource | NSF_Exam | `RE-{0000}` |

`NSF_Resource_Note` from the spec is intentionally omitted in v1.0.

### 5.4 Per-user state

| Object | Fields | Notes |
|---|---|---|
| **NSF_Star_Listing** | one of `NSF_CardId` / `NSF_NoteId` / `NSF_ResourceId` / `NSF_SectionId` (sparse); standard `OwnerId`; auto-# `SL-{0000}` | Per-user starring. All queries filter by `OwnerId = :UserInfo.getUserId()`. |
| **NSF_Exam_Attempt** | `NSF_ExamId` Lookup → NSF_Exam, `Selected_Answer_Id` Lookup → NSF_Exam_Answer_Candidates, `Was_Correct` Checkbox, `Submitted_At` DateTime, standard `OwnerId`; auto-# `EA-{0000}` | Per-user exam attempts. Reopening a question shows the user's most recent attempt with their selected answer + explanation. |

### 5.5 Schema decisions

- **Cascade behavior (hard delete):** because `Section`/`Notebook` references are Lookups (not Master-Detail), `before delete` Apex triggers on Notebook/Section fan out and irreversibly delete all dependent records (sections, items, junctions, stars, attempts) inside a single transaction. No soft-delete / restore.
- **Reparenting:** Resource junctions allow reparenting so resources can be moved between sections without losing their attachments. Edit Project / Edit Notebook modals also support cross-Group reparenting via cascading Group→Project pickers.
- **Per-user state:** `NSF_Star_Listing` and `NSF_Exam_Attempt` are scoped by standard `OwnerId`.
- **Section ordering:** Sections render alphabetically by `Title` in all List Views — no manual sort, no `Order__c` field on `NSF_Section`.
- **Notebook icon:** v1.0 uses a single fixed SLDS icon (`standard:knowledge`) for every Notebook — no per-Notebook icon/color fields.

---

## 6. App Structure

One Lightning **Console** App: **Notebook Console**.

- **Home tab** → renders `notebookHome` (LWC with Group nav + Project cards + Notebook items).
- Selecting a Notebook **opens a new console subtab** rendering `notebookNotebookView`, which routes between the four interaction modes. Multiple notebooks can be open simultaneously.
- Every screen except Home has the AI Chat panel (`notebookAiChat`) docked right.
- All rich-text editing uses `lightning-input-rich-text` (Notes details, Card backs).
- Empty surfaces show an illustrated zero-state with a primary "Create…" CTA.
- Save/delete results surface as `lightning-toast`; error toasts include a one-line cause.
- Cancel / close actions on dirty forms prompt a "Discard changes?" confirmation.

### LWCs to build

| Component | Role |
|---|---|
| `notebookApp` | App shell / utility bar wiring |
| `notebookHome` | Group nav, Project cards, Notebook list, hover edit/delete buttons |
| `notebookNotebookView` | Tab strip for Resources/Notes/Cards/Exams + AI Chat slot |
| `notebookResources` | Resources list view (Section Cards) |
| `notebookNotes` | Notes list + details (rich text editor) |
| `notebookCards` | Cards list + carousel detail + upsert wizard + sort view |
| `notebookExams` | Exams list + detail with submit/explanation + upsert wizard + sort view |
| `notebookAiChat` | Fetch Agent chat panel — **stubbed in v1.0** (UI shell with "coming soon" state); RAG provider TBD |
| `lwcModal` | **Port from `NotebookSF v.01 using Claude/force-app/main/default/lwc/lwcModal/`** |
| `sectionCard` (shared) | Reusable Section Card (title + items + action button) |
| `resourceSelector` (shared) | Used in Cards/Exams page-3 to attach resources |
| `sortableList` (shared) | Drag-handle list used by sort views |

---

## 7. Screens

| # | Screen | Modals it opens |
|---|---|---|
| 1 | Application Home Page | Create/Edit Group, Delete Group, Create/Edit Project, Delete Project, Create/Edit Notebook, Delete Notebook |
| 2 | Resources — List View | Create/Edit Section, Delete Section, Create/Edit Resource, Delete Resource |
| 3 | Resources — Detail View | (opens external URL in new tab) |
| 4 | Notes — List View | Create/Edit Note, Delete Note |
| 5 | Notes — Detail View | Edit Note |
| 6 | Cards — List View | — |
| 7 | Cards — Detail View | Delete Card |
| 8 | Cards — Upsert (1 of 3) Front | — |
| 9 | Cards — Upsert (2 of 3) Back | — |
| 10 | Cards — Upsert (3 of 3) Resources | — |
| 11 | Cards — Sort View | — |
| 12 | Exams — List View | — |
| 13 | Exams — Detail View | Delete Question |
| 14 | Exams — Upsert (1 of 2) Question + Answers | — |
| 15 | Exams — Upsert (2 of 2) Resources | — |
| 16 | Exams — Question Sort View | — |

### Section Card pattern (shared by all four List Views)

- Section title with hover **Edit** + **Delete** icons
- Section items with hover **Edit** icon and always-visible **Star toggle** + **Delete** icons
- One or more **Section Action Buttons** in the lower-right (e.g., *Add Resource*, *Add Note*, *Open Deck*, *Open Exam*)
- A floating **Add Section** button in the bottom-right of the page

---

## 8. User Stories

Each story below maps directly to the spec. **AC = acceptance criteria.**

### 8.1 Groups
- **Add Group** — Add Group button on Home → "Create Group" modal. AC: title required; new Group appears in left nav after save.
- **Edit Group** — pencil icon on hover over group title → "Edit Group" modal. AC: rename persists; nav refreshes.
- **Delete Group** — trash icon on hover, **only if Group has zero Projects** → confirmation modal.
- **Select Group** — clicking a group renders its Projects on the Home page.

### 8.2 Projects
- **Add Project** — floating "Add Project" button on Home → modal; Group preselected to current.
- **Edit Project** — hover edit on Project Card title; allows rename **and reparent** to another Group.
- **Delete Project** — hover delete, **only if Project has zero Notebooks** → confirmation.

### 8.3 Notebooks
- **Add Notebook** — "Add Notebook" button at the bottom of a Project Card.
- **Edit Notebook** — hover edit on a Notebook list item; allows rename **and reparent** to any Project, including projects in another Group (cascading Group → Project pickers).
- **Delete Notebook** — hover delete; modal **emphasizes** that all sections/items inside will be deleted.
- **Select Notebook** — opens a *new* console subtab (multiple notebooks can be open at once) and routes to the Resources List View.

### 8.4 Sections
- **Add Section** — floating "Add Section" button on any List View → modal.
- **Edit Section** — hover edit on section title.
- **Delete Section** — hover delete; modal emphasizes all child items will be deleted.

### 8.5 Resources
- Add / Edit / Delete Resource via section action button + hover icons.
- Modal captures `Link`, `Title`, and `Type` (picklist: Link / PDF / Video).
- On URL paste/blur, an Apex callout fetches the page `<title>` and pre-fills the Title field. User can override. Failures fall back silently to manual entry. Requires a Named Credential / Remote Site Setting for outbound HTTP.
- Clicking a resource item opens its URL in a new browser tab.

### 8.6 Notes
- Create Note from List View modal; auto-navigate to Detail View on save.
- Detail View has rich-text editor, **Cancel** and **Save & Close** buttons.
- Hover the Note title in Detail View to edit title via modal.

### 8.7 Cards
- List View shows section "decks" with card count + last modified date; **Open Deck** opens Detail View.
- Detail View carousel: ← / → arrows or arrow keys for prev/next, click or **spacebar** to flip, star toggle, **View Resources** button, **Close**.
- Card content auto-scales to fit using a binary-search font sizer with `ResizeObserver`; no scrolling.
- Spacebar/arrow shortcuts ignored when `activeElement` is an input/textarea/contenteditable, or when a modal is open.
- Action buttons (Add / Edit / Sort / Delete) at the top right.
- **Upsert wizard** — 3 pages: Front, Back (rich text via `lightning-input-rich-text`), Resources. Cancel on dirty wizard prompts "Discard changes?".
- **Sort View** — drag-handle list with up/down sort buttons.

### 8.8 Exams
- List View mirrors Cards List View ("Open Exam" button).
- Detail View shows one question at a time with selectable answers and a **Submit** button. After submit, render Explanation + Related Resources; Submit becomes disabled.
- ← / → keys navigate prev/next question (same activeElement guard as Cards).
- **Per-user attempts persist** in `NSF_Exam_Attempt`. Reopening a question shows the user's most recent selection and the explanation. A "Try again" link reverts to the unsubmitted state.
- **Upsert wizard** — 2 pages: Question + Answer Candidates (3–6, mark `Is_Correct`) + Summary; then Resources. Cancel on dirty wizard prompts "Discard changes?".
- **Question Sort View** — same drag-list pattern as Cards.

### 8.9 Starring
- Star toggle on every Resource, Note, Card, and Exam item.
- Each List View shows a pinned **Starred** section card at the top (read-only — no Add button on it).

### 8.10 AI Chat (Fetch Agent) — *Stubbed in v1.0*
- Persistent right-side panel on every screen except Home.
- v1.0 ships the **UI shell only**: chat layout, input box, suggested-prompt chips, and a placeholder response ("AI assistant coming soon").
- Full RAG behavior (corpus retrieval, summarized answers with citations) is deferred to a follow-up release once an AI provider is selected.

---

## 9. AI Chat / RAG Design — Deferred

v1.0 ships the AI Chat panel as a **non-functional stub** so the UI is complete and ready to wire up later. No corpus, embeddings, or LLM integration in this release.

### What v1.0 builds
- `notebookAiChat` LWC: docked right panel on every non-Home screen, with the visual layout from the spec (avatar, message list, suggested-prompt chips, input box, send button).
- All user input is captured but the response is a static placeholder message.

### What's intentionally deferred
- AI provider selection (Agentforce/Einstein vs. external LLM via Named Credential)
- Corpus indexing across `NSF_Resource` / `NSF_Note` / `NSF_Card` / `NSF_Exam`
- Embedding storage (`NSF_Embedding__c`) and trigger pipeline
- Retrieval, prompt templates, citations, and guardrails

A follow-up PRD will cover RAG once a provider is chosen.

---

## 10. Apex Controller Design

One controller per top-level entity, each `with sharing`:

| Controller | Methods (sketch) |
|---|---|
| `NSFGroupController` | `getGroups()`, `upsertGroup(Id, Title)`, `deleteGroup(Id)` |
| `NSFProjectController` | `getProjectsByGroup(Id)`, `upsertProject(Id, Title, GroupId)`, `deleteProject(Id)` |
| `NSFNotebookController` | `getNotebooksByProject(Id)`, `upsertNotebook(Id, Title, ProjectId)`, `deleteNotebook(Id)` |
| `NSFSectionController` | `getSectionsByNotebook(Id)`, `upsertSection`, `deleteSection` |
| `NSFResourceController` | `getResourcesBySection`, `upsertResource`, `deleteResource`, `attachResourceTo(noteId/cardId/examId)` |
| `NSFNoteController` | `getNotesBySection`, `getNoteDetail(Id)`, `upsertNote`, `deleteNote` |
| `NSFCardController` | `getDecksBySection`, `getCardsBySection`, `upsertCard`, `deleteCard`, `reorderCards(List<Id>)` |
| `NSFExamController` | `getExamsBySection`, `getQuestionsBySection`, `upsertExam`, `deleteExam`, `reorderQuestions`, `submitAnswer(examId, candidateId)`, `getMyAttempt(examId)`, `clearMyAttempt(examId)` |
| `NSFResourceTitleService` | `fetchPageTitle(url)` — Apex callout via Named Credential, returns best-effort `<title>` or `null` |
| `NSFStarController` | `toggleStar(objectType, recordId)`, `getStarredFor(notebookId, mode)` — all queries scope by `OwnerId = UserInfo.getUserId()` |
| `NSFChatController` | **Stubbed in v1.0**: `ask(prompt, scopeId)` returns a placeholder response. Real RAG implementation deferred. |

Conventions:
- All public methods `@AuraEnabled` with cacheable where appropriate.
- DML wrapped in try/catch → `AuraHandledException` with safe messages.
- All queries bulk-safe; no SOQL/DML inside loops.

---

## 11. Permissions

- **Permission Set:** `NotebookSF_Admin` granting Read/Create/Edit/Delete on all `NSF_*` objects and FLS on all custom fields.
- App, tabs, and pages: visible to System Administrators only (per spec audience).
- Assignment is manual post-deploy (or via `sf org assign permset`).

---

## 12. Testing Strategy

### Apex
- Per-controller test class with at minimum: happy path, empty-input, FLS/CRUD-denied, bulk (200 rows), and error-path tests.
- Trigger tests for cascade deletes (Notebook → Section → items → embeddings).
- **Coverage target:** ≥85% (org-wide), ≥90% on cascade triggers.

### LWC
- jest test per component covering: render with empty state, render with data, modal open/close, event dispatch (`@api` + custom events), and one interactive flow (e.g., flip card).

### Manual smoke checklist (per phase)
- Deploy to scratch org via `sf project deploy start`.
- Run `npm test`.
- Walk through that phase's user stories in the UI.

### Sample data
A `scripts/apex/seed-sample-notebook.apex` script seeds 1 Group, 2 Projects, 3 Notebooks, several sections, and a representative set of resources/notes/cards/exams for demos and screenshots. Re-run idempotently (deletes prior `NSF_*` records first).

### Accessibility target
WCAG 2.1 AA on all core flows: keyboard navigability, ARIA labels on icon-only buttons, focus traps in modals, sufficient color contrast. Custom components (sortable list, flippable card) get explicit a11y testing; SLDS components are trusted defaults.

### Deployment target
Scratch orgs for development; promote to a Developer/Partial sandbox for stakeholder demos. **No packaging in v1.0.**

---

## 13. Build Phases

Sequence designed so each phase deploys and tests cleanly on its own.

| Phase | Deliverables |
|---|---|
| **1. Foundation** | All 13 custom objects + fields, `NotebookSF_Admin` permset, Notebook Console app shell, Home tab, deploy to scratch org |
| **2. Hierarchy** | Port `lwcModal` from v.01; build `NSFGroupController`, `NSFProjectController`, `NSFNotebookController`; `notebookHome` LWC with Group nav + Project cards + Notebook items + all 6 modals |
| **3. Resources** | `NSFSectionController`, `NSFResourceController`, `notebookResources` LWC, shared `sectionCard` |
| **4. Notes** | `NSFNoteController`, `notebookNotes` LWC (List + Details rich-text editor) |
| **5. Cards** | `NSFCardController`, `notebookCards` LWC (List + carousel Detail + 3-page upsert + Sort), spacebar flip, `resourceSelector`, `sortableList` |
| **6. Exams** | `NSFExamController`, `notebookExams` LWC (List + Detail with submit/explanation + 2-page upsert + Sort) |
| **7. Starring** | `NSF_Star_Listing` wiring, `NSFStarController`, star toggles on every item, Starred section cards on each List View |
| **8. AI Chat (stub)** | `notebookAiChat` LWC docked on every non-Home screen; stub `NSFChatController.ask()` returning a placeholder response. No embedding pipeline or LLM integration in v1.0. |
| **9. Polish** | Salesforce Cosmos theme, accessibility (keyboard nav, ARIA), final jest + Apex coverage, README |

---

## 14. Verification

For each phase:
1. `sf project deploy start -o <scratch-alias>` — clean deploy
2. `npm test` — all jest tests pass
3. `sf apex run-test --result-format human --code-coverage` — Apex tests pass at ≥85%
4. Manual UI walkthrough of that phase's user stories in the scratch org
5. Commit phase increment (Husky pre-commit runs Prettier + ESLint + jest on changed files)

---

## 15. Resolved Decisions & Conventions

### 15.1 Schema / behavior

| # | Question | Decision |
|---|---|---|
| 1 | AI provider | **Defer** — ship the chat panel as a UI stub in v1.0; pick a provider in a later release |
| 2 | Notebook / Section delete behavior | **Hard cascade-delete** — irreversible, all children removed in one transaction |
| 3 | Starring scope | **Per-user** — `NSF_Star_Listing` rows scoped by standard `OwnerId` |
| 4 | Notebook icon | **Fixed default** — single SLDS icon (`standard:knowledge`) for every Notebook |
| 5 | `NSF_Resource.Type` | **Picklist** — values: Link, PDF, Video |
| 6 | Section ordering | **Alphabetical by Title** — no manual sort, no `Order__c` on `NSF_Section` |
| 7 | Note ↔ Resource link | **Dropped** — no `NSF_Resource_Note` and no UI for note resources in v1.0 |
| 8 | Exam answers | **Persist per-user** in `NSF_Exam_Attempt`; reopening shows last attempt |
| 9 | Notebook reparenting | **Cross-Group allowed** via cascading Group → Project pickers (same for Projects) |
| 10 | Concurrency | **Last-write-wins** — no optimistic checks, no locking |
| 11 | List size assumption | **< 50 sections / < 200 items per section**; no pagination, no virtualization |

### 15.2 UI / interaction

| # | Topic | Decision |
|---|---|---|
| 12 | Notebook tabs | **New console subtab per notebook**; multiple open simultaneously |
| 13 | Rich text editor | **`lightning-input-rich-text`** for Notes details and Card backs |
| 14 | Cancel on dirty form | **"Discard changes?" modal** if dirty; immediate close if pristine |
| 15 | Empty states | **Illustrated zero-state + primary CTA** on every empty surface |
| 16 | Notifications | **`lightning-toast`** for both success and error; one-line cause on error |
| 17 | Card content scaling | **Binary-search font sizer with `ResizeObserver`**; no scrolling |
| 18 | Spacebar (flip) / arrows (navigate) | **Document listener with `activeElement` guard**; disabled while modal open |
| 19 | Keyboard shortcuts | ← / → on Cards & Exams; Esc closes modals; **Cmd/Ctrl+S** saves active Note |
| 20 | i18n | **Hardcoded English**; no Custom Labels in v1.0 |
| 21 | Resource title | **Auto-fetch via Apex callout** with manual override; falls back silently on failure |
| 22 | Search | **None in v1.0** — rely on AI Chat (once wired) and browser Cmd/Ctrl-F |

### 15.3 Delivery

| # | Topic | Decision |
|---|---|---|
| 23 | Deployment | Scratch orgs for dev; sandbox for demos. **No packaging.** |
| 24 | Sample data | `scripts/apex/seed-sample-notebook.apex` — idempotent seed script for demos |
| 25 | Accessibility | **WCAG 2.1 AA** on core flows |
| 26 | Test depth (LWC) | **Render + happy-path interaction** per component, with mocked Apex calls |
| 27 | Test depth (Apex) | ≥85% org-wide; ≥90% on cascade triggers |

---

## 16. Reference Material in the Repo

- Spec PDF: `NotebookSF Technical Document Specification.pdf`
- `lwcModal` to port: `../NotebookSF v.01 using Claude/force-app/main/default/lwc/lwcModal/`
- v.01 prior LWCs (treat as design inspiration, not source-of-truth):
  `../NotebookSF v.01 using Claude/force-app/main/default/lwc/{notebookApp, notebookHome, notebookResources, notebookNotes, notebookCards, notebookExams, notebookAiChat, notebookNotebookView}/`

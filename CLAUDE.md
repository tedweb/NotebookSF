# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:unit:watch

# Run a single test file
npx sfdx-lwc-jest -- --testPathPattern="notebookAiChat"

# Lint LWC/Aura JS
npm run lint

# Format all files
npm run prettier

# Check formatting without writing
npm run prettier:verify
```

Salesforce CLI (sf) commands for deploying/running:
```bash
# Deploy source to a scratch org
sf project deploy start --source-dir force-app

# Open the default org
sf org open

# Run Apex tests in org
sf apex run test --class-names NSFNotebookControllerTest
```

## Architecture

**NotebookSF** is a Salesforce app that provides a notebook/study-tool experience inside a Salesforce org. Everything lives under `force-app/main/default/`.

### Data model (custom objects, all prefixed `NSF_`)

The hierarchy is: **Group → Project → Notebook → (Sections, Notes, Cards, Resources, Exams)**

- `NSF_Group__c` — top-level grouping bucket
- `NSF_Project__c` — belongs to a Group
- `NSF_Notebook__c` — belongs to a Project
- `NSF_Section__c`, `NSF_Note__c`, `NSF_Card__c`, `NSF_Resource__c`, `NSF_Exam__c` — all belong to a Notebook
- `NSF_Star_Listing__c` — favorites/starred items
- `NSF_Resource_Card__c`, `NSF_Resource_Exam__c` — junction objects

### Apex controllers (`classes/`)

Each controller (`NSFGroupController`, `NSFProjectController`, `NSFNotebookController`, etc.) is a single `with sharing` class exposing `@AuraEnabled` methods for CRUD. All DML uses `as user` (user-mode) to respect field/object permissions. Every controller has a matching `*Test` class.

`NSFChatController.sendMessage()` is a stub — the RAG pipeline (context retrieval + LLM call) is not yet implemented.

### LWC components

Two top-level page components:
- **`notebookHome`** — the main landing page. Left sidebar lists Groups; main panel shows Projects (accordion) and Notebooks (lazy-loaded on expand). Uses `@wire` for Groups and Projects (reactive on `$selectedGroupId`), and imperative `getNotebooksByProject` calls on project expand.
- **`notebookNotebookView`** — the notebook detail page. Reads `c__notebookId` / `c__notebookName` from page state via `CurrentPageReference`. Contains a `lightning-tabset` that lazy-renders tab content (Resources, Notes, Cards, Exams, AI Chat).

Shared utility component:
- **`lwcModal`** — reusable modal. Call `modal.open()` / `modal.close()` imperatively. Fires a `buttonclick` CustomEvent with `detail = 'confirm' | 'cancel'`. Supports `validate-on-confirm` which calls `reportValidity()` on all slotted Lightning input components before dispatching confirm.

Navigation between pages uses `NavigationMixin` with `standard__navItemPage` (API name `NSF_Notebook_View`) and page state params (`c__notebookId`, `c__notebookName`).

### Testing

Tests live in `__tests__/` inside each LWC folder. The jest config extends `@salesforce/sfdx-lwc-jest`. Apex imports are auto-mocked via `moduleNameMapper` in jest config — see the mock patterns in `jest.config.js`.

### Linting

ESLint uses flat config (`eslint.config.js`). LWC files use `@salesforce/eslint-config-lwc/recommended`; test files disable `no-unexpected-wire-adapter-usages`.

A pre-commit hook (lint-staged) runs Prettier, ESLint, and related Jest tests on staged files automatically.

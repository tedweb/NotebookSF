# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NotebookSF is a Salesforce DX project targeting API version 66.0. Source lives under `force-app/main/default/` with the standard SFDX source format. The primary development language for LWC is JavaScript.

## Development Commands

### Salesforce CLI (sf / sfdx)

```bash
# Authorize an org
sf org login web

# Create a scratch org
sf org create scratch -f config/project-scratch-def.json -a <alias> -d

# Push source to scratch org
sf project deploy start

# Pull changes from org back to source
sf project retrieve start

# Run anonymous Apex
sf apex run -f scripts/apex/hello.apex

# Run SOQL query
sf data query -f scripts/soql/account.soql
```

### Testing and Linting

```bash
# Run all LWC unit tests
npm test

# Run tests in watch mode
npm run test:unit:watch

# Run tests for a single component
npx sfdx-lwc-jest -- --testPathPattern=force-app/main/default/lwc/<componentName>

# Run tests with coverage report
npm run test:unit:coverage

# Lint LWC and Aura JS
npm run lint

# Format all files
npm run prettier

# Verify formatting without writing
npm run prettier:verify
```

## Architecture

### Source Structure

All Salesforce metadata lives under `force-app/main/default/`:

| Directory | Contents |
|---|---|
| `classes/` | Apex classes and test classes (`.cls` + `.cls-meta.xml`) |
| `triggers/` | Apex triggers (`.trigger` + `.trigger-meta.xml`) |
| `lwc/` | Lightning Web Components — each component is a folder with `.html`, `.js`, `.js-meta.xml`, and optionally `.css` and `.test.js` |
| `aura/` | Aura components (legacy) |
| `objects/` | Custom objects, fields, and validation rules |
| `flexipages/` | Lightning App Builder pages |
| `layouts/` | Page layouts |
| `applications/` | Lightning apps |
| `permissionsets/` | Permission sets |
| `staticresources/` | Static resource files |
| `contentassets/` | Content assets |
| `tabs/` | Custom tabs |

### LWC Testing

Jest is configured via `jest.config.js` using `@salesforce/sfdx-lwc-jest`. Tests live alongside components as `<component>.test.js`. The pre-commit hook automatically runs jest on changed LWC files via lint-staged.

### Pre-commit Hook

Husky runs `lint-staged` on every commit:
- Prettier formats all supported file types
- ESLint checks Aura and LWC JS
- Jest runs related LWC tests (with `--bail` — fails fast)

### Scratch Org Configuration

`config/project-scratch-def.json` defines a Developer edition org for `tgodwin company` with Lightning Experience enabled.

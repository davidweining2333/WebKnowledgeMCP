# Architecture

## Core Modules

```
src/
├── agents/
│   ├── onboarding/
│   └── crawler/
│
├── browser/
│
├── parser/
│
├── workflow/
│
├── profile/
│
├── database/
│
├── tools/
│
└── common/
```

---

## Module Responsibilities

### Onboarding Agent

Responsible for learning a website.

Output:

- Site Profile

---

### Crawl Agent

Responsible for collecting documents according to Site Profile.

Output:

- Document[]

---

### Browser Adapter

Only responsible for browser automation.

Never contains business logic.

---

### Parser Adapter

Convert:

- HTML
- PDF
- DOCX

into

Document

---

### Workflow

Workflow coordinates all modules.

Business logic must only exist here.

---

## Data Flow

```
User

↓

MCP Tool

↓

Workflow

↓

Browser

↓

Parser

↓

Document[]

↓

Return
```

---

## Design Rules

1. Browser never knows business.
2. Parser never knows browser.
3. Workflow never manipulates DOM directly.
4. Agent never calls Playwright directly.
5. Everything goes through Adapters.

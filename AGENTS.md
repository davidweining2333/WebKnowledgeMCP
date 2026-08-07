# AGENTS

This project is designed for AI Coding Agents.

All contributors (human or AI) must follow the following rules.

---

# Architecture Rules

Never bypass Workflow.

Never bypass Adapters.

Never manipulate Playwright directly inside business code.

Never access SQLite outside Repository layer.

---

# Module Responsibilities

## Onboarding Agent

Only responsible for:

- Website understanding
- User interaction
- Site Profile generation

Never performs crawling.

---

## Crawl Agent

Only responsible for:

- Collecting documents
- Downloading attachments

Never modifies Site Profile.

---

## Browser Adapter

Responsible only for browser operations.

Allowed:

- click
- type
- wait
- download

Forbidden:

- Business logic
- Parsing

---

## Parser Adapter

Responsible only for converting files into Document.

---

# Coding Rules

Prefer composition over inheritance.

Use dependency injection.

One class, one responsibility.

No static singleton.

Use interfaces whenever possible.

---

# Database Rules

SQLite only.

Never store:

- HTML
- Markdown
- News
- PDF

Persist only:

- Site Profile
- Cookies
- Workflow

---

# MCP Rules

Every capability must be exposed as a Tool.

Tools must remain backward compatible.

Never expose Playwright APIs directly.

---

# Future Compatibility

Future Browser Agent must replace Workflow without changing MCP APIs.

This is a mandatory architectural requirement.

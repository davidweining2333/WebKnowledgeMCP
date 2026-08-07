# Web Knowledge MCP

> Product Requirement & Architecture Specification (MVP v1.0)

**Author:** 魏伟宁  
**Status:** Draft → Implementation  
**Version:** v1.0  
**Target Stack:** NestJS + Official MCP SDK + Playwright + SQLite

---

# 1. Project Vision

## Goal

Build a lightweight **Web Knowledge MCP**, allowing any MCP-compatible AI client (Claude, Codex, Cherry Studio, ChatGPT Desktop, etc.) to acquire structured knowledge from websites through a unified interface.

The MCP itself **does not perform reasoning**.

Its responsibilities are only:

- Understand a website
- Crawl website content
- Download related documents
- Normalize data
- Return structured knowledge

Reasoning, summarization, report generation, trend analysis and Q&A are all completed by the LLM.

---

# 2. Product Positioning

## It is NOT

- A crawler
- A RAG platform
- A knowledge base
- A browser automation framework

## It IS

A **Website Knowledge Acquisition Engine** exposed through the **Model Context Protocol (MCP)**.

---

# 3. Design Principles

## Principle 1

### MCP only acquires knowledge.

Never:

- Summarize
- Analyze
- Translate
- Generate reports

Only:

- Navigate websites
- Acquire documents
- Normalize content
- Return structured results

---

## Principle 2

### Persist configuration, not content.

Persist:

- Site Profile
- Login configuration
- Workflow
- Cookies
- Metadata

Do NOT persist:

- HTML
- Markdown
- News
- PDF
- Documents

Every crawl is executed in real time.

---

## Principle 3

### Workflow first, Agent later.

MVP uses deterministic workflow.

Future versions may replace internal workflow with autonomous Agents.

The MCP API must remain unchanged.

---

## Principle 4

### Infrastructure is replaceable.

Business logic must never directly depend on:

- Playwright
- Firecrawl
- Crawl4AI

Everything must go through Adapters.

---

# 4. Overall Architecture

```text
                 Claude
                  │
                Codex
                  │
          Cherry Studio
                  │
          ChatGPT Desktop
                  │
─────────────── MCP ───────────────
                  │
          Web Knowledge MCP
                  │
        ┌─────────┴─────────┐
        │                   │
 Site Learning Agent   Crawl Agent
        │                   │
        └─────────┬─────────┘
                  │
              Workflow
                  │
      ┌───────────┴───────────┐
      │                       │
 Browser Adapter        Parser Adapter
      │                       │
 Playwright         HTML / PDF / DOCX
                  │
               SQLite
```

---

# 5. Core Components

## 5.1 Site Learning Agent

### Responsibility

Learn how to crawl a website.

Runs only when:

- User provides a new URL
- Site Profile becomes invalid
- User requests relearning

### Workflow

```text
Receive URL

↓

Analyze Website

↓

Need Login?

↓

Need Interaction?

↓

Need User Confirmation?

↓

Generate Site Profile

↓

Persist Site Profile
```

### Output

```json
{
  "site": "OpenAI",
  "entry": "/news",
  "loginRequired": false,
  "pagination": "next",
  "attachments": [
    "pdf"
  ],
  "workflowId": "default"
}
```

---

## 5.2 Crawl Agent

### Responsibility

Collect website knowledge according to Site Profile.

Workflow

```text
Load Site Profile

↓

Login

↓

Navigate

↓

Find Articles

↓

Pagination

↓

Download Attachments

↓

Parse

↓

Normalize

↓

Return
```

---

# 6. MCP API

## onboard_site()

### Input

```json
{
  "url": "https://example.com"
}
```

### Output

```json
{
  "siteId": "...",
  "status": "success"
}
```

---

## crawl_site()

### Input

```json
{
  "site": "openai",
  "from": "2025-01-01",
  "to": "2026-01-01"
}
```

### Output

```json
{
  "documents": []
}
```

---

## list_sites()

Returns all configured websites.

---

## remove_site()

Remove a configured website.

---

# 7. Document Model

```typescript
interface Document {

    title: string;

    url: string;

    publishTime: Date;

    content: string;

    attachments: Attachment[];

}
```

```typescript
interface Attachment {

    filename: string;

    type: string;

    url: string;

    localPath?: string;

}
```

---

# 8. Site Profile

```typescript
interface SiteProfile {

    url: string;

    loginRequired: boolean;

    loginType: "cookie" | "password" | "oauth";

    entrySelector: string;

    articleSelector: string;

    nextPageSelector: string;

    attachmentSelector: string;

    workflowVersion: number;

}
```

---

# 9. SQLite Schema

## site

```text
id

name

url

createdAt
```

---

## profile

```text
id

siteId

json

updatedAt
```

---

## cookie

```text
id

siteId

cookie

expireAt
```

---

## workflow

Store user-recorded Playwright workflow.

```text
id

siteId

workflowJson

updatedAt
```

---

# 10. Adapter Layer

## Browser Adapter

```typescript
interface BrowserAdapter {

    open();

    click();

    type();

    wait();

    download();

}
```

Implementations

- Playwright Adapter
- Firecrawl Adapter (Future)
- Crawl4AI Adapter (Future)

---

## Parser Adapter

```typescript
interface ParserAdapter {

    parse();

}
```

Implementations

- HTML Parser
- PDF Parser
- DOCX Parser

---

# 11. LLM Responsibilities

The LLM is responsible for:

- Understanding webpages
- Asking users questions
- Generating Site Profile

The LLM is NOT responsible for:

- Browser automation
- Downloading files
- Parsing documents

---

# 12. User Experience

## First Time

```text
User

↓

Provide URL

↓

Onboarding Agent

↓

Interactive Questions

↓

Generate Site Profile

↓

Persist
```

---

## Daily Usage

```text
User

↓

Ask Question

↓

crawl_site()

↓

Crawler

↓

Return Documents

↓

LLM summarizes
```

---

# 13. Out of Scope (MVP)

Not included:

- Object Storage
- Redis
- Kafka
- Elasticsearch
- Vector Database
- Scheduler
- RAG
- Multi-user Authentication
- Permission System
- Browser Agent

---

# 14. Technology Stack

| Layer | Technology |
|--------|------------|
| Language | TypeScript |
| Framework | NestJS |
| MCP | Official TypeScript MCP SDK |
| Browser | Playwright |
| ORM | Prisma |
| Database | SQLite |
| Parser | pdf-parse / mammoth / cheerio |
| Validation | Zod |
| Logging | Pino |

---

# 15. Milestones

## Milestone 1

- NestJS
- MCP Server
- Hello Tool

---

## Milestone 2

- Playwright Adapter
- Browser automation

---

## Milestone 3

- Site Learning Agent
- SQLite persistence

---

## Milestone 4

- Crawl Agent
- Document normalization

---

## Milestone 5

- Claude / Codex / Cherry Studio integration
- End-to-end workflow completed

---

# 16. Future Roadmap

## v2

Use LLM to automatically identify:

- News page
- Article list
- Pagination
- Attachments
- Article content

---

## v3

Replace Workflow with Browser Agent.

Internal implementation changes from:

```text
Workflow
```

to:

```text
Agent
```

without changing any MCP APIs.

---

# 17. Core Philosophy

> **Web Knowledge MCP is not a crawler.**

It is a **Website Knowledge Acquisition Engine**.

Its responsibility is to transform arbitrary websites into structured knowledge that any AI Agent can understand through a standard MCP interface.

---

# 18. MVP Definition

The MVP is considered complete when the following scenario succeeds without manual intervention:

```text
User
    │
    ▼
Provide a website URL
    │
    ▼
Onboarding Agent analyzes the website
    │
    ▼
Interactively asks the user only when necessary
    │
    ▼
Generate and persist Site Profile
    │
    ▼
User asks:
"Summarize all news from the past year."
    │
    ▼
Crawler Agent automatically logs in (if needed)
    │
    ▼
Navigates the website
    │
    ▼
Collects all articles
    │
    ▼
Downloads PDF / DOCX attachments
    │
    ▼
Parses and normalizes all content
    │
    ▼
Returns Document[]
    │
    ▼
Claude / Codex / ChatGPT performs summarization
```

When this workflow is complete, the MVP is finished.
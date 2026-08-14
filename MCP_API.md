# MCP Tools

---

## onboard_site

Purpose

Open a new website with Playwright and learn a replayable workflow: safe navigation/search controls, keyword/date fields, result selectors, pagination hints, details, and attachments. The learned profile is persisted for later parameterized queries.

Input

```json
{
  "url":"https://..."
}
```

Output

```json
{
  "siteId":"..."
}
```

---

## crawl_site

Purpose

Replay the workflow learned by `onboard_site`, fill the current query and date parameters, submit the website search, visit result pages, and extract HTML plus supported PDF/DOC/DOCX attachment text. It returns raw documents; the calling Agent is responsible for summarization and report generation.

Input

```json
{
  "site": "ferc",
  "query": "energy storage",
  "from": "2025-01-01",
  "to": "2025-06-30",
  "limit": 20
}
```

All fields except `site` are optional. Date strings should preferably use `YYYY-MM-DD`; the learned workflow converts them to the website's detected field format where possible.

Output

```typescript
{
  documents: Array<{
    title: string;
    url: string;
    publishTime: string | null;
    content: string; // Includes extracted supported attachment text.
    attachments: Attachment[];
  }>;
}
```

---

## list_sites

Returns

Configured websites.

---

## remove_site

Remove one website.

---

## Future

refresh_site

validate_site

export_profile

import_profile

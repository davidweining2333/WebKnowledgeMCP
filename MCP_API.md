# MCP Tools

---

## onboard_site / learn_website / add_website_to_knowledge

Purpose

Open a new website with Playwright and learn a replayable workflow: safe navigation/search controls, keyword/date fields, result selectors, pagination hints, details, and attachments. The learned profile is persisted for later parameterized queries.

The AI should call this tool when the user provides a website and asks to learn, add, understand, search, monitor, or query it. The user does not need to mention “Web Knowledge MCP” or the exact tool name.

If onboarding is blocked, the tool returns `ok: false` and diagnostic fields including `reason`, `url`, `status`, `title`, `bodyPreview`, and `navigationError`. Ask the user to forward those fields when reporting the problem. Do not replace them with a generic “抓取失败” message.

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

## crawl_site / search_website / web_knowledge_search

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

The AI should call this tool when the user asks to search, query, retrieve, monitor, summarize, translate, or extract information from a configured website. It should infer `site`, `query`, `from`, `to`, and `limit` from natural language instead of requiring the user to name the MCP.

After every tool result, the response includes a `nextStep` suggestion. The AI should briefly tell the user what can be done next and ask whether to continue, rather than silently ending the workflow.

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

# MCP Tools

---

## onboard_site

Purpose

Learn a new website.

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

Collect documents.

Input

```json
{
    "site":"openai",

    "from":"2025-01-01",

    "to":"2026-01-01"
}
```

Output

```typescript
Document[]
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

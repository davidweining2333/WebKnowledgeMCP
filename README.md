# Web Knowledge MCP

> Codex 接入指南：见 [Codex 集成文档](file:integrations/codex/README.md)。

A lightweight MCP server for acquiring structured knowledge from websites.

The goal of this project is **not** to build another crawler.

The goal is to allow any MCP-compatible AI (Claude, Codex, Cherry Studio, ChatGPT, etc.) to query websites through a unified interface.

---

## Features

- Website onboarding
- Interactive website learning
- Parameterized query workflow replay
- Structured anti-bot / navigation diagnostics
- Natural-language-friendly tool aliases
- Next-step suggestions after every tool result
- Login support
- Browser automation
- PDF / DOCX parsing
- Structured document output
- SQLite persistence
- Official MCP protocol

---

## Architecture



AI Client

↓

MCP Server

↓

Web Knowledge MCP

├── Site Learning Agent

├── Crawl Agent

├── Workflow Engine

├── Browser Adapter

└── Parser Adapter

---

## Philosophy

This project is NOT responsible for:

- Summarization
- Translation
- Report generation

Those responsibilities belong to the LLM. The MCP returns source documents and explicit next-step suggestions so the client can continue with summarization, translation, deduplication, or report generation.

Tool selection is driven by tool descriptions and aliases: users can say “学习这个网站”“搜索这个网站最近的新闻”“提取并总结这些 PDF”，without first saying the MCP name or exact tool name. The final decision to call a tool remains with the MCP client/AI model.

This project is only responsible for acquiring structured knowledge.

---

## Current Stack

- NestJS
- Official MCP SDK
- Playwright
- SQLite
- Prisma

---

## Roadmap

v1

- Workflow
- Playwright
- SQLite

v2

- LLM-assisted webpage understanding

v3

- Browser Agent

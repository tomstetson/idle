# Upstream Issue Triage: slopus/happy vs Idle

**Date:** 2026-03-07
**Source:** https://github.com/slopus/happy/issues (50 open issues)
**Platform priority:** CLI > iOS (TestFlight) > Server > Web (maintain only)

## Relevant Issues (Fix in v1.5)

| # | Title | Severity | Notes |
|---|-------|----------|-------|
| 825 | Codex CLI integration: 3 bugs in MCP tool name, permission call_id, elicitation format | P1 | Affects our CLI if user runs Codex through Idle. Investigate. |
| 824 | Error: t.todos.filter is not a function | P1 | Runtime crash — likely affects us. Need to reproduce. |
| 793 | Chat history cannot scroll — FlatList inverted+absolute on web | P2 | Already in our plan as M4.8. |
| 787 | Messages not syncing with non-ASCII working directories | P1 | Affects CLI users with non-English paths. Likely affects us. |
| 779 | --settings flag overrides enabledPlugins since v0.13.0 | P1 | Breaks skills/plugins. Affects CLI. Investigate. |
| 773 | getProjectPath() regex breaks session resume (spaces/tildes) | P1 | Already investigated — research agent found regex is actually correct in our fork. Verify and close. |
| 768 | change_title MCP tool HTTP 500 | P1 | **Already fixed in M2.2.** |
| 761 | happy-agent send: token missing session claim | P2 | WebSocket auth bug. May affect our agent package. |
| 798 | CLI --add-dir flags not forwarded to Claude Code | P2 | Flag passthrough bug. Small fix if confirmed. |
| 738 | MCP server HTTP 500 after handshake (MCP SDK >=1.26) | P1 | MCP compatibility issue. Investigate against our SDK version. |
| 741 | WebSocket 502 Bad Gateway — sessions stuck on TransportError | P2 | May affect our server. Already have WebSocket polling in roadmap backlog. |

## Needs Investigation

| # | Title | Why |
|---|-------|-----|
| 812 | Cannot switch between Mac and phone | Cross-machine — related to M4.10/4.11 work. Test after mobility feature. |
| 796 | Title bar shows "error" | Vague — need to reproduce on our app. May be related to change_title fix. |
| 765 | Terminal needs permission | Unclear scope. Need to test on TestFlight. |
| 750 | Strip XML system tags + text selection in chat | May affect message display. Quick test. |

## Irrelevant / Not Applicable

| # | Title | Reason |
|---|-------|--------|
| 821 | Can't connect to server | User environment issue (their self-hosted server). Our server is deployed. |
| 820 | Machine registration failed 404 | User environment — likely wrong server URL or version mismatch. |
| 814 | Image upload: feature parity web/Android | Feature request. We're building this in M4.9. |
| 813 | Image upload button hidden on web | Already in plan as M4.9. |
| 811 | Why are vendor API keys sent to server? | Security question about their architecture. Our E2E encryption model is documented. |
| 804 | Custom label/alias for terminal sessions | Feature request — covered by M5.2 (session rename). |
| 802 | Live Preview Panel with Click-to-Edit | Feature request. Out of v1.5 scope. |
| 801 | Camera permission required | Expo config issue. Our `app.config.js` already declares camera permission correctly. |
| 799 | Telegram chat support | Feature request. Irrelevant. |
| 788 | Docker build failing on patch script | Docker-specific. We deploy via systemd, not Docker for alpha. |
| 778 | Mic not working | Voice feature — deferred past v1.5. |
| 777 | Support for native Claude install | Feature request for non-npm Claude. Out of scope. |
| 776 | "Process exited unexpectedly" | Support question, not a bug report. |
| 772 | happy-agent create --spawn | Feature request for agent package. Low priority. |
| 771 | Voice: hardcoded ElevenLabs agent IDs | Voice feature — deferred. |
| 770 | Apple Watch support | Feature request. Way out of scope. |
| 764 | Chinese characters display as mojibake | i18n rendering issue. P3 for us — most testers are English. |
| 760 | GitHub Auth Issue | GitHub OAuth — we know this is broken (in our backlog). Low priority for alpha. |
| 759 | i18n translations for all new features | Feature request / tracking issue. Not a bug. |
| 758 | Session reactivate + export | Feature request. Could be useful later. |
| 757 | Unified Command Palette | Feature request. Out of scope. |
| 756 | Browse/Changes tabs with local search | Feature request. Out of scope. |
| 755 | Session transcript export | Feature request. Nice-to-have, not v1.5. |
| 754 | Image upload in chat | Duplicate of 813/814. Covered by M4.9. |
| 753 | File search fallbacks | Feature request. Low priority. |
| 752 | Markdown preview with edit mode | Feature request. Out of scope. |
| 751 | Clickable file paths in chat | Feature request. Nice-to-have. |
| 749 | Code Editor + CSV/SQLite viewers | Feature request. Out of scope. |
| 748 | MMKV session caching | Performance optimization. Not needed for alpha. |
| 747 | Virtualized syntax highlighting | Performance. Not blocking. |
| 746 | Enhanced File Manager | Feature request. Out of scope. |
| 745 | Project sessions view with grouped sessions | Feature request — partially covered by M4.4 (terminal grouping). |
| 744 | Memory monitor with RAM indicator | Feature request. Out of scope. |
| 743 | Plannotator | Feature request. Out of scope. |
| 742 | WebSocket polling fallback | Resilience feature. Nice-to-have but not blocking. |

## Summary

- **11 relevant issues** to track — 2 already fixed (768, 773), 4 need investigation
- **4 issues** need investigation against our fork
- **35 issues** irrelevant (feature requests, user env issues, deferred features)
- Many issues (#742-#759) were batch-filed feature requests, not real bug reports

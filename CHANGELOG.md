# Changelog

All notable changes to **Agent Arena** are documented in this file.

## [0.5.0] - 2026-11-20

### Added
- **Antigravity (`agy`) Harness Support**: First-class support for Google Antigravity CLI (`agy`) across side-by-side runs, preset auto-discovery (`~/.gemini/antigravity-cli/settings.json` and `~/.gemini/bin/agy`), AI Agent Judge selection, `agentArena.agyPermissionMode` setting, and live `stream-json` parsing (streaming deltas, tool steps, thinking tokens, cache-read tokens, and headless permission notices).
- **Add Agents to Existing Runs**: Append and execute one or more additional agent configurations directly inside any existing run (`+ Add Agent ▾` in the Arena topbar or `+ Add Agent` in Analysis) without re-running completed candidates or overwriting existing outputs and judgments. Preserves blind aliases, checks out the original frozen baseline in `apfs-cow` / `git-worktree` modes, and shields unjudged appended candidates from unfair leaderboard losses until re-judged.

## [0.4.0] - 2026-11-20

### Added
- **Minimalist, Output-First UI with Progressive Disclosure**: Streamlined the Side-by-Side Arena, Run Summary, and Leaderboard around uncluttered high-signal views, auto-collapsing the agent preset drawer once launched, hiding empty file footers, and placing full 12-column telemetry, 95% confidence interval tables, plots, pairwise matrices, and workspace diffs inside collapsible on-demand disclosures.
- **Rendered Markdown Outputs & `.md` File Switching (`lib/markdown.js`)**: Zero-dependency, XSS-safe GFM Markdown renderer for headings, tables with alignment, fenced code blocks, task lists, nested lists, blockquotes, inline formatting, and sanitized `https`/`http`/`mailto` links. Supports toggling rendered Markdown vs. raw source and previewing `.md` files produced by candidates directly inside both Arena panes and Analysis cards.
- **Configurable Coding Agent Judge (`lib/judge.js`, `agentArena.judge.*`)**: Assign any coding agent CLI (`codex`, `claude`, `opencode`, `pi`, `dsh`, or `custom`) with configurable model, reasoning effort, blind candidate masking (`Candidate A/B/C`), and custom evaluation rubric to judge outputs and persist structured scores and rationale automatically (`judgeType: 'agent'`, CSV `judge_type` column).

## [0.3.0] - 2026-11-20

### Added
- **Auto-Discovery of Local CLI Defaults**: Empty `agentArena.presets` now safely inspects local CLI configurations (`~/.codex/config.toml`, `~/.claude/settings.json`, `~/.config/opencode/opencode.json`, `~/.pi/agent/settings.json`) for default model and reasoning effort names without storing internal presets or credentials.
- **Cross-Platform Isolation & Pure-JS Diffs**: Added cross-platform CoW fallback (`cp -cRP` on macOS, `cp --reflink=auto` on Linux, size-guarded copy fallback), Windows junction symlinks, path-traversal assertions, and a pure-JavaScript LCS unified diff generator when `/usr/bin/diff` is absent.
- **Live Feed Filters & Controls**: Per-pane `All | Tools | Errors` feed filter, live `Re-run` action, direct `Settings ⚙` shortcut (displaying permission/sandbox summary), and `Copy Prompt` in Analysis.
- **Blind-Mode & Shared-Workspace Clarifications**: Randomized Candidate A/B/C sorting when Blind Mode is enabled, Blind Mode status banner, and explicit shared-workspace change callouts in `direct` mode.
- **Reasoning Token Telemetry**: Added `reasoningTokens` extraction (Codex `reasoning_output_tokens`, Claude `reasoning_tokens`, OpenCode `reasoning`) and `reasoning_tokens` column in CSV export.
- **VS Code Light & High-Contrast Theme Fidelity**: Theme-aware CSS tokens for status badges, dots, and diff highlighting across both Light and Dark VS Code themes.
- **Marketplace & Repo Infrastructure**: 256×256 PNG extension icon, MIT license, GitHub Actions CI (`ubuntu-latest` + `macos-latest`), and tag-driven `.vsix` GitHub Release + VS Code Marketplace publishing workflow.

### Fixed
- **Codex Tool & Search Counting**: `web_search`, `function_call`, `custom_tool_call`, `tool_call`, and `reasoning` summary events in `codex exec --json` streams are now accurately counted and displayed in the live feed.
- **Claude Non-Interactive Telemetry & Permission Hints**: Tracked live turns and per-message usage during streaming prior to final `result`, and surfaced a helpful `notice` when a tool call is blocked by non-interactive permissions.
- **In-Place Pane Patching**: Toggled per-pane `Stop` button, active tab/filter states, and `Adopt into Workspace` actions smoothly during status transitions.
- **SVG Chart Label Layout**: Prevented right-edge label clipping in the Pareto scatter plot and widened Forest Plot labels.
- **Safe Task Deletion**: Added modal confirmation before deleting a recorded run and its logs.

## [0.2.0] - 2026-11-20

### Added
- Redesigned into two dedicated views: unified side-by-side live Arena panel + separate Analysis & Telemetry panel.
- Added instant `direct` (shared workspace) and `scratch` isolation modes, async CoW cloning, auto-symlinking of heavy directories, stale-task reconciliation on startup, and duplicate-launch guards.
- Added real-run 4-step **Welcome & Live Tutorial** pipeline.

## [0.1.0] - 2026-11-20

### Added
- Initial prototype of Agent Arena supporting concurrent CLI runs (`claude`, `codex`, `opencode`, `pi`, `dsh`, `custom`), workspace isolation, diffing, blind judging, and Bradley-Terry Elo / Wilson & bootstrap confidence intervals.

# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Development Commands

```bash
# Run CLI in dev mode (no build step — Bun executes TypeScript directly)
bun run dev

# Install dependencies
bun install
```

There are no tests, linter, or build scripts configured. The CLI runs directly via Bun with `#!/usr/bin/env bun` shebang in `bin/ccswi.js`.

## Architecture

ccswi is a CLI for switching Codex `~/.Codex/settings.json` profiles. The core design separates **provider-specific env vars** (endpoint, token, model names) from **common settings** (MCP servers, permissions, tool config) so switching providers doesn't lose user customizations.

### Data Flow

1. **Profiles** live in `~/.ccswi/profiles.toml` (TOML via `smol-toml`)
2. **Common config** (non-provider settings) is cached in `~/.ccswi/common.json`
3. **Switch operation** (`src/core/switch.ts`): reads current `settings.json` → strips provider env vars → saves as common config → merges target profile → writes back to `settings.json`

### Key Files

- `src/types.ts` — All interfaces: `Profile`, `ProfilesStore`, `ClaudeSettings`, `ProviderPreset`
- `src/core/config.ts` — TOML profile store CRUD (load/save/add/update/remove/set-active)
- `src/core/settings.ts` — Builds `settings.json` from profile+common, and extracts profile from settings
- `src/core/switch.ts` — Orchestrates the full switch flow
- `src/core/common-config.ts` — Manages the common (non-provider) config
- `src/models/api.ts` — Model list fetching with 3-tier cache (memory → disk 24h → network) and provider/OpenRouter fallback
- `src/providers/presets.ts` — ~60 hardcoded provider presets (endpoint, name, URL)
- `src/utils/fuzzy.ts` — Fuzzy matching for profile ref resolution (by name, index, or search)
- `src/ui/prompts.ts` — Interactive wizard flows using `@clack/prompts`

### Command Pattern

Each command in `src/commands/` exports a `register(program: Command)` function. Commands follow: load store → perform operation → save store → print result. Entry point is `src/index.ts` which registers all commands via Commander.

### Provider Env Keys

The constant `PROVIDER_ENV_KEYS` in `src/core/settings.ts` defines which env vars are provider-specific (stripped during switch). These include `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, and others.

### Model Name Convention

Each profile stores one model slot:
- **model** — maps to all four `ANTHROPIC_*_MODEL` env vars (`ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`)

The same value is written to all four slots so Codex and downstream tooling that reads any one of them keep working.

`model_1m: true` appends `[1m]` to the model name (e.g., `Codex-opus-4-20250514[1m]`) to indicate 1-million token context support.

**v4.0.0 migration**: pre-v4.0.0 profiles stored three slots (`opus`, `sonnet`, `haiku`). On first load with v4.0.0+, `loadProfiles` auto-collapses them into one `model` field (opus wins, silent). Migration code stays in place for ~1–2 weeks then gets deleted.

# ccswi

Lightweight CLI to switch [Claude Code](https://claude.ai/download) `~/.claude/settings.json` profiles.

## Install

```bash
bun add -g ccswi
```

## Usage

```bash
# Initialize from scratch — wipe & rewrite ~/.claude/settings.json with
# a guided wizard (set options + WebSearch deny + default mode + theme +
# optional Exa MCP / ccstatusline + ~/.claude.json bootstrap).
# Intended for fresh machines or full reset; existing settings.json is
# backed up to settings.json.bak.
ccswi init

# Save current settings.json as a profile
ccswi save [name]

# Add a new profile interactively
ccswi add

# List all profiles
ccswi ls

# Switch to a profile
ccswi use <name|index>

# Show profile details
ccswi show [name|index]

# Edit a profile
ccswi edit <name|index>

# Rename a profile
ccswi rename <old> <new>

# Delete a profile
ccswi rm <name|index>

# Tweak Claude Code behavior flags (settings.json + claude.json).
# Migrated from `ccswi set <sub>` — same flag names, same env vars.
ccswi tool use-pwsh                # CLAUDE_CODE_USE_POWERSHELL_TOOL=1
ccswi tool no-flicker              # CLAUDE_CODE_NO_FLICKER=1
ccswi tool disable-updater         # DISABLE_AUTOUPDATER=1
ccswi tool disable-install-checks  # DISABLE_INSTALLATION_CHECKS=1
ccswi tool skip-ide-install        # CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1
ccswi tool no-ide-connect          # CLAUDE_CODE_AUTO_CONNECT_IDE="false"
ccswi tool deny-web-search         # permissions.deny += "WebSearch"

# Per-project state in ~/.claude.json
ccswi tool skip-project-onboarding # all projects: projectOnboardingSeenCount=4
ccswi tool trust-home              # mark homedir() as hasTrustDialogAccepted=true

# Top-level / MCP toggles (init-derived, exposed surgically)
ccswi tool install-exa             # mcpServers.exa (https://mcp.exa.ai/mcp)
ccswi tool complete-onboarding     # hasCompletedOnboarding = true

# Cache maintenance
ccswi tool clean-cache             # clear ccswi's model list cache, force fresh fetch
```

## Profiles

Profiles are stored in `$XDG_CONFIG_HOME/ccswi/profiles.toml`
(default: `~/.config/ccswi/profiles.toml`, overridden by the `XDG_CONFIG_HOME`
env var). The companion `common.json` lives in the same directory. The
model list cache lives in `$XDG_CACHE_HOME/ccswi/models-cache.json`
(default: `~/.cache/ccswi/models-cache.json`).

When upgrading from a pre-XDG install (v2.x or earlier), ccswi auto-migrates
`~/.ccswi/` → XDG layout on first run via a safe staging rename. Set
`CCSWI_NO_MIGRATE=1` to skip (e.g. in tests).

Each profile contains:

- **vendor** — Provider preset name (optional)
- **endpoint** — `ANTHROPIC_BASE_URL`
- **token** — `ANTHROPIC_AUTH_TOKEN`
- **opus / sonnet / haiku** — Model names for each tier
- **opus_1m / sonnet_1m** — Whether the model supports 1M context

## Acknowledgements

The bundled provider preset list (`src/providers/presets.ts`) is adapted from
[cc-switch](https://github.com/farion1231/cc-switch) by Jason Young, licensed
under MIT. See [`LICENSE`](./LICENSE) for full third-party notices.

## License

MIT

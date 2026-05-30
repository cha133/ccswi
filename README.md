# ccsw

Lightweight CLI to switch [Claude Code](https://claude.ai/download) `~/.claude/settings.json` profiles.

## Install

```bash
bun add -g ccsw
```

## Usage

```bash
# Save current settings.json as a profile
ccsw save [name]

# Create a new profile interactively
ccsw new

# List all profiles
ccsw ls

# Switch to a profile
ccsw use <name|index>

# Show profile details
ccsw show [name|index]

# Edit a profile
ccsw edit <name|index>

# Rename a profile
ccsw rename <old> <new>

# Delete a profile
ccsw rm <name|index>

# Modify common config options
ccsw set disable-updater
ccsw set use-pwsh
```

## Profiles

Profiles are stored in `~/.ccsw/profiles.toml`. Each profile contains:

- **vendor** — Provider preset name (optional)
- **endpoint** — `ANTHROPIC_BASE_URL`
- **token** — `ANTHROPIC_AUTH_TOKEN`
- **opus / sonnet / haiku** — Model names for each tier
- **opus_1m / sonnet_1m** — Whether the model supports 1M context

## License

MIT

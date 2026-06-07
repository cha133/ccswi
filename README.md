# ccswi

Lightweight CLI to switch [Claude Code](https://claude.ai/download) `~/.claude/settings.json` profiles.

## Install

```bash
bun add -g ccswi
```

## Usage

```bash
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

# Modify common config options
ccswi set disable-updater
ccswi set use-pwsh
ccswi set no-flicker
ccswi set skip-ide-install
ccswi set no-ide-connect
```

## Profiles

Profiles are stored in `~/.ccswi/profiles.toml`. Each profile contains:

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

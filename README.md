# abox

> **macOS only** - relies on `sandbox-exec` (Apple's Seatbelt). `sandbox-exec` is marked deprecated but the underlying Seatbelt subsystem is not; see [Why `sandbox-exec`?](#why-sandbox-exec) below.

`abox` is a tiny wrapper around macOS `sandbox-exec` for running GitHub Copilot CLI with a reusable permissive seatbelt profile.

## Install

Requires [Bun](https://bun.sh).

```bash
cd ~/Projects/abox
bun install   # installs dev dependencies
bun link      # links `abox` bin globally via Bun
```

Or build a standalone binary:

```bash
bun run build   # outputs dist/abox
```

## Commands

### Run in sandbox

```bash
abox run copilot
abox run --project ~/Projects/myapp copilot
```

If no command is passed, default is:

```bash
abox run
# runs: copilot
```

### Add writable folder

```bash
abox add folder ~/Projects
```

### List added folders

```bash
abox list folders
```

## Why `sandbox-exec`?

`sandbox-exec` is marked deprecated by Apple (since macOS Sierra), but the underlying kernel sandbox subsystem (Seatbelt) is not.

This is also the approach taken by other AI coding tools on macOS:

- [Gemini CLI](https://geminicli.com/docs/cli/sandbox/) uses `sandbox-exec` with a `permissive-open` profile by default
- [OpenAI Codex CLI](https://developers.openai.com/codex/security/) uses OS-level sandbox mechanisms including Seatbelt
- [Claude Code](https://code.claude.com/docs/en/sandboxing) uses Seatbelt on macOS and bubblewrap on Linux

Alternatives and why they're not used here:

- **Docker / OrbStack** - true isolation, but requires an install step
- **App Sandbox** - the "official" Apple way, but requires signed entitlements and notarization; too heavyweight for a CLI wrapper
- **macOS Containerization framework** - Apple's new framework in macOS 26 is a Linux container runtime (think Apple-branded Docker), not a macOS-native sandbox

The main risk of relying on `sandbox-exec` is that Apple could change the SBPL policy language without notice. In practice it has been stable for many years.

## Security notes

The profile uses `(allow default)` with a blanket `(deny file-write*)`, then re-allows specific paths. Make sure sensitive dotfiles (`~/.ssh`, `~/.aws`, etc.) and `~/Library` (outside of `~/Library/Caches`) are not unintentionally writable - this is a common mistake with hand-rolled Seatbelt profiles.

## Config

- Config dir: `~/.config/abox`
- Extra folder list: `~/.config/abox/folders`
- Generated profile: `~/.config/abox/permissive-open.sb`
- Custom rules: `~/.config/abox/custom.sb` _(optional - appended to the generated profile on every run)_

### Default writable paths

- current `--project` directory (or current working dir)
- `~/.copilot`
- `~/.agents`
- `~/.npm`
- `~/.cache`
- `~/Library/Caches`
- `/tmp`, `/private/tmp`

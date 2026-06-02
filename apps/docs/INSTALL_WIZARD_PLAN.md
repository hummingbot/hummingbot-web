# Hummingbot Install Wizard — Plan

> Status: **Draft for review.** This is the single plan for the Hummingbot on-ramp. Scope is
> deliberately narrow: **help users install Hummingbot or Condor (or the dev components) with one
> command** — *not* a full lifecycle CLI. The installer orchestrates the **native commands that
> already exist** in each repo; it doesn't reinvent them. References:
> [Resend `install.sh`](https://resend.com/install.sh),
> [OpenClaw `install.sh`](https://openclaw.ai/install.sh), and the current
> [`deploy/setup.sh`](https://github.com/hummingbot/deploy/blob/main/setup.sh).
>
> *(An earlier draft proposed a full `install/start/config/doctor/run/up/down` lifecycle CLI. We are
> not building that — just the installer + a re-runnable `doctor`. This is the single, current plan.)*

## 1. Goal & scope

One command per product, the whole on-ramp. The user picks **Hummingbot or Condor in the website UI**
(§9), which routes them to one of **two single-purpose scripts** in the `deploy` repo — no in-script
"which product?" wizard:

```bash
curl -fsSL https://hummingbot.org/install-hummingbot.sh | bash   # the Hummingbot client (NEW)
curl -fsSL https://hummingbot.org/install-condor.sh    | bash   # Condor + API  (existing flow)
```

- **`install-condor.sh`** — the **existing** Condor + API installer, **renamed from `setup.sh`**,
  content unchanged. We don't touch the proven flow.
- **`install-hummingbot.sh`** — the **new** Hummingbot client installer (Docker or source), the focus
  of this plan.

**In scope**
- The two `curl | bash` installers above (curl|bash-safe, platform/musl guards).
- `install-hummingbot.sh`'s own **method sub-wizard** (Docker / source / develop) — *not* a product
  wizard; the product is already chosen in the UI.
- A re-runnable **`doctor`** (`install-hummingbot.sh --doctor`).
- A default, minimal **Claude/LLM plugin** (local MCP) on the Hummingbot path.
- The home-page **Quick Start card** that drives all of the above.

**Also in scope — a *tiny* `hummingbot` wrapper (three verbs).** Not a lifecycle CLI; a small script
installed to `~/.local/bin/hummingbot` by `install-hummingbot.sh` (embedded heredoc) that wraps the
existing `bin/hummingbot_quickstart.py`:
- `hummingbot start [--v2 FILE | -f FILE] [-p PASSWORD] [--headless]` — launch the client REPL, or
  **autostart** a (V2) strategy config, optionally **headless** (unattended; auto-enables MQTT). Thin
  passthrough to `hummingbot_quickstart.py` under the right context (source: the `hummingbot` conda
  env; docker: the container) — hiding `conda activate` / `docker attach`. See §5.
- `hummingbot update [--dev | --latest]` — update the install to the newest version on its channel
  (and switch channel for Hummingbot). See §5, §8.
- `hummingbot doctor` — the §7 health check.
- `hummingbot --version`.

**Out of scope (explicitly not building)**
- A full CLI with `config`/`run`/`up`/`down`/`status`/`logs`/`uninstall`. Service/bot management stays
  native (docker compose, `tmux attach -t condor`), which the installer prints.

**Where it lives.** Both scripts live in the
[`hummingbot/deploy`](https://github.com/hummingbot/deploy) repo (already the `curl | bash` source).
We **repurpose** deploy — it keeps its docker-compose assets, `setup.sh` becomes `install-condor.sh`,
and `install-hummingbot.sh` is added. One lightweight repo we can iterate on fast, decoupled from
core's release cycle. *(Shipped: branch `install-wizard`.)*

## 2. The two-script entry & product selection

**The website is the product selector.** The home-page Quick Start card (§9) has two product tabs —
**Hummingbot** and **Condor** — and each copies the matching script's one-liner. Because the UI makes
the choice, each script is single-purpose (no in-script "which product?" wizard):

| Tab | Command copied | What it does |
|---|---|---|
| **Hummingbot** | `curl -fsSL https://hummingbot.org/install-hummingbot.sh \| bash` | installs the client (then its own *Docker / source / develop* sub-wizard) |
| **Condor** | `curl -fsSL https://hummingbot.org/install-condor.sh \| bash` | the existing Condor + API flow (renamed `setup.sh`, unchanged) |

- **Condor is untouched.** `install-condor.sh` is `setup.sh` renamed; its self-references and the
  README were updated to the new name. We do not reimplement the proven Condor + API flow.
- **Dev channel** (§8) — **Hummingbot only.** The card's **Dev** toggle (Hummingbot tab) appends
  `--dev` to `install-hummingbot.sh` to track the `development` branch / `:development` image; default
  is **latest**. **Condor always tracks `main`** — no channel toggle on the Condor tab.
- **macOS & Linux only for now.** Windows (WSL2 / `install.ps1`) is deferred to P3 (§10) — we'll
  investigate how OpenClaw handles it. The card shows a static "macOS · Linux" indicator, no OS toggle.
- **`hummingbot-web` is pre-launch**, so there are no published `install.sh`/`condor.sh` links to
  preserve. *(Optional: keep a thin `setup.sh` shim that `exec`s `install-condor.sh` if we want old
  `…/setup.sh` URLs to keep working after merge — open item.)*

## 3. `install-hummingbot.sh` — architecture

Lives at the `deploy` repo root; served at **`hummingbot.org/install-hummingbot.sh`** via an
`apps/site` rewrite. **Bash orchestration over the native repo `make` targets** — it doesn't reinvent
the build. Borrows the safest idioms from Resend (truncation safety) and OpenClaw (TTY prompts):

```bash
#!/usr/bin/env bash
main() {
  set -euo pipefail
  # 1. parse_args: --docker | --source | --develop | --dev | --latest | --no-plugin
  #                --dir | --doctor | --yes | --help        (+ env: HUMMINGBOT_INSTALL)
  # 2. --doctor short-circuits to the health check (§7) and exits.
  # 3. is_promptable() — true only if /dev/tty is readable (CRUCIAL under curl|bash, where stdin
  #                IS the script). All prompts read from </dev/tty.
  # 4. detect: uname -ms -> {darwin,linux}-{arm64,x64}; musl; Windows -> WSL2 guidance.
  # 5. method sub-wizard (Docker/source/develop) unless a flag pre-selects it.
  # 6. run the method's native steps (§5); install the `hummingbot` wrapper; write state.json.
  # 7. install the LLM plugin (default, unless --no-plugin) — §6.
  # 8. doctor (§7), then print next-steps (`hummingbot start`).
}
main "$@"   # MUST be the last line — truncation safety for curl | bash
```

**Borrowed safeguards:** `main "$@"` as the final line, `set -euo pipefail`, **no `sudo`** (everything
under `$HOME`), platform/musl guards. Native `make` steps that may prompt are fed `</dev/tty`.

*(`install-condor.sh` is the renamed `setup.sh`; its architecture is unchanged and not re-specced here.)*

## 4. The method sub-wizard (Hummingbot only)

The **product** is already chosen in the UI, so `install-hummingbot.sh` only asks **how** to run it,
then runs that method's native steps (§5):

```
How do you want to run Hummingbot?            (skipped if --docker / --source / --develop)
  1) Docker   — run the client in a container (recommended)   → make setup && make deploy
  2) Source   — build from source with conda                  → make install (conda env + compile)
  3) Develop  — core / API / Gateway from source              → P3 (prints native steps for now)
```

- **Defaults are pressable-enter** — Docker by default; `latest` channel unless `--dev`.
- **Adopt existing installs.** `clone_or_update` detects `~/hummingbot` and fast-forwards instead of
  re-cloning.
- **Channel** — `--dev` ⇒ `development` branch (source) / `:development` image (docker); default
  `master`/`:latest`.

## 5. What each path runs (native commands — the whole point)

The installer is a thin orchestrator. Each path is exactly the documented native flow, with the
friction (conda activation, `docker attach`, editing compose for versions, `.env` hand-authoring)
handled for the user.

| Path | Native steps `install-hummingbot.sh` runs |
|---|---|
| **Docker** | clone `~/hummingbot` (`master`, or `development` on `--dev`) · `--dev` ⇒ `sed` compose image to `:development` · `make setup` (fed `</dev/tty`) · `make deploy` (`docker compose up -d`). **Start (wrapper):** `docker attach hummingbot`. |
| **Source** | `ensure_conda` (install Miniforge if none) · clone `~/hummingbot` · `make install` (conda env create/update + `build_ext` compile). **Start (wrapper):** `conda run -n hummingbot --no-capture-output ./bin/hummingbot_quickstart.py`. |
| **Develop** | P3 — prints the native `./install` + API/Gateway steps for now. |
| **Condor** *(separate script)* | `install-condor.sh` = the existing `setup.sh`, **unchanged** (clone `~/hummingbot-api` + `~/condor`, `uv`, `docker compose up -d`, `tmux -s condor`). Not re-specced here. |

### Directory layout — flat `$HOME` siblings (matches `deploy`)

```
$HOME/                  # default base = $HOME  (override: --dir / HUMMINGBOT_INSTALL)
├─ hummingbot/        # core client (source clone, or compose project for --docker)
├─ hummingbot-api/    # repo + .env + docker-compose;  BOTS_PATH = ~/hummingbot-api/bots (abs)
│  └─ bots/           # bot configs, scripts, credentials/
├─ condor/            # repo + .env (Telegram token, admin id)
└─ gateway/           # source build; method follows the chosen path
```

- **Flat `$HOME`, not pwd-relative** — matches `deploy` (`CONDOR_DIR="condor"`, `API_DIR="hummingbot-api"`)
  and the `hummingbot-developer` skill (`~/hummingbot-api`, `~/condor`), so the installer **adopts
  existing installs** instead of re-cloning. Default base `$HOME`; `--dir`/`HUMMINGBOT_INSTALL`
  overrides to a one-folder layout. `BOTS_PATH` = abs path of `<base>/hummingbot-api/bots`, as deploy
  computes it.
- **Conda vs uv:** `install-hummingbot.sh` source builds use an existing conda/Anaconda (install
  Miniforge if none — we don't force the full Anaconda download). `uv` belongs to the **Condor**
  script. Each owns its layer.

### Post-install: the `hummingbot` wrapper

`install-hummingbot.sh` writes a small `hummingbot` script to **`~/.local/bin/hummingbot`** (embedded
heredoc, adds `~/.local/bin` to PATH) so users don't juggle `conda activate` / `docker attach`. It
reads the method from `~/.hummingbot/state.json` and dispatches to `bin/hummingbot_quickstart.py`:

| Invocation | Result |
|---|---|
| `hummingbot start` | Launch the client **REPL** (source: `conda run -n hummingbot --no-capture-output ./bin/hummingbot_quickstart.py`; docker: `docker start` + `docker attach hummingbot`). |
| `hummingbot start --v2 <file> [-p <pw>]` | **Autostart** a V2 strategy config from `conf/scripts/`. |
| `hummingbot start -f <file> [-p <pw>]` | Autostart a legacy strategy config from `conf/`. |
| `hummingbot start … --headless` | Run **unattended**, no UI (auto-enables MQTT autostart). |
| `hummingbot update [--dev\|--latest]` | source: `git pull` + `make install`; docker: `docker compose pull && up -d`. `--dev`/`--latest` switches channel. |
| `hummingbot doctor` | Quick method-aware check (conda env / container). |
| `hummingbot --version` | Print `hummingbot/VERSION`. |

For source, the `start` flags are a 1:1 passthrough to `hummingbot_quickstart.py` (`--v2`,
`-f/--config-file-name`, `-p/--config-password`, `--headless`) — the wrapper resolves *where* to run
it. *(Docker autostart-with-config is a P3 follow-up; docker `start` attaches the REPL.)*

## 6. The Hummingbot LLM plugin (local MCP) — installed by default

The **Hummingbot** path installs a **plugin for Claude (and other MCP-capable LLMs)** by default and
**shows the user what was added** (opt out with `--no-plugin`). Scope is deliberately tiny. *(Condor
ships its own MCP via the existing `setup.sh`, so the Condor route doesn't add this one.)*

- **What it is:** a **local MCP server** (shipped in `deploy`, run via `uvx`/`uv run`), registered at
  **project scope** so running `claude` inside the install folder picks it up automatically. The
  installer writes a project `.mcp.json` into the base dir (`~/hummingbot/.mcp.json`):

  ```json
  { "mcpServers": { "hummingbot": { "command": "uvx", "args": ["hummingbot-mcp"] } } }
  ```
  (For Docker installs the server proxies into the API container; for source it runs locally.)

- **Tool surface (v1, intentionally minimal):** **run a bot with a config, in a tmux session.** One
  primary tool `run_bot(config, [script|controller])` that launches the bot detached under `tmux`
  (so it survives the session), plus a read-only `list_configs`. No credential / transfer / withdrawal
  tools in v1.

- **What the user sees** at the end of install:

  ```
  ✓ Installed the Hummingbot plugin for Claude (local MCP).
    Run `claude` inside ~/hummingbot and ask it to run a bot.
    Tools: run_bot (launches a bot from a config in tmux), list_configs.
    Opt out next time with --no-plugin.
  ```

- **Other LLMs:** MCP is also consumable by Codex / Gemini CLIs; v1 ships the Claude project-scope
  path, others follow the same `.mcp.json` pattern.

## 7. `doctor` — re-runnable health check

`curl -fsSL https://hummingbot.org/install-hummingbot.sh | bash -s -- --doctor` (and run automatically
at the end of every install), plus `hummingbot doctor`. Prints a ✅/⚠️/❌ table with a one-line remedy
per failure; exits non-zero on any ❌. Checks (Hummingbot-focused; Condor has its own verify):

- **System** — OS/arch supported · disk space · ports free (8000 api, 15888 gateway, 1883 emqx,
  5432 postgres, 8501 dashboard).
- **Toolchain** — `git`, `curl` · Docker installed **and daemon running** · `docker compose` ·
  (source) conda env `hummingbot` present · `uv` (condor/plugin).
- **Client** — install detected (`~/hummingbot`) · version vs channel · `conf/` exists.
- **API/Condor** — `hummingbot-api`/`emqx`/`postgres` containers up · `:8000` answers basic auth ·
  `.env` sane (broker host matches docker-vs-local) · `condor` tmux session alive · Telegram token set.
- **Gateway** — reachable at `:15888` · certs present (prod).
- **Plugin** — `~/hummingbot/.mcp.json` present and the MCP server resolvable.

(No `--fix` in v1; doctor reports and points at the exact remedy. Auto-fix is a later add.)

## 8. Channels & non-interactive flags

- **Channels (Hummingbot only):** default **latest** (latest release tag / `:latest` image); `--dev`
  ⇒ `development` branch (source) / `:development` image (docker). **Condor always tracks `main`** and
  has no channel option. (`deploy`'s existing `--upgrade`/`--api` flags are kept.)
- **Pinning:** `--version vX.Y.Z` (semver-validated, Hummingbot) overrides the channel.
- **Switching post-install:** `hummingbot update --dev` / `--latest` moves an existing Hummingbot
  install between channels and rebuilds/repulls (§5). Mirrors OpenClaw's `… update --channel …`.
- **Non-interactive:** when `! is_promptable()` (CI / piped without `/dev/tty`), the wizard is skipped;
  intent must come from flags (`--condor`, `--hummingbot --source`, `--develop --gateway`, …).

## 9. Home page — Quick Start card

**Reuse, don't rebuild.** The Hero already renders `InstallTabs`
(`apps/site/src/components/home/install-tabs.tsx`) with **Hummingbot | Condor** tabs and pulls the
version from GitHub releases; `CodeBlock` + `CopyButton` live in `packages/ui`. This is an
**enhancement of `InstallTabs`** to match the OpenClaw Quick Start aesthetic, adapted per direction.

### Layout (target)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ● ● ●   [ Hummingbot ] [ Condor ]                      macOS · Linux   [⟡ Dev] │  ← chrome row
├──────────────────────────────────────────────────────────────────────────────┤
│   # One command. Installs Hummingbot, then asks how you want to run it.        │  ← comment line
│   $ curl -fsSL https://hummingbot.org/install-hummingbot.sh | bash       [⧉]   │  ← command + copy
└──────────────────────────────────────────────────────────────────────────────┘
   Works on macOS & Linux. The installer sets up the toolchain and walks you
   through setup. (Windows via WSL2 coming later.)
```

### Differences from the OpenClaw reference (per direction)

| OpenClaw | Hummingbot |
|---|---|
| Left tabs: `One-liner / npm / Hackable / macOS` | Left tabs: **`Hummingbot` / `Condor`** (product selection — §2) |
| Right toggle `macOS & Linux / Windows` | **Drop the toggle** — static `macOS · Linux` label (Windows → P3) |
| Badge `β BETA` | Toggle **`Latest` / `Dev`** — **Hummingbot tab only** (Condor is always `main`) |
| Multiple install methods | **Single one-line command** (no npm/method selector) |

### Behavior

- **Tab → command:** `Hummingbot` → `…/install-hummingbot.sh | bash`; `Condor` →
  `…/install-condor.sh | bash`.
- **Dev toggle (Hummingbot tab only):** default **Latest**; when flipped to **Dev**, appends
  ` -s -- --dev` and the badge reads `Dev`. **Hidden on the Condor tab** (Condor always tracks `main`).
- **Copy:** existing `CopyButton`; copies the exact composed command (tab × channel).
- **OS:** static `macOS · Linux` indicator (no toggle yet). Window chrome: three traffic-light dots on
  the tab row (decorative, `ink` tokens).

### Files & tokens

- **Enhance:** `apps/site/src/components/home/install-tabs.tsx` — add the `Latest`/`Dev` toggle
  (Hummingbot tab only), the static `macOS · Linux` indicator, the comment line, and the traffic-light
  chrome; keep the existing tab/version logic and `CodeBlock`. Stays in the **Hero** (primary CTA).
- **Reuse from `packages/ui`:** `CodeBlock` (`{ command, prompt }`), `CopyButton` (`{ value }`), `cn`.
  If the segmented OS/channel control is wanted elsewhere, extract a `Segmented` primitive into
  `packages/ui` and export from `packages/ui/src/index.ts`.
- **Tokens:** `bg-card`, `border-border`, `text-foreground`, `text-ink-500` (inactive tab),
  `bg-ink-950 text-foreground` (active tab), `text-brand-teal` (Dev badge / accent), `font-mono`.
  Inherits light/dark automatically (see [[tokens-runtime-theming]] — verify contrast with a
  Playwright check on both themes before shipping).

## 10. Open questions & phasing

**Resolved**
1. ~~Thin post-install shim?~~ **Yes** — ship the two-verb `hummingbot` wrapper (`start` with
   `--v2`/`-f`/`-p`/`--headless` passthrough, + `doctor`). See §1, §5.
2. ~~Default card channel?~~ **Latest default, `Dev` toggle — Hummingbot only.** Condor always `main`.
3. ~~Windows now or later?~~ **Skip for now → P3.** Investigate OpenClaw's approach then.

**Resolved (cont.)**
4. ~~Plugin default-on?~~ **Yes** — the LLM plugin installs by default (shown, opt-out via `--no-plugin`).

**Phasing** *(all on `hummingbot/deploy` branch `install-wizard`)*
1. **P1 — two-script split + Condor.** ✅ *Shipped.* `setup.sh` → `install-condor.sh` (renamed,
   unchanged; self-refs + README updated). `--doctor` + curl|bash-safe scaffolding.
2. **P2 — Hummingbot client + wrapper.** ✅ *Shipped.* `install-hummingbot.sh`: Docker (`make
   setup`/`deploy`) or source (`make install`), `latest`/`--dev` channel, the `hummingbot`
   `start`/`update`/`doctor` wrapper → `~/.local/bin`, `state.json`, `--doctor`. **Remaining:** the
   LLM plugin is a default-on *notice* (the `.mcp.json` + `run_bot`/tmux MCP server is still TODO,
   pending the `hummingbot-mcp` package).
3. **P3 — Develop + Windows + plugin wiring.** *Develop* multi-component source path (core/API/Gateway,
   branch select); Docker autostart-with-config; the real LLM plugin; Windows (WSL2 / `install.ps1`).
4. **Site — the Hero Quick Start card** (§9): enhance `apps/site` `InstallTabs` (two product commands,
   `Latest`/`Dev` toggle, chrome). *Not started.*

---

### Appendix — reference patterns adopted

- **Resend:** `main "$@"` last line (truncation safety); `set -euo pipefail`; `$HOME`-only, no sudo;
  semver-validated version pin; shell-aware idempotent PATH writes.
- **OpenClaw:** `is_promptable()` TTY gate + reading prompts from `/dev/tty` (required under
  `curl | bash`); clone-or-update adoption; channel via flag; post-install verify + next-steps.
  *(We used plain numbered `read` prompts; `gum` arrow-key menus are a possible future polish.)*
- **`deploy/setup.sh` → `install-condor.sh`:** kept verbatim (relative sibling dirs, `uv run … main.py`
  in `tmux -s condor`, `.env` defaults, `--upgrade`/`--api`). Only renamed; self-refs + README updated.

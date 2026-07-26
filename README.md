# The Rendemo Claude Code plugin

Rendemo's MCP server has ~65 tools. That is an API, not an interface: you would have to know which
tool to call, in what order, with what arguments. This plugin ships the **workflow** instead — you
state an intent and the agent sequences the tools, stops at the checkpoints that matter, and writes
the files the MCP cannot touch.

```
/rendemo                 pick between the two, if you're not sure which you want
/rendemo-demo            add our onboarding demo to the pricing page
/rendemo-tour            onboarding for new users
```

## Two things, and they are not variations of each other

- **A demo** is a recording of your product that a visitor **watches** in an iframe on your site.
  Nobody touches your real app. Installed with `<rendemo-demo demo="…">`, inline or as a modal.
- **A tour** is step-by-step guidance on your **own live product**, which the person **performs for
  real**. Cards anchor to `data-rendemo` markers in your source and advance when they do the thing.
  Installed with `<rendemo-demo demo="…" mode="tour">`.

Watching versus doing is the whole distinction. A demo goes on a marketing page for someone who has not
signed up; a tour goes inside the app for someone who has. `/rendemo` asks in one question if that is
not obvious from what you typed.

## Read this before using `/rendemo-tour`

**Tours render to a user.** A published tour runs in your product through
`<rendemo-demo demo="<tour>" mode="tour">`: it resolves each step's `data-rendemo` marker on your live
DOM, shows the same step card the published demo shows, waits for the viewer to do the real thing, and
remembers where they were across pages and reloads. See **Tours and the marker contract**,
**Tours (`mode="tour"`)** and **Previewing a tour** in `docs/mcp/EMBED.md` for the element, the payload
route and the exact behaviour.

What `/rendemo-tour` produces: `data-rendemo` markers in your source that a human reviewed, a preview
link you look at **before** anything goes live, a published tour, a committed `rendemo.tours.json`, an
offline check that fails your build when someone deletes an element a step points at, and one script
tag that makes it run.

**The optional attributes:**

```html
<rendemo-demo demo="acme/onboarding" mode="tour"
              user="u_123" routes="/app,/app/projects" when="always"></rendemo-demo>
```

`user` makes progress and the analytics per person instead of per browser (any opaque string you
choose — Rendemo never resolves it to anybody). `routes` limits which pages the tour may run on at all.
`when="always"` replays a tour the viewer already finished, which is what a "Take the tour" button
needs. All three are optional and absent means today's behaviour.

`mode="guide"` is still accepted as a silent alias of `mode="tour"`, because a page holding the old
spelling can be served from a CDN cache long after `embed.js` updates. Do not write it into new code.
**The rename** in `docs/mcp/EMBED.md` lists every old spelling that still works and why.

**What is still absent, and matters before you roll one out to real users:**

- **A targeting rule engine** — no "new users only", no per-plan or per-role condition, no feature
  flag, no percentage rollout. The primitive is yours and it is the honest answer: **conditionally
  render the element.** `routes` filters *pages*, not people.
- **Cross-device progress** — progress lives in `localStorage`. `user` scopes it per person within a
  browser; it is not a server-side profile, so switching device or clearing storage still starts over.
- **Any privacy posture beyond Do-Not-Track** — the tour reports its funnel (`demo_loaded`,
  `step_shown`, `step_completed`, `step_dwell`, `demo_completed`) to Rendemo's existing demo
  analytics, where it appears in that demo's own dashboard. It honours DNT and nothing else; there is
  no consent API in that path. The DOM events are unchanged and still yours to wire up.
- **Rule-evaluated branching** — a step can offer up to three author-declared choices that jump to
  another step (forwards or backwards), but a *viewer* picks; nothing evaluates a condition. A step
  whose target never appears still **gives up visibly** (a card saying so, with Skip and Close) and
  offers no branch buttons — branching is declared paths, not error recovery.
- **Reaching a tab that is already running one.** The kill switch is per demo
  (`rendemo_take_demo_offline`, or **Take offline** in the library's ⋯ menu) *and* per workspace
  (**Settings → Product tours**), neither deletes anything, and the payload's 30-second cache bounds
  how long it keeps being served. A tour already running in a visitor's tab finishes.

`/rendemo-demo` remains the one for the "watch it without doing it for real" case.

## Changing a tour you already have

`/rendemo-tour` covers the second visit too — it calls `rendemo_list_tours` first and branches itself,
because "onboarding for new users" is what you type whether or not that tour exists, and a separate
edit command would make you know which state you are in before you could name the command.

- **Reword** — `rendemo_update_step`. **Reorder** — `rendemo_reorder_steps` (touches no source: the
  markers say *where*, the order says *when*). **Add** — `rendemo_add_tour_step` appends, so a step in
  the middle is append-then-reorder.
- **Remove a step** — `rendemo_remove_tour_step` returns the exact `data-rendemo` attribute to strip.
  **That matters**: a marker left behind becomes an `orphan-marker` and `rendemo check` fails the
  build for whoever pushes next, which is the safety feature turning into a nuisance exactly when you
  are backing out. The two edits land as one reviewable diff.
- **Retire the whole tour** — `rendemo_remove_tour` takes it offline, hands back every marker to
  strip, and returns `rendemo.tours.json` with only that entry removed. `rendemo_take_demo_offline`
  is the *kill switch* by comparison: instant, touches no files, right when a live tour is pointing
  at UI that just moved. **Neither deletes anything** — the published plan is kept, so publishing
  again serves the identical tour.

Every edit needs a republish and a regenerated lockfile before anything a visitor sees changes.

## Install

`plugin/` is both the plugin root and its own marketplace, so it installs from a local path or from
the git repo.

From a local checkout:

```bash
claude plugin marketplace add /path/to/rendemo/plugin
claude plugin install rendemo@rendemo
```

Or in an interactive session, `/plugin` and pick it from the marketplace you added.

Restart Claude Code afterwards — MCP servers are wired up at startup.

## The token step

The Rendemo MCP endpoint authenticates with a **per-workspace** bearer token, so no token can ship
inside the plugin. There is one way to supply one — `npx rendemo login` — and an environment variable
for CI and overrides.

**You do not have to export anything.** The plugin's `.mcp.json` declares a Claude Code
[`headersHelper`](https://code.claude.com/docs/en/mcp): a command whose stdout supplies the request
headers. It runs `npx --yes rendemo token`, which reads the token `rendemo login` stored and prints
`{"Authorization":"Bearer …"}`. So logging in is the whole setup.

That matters because the header beside it, `Bearer ${RENDEMO_API_TOKEN}`, resolves **from the
environment of the shell that launched `claude`** — it has never been able to see the config file
`rendemo login` writes. Before the helper, a successful login left the MCP unable to authenticate until
you also exported the variable by hand, which is a setup step that reports success and leaves the thing
broken. Both are declared now, and Claude Code merges them with the helper winning, so the helper covers
a stored login and the plain header stays as a floor under it.

### `npx rendemo login` (recommended)

```bash
npx rendemo login
```

It prints a short code and a URL, you approve in a browser where you are already signed in, you pick a
workspace, and it stores the token in a per-user config file outside every checkout —
`%APPDATA%\rendemo\config.json` on Windows, `~/.config/rendemo/config.json` on macOS and Linux, 0600
where the OS has file modes. **The token is never printed and never logged.** `npx rendemo logout`
removes it.

It then offers to declare the MCP server for you:

- **`~/.claude.json`** (per-user, in no repo) gets the real token, and no helper — that entry needs
  nothing installed at all. It is only ever *edited*, never created, and backed up first.
- **`.mcp.json` in your repo** gets the same pair the plugin ships: the `headersHelper` plus the
  `Bearer ${RENDEMO_API_TOKEN}` placeholder. Never a credential, because a repo file can be committed.

An existing `rendemo` entry is never silently replaced; it reports what it found and `--force` is the
only way past that.

Then `npx rendemo doctor` confirms it in one block: sign-in, workspace, tours, MCP server, **MCP
headers**, version. That fifth line runs the helper command itself and checks that it produces a usable
`Authorization` header inside the 10 seconds Claude Code allows — so "signed in, and the MCP still 401s"
cannot be reported as ready. `/rendemo` runs the same check as its first act.

### CI, and overriding by hand

`RENDEMO_API_TOKEN` still works and is still the right answer for CI and for pointing one command at a
different workspace. Get the token from **Workspace settings** at https://www.rendemo.com — the same one
the browser extension uses — and set it in the shell you launch Claude Code from, **before** launching:

```bash
export RENDEMO_API_TOKEN="…"        # macOS / Linux
$env:RENDEMO_API_TOKEN = "…"        # PowerShell
```

Do not commit it. It takes precedence over a stored login in both paths — the plain header and the
helper, which resolves the variable first for exactly this reason — so it is also the usual cause of "I
logged in but it is using the wrong workspace". `npx rendemo doctor` says which source is in play.

Run `/mcp` to confirm a `rendemo` server is connected. If neither the helper nor the variable produced a
credential, the server is listed but every call fails to authenticate — that is what a 401 from these
tools means, and `npx rendemo doctor` names the reason.

### `rendemo token`, and why it is not a way to look at your token

`token` exists for the `headersHelper` and nothing else. It prints the literal credential to stdout, so
it is the one command here whose output is a secret — do not run it to check whether you are signed in.
`npx rendemo doctor` answers that without printing anything secret. With no token it exits 1 and prints
nothing at all, deliberately: Claude Code merges helper headers *over* the static ones, so emitting an
empty `Bearer` would wipe out the `RENDEMO_API_TOKEN` fallback and turn a working setup into an
unexplained 401.

Every tool is scoped to that token's workspace. No tool accepts a workspace id, so switching
workspaces means switching tokens.

Endpoint, for reference: `https://www.rendemo.com/api/mcp/mcp`, streamable HTTP, stateless.

## What ships

```
plugin/
├── .claude-plugin/
│   ├── plugin.json          name, description — deliberately NO version, see below
│   └── marketplace.json     so plugin/ can be added as a marketplace directly
├── .mcp.json                the Rendemo MCP server (HTTP + headersHelper + bearer fallback)
├── commands/
│   ├── rendemo.md           /rendemo         — router: demo or tour?
│   ├── rendemo-demo.md      /rendemo-demo
│   └── rendemo-tour.md      /rendemo-tour
├── skills/
│   ├── embed-a-demo/SKILL.md
│   └── author-a-tour/SKILL.md
└── README.md
```

### `/rendemo <what you want>`

The router. **Runs `npx rendemo doctor` first** and says one line about readiness — a missing token or
a tour whose markers have gone otherwise surfaces halfway through the work, after the repo has been
read and the steps proposed. Then it explains demo versus tour in one line each and hands off. If what
you typed already makes the intent obvious it says which one it picked and why, then goes — it does
not interrogate someone who was already clear.

### `/rendemo-demo <what to embed, and where>`

Installs a **published** demo on your site, end to end:

- lists your projects and picks the demo (asks when it is ambiguous),
- detects the framework from the repo — `next-app-router`, `next-pages`, `react`, `vue`, `svelte`,
  `html` — rather than asking you,
- calls `rendemo_get_embed` and writes the wrapper component, the `embed.js` script tag in the right
  place for that framework, and the snippet where the demo should appear,
- runs your typecheck and reports the caveats that actually apply to your repo (a strict `script-src`
  CSP must allow `https://www.rendemo.com`; password-protected demos cannot be embedded today).

The wrapper it writes may do exactly two things: forward props to attributes, and bridge the
element's five declared events (`rendemo:ready`, `rendemo:step`, `rendemo:complete`, `rendemo:lead`,
`rendemo:close`) to callbacks. Anything else belongs in `embed.js`, which Rendemo can fix for every
site at once — a wrapper lives in your repo, where it cannot.

It will not publish a demo without asking. Publishing makes it world-visible.

### `/rendemo-tour <the tour to build>`

Authors a tour — read what is still absent, above, first. It:

- states what a tour does and does not do yet (no targeting rule engine, no cross-device progress,
  DNT as the only privacy posture, viewer-chosen branching only) and waits for a go-ahead,
- reads your repo to find the sequence (delegating the scan to a subagent on a large codebase),
- proposes the steps as a table with a `file:line` for every target element, and **waits for
  approval** before creating anything,
- creates the tour, adds the steps, and writes the exact `data-rendemo` attributes the tools hand
  back onto the real elements — as a reviewable diff,
- **hands you a preview link and waits while you look at it** (below),
- **asks before publishing**, because publishing claims the tour's slug workspace-wide and ties your
  committed markers to a published plan,
- writes `rendemo.tours.json` (merging into an existing one, so other tours keep being checked),
- runs the check and reports its real exit code,
- offers the CI step that runs the check on every push, detecting what you already use and **never
  overwriting an existing workflow**,
- hands you the two lines that make it run:

```html
<script src="https://www.rendemo.com/embed.js" async></script>
<rendemo-demo demo="<workspace>/<tour-slug>" mode="tour"></rendemo-demo>
```

Markers must ship to production — they are what the tour anchors to at runtime. Do not strip them.

### Preview before you publish

`rendemo_get_tour_preview({ projectId, baseUrl })` returns a ready-to-open URL like
`http://localhost:3000/projects?rendemo_preview=<token>`. Open it in a browser pointed at your own
running app and the **draft** tour runs — every card carrying a persistent **"Preview — draft, not
live"** badge. Nothing is published, no analytics are recorded, and a tour that has never been
published previews fine.

`baseUrl` defaults to `http://localhost:3000`; the agent asks where your app runs rather than guessing.
The link is a **bearer token** — anyone holding it sees the draft, with no sign-in — and it **expires
30 minutes** after it is issued.

**The limit worth knowing before you open it:** the `data-rendemo` markers have to exist in the
**build being previewed**. On a dev server that is immediate — save the file. Previewing against
staging or production needs the marker commit **deployed there first**, or every step reports that it
cannot find its target. The `<rendemo-demo … mode="tour">` element has to be in that build too, since
that is what reads the token off the URL; leave it out of production until the tour is published, or
real visitors see a "could not be loaded" note.

Publishing is now the **last** step, not the way to see your work.

### Verifying

The CLI is a real, published package — `rendemo` on npm, `packages/cli` in the Rendemo repo, one
dependency-free JS file with a `rendemo` bin. On your own project, `npx rendemo check` just works, no
install needed. **0.2.0 or newer** is required — that is the version that reads the
`rendemo.tours.json` name; older ones only know the previous filename. `login`, `logout` and `doctor`
arrived in **0.3.0**, and `token` — the `headersHelper` the plugin's `.mcp.json` calls — in **0.4.0**.
On an npx cache still holding 0.3.0 the helper exits 2 with `Unknown command "token"`, Claude Code
discards it and falls back to the `RENDEMO_API_TOKEN` header, and `npx rendemo doctor` names it on the
**MCP headers** line.

### Why `plugin.json` has no `version`

Claude Code uses the plugin's version as the cache key for updates: *"Users get updates only when you
bump this field. Pushing new commits without bumping it has no effect, and `/plugin update` reports
'already at the latest version'."* Omitting it instead means users get updates on every new commit to
the plugin's git source. While this is iterating quickly that is the behaviour worth having, so the field
is left out on purpose — it is not an oversight, and adding it back means owning a bump on every change
users need to receive.

It works inside a checkout of the Rendemo repo too — that repo's root package is named `rendemo-app`
so it does not shadow the CLI. (It additionally offers `npm run tour:check`, which builds the CLI from
the working tree instead of downloading the published version.)

The one thing that breaks `npx rendemo check` is a project whose *own* `package.json` is named
`rendemo`: npx resolves the local package first and fails with `could not determine executable to run`.
Rename it, or install the CLI as a devDependency and run `./node_modules/.bin/rendemo check`.

## Human checkpoints, and why they are not optional

The two irreversible-ish actions are gated, in the skills and in the commands:

- **Publishing** makes a demo world-visible at a public URL, and for a tour it claims the slug
  workspace-wide — publish is refused rather than renamed if the slug is taken, precisely because
  renaming would orphan markers already committed to your repo. It is also now the *last* step in the
  tour path: preview is how you see your work, so publishing is a decision rather than a debug loop.
- **Writing markers** modifies your source. They land as a diff you read, and a step whose target
  could not be confidently located is reported as unplaced rather than anchored to a close-enough
  element.

## Relationship to the raw MCP

The plugin is the front door; the MCP stays the API for non-Claude agents. Connecting by hand instead:

```bash
claude mcp add --transport http rendemo https://www.rendemo.com/api/mcp/mcp \
  --header "Authorization: Bearer <your workspace API token>"
```

Full tool list: `docs/mcp/README.md`. Embed and marker contracts: `docs/mcp/EMBED.md`.

---
description: Start here — choose a recorded demo, sandbox demo, or codebase tour
argument-hint: <what you want — e.g. "show our product on the pricing page" or "walk new users through setup">
---

The user's intent: $ARGUMENTS

## First, before anything else: one readiness check

A missing token, a token for the wrong workspace, or a tour whose markers are no longer in source all
surface today as an error *partway through authoring*, after the repo has been read and the steps
proposed. All of it is knowable in one second. **Run this as your first act, before asking the user a
single question:**

```bash
npx --yes rendemo doctor
```

It prints a six-line block: sign-in, workspace, tours, MCP server, MCP headers, version. It touches
nothing and publishes nothing. The **MCP headers** line runs whichever `headersHelper` is actually
declared — the plugin's shipped `bin/mcp-token.mjs`, or the `npx --yes rendemo token` form a repo's own
`.mcp.json` carries — to prove the MCP server can reach the stored token. The plugin's takes about a
tenth of a second; the `npx` form can take several, and doctor warns when it takes enough of the
ten-second budget to be a coin flip rather than a cost.

**Do not announce that you are running it.** "I'll start with the readiness check" is a sentence about
your own procedure, and it arrives before the user has been told anything. Run it silently and let the
result be the first thing they read.

**Then fold readiness into ONE clause of the line you were going to say anyway** — never its own
sentence, never its own turn: *"Signed in to Acme — which of these did you mean?"* or *"You are not
signed in yet; `npx rendemo login` fixes that in about twenty seconds."* Do not paste the whole block
unless something failed, and when everything passes do not list what passed.

How to read it:

- **`✗ Sign-in`** — nothing is stored and `RENDEMO_API_TOKEN` is not set. Tell the user to run
  `npx rendemo login`: it prints a short code and a URL, they approve in a browser where they are
  already signed in, and the token is stored for them. **Do not run `login` for them without asking**
  — it waits on a human approving in a browser, and starting it unasked leaves a terminal blocked.
  Nothing else in this command works until this is fixed, so stop here and say so.
- **`✗ Workspace`** — the token was rejected, or the deployment answered an error. Say which; the fix
  is `npx rendemo login` again for the first and "try shortly" for the second.
- **`? Workspace`** — unreachable. That is a network problem, **not** a bad token. Do not tell them to
  re-authenticate.
- **`✗ Tours`** — this repo already has a tour whose steps no longer resolve. Worth naming up front:
  it usually means someone deleted or moved a marked element, and `/rendemo:tour` can repair it.
- **`✗ MCP headers`** — the token is stored and valid, but the command the MCP server uses to *read* it
  cannot run, and `RENDEMO_API_TOKEN` is not set either. So every tool call will 401 even though the
  sign-in looks fine. This is a blocker exactly like `✗ Sign-in`: stop and relay what the line says. It
  normally means `npx` is not on PATH, or the npx cache holds a `rendemo` older than 0.4.0.
- **`? MCP headers`** — the helper works but sends a *different* token than the one doctor checked, so
  the Workspace line above is about a credential the MCP will not use. Say so; do not trust the
  workspace name.
- **`· Tours`** (no lockfile), **`· MCP server`**, **`· MCP headers`** and **`· Version`** —
  informational. Never block on these; a repo with no tour yet is the normal starting state, and a
  `· MCP headers` means something else is already authenticating (usually `RENDEMO_API_TOKEN`).

If `npx` is unavailable or the command cannot run at all, say so in that same one line and continue —
a preflight that cannot run must not stop the work. Do not substitute a guess about readiness.

## The three authoring paths

Rendemo has three distinct authoring paths:

- **A recorded demo** — a recording of your product that a visitor **watches** in an iframe on your site. Nobody
  touches your real app; you record once and it replays.
- **A sandbox demo** — a hosted demo built from a crawled replica. It has normal demo steps, cards,
  emphasis, autoplay and a shareable URL. It writes nothing into customer source and has no lockfile.
- **A codebase tour** — step-by-step guidance on your **own live product**, which the person **performs for
  real**. Cards anchor to `data-rendemo` markers you put in your source and advance when they do the
  thing.

Watching versus doing is the whole distinction. A demo goes on a marketing page for someone who has not
signed up; a tour goes inside the app for someone who has.

## Route it

**If `$ARGUMENTS` already makes the intent obvious, do not run a quiz — and do not show your
reasoning.** Pick, and go. *"You said 'tour' and 'in the app', so this is a tour; handing off to the
tour skill"* is three clauses of thinking out loud, and the user learns which one you picked by
watching you do it. Name the choice in a few words only when it is genuinely close, or when picking
wrong would waste their time.

Signals for a **recorded demo**: "on our pricing page", "landing page", "watch", "video",
"already recorded", a named published recording.

Signals for a **sandbox demo**: a public URL with no repo, "crawl", "sandbox", "replica", "make a
demo of this site", or an existing sandbox demo. Load `sandbox-demos` and use
`rendemo_create_sandbox_demo` / `rendemo_add_sandbox_demo_step`.

Signals for a **codebase tour**: "in the app", "our users", "onboarding", "walk them through", "guide them",
"first-run", "empty state", "product tour", "they should click", a route inside the product.

Then:

- **Recorded or already-published sandbox demo** → run `/rendemo:demo` with their intent, or invoke the `rendemo:embed-a-demo` skill
  directly and follow it end to end.
- **New sandbox demo** → invoke the `rendemo:sandbox-demos` skill and follow it end to end.
- **Codebase tour** → run `/rendemo:tour` with their intent, or invoke the `rendemo:author-a-tour` skill
  directly and follow it end to end.

**If the intent is genuinely ambiguous, or `$ARGUMENTS` is empty, ask one question — not a
questionnaire:**

> Do you want a **recorded demo**, a **hosted sandbox demo built from a URL**, or guidance inside
> your **real product code** (a tour anchored to source markers)?

Two cases worth naming rather than guessing at:

- **"I want a demo of our onboarding for new users."** Ambiguous on purpose — "demo" is a generic word
  and "for new users" points inside the app. Ask.
- **"Both."** That is legitimate and common: a demo on the marketing page, a tour once they are in. Do
  them one at a time, tour last, because it writes into their source and needs their attention.

## Before you hand off

Two facts that change the answer and are cheap to check now rather than halfway through:

- A **demo must already be published** to be embedded. If it is not, the demo path stops and asks —
  publishing makes it world-visible and that is not yours to decide.
- A **tour writes attributes into their source files** and needs `data-rendemo` markers shipped to
  production. If they cannot modify the product's code, a tour is not available to them and a demo is
  the honest answer.

Do not start scanning the repo, listing projects, or calling MCP tools from this command. `npx rendemo
doctor` is the one exception, and only because it is offline-safe, read-only, and answers the question
that otherwise gets answered halfway through the work. Pick the path, say why, hand off. The skill you
hand to has its own approval gates and they exist for reasons that this command cannot restate in full.

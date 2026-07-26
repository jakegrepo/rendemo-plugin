---
name: embed-a-demo
description: This skill should be used when the user asks to "embed a demo", "add our demo to the pricing page", "install a Rendemo demo", "put the product demo on the site", mentions `<rendemo-demo>`, `embed.js`, or `rendemo_get_embed`, or wants an interactive Rendemo demo rendered inside their own app or marketing site. Sequences the whole install: pick the demo, detect the framework, write the wrapper, place the script tag.
version: 0.2.0
---

# Install a published Rendemo demo on a site

A **demo** is a recorded replay a visitor **watches** in an iframe. If what the user actually wants is
step-by-step guidance on their own live product, which they **perform for real**, that is a **tour** —
a different artifact and a different skill (`author-a-tour`). Check that before you install anything;
embedding a recording for someone who asked to guide their users is a visible mistake.

This works end to end today. `https://www.rendemo.com/embed.js` is live, the `<rendemo-demo>`
custom element ships `inline` and `modal` modes, and `rendemo_get_embed` returns install code per
framework. Nothing in this procedure is aspirational.

The MCP cannot touch a filesystem. Every tool here hands back **text you write**.

## 1. Find the demo

Call `rendemo_list_projects`. Each project reports `demo: { id, status }` or `null`.

- **Exactly one plausible match** by name and the user's stated intent → say which one you picked and
  keep going.
- **Ambiguous, or several published demos** → list name / step count / status and ask which. Do not
  guess: embedding the wrong demo on a pricing page is a visible mistake on a public page.
- `status` is not `published` → **stop and ask.** `rendemo_publish_demo` makes the demo
  world-visible at a public URL. That is not yours to decide. Offer it, wait for a yes.
- `demo: null` → the project has no demo yet. Publishing is the only path, so the same checkpoint
  applies.

## 2. Detect the framework — do not ask, look

`rendemo_get_embed` takes exactly these values, and passing the wrong one produces a snippet that
will not compile:

| value | evidence to look for |
|---|---|
| `next-app-router` | `next` in dependencies **and** an `app/` directory containing `layout.tsx`/`layout.jsx` |
| `next-pages` | `next` in dependencies **and** `pages/_app.tsx`/`_app.jsx`, no `app/` router |
| `react` | `react` in dependencies, no `next` |
| `vue` | `vue` in dependencies |
| `svelte` | `svelte` in dependencies |
| `html` | no package.json, or plain static HTML |

Read `package.json` and glob for the router directory. If a repo has both `app/` and `pages/`
(a mid-migration Next app), pick the router that owns the page the demo is going on, and say which
you picked and why.

`mode` is your call from the intent: `inline` for "put the demo on the page", `modal` for
"a Watch-the-demo button". Ask only if the intent genuinely does not say.

## 3. Get the code

`rendemo_get_embed({ projectId, framework, mode })`. It fails with a clear message if the project has
no demo or the demo is not published — that means you skipped step 1, go back.

It returns `scriptTag`, `scriptLocation`, `snippet`, `wrapper`, `url`, `posterUrl`, and `events`.
**Use the returned strings verbatim.** Do not retype them from memory or from this file; the tool is
the single source of the contract and this skill is not.

## 4. Write the files

Three writes, in this order:

1. **The wrapper.** Write `wrapper` to the path in its first-line comment (e.g.
   `components/RendemoDemo.tsx`, `components/RendemoDemo.vue`, `src/lib/RendemoDemo.svelte`).
   `wrapper` is empty for `html` — there is nothing to wrap; skip this step.
   - If the file already exists, **read it first and diff.** A repo that already has a
     `RendemoDemo` wrapper is already installed; you are probably adding a second placement, not
     a second wrapper. Overwriting a hand-adjusted wrapper is a silent regression.
2. **The script tag.** Put `scriptTag` at `scriptLocation`. It must load once per document, not once
   per demo — if the tag is already there, do not add a second one.
   - `scriptLocation` is a starting point, not a law: if the repo already loads third-party scripts
     through a local convention (Next's `next/script`, a `<Scripts>` component, a CMS head block),
     follow that convention and put the same URL there instead. Say what you did.
3. **The snippet.** Put `snippet` where the demo should appear. In modal mode every framework snippet
   except `html` references an `open` state variable — declare it and wire it to whatever button the
   user meant, in that page's own idiom. For `html` the snippet is the bare element; the host
   controls the modal by adding and removing the `open` attribute itself.

## 5. The wrapper rule — this is a hard constraint

A wrapper may do **exactly two things**: forward props to attributes, and bridge the element's
declared events to callbacks. The five events are the whole surface: `rendemo:ready`,
`rendemo:step`, `rendemo:complete`, `rendemo:lead`, `rendemo:close`.

Nothing else. No loading states, no retry logic, no analytics, no visibility heuristics, no
attribute munging.

The reason is not style. The wrapper lives in the customer's repo, where Rendemo cannot patch it.
Anything that belongs in `embed.js` can be fixed for every site at once; the same logic in a wrapper
is frozen until that customer redeploys. If a user asks for behaviour that does not fit those two
things, say that it belongs in `embed.js` and does not go in the wrapper.

## 6. Verify, then report the caveats that apply

- **Typecheck.** In a TypeScript repo, `<rendemo-demo>` is not a known JSX element and the generated
  React wrapper does **not** declare it. Run the repo's typecheck. If it errors on the unknown
  element, add a JSX intrinsic-element declaration for `rendemo-demo` in the wrapper file
  (`declare module "react" { namespace JSX { interface IntrinsicElements { "rendemo-demo": … } } }`)
  — Rendemo's own `components/RendemoDemo.tsx` does exactly this and is the reference.
- **CSP.** If the host page sets a strict `script-src`, it must allow `https://www.rendemo.com` or
  the element never upgrades and its fallback link renders instead of the demo. Grep for a CSP in
  middleware / headers config and say plainly whether you found one.
- **Password-protected demos cannot be embedded today.** The access cookie is dropped inside a
  third-party iframe, so the visitor loops back to the password form forever. Link to `/d/<id>` or
  `/site/<workspace>/<slug>` in a new tab instead. If the demo is protected, say this before writing
  anything.
- **`mode="tour"` is not this skill's job.** It is a real, working mode — but it renders a *tour*,
  anchored to `data-rendemo` markers in the host's own source, with no iframe and no footage. It has
  its own procedure (`author-a-tour`) with approval gates, because it writes into the customer's
  source. Never set `mode="tour"` on an embed you install here: pointed at a replay demo it 404s and
  the element shows a "could not be loaded" note.

## What not to do

- Do not hand-write the snippet, the script tag, or the wrapper. Every one of them comes from
  `rendemo_get_embed`, and a hand-written copy drifts the moment the contract changes.
- Do not pin a version of `embed.js`. There is one URL, no versioning, by design.
- Do not publish a demo to make this procedure work. Ask.

---
name: author-a-tour
description: This skill should be used when the user asks to "add a product tour", "build a guided tour of our app", "onboard new users in the app", "create a tour", or to CHANGE an existing one — "add a step to the onboarding tour", "reword step 3", "reorder the tour", "drop the billing step", "take the tour down" — or mentions `data-rendemo`, `rendemo.tours.json`, `rendemo_create_tour`, `rendemo_add_tour_step`, `rendemo_list_tours`, `rendemo_remove_tour_step`, `rendemo_get_tour_preview`, or wants step-by-step guidance on their own real product rather than a recorded demo. Covers both visits: authoring a tour (find the sequence, get approval, write markers, preview, publish, commit the lockfile, verify) and editing one (add, reword, reorder, remove a step and its marker together, retire the whole tour cleanly).
version: 0.5.0
---

# Author a Rendemo product tour

A **tour** is step-by-step guidance on the user's own product, which they perform for real. The other
artifact Rendemo makes is a **demo** — a recorded replay a visitor watches in an iframe — and that is a
different skill (`embed-a-demo`). Watching versus doing is the whole distinction.

**This skill covers two visits.** Building a tour that does not exist yet is everything from "Say this
first" onward. Changing one that does — add a step, reword one, reorder them, drop one, retire the
whole thing — is section 0 and "Editing an existing tour", and it skips the preamble entirely.
`rendemo_list_tours` is what tells you which visit this is, and it is the first call either way.

## Say this first, before touching a single file

*(Authoring only. On a second visit, jump to section 0 — someone who already shipped a tour does not
need the whole absent-features list read back to them.)*

**A published tour renders to a user.** It runs in the product through one element:

```html
<script src="https://www.rendemo.com/embed.js" async></script>
<rendemo-demo demo="<workspace>/<tour-slug>" mode="tour"></rendemo-demo>
```

That resolves each step's `data-rendemo` marker on the live DOM, draws the same step card the published
demo draws, advances when the viewer does the real thing (`data-rendemo-do`), waits for a target that
has not appeared yet, skips steps whose `route` is not the current page, and resumes on the right step
across navigations and reloads.

**What it does, and what is STILL absent. Say both halves — a developer rolling this out to real users
needs the real shape, not the optimistic one:**

1. **Targeting: a primitive plus two declarative cases, and no rule engine.**
   The primitive is yours and it is the honest primary answer: **a developer conditionally rendering
   the element is targeting.** If only trial admins should see it, render it only for them — Rendemo
   cannot know your roles and should not try. On top of that, two attributes:
   `routes="/app,/app/projects"` limits which pages a tour may run on at all (re-evaluated on every
   navigation, so it starts when the visitor arrives on one) and `when="always"` replays a tour the
   viewer already finished, for a "Take the tour" button. **Still absent:** any rule engine — no "new
   users only", no per-plan, per-role or feature-flag condition, no percentage rollout. Do not describe
   `routes` as segmentation; it is a page filter.
2. **User identity: opt-in, and it does not sync.**
   `<rendemo-demo demo="acme/onboarding" mode="tour" user="u_123">` keys progress by that id and sends
   it with the analytics events, so two people sharing a browser no longer share one position and
   completion is a fact about a person. The id is **whatever opaque string you choose** — Rendemo never
   resolves it to anybody and collects nothing else about them. Absent, everything behaves as it always
   did, which is what an anonymous marketing page needs. **Still absent:** progress is still stored in
   `localStorage`, so `user` makes it per person *within a browser* — it is not a server-side profile,
   and **switching device or clearing storage still restarts the tour.**
3. **Analytics: it reports to the same place a published demo does.**
   The tour beacons `demo_loaded`, `step_shown`, `step_completed`, `step_dwell` and `demo_completed` to
   Rendemo's existing demo-analytics ingest, over `sendBeacon`, so a step completion is not lost to the
   navigation the step itself caused. Completion rate, per-step drop-off, dwell and abandons all appear
   in that demo's own analytics — no new dashboard to find. A dismissal is recorded as the step's dwell
   reason, and a give-up as `unresolved` with **no** completion. The DOM events (`rendemo:ready` /
   `:step` / `:complete` / `:close`) are unchanged and still the host's hook. **Still absent:** the only
   privacy posture observed is **Do-Not-Track** (which is all the replay player observes either — there
   is no consent API and no cookie banner in this path), and nothing is sent at all when the payload
   has no project to attribute it to. Say this plainly to anyone with a consent regime to satisfy.
4. **Branching: the plan's own choices, honoured.**
   A step can offer up to three author-declared paths (`choices`, set with `rendemo_update_step`), each
   jumping to another step id — forwards, or backwards for a "show me that again". Afterwards the tour
   continues linearly from wherever the branch landed, and progress resumes on the chosen path.
   **Still absent:** branches are **viewer-chosen, never rule-evaluated** — there is no "if they are on
   the Pro plan, go to step 5". And a step whose target never appears still gives up **visibly** after a
   bounded wait (a card saying so, with "Skip this step" and Close) and shows **no** branch buttons:
   branching is author-declared paths, not error recovery.
5. **The kill switch: per demo, per workspace, and 30 seconds.**
   `rendemo_take_demo_offline` (or **Take offline** in the library's ⋯ menu) stops one tour being
   served; **Settings → Product tours** turns off every tour in the workspace at once, which is what
   you reach for when a release has moved the UI out from under every tour's markers. Neither deletes
   anything — turning it back on serves the identical artifact. The payload is cached `s-maxage=30`, so
   propagation is bounded at **30 seconds** rather than the five minutes (plus an hour-long stale
   window) it used to be. **Still absent:** it is a "stop serving it" switch, not a "reach into open
   tabs" one — a visitor whose tour is already running finishes it. Removing the element still works
   too.

Also still true, and worth stating: a tour is **not visible in the studio** (the studio needs a
capture; a tour has none), and no replay artifact is built for it — no HTML, no poster, no export, no
localization. The way you see a tour before it is live is the **preview link** in step 6, not the
studio.

**Tell the user all of this in your first reply and get an explicit go-ahead.** Do not begin the repo
scan on the assumption they will accept it. This procedure writes attributes into their source.

If they want something a visitor **watches** rather than performs for real — a marketing page, a sales
follow-up — that is a published replay demo installed with `<rendemo-demo>`, a different skill
(`embed-a-demo`).

## 0. Is this a first visit or a second one?

**Call `rendemo_list_tours` first, always.** It returns every tour in the workspace with its
`projectId`, slug, step count and whether it is live — replay demos excluded, because they are a
different artifact and a marker step cannot be added to a recording.

If the intent is about a tour that already exists, **skip everything below and go to "Editing an
existing tour"**. The preamble above is for someone deciding whether to build one; repeating it at
someone who already shipped one is noise. Name only the constraints their specific change touches.

If nothing matches, this is a first visit: continue from step 1.

## Editing an existing tour

Four changes, and one of them has a trap.

**Reword a step** — `rendemo_update_step({ projectId, stepId, title?, blurb?, … })`. `rendemo_get_plan`
gives you the step ids. The tour renders `title`, `blurb`, `eyebrow`, `advanceLabel`,
`successMessage`, `recoveryHint`, `emphasis`, `emphasisColor` and `choices` and nothing else; the tool
names anything it dropped.

**Add a step** — `rendemo_add_tour_step` appends, so a step that belongs in the middle is *append then
reorder*. It returns the exact attribute to write; write it into source as a reviewable diff, the same
as the first time.

**Reorder** — `rendemo_reorder_steps({ projectId, order })`. Pass the **complete** ordered list of step
ids; a partial list drops the missing ones from the story order. Reordering touches no source at all —
the markers say *where*, the order says *when*.

**Remove a step — the one with the trap.** `rendemo_remove_tour_step({ projectId, stepId })` deletes it
from the plan and returns `markerToStrip` / `attributeToStrip`. **The marker does not remove itself.**
Left in source it becomes an `orphan-marker` and `rendemo check` fails the build for whoever pushes
next — the safety feature turning into a nuisance exactly when someone is backing out of something.
So:

1. Call the tool.
2. In the **same diff**, delete `data-rendemo="<tour>/<step>"` from the element, along with any
   `data-rendemo-do` or `data-rendemo-wait` on it. If the element only existed to be marked — a
   wrapper someone added for the tour — say so and let the user decide whether the element goes too.
3. Show the user that one diff: the step gone, the attribute gone.

The tool refuses two cases rather than producing a broken tour, and both need a decision from you, not
a retry:

- **Another step's branch choice points at this one.** A dangling `goToStepId` is dropped silently by
  the payload builder, so the button would just vanish for the viewer. Edit those choices with
  `rendemo_update_step` first — the message names which steps.
- **It is the last step.** A tour with no steps cannot be previewed or published. Retiring the whole
  tour is a different, deliberate act — `rendemo_remove_tour`, see "Retiring a tour" below.

**After ANY of the four, in this order and without skipping:**

1. **Preview** — `rendemo_get_tour_preview`. Same 30-minute bearer link, same rule that the markers
   must exist in the build you point it at. A removal is the case where this matters most: it is the
   only way to see that the tour still reads as a sequence with the step gone.
2. **Publish again** — `rendemo_publish_demo`, after asking. **Until you do, the live tour is the old
   one.** Editing the plan changes nothing a visitor sees.
3. **Regenerate the lockfile** — `rendemo_get_tour_lockfile({ projectId, lockfile })`, passing the
   current `rendemo.tours.json` so other tours survive. Until you do, the committed lockfile still
   describes the steps you changed, and `check` verifies the old shape.
4. **Run the check** — `npx rendemo check` — and report its real exit code.

Skipping 3 after a removal is the specific way to leave CI failing on a marker that is already gone.

## 1. Find the sequence in the code

Read the repo, do not interview the user. You are looking for the ordered sequence of real elements a
new user touches: the entry route, the primary action on it, the route it navigates to, and so on.

Useful evidence, roughly in order of confidence: route files and their paths, `data-testid`
attributes, form submit handlers, primary/CTA button components, existing onboarding or empty-state
copy, and `href`s between the pages.

**In a large repo, delegate the scan to a subagent** and ask it to return only the candidate step list
with `file:line` for each target element. A full-repo read floods the main context and you need that
context for the approval conversation.

## 2. Propose the steps and get approval — mandatory

Present a table before creating anything:

| # | step slug | route | target element (`file:line`) | `do` | what the card says |
|---|---|---|---|---|---|

Rules for the proposal:

- Step slugs and the tour slug are lowercase letters, digits and hyphens, no leading or trailing
  hyphen. An invalid slug is rejected by the tools, not silently fixed.
- `do` is `click`, `type`, or `hover`, and only when that action is what completes the step. Omit it
  and the step waits for an explicit Next. A tour where every step is Continue is a slideshow; aim for
  at least half of them being something the user really does.
- Every target must be an element **that exists in source now**, with the line you found it at. If
  you could not confidently locate a target, say so and leave it out — a marker on a
  nearly-right element points at the wrong thing forever, and an unplaced step is the safer failure.
- **Ask two questions of every target before you propose it**, because both have runtime-only answers
  that `check` cannot give you:
  1. *How many of these are in the DOM at once?* One line of source inside a `.map()` is N elements at
     runtime, and the tour treats an ambiguous marker as a **missing** target. That step needs `match`
     (`"first"`, `"last"`, or a 1-based integer). Two mutually exclusive JSX branches carrying the same
     marker are the mirror image: two occurrences in source, one at runtime, and `check` *will* fail
     them with `duplicate-marker` until you add `match: "first"`.
  2. *Is it visible when the step is reached?* Resolution **prefers a visible match**: among several
     elements carrying the marker it picks the one on screen, and if the only match is invisible it
     treats the step as not-yet-present and keeps waiting, then gives up visibly on timeout. So a tab
     panel toggled with a `hidden` class rather than unmounted no longer anchors the card to a zero
     rect in the corner of the viewport — but it does mean the step shows nothing until the visitor
     opens that tab. Still give it a `recoveryHint` naming how to get there. A `wait` is now optional
     rather than the fix, and is worth adding only when the real precondition is something visibility
     cannot express (a fetch settling, a form becoming valid). Note the visibility test reads whether
     the element renders a box at all, not how big it is, so a legitimately 0x0 icon button resolves.
- **Prefer a target you cannot mark cleanly over restructuring their UI.** If the natural anchor is
  produced by a shared component that does not forward props, either mark a different element or add a
  narrow attribute-only pass-through to that component (Rendemo's own studio needed one for its
  toolbar popovers: a single `marker` prop spread onto the trigger button, not a `...rest`). Never wrap
  the element in a new `<div>` to hang the attribute on — that injects a layout box into their CSS,
  which is the whole reason `demo()` is an attribute spread and not a component.

Then stop and wait. **Writing markers modifies the customer's source**, and the tour slug you agree on
is baked into every one of those attributes — renaming it later orphans all of them.

## 3. Create the tour and its steps

- `rendemo_create_tour({ name, tourSlug })` → `projectId`. Every marker for this tour starts
  `<tourSlug>/`.
- `rendemo_add_tour_step({ projectId, step, route, do?, wait?, match?, title?, blurb? })` once per
  step, in order. Each call returns the **exact attribute string** to place. Use what it returns; do
  not compose the attribute yourself.
- `match` is flat on the wire: `"first"`, `"last"`, or a positive integer meaning the 1-based nth
  element. Pass it for every target you answered "more than one" to in step 2 — it is the only way to
  express that, and it cannot be added later by editing `rendemo.tours.json`.
- Two steps cannot share a marker; the tool refuses the duplicate.

## 4. Write the markers into source

Put the returned attribute on the element the step points at:

```jsx
<button data-rendemo="onboarding/new-project" data-rendemo-do="click">New project</button>
```

- `data-rendemo-do` is optional (what completes the step). `data-rendemo-wait="<selector>"` is
  optional (a selector that must exist before the step is reachable).
- **Markers must ship to production.** They are what the tour anchors to at runtime, on every
  visitor's page. Do not strip them in a production build, and do not put them behind a dev-only flag.
- Rendemo's own repo has a zero-runtime helper, `demo(id, opts?)` in `lib/flow/marker.ts`, that
  spreads the same attributes: `<button {...demo("onboarding/new-project", { do: "click" })}>`. It
  exists **only in a Rendemo checkout or a repo that vendored that module.** In any other repo, write
  the plain attributes — do not import a module that is not there.
- Present the marker edits as a reviewable diff and let the user read it before you continue.

## 5. Author the copy

Tour steps use the ordinary step tools: `rendemo_update_step` for title/blurb/emphasis,
`rendemo_set_card_look` for the demo-wide direction, `rendemo_style_steps` for the per-step pass.
`rendemo_get_plan` shows the step ids to address.

**Those tools accept the whole player vocabulary; a tour renders a subset of it.** Per step the tour
draws `title`, `blurb`, `eyebrow`, `advanceLabel`, `successMessage`, `recoveryHint`, `emphasis`,
`emphasisColor` and `choices` — nothing else. `variant`, `size`, `placement`, `anim`, `choreography`,
`stepType`, `rect`, `variants`, `narration`, and the presenter name / avatar / section label / progress
style all **save and never render**. The tools now name what they dropped when the project is a tour;
do not spend the user's time authoring fields behind that line, and do not report them as applied.

`choices` is worth authoring on a tour: each is a button on the card that jumps to another step id, so
"are you setting this up for yourself or for a team?" is a real fork rather than a paragraph asking the
viewer to skip ahead themselves. Keep it to genuinely different paths — the tool refuses a choice
pointing at a step that does not exist, and the payload silently drops one pointing at a step the tour
is not serving.

What *does* change a tour's look: `rendemo_set_card_look` (the whole card system),
`rendemo_set_card_craft`, the plan's brand theme, and per-step `emphasis`.

Copy is Rendemo's, not the repo's: source declares *where and in what order*, Rendemo owns *what it
says*. Do not write card text into the source files.

Write copy that teaches. A title that names the control ("Click a clip to open its step") and a blurb
that says why it matters beats a label. `successMessage` is what the viewer sees when they get it
right; `recoveryHint` is the only thing they get when the step gives up, so it must name where the
control actually is.

## 6. Preview the draft — before you offer to publish

**This step comes before publishing, and that ordering is the point.** Publishing used to be the only
way to see a tour, which meant making it live to find out whether it was right. Preview is also the
only thing that can catch bad copy: the lockfile carries no card text, so no offline check can tell you
that a tour's cards say nothing useful.

```
rendemo_get_tour_preview({ projectId, baseUrl })
```

It returns a URL like `http://localhost:3000/projects?rendemo_preview=<token>` — the route the tour's
**first** step expects, on the host you named, with a signed token in the query string. Opening it runs
the **current draft**: nothing is published, no analytics are recorded, progress is kept out of a real
visitor's storage, and every card carries a persistent **"Preview — draft, not live"** badge so a draft
is never mistaken for the live thing.

- **Ask where their app runs.** `baseUrl` defaults to `http://localhost:3000`; a link pointed at the
  wrong host looks exactly like a broken tour. A dev server, a staging deploy and production are all
  valid targets.
- **The link is a bearer token and expires 30 minutes after it is issued.** Anyone holding it sees the
  draft, with no sign-in. Say that when you hand it over, and re-issue rather than trying to extend one.
- **A tour that has never been published previews fine.** That is the case preview matters most for —
  you cannot inspect the first version of a tour by publishing it.
- The tool refuses if no step has a route yet: there would be no page to open. Add the steps first.
- The one gate a preview token does **not** lift is the workspace kill switch. If **Settings → Product
  tours** is off, the preview 404s — an operator who turned tours off was not saying "except drafts".

**THE HONEST LIMIT — say it before you hand the link over.** A preview sends the draft **plan** to a
browser. It cannot send the draft **markup**, which lives in the user's application and not in
Rendemo. So the `data-rendemo` markers have to already exist in whatever build is answering at
`baseUrl`:

- **Dev server:** immediate. Save the file, reload, the step anchors.
- **Staging or production:** the commit that adds the markers has to be **deployed there first**.
  Preview against a build that predates the markers and every step correctly reports a target it
  cannot find — a real failure with a cause that has nothing to do with the tour.

The usual order therefore is: write the markers, preview against the dev server, deploy the markers
with their normal release, then publish.

The same applies to the element itself. `embed.js` reads the preview token off the page URL and acts on
it only where a `<rendemo-demo … mode="tour">` element is actually mounted, so the two lines from
step 10 must be in the build being previewed too. Putting them in the dev build is free; **do not ship
that element to production before the tour is published** — an element pointing at an unpublished tour
renders a visible "This product tour could not be loaded." note to every real visitor of those routes.

Hand over the link, say what to look for (the copy, where each card anchors, whether the `do` steps
advance when they really click), and **wait**. Fix what they report — `rendemo_update_step` and the card
tools take effect on the next load of the same link, because the preview serves the draft itself rather
than a copy of it, and it is never CDN-cached. Only when they say the tour is right do you move on.

## 7. Publish — mandatory checkpoint

Ask before calling `rendemo_publish_demo({ projectId })`. Publishing claims the tour's slug
**workspace-wide** and writes the published plan and its hash. It is the point after which the markers
in the repo and the published tour are contractually tied together — and it is the **last** authoring
step, not the way to see your work.

The publish is validated, and a refusal says what to do. Two of them still need a decision from you
rather than a retry:

- **A validation refusal (422)** lists **each bad step and why** — a missing or malformed target, a
  marker naming a different tour, two steps sharing one. Fix exactly the steps it names, then publish
  again.
- `slug_taken` — another artifact in this workspace already holds that slug. Publish is **refused
  rather than renamed**, because renaming would orphan every marker already committed. Pick a
  different `tourSlug` — which means going back to step 2, since every marker in source changes too.
- `approval_required` — this workspace gates publishes behind review.
- **A locale-pinned tour publish is refused (400).** Never pass a `locale` when publishing a tour.

A successful tour publish reports the demo id, slug, step count and plan hash — and **no URL**, because
there is nothing to open. Carry the plan hash to step 8; there is no link to give the user.

## 8. Write `rendemo.tours.json`

- **Read the repo root's existing lockfile first** — `rendemo.tours.json`, or the older
  `rendemo.flow.json` if that is what the repo still has. If one exists, pass its full text as
  `lockfile` to `rendemo_get_tour_lockfile({ projectId, lockfile })`. **One file describes every tour
  in the repo** — writing a single-tour file silently stops checking the others' markers. The tool
  refuses an unparseable input rather than replacing it, and reports which other tours it preserved.
- Write the returned `contents` to `rendemo.tours.json` at the repo root and commit it. A repo still on
  the old filename should be moved to the new one; `rendemo check` reads either, preferring the new.
- **Never hand-edit this file.** It describes the *published* tour, which is what lets the check run
  offline with no token.

## 9. Verify

The check scans source for markers and confirms every lockfile step resolves to exactly one — offline,
no auth, source-only. Exit `0` pass, `1` step failures, `2` bad or missing lockfile.

Run `npx rendemo check` in the repo you're working in. That is the normal, correct way to run it — the
package is published on npm as `rendemo`, currently `0.2.0`, and this needs no install. **`0.2.0` or
newer is required**, because that is the version that reads the `rendemo.tours.json` name.

**General rule: if the repo you are in has its own package named `rendemo`, `npx` will resolve that
local package instead of the published CLI, and the check will fail oddly** — something like `could
not determine executable to run`, or the shell reporting `rendemo` as an unrecognized command — even
though nothing about the tour or the lockfile is wrong. You cannot know in advance which repo you are
in, so if `npx rendemo check` fails in a way that doesn't look like a real step failure, read the repo
root's `package.json` `name` field. If it is `rendemo`, either install the CLI as a devDependency and
run `./node_modules/.bin/rendemo check`, or use whatever script that repo defines for the check (the
Rendemo repo itself, whose package is named `rendemo-app` and does *not* collide, offers
`npm run tour:check`). If the name isn't `rendemo`, don't assume this is the cause — report the actual
error instead.

`--help` and `--version` both exit 0.

If you cannot run it, say so plainly rather than reporting the tour as verified.

Failures name what to do:

- `missing-marker` — a lockfile step has no marker in source. The output names the exact attribute to
  write.
- `duplicate-marker` — the marker appears more than once **in source** and the step has no `match`.
  Either de-duplicate, or the step needs `match` — which means going back to `rendemo_add_tour_step`
  and republishing, then regenerating the lockfile. Never edit the lockfile to add it.
  The inverse has no failure to name it: a marker inside a `.map()` is one occurrence in source, so
  check passes and the tour then finds several elements and gives up. Only step 2's first question
  catches that.
- `orphan-marker` — a marker in source that no step references. Delete it or add the step.
- **An unknown-tour warning on a *passing* run** — source has markers for a tour this lockfile does not
  describe, so nothing about that tour is being checked. Regenerate the lockfile, passing the current
  one, unless another team owns those markers. (The CLI still prints this one warning under its
  pre-rename code name and wording. It is the same check, not a different one.)

The check **prints** each tour's `planHash` and cannot verify it — it is offline, so it has no way to
ask whether that is still the published plan. Treat the printed hash as something a human can diff.
There is no staleness detection here; do not tell the user the check proves the tour is current.

## 9b. Offer the CI step — do not just tell them it exists

The check is only a safety net once it runs on every push. You have already written files into this
repo; wiring up the one line that runs the check is the same kind of act and the same kind of diff.

**Detect what they use before offering anything.** Look for, in this order:

| Found | Where the step goes |
| --- | --- |
| `.github/workflows/*.yml` | a `- run: npx rendemo check` step in the existing job, after `checkout` |
| `.gitlab-ci.yml` | a `script:` line in an existing job |
| `.circleci/config.yml` | a `- run: npx rendemo check` step |
| `Jenkinsfile`, `azure-pipelines.yml`, `.drone.yml`, `bitbucket-pipelines.yml` | say you recognised it and offer the equivalent one-liner |
| nothing | offer a minimal GitHub Actions workflow, and say plainly that you are adding CI to a repo that has none |

**Never overwrite an existing workflow.** Show the exact diff — one added line in almost every case —
and get a yes. If a step running `npx rendemo check` is already there, say so and add nothing.

The step itself, for GitHub Actions:

```yaml
      - run: npx rendemo check
```

It needs `actions/checkout` before it and nothing else: no token, no network, no `npm ci`, no Node
version pin beyond what the job already has. It exits 1 with a `file:line` when a marked element is
deleted, which is the entire reason the lockfile exists. Put it **early** in the job — it takes about
a second, and failing there beats failing after a full build.

Two things to say when you offer it, because both change the answer:

- **`npx` fetches the CLI on each run** unless they install it. If their CI is offline or pins
  dependencies, offer `npm install -D rendemo` and `npx rendemo check` instead, and mention that
  **0.2.0 or newer** is required for the `rendemo.tours.json` name.
- **A repo whose own `package.json` is named `rendemo`** shadows the CLI; there the step must be
  `./node_modules/.bin/rendemo check` with the devDependency installed.

If they decline, do not argue. Say what they are choosing: a deleted element silently breaks the tour
for every user, and nothing will tell them.

## Retiring a tour

Taking a tour offline is only half of retiring it. `rendemo_take_demo_offline` is the **kill switch** —
instant, ungated, "stop serving this now", touches no files, and is the right tool when a live tour is
pointing at UI that just moved. But its markers stay in source, so `rendemo check` then fails the build
with an `orphan-marker` for every one of them: the safety feature turning into a nuisance exactly when
someone is backing out.

`rendemo_remove_tour({ projectId, lockfile })` is the retirement, and it does all three halves in one
reviewable change:

1. takes the tour offline (it stops being served within 30 seconds),
2. returns **every** `data-rendemo` marker to strip from source,
3. returns `rendemo.tours.json` with this tour's entry removed and **every other tour preserved** —
   pass the current file's contents as `lockfile`, or it returns only the markers and you edit the
   file yourself. It refuses an unparseable lockfile rather than replacing it.

Then remove the `<rendemo-demo … mode="tour">` element if it was placed for this tour alone, and run
`npx rendemo check`: with the markers gone and the entry gone it passes, and with either half missing
it does not. That asymmetry is the point of doing both in one commit.

**Nothing is deleted.** The plan and the published plan are kept, so publishing again later serves the
identical tour. Say that — "retire" sounds permanent and it is not.

## 10. Install the element

A published, verified tour still shows nobody anything until the element is on the page. If you placed
it in a dev build for the preview in step 6, this is the point at which it is safe to ship it — the
tour is published now, so a real visitor gets the tour rather than the "could not be loaded" note.

Hand the user the two lines and say where they go — the layout or route that the tour's **entry route**
belongs to, so the element is present when the tour starts and stays mounted across the pages the steps
span:

```html
<script src="https://www.rendemo.com/embed.js" async></script>
<rendemo-demo demo="<workspace>/<tour-slug>" mode="tour"></rendemo-demo>
```

`mode="tour"` renders no box and reserves no space — the card is drawn in its own fixed layer. The
element fetches a second script (`/embed-tour.js`) and the tour's payload from
`/site/<workspace>/<tour-slug>/tour`, both public and cacheable. If the tour cannot be resolved the
element says so, in the page and in the console — it never silently renders nothing.

`mode="guide"` is still accepted as a silent alias of `mode="tour"`, because a customer's HTML can be
served from a CDN cache long after `embed.js` updates. Never write it into new code.

The optional attributes, all three of them:

```html
<rendemo-demo demo="<workspace>/<tour-slug>" mode="tour"
              user="u_123"                    <!-- opt-in identity; any opaque string you choose -->
              routes="/app,/app/projects"     <!-- pages this may run on at all -->
              when="always"                   <!-- replay a finished tour; default is once -->
></rendemo-demo>
```

Facts a host integrating this will hit immediately, so say them:

- **Mounting is starting.** There is no `open` attribute and no start button; the tour begins in
  `connectedCallback` and tears down on unmount. A host that gates the tour behind a button expresses
  that by rendering the element or not — and that conditional render **is** the targeting primitive.
- **A finished or dismissed tour renders nothing, forever — unless you say `when="always"`.** The
  default is right for onboarding and wrong for a "Take the tour" button; `when="always"` is that
  button, and it restarts a finished or dismissed tour from the top while still resuming a run that is
  genuinely in progress. Reaching into `localStorage` to delete the progress key before mount still
  works and is what `components/StudioTour.tsx` predates this attribute by doing, but it is no longer
  necessary. (That key keeps its pre-rename spelling on purpose — renaming it would restart every tour
  already in progress in every visitor's browser.)
- **`routes` is evaluated per navigation, `user` and `when` at mount.** A `user` swap remounts the
  tour (somebody signing in), so it reads that person's progress rather than the last one's.

Do not add it for them without asking: it is a change to a shared layout that affects every visitor of
those routes, and `routes` narrows *where* it runs, not *who* it runs for.

## Report honestly at the end

State: the tour slug, the steps and their markers, that the user saw the preview and approved it, that
it is published, that the lockfile is committed, whether the check actually ran and its exit code, and
whether the element is installed or still needs to be.

Then repeat what is still absent — accurately, which means neither the old list nor a victory lap:
**no rule engine for targeting** (conditional rendering plus `routes` is what there is), **no
cross-device progress** (`user` scopes `localStorage`, it does not sync), **Do-Not-Track is the only
privacy posture the analytics observe**, **branches are viewer-chosen, never rule-evaluated**, and the
kill switch is **"stop serving it" within 30 seconds, not "reach into open tabs"**.

The end of this procedure is a live, decay-proof, measured tour for everyone who loads those routes and
is not filtered out by your own conditional render — not a segmented onboarding programme.

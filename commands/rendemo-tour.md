---
description: Author or edit a product tour anchored to markers in this repo
argument-hint: <the tour to build or change — e.g. "onboarding for new users", "drop the billing step">
---

Invoke the `rendemo:author-a-tour` skill and follow it end to end.

The user's intent: $ARGUMENTS

## First: does this tour already exist?

**Call `rendemo_list_tours` before anything else.** This command covers both visits — building a tour
and changing one — because from the user's side they are the same sentence. "Onboarding for new users"
is what someone types whether or not a tour by that name exists, and a separate edit command would
make them know which state they are in before they could name the command, which is exactly the
knowledge this plugin exists to remove. `/rendemo` already routes on watching versus doing; routing
again on new versus existing would be a second quiz for no gain.

- **No tour matches the intent** → this is authoring. Continue below.
- **One plausibly matches** → say which, with its slug, step count and whether it is live, and ask
  whether they want to change that one or start a new one. Do not assume; "add onboarding for new
  users" from someone who already has an `onboarding` tour is genuinely ambiguous.
- **They clearly mean an existing one** ("drop the billing step", "reword step 3", "put the invite
  step before the project step") → skip the authoring preamble entirely and go to **Editing an
  existing tour** in the skill. Do not re-state the whole absent-features list at someone who already
  shipped a tour; name only what their change touches.

## Editing an existing tour

The skill has the full procedure. What must not be improvised:

- **Removing a step removes a marker too.** `rendemo_remove_tour_step` returns the exact
  `data-rendemo` attribute to strip, and leaving it behind makes `rendemo check` fail the build with
  an `orphan-marker` — the safety feature turning into a nuisance precisely when someone is backing
  out. Present the plan change and the source edit as **one reviewable diff**.
- **Every edit needs a republish and a fresh lockfile.** Until `rendemo_publish_demo` runs again, the
  live tour is the old one and the committed `rendemo.tours.json` still describes the old steps.
- **Preview before you publish**, the same as the first time.
- **Retiring a tour is not the kill switch.** `rendemo_take_demo_offline` stops it being served and
  touches no files; `rendemo_remove_tour` also hands back every marker to strip and the lockfile with
  the entry gone, so the retirement lands as one commit that still passes `rendemo check`. Nothing is
  deleted either way — the published plan is kept and publishing again serves the identical tour.

## Authoring a new tour

**Before anything else, in your first reply:** state what this produces and what it does not.

It produces a tour that really runs in their product: markers in source, a published tour, an offline
CI check that fails when a step's target element is deleted, and one
`<rendemo-demo demo="…" mode="tour">` element that anchors each step to the live DOM, advances when the
user does the real thing, reports its funnel to Rendemo's analytics, and can branch where the author
declared a choice. Optional attributes: `user` (per-person progress), `routes` (which pages it may run
on), `when="always"` (a replayable "Take the tour").

It does **not** produce a targeting rule engine — no "new users only", no per-plan or per-role
condition; **conditional rendering of the element is the primitive**, and `routes` filters pages, not
people. Progress is still `localStorage`, so `user` makes it per person within a browser and **not**
across devices. The analytics observe **Do-Not-Track and nothing else** — there is no consent API in
that path. Branches are viewer-chosen, never rule-evaluated, and a step whose target never appears
still gives up visibly rather than taking another path. The kill switch (per demo, and per workspace)
stops it being **served** within 30 seconds; it does not reach into a tab where the tour is already
running.

Say all of that — both halves — then get an explicit go-ahead before scanning the repo or writing
anything.

If the user wants something a visitor **watches** rather than performs for real, that is a published
replay demo installed with `<rendemo-demo>` — point them at `/rendemo-demo` instead. If you are not
sure which they meant, `/rendemo` settles it in one question.

Then: read the repo to find the sequence the intent describes, propose the steps as a table with a
`file:line` for every target element, and get approval before creating the tour or writing a single
marker.

**Offer the CI step too.** You are already writing files into their repo; the check is only a safety
net once it runs on every push. The skill has the detection table — GitHub Actions, GitLab, CircleCI
and the rest — and the rule that matters: **never overwrite an existing workflow.** Show the one added
line as a diff and get a yes.

**Then preview it before you offer to publish.** Once the markers are in source and the copy is
written, call `rendemo_get_tour_preview({ projectId, baseUrl })`, hand the user the link, and let them
actually look at the draft running on their own app. **Ask where their app runs** rather than assuming
`http://localhost:3000`. The link carries a "Preview — draft, not live" badge on every card, publishes
nothing and records no analytics, and it expires in 30 minutes; anyone holding it can see the draft, so
say that when you hand it over.

Publishing is now the **last** step, not the way to see your work. Do not offer it until they have seen
the preview and said the tour is right.

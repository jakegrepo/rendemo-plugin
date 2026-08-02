---
description: Author or edit a product tour anchored to markers in this repo
argument-hint: <the tour to build or change — e.g. "onboarding for new users", "drop the billing step">
---

Invoke the `rendemo:author-a-tour` skill and follow it end to end.

The user's intent: $ARGUMENTS

**Never narrate the machinery.** No "handing off to the tour skill", no "I'll follow this skill end to
end", no "first, let me check whether a matching tour exists", no explaining which word in their
request routed them here. That is this plugin describing its own organisation to someone who asked for
a tour. Say what you *found* and what you are *doing* — never which file you are in or which step of a
procedure you have reached.

## First: does this tour already exist?

**Call `rendemo_list_tours` before anything else.** This command covers both visits — building a tour
and changing one — because from the user's side they are the same sentence. "Onboarding for new users"
is what someone types whether or not a tour by that name exists, and a separate edit command would
make them know which state they are in before they could name the command, which is exactly the
knowledge this plugin exists to remove. `/rendemo:start` already routes on watching versus doing; routing
again on new versus existing would be a second quiz for no gain.

- **No tour matches the intent** → this is authoring. Continue below.
- **One plausibly matches** → say which, with its slug, step count and whether it is live, and ask
  whether they want to change that one or start a new one. Do not assume; "add onboarding for new
  users" from someone who already has an `onboarding` tour is genuinely ambiguous.
- **They clearly mean an existing one** ("drop the billing step", "reword step 3", "put the invite
  step before the project step") → go straight to **Editing an existing tour** in the skill. Name only
  the constraints their specific change touches — someone who already shipped a tour is the last
  person who needs the general shape of tours explained to them.

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

**Do not open with a disclosure essay, and do not ask permission to read the repo.** Someone who typed
"build a tour of our app" has already decided. Reading their code is free, reversible and invisible —
gating it behind "say go" buys them nothing and costs them a round trip. The first act that is not free
is **writing markers into their source**, and that is where the one gate belongs.

So the first reply is a clause of readiness, a clause of what you are doing, then work:

> Signed in to **acme**. Reading the repo for the signup → first-project sequence…

The single thing worth saying before you scan — because it is the only one that can make this whole
approach wrong for them — is that a tour writes `data-rendemo` attributes into their source and **those
have to ship to production**. Someone who cannot change the product's code cannot have a tour. Say it
in a clause; if they can change their code, it needs no answer and you keep going.

**Every other limit is disclosed where it bites, not up front.** The skill has the table: targeting and
cross-device progress when you hand over the element, analytics before publishing, branching only if
they want a fork, the kill switch when they ask how to stop it. Front-loading all five means the user
pays the full cost on every tour and retains none of it — they cannot judge "no rule engine" before
they have seen a single step.

If the user wants something a visitor **watches** rather than performs for real, that is a published
replay demo installed with `<rendemo-demo>` — point them at `/rendemo:demo` instead. If you are not
sure which they meant, `/rendemo:start` settles it in one question.

Then: read the repo to find the sequence the intent describes and **propose the steps as a table with a
`file:line` for every target element.** That table is the real disclosure — specific, about their own
product, and something they can actually judge. Get approval on it before creating the tour or writing
a single marker.

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

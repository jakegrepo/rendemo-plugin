---
description: Author or edit a codebase tour anchored to markers in this repo
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

Use that shape literally. "First, let me check whether a matching tour already exists" is the failure
this is preventing, and it has happened with the rule stated twice — so copy the template rather than
composing a first line from scratch.

The single thing worth saying before you scan — because it is the only one that can make this whole
approach wrong for them — is that a tour writes `data-rendemo` attributes into their source and **those
have to ship to production**. Someone who cannot change the product's code cannot have a tour. Say it
in a clause; if they can change their code, it needs no answer and you keep going.

**If the request names an audience, one more clause — in that same first reply, not at the end.**
"For users who don't have a recording yet", "for trial admins", "for first-time visitors" is a
targeting requirement, and Rendemo has no rule engine: who sees a tour is a conditional render in
the customer's own code. That is not a caveat to disclose when you hand over the element in §10 —
by then they have approved a step table, had markers written, and previewed a tour, all on the
assumption that the thing they actually asked for was covered. Name it first:

> Worth knowing up front: who sees a tour is a conditional render in your own code — Rendemo has no
> rule engine — so "users without a recording" becomes your app rendering the element only when the
> recording count is zero. Reading the repo for the workspace → settings sequence…

Then propose that conditional as part of the step table, so it is approved with everything else
rather than appearing later as code you wrote into their app on your own initiative.

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

**Ask the open decisions individually — a step table's leftovers do not fit behind one "go".** A scan
routinely surfaces three or four things it cannot settle: a duplicated nav, a component that needs a
pass-through prop, a CI assertion that will go red, a gate component to restore. Written up as prose
ending in "say go", what comes back is `go`, which answers none of them — and defaults get chosen
silently for all four. Ask each as its own question with the options named (use a structured choice if
the harness has one), keep configuration questions like `baseUrl` out of the approval, and if
something comes back unanswered, say which default you took at the moment you take it.

**Ask where the app runs, and confirm it answers, in that same round trip.** Nothing before the
preview needs a running app, which is exactly why the discovery that nothing is serving `baseUrl`
lands after the markers are written and the preview clock is running. One request settles it.

**Two things must not be improvised on the way to the table:** a marker duplicated across breakpoints
is a solved shape, not a reason to make the tour desktop-only (`match: "visible"` — resolution filters
to visible elements before applying `match`, so the viewport disambiguates); and anything the history
shows was deleted *deliberately* gets a question before you restore it, naming the commit.

**Offer the CI step too.** You are already writing files into their repo; the check is only a safety
net once it runs on every push. The skill has the detection table — GitHub Actions, GitLab, CircleCI
and the rest — and the rule that matters: **never overwrite an existing workflow.** Show the one added
line as a diff and get a yes.

**Probe the targets before you mint a link.** `rendemo_probe_tour_targets({ projectId, baseUrl })`
fetches each step's route from the running app and says, per step, whether the tour would find its
marker. It costs seconds and catches what would otherwise eat the reviewer's session: markers not
deployed to that host, a route rendering a sign-in stub, a marker that resolves to several elements.
Read `absent` as *look here*, not *broken* — the probe sees what a signed-out stranger gets, so an
auth-gated or client-rendered marker is legitimately missing there and present for the real visitor.
**Pass that on:** tell the reviewer which steps they must be signed in to see, before they walk them.
Ten steps reviewed once beats six reported as bugs.

**Then preview it before you offer to publish.** Once the markers are in source and the copy is
written, call `rendemo_get_tour_preview({ projectId, baseUrl })`, hand the user the link, and let them
actually look at the draft running on their own app. **Ask where their app runs** rather than assuming
`http://localhost:3000`. The link carries a "Preview — draft, not live" badge on every card, publishes
nothing and records no analytics, and it expires **30 minutes after it is issued — not after it is
first opened**. So mint it when the reviewer is ready to look: issuing it and then running an install
or a deploy spends the window on work they never see. Anyone holding it can see the draft, so say that
when you hand it over, and re-issue freely if it lapses.

Publishing is now the **last** step, not the way to see your work. Do not offer it until they have seen
the preview and said the tour is right.

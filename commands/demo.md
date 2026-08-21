---
description: Install a published Rendemo demo on this site
argument-hint: <what to embed, and where — e.g. "our onboarding demo on the pricing page">
---

Invoke the `rendemo:embed-a-demo` skill and follow it end to end.

The user's intent: $ARGUMENTS

**Never narrate the machinery.** No "handing off to the embed skill", no "I'll follow this skill end
to end", no announcing which procedure step you have reached. Say what you *found* and what you are
*doing*. The user asked for a demo on a page; they did not ask how this plugin is organised.

**A demo is a hosted experience a visitor watches or autoplays, whether it comes from a recording or
a crawled sandbox replica.** If the intent is really about guiding people
through their own live product — "walk our users through setup", "onboard new signups in the app",
"they should click the New project button" — that is a **tour**, not a demo, and it is a different
procedure: markers written into their source, no recording, no iframe. Say so and point them at
`/rendemo:tour`, or at `/rendemo:start` if you are not sure which they meant. Do not embed a demo as a
consolation prize for someone who asked for a tour.

Read that intent for three things before you start, and infer what it does not say rather than
asking about all of it:

1. **Which demo** — a name, a product area, or nothing. If nothing, list the workspace's published
   demos and ask.
2. **Where it goes** — a page, a route, a component. If nothing, ask; there is no sensible default
   placement.
3. **Inline or modal** — "on the page" / "in the hero" means inline; "a button", "a Watch the demo
   link", "a popup" means modal.

Detect the framework from the repo yourself. Do not ask the user what framework they are using.

If the demo the user means is not published yet, stop and ask before publishing — publishing makes it
world-visible.

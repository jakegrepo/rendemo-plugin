// The plugin's `headersHelper`: print the Authorization header the Rendemo MCP server needs, and do
// it fast enough that it cannot lose a race it is not visibly in.
//
// WHY THIS FILE EXISTS AT ALL, rather than the plugin calling the published CLI.
//
// Claude Code gives a `headersHelper` a TEN SECOND budget, and a helper that misses it fails
// silently: the tools simply never appear. The plugin used to declare `npx --yes rendemo token`,
// which is correct in every respect except the one that matters — `npx` re-resolves the package on
// every session start. Measured on a developer machine with a WARM cache, across 20 logged
// connection attempts:
//
//   npx --yes rendemo token   1.0 – 9.4 s   (17 attempts), plus 3 that hit the 10 s wall
//   node this-file            ~0.1 s        (the `token` command itself was never the cost)
//
// A 15% failure rate, and the tail sat 0.6 s from the cliff on a good day. Under the load of a
// dozen MCP servers starting at once it goes over. So the helper stops being a package resolution
// and becomes a file read: no npm, no network, no registry, nothing to be slow.
//
// WHAT IT DELIBERATELY DOES NOT DO:
//   - It never prints a diagnostic on stdout. Stdout is a JSON headers object or it is nothing;
//     Claude Code parses it, and a stray line makes the whole helper "invalid".
//   - With no token it exits NON-ZERO and prints NOTHING. Printing `Bearer ` with an empty value
//     would be worse than failing: Claude Code treats a returned header as success and merges it
//     over anything else, so an empty credential wins and every tool call 401s. `rendemo doctor`
//     names that exact failure, and this file must not be the thing that causes it.
//   - It does not reach the network, so it cannot tell you the token is expired — only that there
//     is one. `rendemo doctor` is what verifies it against the server.
//
// THE TOKEN RESOLUTION ORDER MIRRORS `resolveToken()` in the CLI (bin/config.ts), and
// tests/plugin-mcp-token.test.ts asserts the two agree on every case. If they ever disagree, the
// MCP server and `rendemo doctor` are reporting different credentials and neither one is wrong
// about what it can see — which is the least debuggable failure this system can produce.
//
// Node builtins only, and no import of anything in this plugin: it is copied into a plugin cache
// directory as a standalone file and must run there.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { argv, stderr, stdout, exit } from 'node:process';
import { pathToFileURL } from 'node:url';

/** Mirrors configDir() in bin/config.ts. The conventional per-platform location, not a Rendemo
 *  invention: %APPDATA%\rendemo on Windows, $XDG_CONFIG_HOME or ~/.config elsewhere.
 *  RENDEMO_CONFIG_HOME overrides both — the tests drive that, and it is the escape hatch for a
 *  machine with an unusual home. */
function configDir(env, platform) {
  const override = env.RENDEMO_CONFIG_HOME?.trim();
  if (override) return override;
  if (platform === 'win32') {
    const appData = env.APPDATA?.trim();
    return join(appData || join(homedir(), 'AppData', 'Roaming'), 'rendemo');
  }
  const xdg = env.XDG_CONFIG_HOME?.trim();
  return join(xdg || join(homedir(), '.config'), 'rendemo');
}

/** The token to send, or null. NEVER throws: a corrupt config must read as "logged out" — something
 *  `rendemo login` fixes — and not as a crash inside a helper whose stderr nobody is watching. */
export function resolveToken(env = process.env, platform = process.platform) {
  // RENDEMO_API_TOKEN wins, exactly as the CLI does it. CI sets it, and a developer overriding
  // their own login expects the override to take. An env var set to "" or spaces is a broken shell
  // line, not a request to authenticate as nobody.
  const fromEnv = env.RENDEMO_API_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  let raw;
  try { raw = readFileSync(join(configDir(env, platform), 'config.json'), 'utf8'); } catch { return null; }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  // A non-string token is not a token. Sending one would put `[object Object]` on the wire and turn
  // the resulting 401 into "your token expired", which is a lie.
  const token = typeof parsed.token === 'string' ? parsed.token.trim() : '';
  return token || null;
}

/** Written to stdout verbatim, or null when there is nothing to authenticate with. Separated from
 *  the process exit so a test can assert the OUTPUT without a subprocess. */
export function headersJson(env = process.env, platform = process.platform) {
  const token = resolveToken(env, platform);
  return token ? JSON.stringify({ Authorization: `Bearer ${token}` }) : null;
}

// Only when run as a command. Importing this file — which tests/plugin-mcp-token.test.ts does, to
// check it against the CLI's own resolveToken — must not print or exit.
if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) {
  const out = headersJson();
  if (out === null) {
    // Stderr, because stdout must stay parseable. Claude Code surfaces neither during startup,
    // which is why the message names the command that WILL explain it.
    stderr.write('rendemo: no token. Run `rendemo login`, or set RENDEMO_API_TOKEN. `rendemo doctor` explains.\n');
    exit(1);
  }
  stdout.write(out);
}

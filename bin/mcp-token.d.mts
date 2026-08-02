// Types for the plugin's headersHelper script.
//
// The script itself is plain `.mjs` on purpose — it is copied into a plugin cache directory and run
// by `node` with nothing installed alongside it, so it cannot be TypeScript and cannot be built.
// This file exists so the repo's own tests can hold it to the same contract as the CLI's
// resolveToken() without TypeScript inferring `process.env`'s exact shape from the parameter
// defaults, which would make every call site pass a full ProcessEnv.
//
// Ships with the plugin harmlessly: a declaration file has no runtime effect.

/** A subset of the environment. Matches the `Env` alias the CLI's bin/config.ts uses. */
type Env = Record<string, string | undefined>;

/** The token to send, or null when there is nothing to authenticate with. Mirrors resolveToken() in
 *  bin/config.ts — RENDEMO_API_TOKEN first, then the stored login — and never throws. */
export function resolveToken(env?: Env, platform?: string): string | null;

/** Exactly what the script writes to stdout, or null when it should print nothing and exit non-zero.
 *  Never an Authorization header with an empty credential: Claude Code would treat that as success
 *  and merge it over every fallback. */
export function headersJson(env?: Env, platform?: string): string | null;

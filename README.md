# LineGraph

Paste a public TypeScript or JavaScript repository URL and get a map of it.
Folders are boxes, imports are the lines between them. Open a folder into its
files, select a file, and see what it imports, what imports it, and what breaks
two levels out if it changes. There's a panel where you can ask the repository a
question and watch it look the answer up.

**Every box and every line comes from really parsing the code.** ts-morph walks
the files and resolves each import against the tsconfig that owns the importing
file. A reference that doesn't resolve is reported with a reason, never guessed
at. The model explains and labels what the parser found; it is never allowed to
decide that two files are connected.

The reasoning behind that rule, and every other product decision, is in
`docs/project-doc.md`. Per-phase specs are in `docs/specs/`.

## Requirements

- Node 22.x
- pnpm 11.28.5 (`corepack enable` picks up the pinned version)
- A Clerk application with **organizations enabled**
- A Supabase project
- Optionally, an OpenAI-compatible API for explanations and the Ask panel

## Setup

**1. Install.**

```bash
pnpm install
```

**2. Point Supabase at Clerk.** In the Supabase dashboard, add Clerk as a
third-party auth provider. Row-level security reads the organization out of the
Clerk session token, so without this every query returns zero rows and the app
looks broken rather than misconfigured.

**3. Apply the migrations.** There's no `supabase/config.toml`, so this runs
against a hosted project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

`supabase/seed.sql` is optional and carries two hardcoded Clerk organization
ids. Replace them with your own or skip the seed.

**4. Write `.env.local`.** See below.

**5. Run it.**

```bash
pnpm dev
```

## Environment

These seven are required. The app reads them in `lib/env.ts` and throws on
startup if any is missing, rather than failing on the first request that needs
one.

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_API_KEY=
```

`SUPABASE_API_KEY` is the secret key and has no `NEXT_PUBLIC_` prefix, so it
can't be bundled into the browser. It's the pipeline's writer.

Everything below is optional, and a missing key is a supported state: the map
still works and the pane says what isn't configured.

```bash
# Explanations. All three or nothing.
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=

# Tracing. Both halves or it stays off.
LANGSMITH_API_KEY=
LANGSMITH_TRACING=true

# The Ask panel, once the agent service is running.
AGENT_URL=
AGENT_ASSISTANT_ID=
AGENT_API_KEY=
```

Repository archives are fetched from GitHub unauthenticated on purpose — no
token is stored — so analyses share the anonymous rate limit of 60 requests an
hour.

## The agent

The Ask panel is a separate service in `agent/`, built on Managed Deep Agents.
It has six read-only tools over a stored analysis. Every message mints a
short-lived credential signed inside the database, so the tools surface holds
nothing that could read another organization's rows.

```bash
cd agent
pnpm install
cp env.example .env
pnpm dev
```

Then set `AGENT_URL`, `AGENT_ASSISTANT_ID` and `AGENT_API_KEY` in the app's
`.env.local`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm parse <dir>` | Parse a directory and print what it found. `--out <file>` writes the full typed result. No database, no server. |
| `pnpm eval:paths` | Score explanations against the paths they're allowed to name |
| `pnpm eval:roles` | Role assignment accuracy |
| `pnpm eval:prompts` | Compare the current and retired prompts over one dataset |
| `pnpm eval:agent` | Agent answer quality |

## Layout

```
lib/parser/      ts-morph walk, import resolution, framework adapters.
                 Imports no Next, React or database client — path in, data out.
lib/graph/       Folding, layout and the graph calculations. Pure functions
                 over a file list and an edge list.
lib/pipeline/    Fetch an archive at a resolved HEAD commit, parse it, store it.
lib/agent/       The tools surface and its credential.
app/             App Router. `proxy.ts` at the root is the middleware.
supabase/        Migrations. Who may read a row is decided by a policy, never
                 by a where clause in application code.
docs/            The product decisions and the per-phase specs.
```

## Deploy

`railway.json` builds with Nixpacks and serves with `pnpm start`. The agent
deploys separately with `mda deploy .` from `agent/`.

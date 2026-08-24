# ThoughtSpot Embed Studio

A playground for testing ThoughtSpot embeds and the v2 REST API against a live cluster.

## Features

- **Embeds** — Full App, Liveboard, Search, and Spotter.
- **Embed config panel** — edit any prop of the embed's view config from the UI, then rebuild the embed with it. No code edit, no redeploy.
- **Switchable SDK versions** — the `visual-embed-sdk` version from the embed config panel, the
  `rest-api-sdk` version from the REST API tab.
- **Host event composer** — fire `embed.trigger()` host events with editable JSON params, in the same
  editor, with the resulting call rendered beside them.
- **Event log** — live stream of embed events, with event→host-event reactions and export. Third tab of the
  left panel, beside the config editor and the host-event composer.
- **REST API tab** — two modes:
  - *SDK Explorer*: call any of the ~160 `@thoughtspot/rest-api-sdk` methods, edit JSON args, inspect request/response.
  - *API Playground*: the hosted ThoughtSpot REST API playground, embedded and auto-configured; its URL is
    editable in the tab bar (defaults to `VITE_REST_PLAYGROUND_URL`).

Auth covers all seven Visual Embed SDK methods, picked on the sign-in screen. The two trusted-token
methods need this app's own backend, which is a **dev-server** plugin (`vite.config.ts`) — those two are
unavailable in a static deployment; the SSO, Basic and None methods talk to the cluster directly and work
either way.

## Editing embeds

Embed props are edited in the running app, not in the source: open an embed and use the **Config** tab of
the left panel (which also holds **Host events** and the **Log**). Drag its right edge to resize it (double-click the handle, or `Home` when it has focus,
resets); the width is remembered per browser. Its *JSON* tab is the view config itself — the object the SDK is handed — so any prop of
any SDK version is reachable, and a prop left out keeps the SDK's own default. *Apply* rebuilds the embed
with it. Configs are saved per browser, so they survive a reload.

The *Code* tab is the same config as source, with enum values named (`Action.SpotterChatRename`, not
`"spotterChatRename"`) — that is what `src/studio/embeds/viewConfigSchema.generated.ts` is for. It edits
both ways: paste your own app's `new SomethingEmbed(container, { … })` call there and the object literal in
it becomes the config, enum members included. The import line, the variable name and the `render()` call are
ignored, and only literals and enum members can be applied — a function or a spread is reported rather than
run.

`src/studio/embeds/*.ts` now only holds what a fresh browser starts from, which is also the *Reset to
defaults* target.

**Neither SDK is a dependency of this app.** They are not in `package.json`, not in `node_modules`, and not in
the bundle: every version, including the one the app starts at, is fetched from a CDN at runtime. What that
buys is that "which version am I testing" is only ever a runtime question. What it costs is a hard dependency
on a reachable CDN — with no network the app does not start at all — and the SDK's TypeScript types, which
`src/thoughtspot/sdkTypes.ts` declares locally instead. Those declarations cover the surface, not the value
types behind it: a misspelled view-config prop is still a compile error (the prop names are generated from a
published build), but a prop given the wrong *kind* of value surfaces as an SDK error at render.

`scripts/sdk-versions.json` pins the version each committed generated artifact was built from, and is what the
app falls back to — `SNAPSHOT_VERSIONS`, fetched from the CDN like any other version. The generators download
that version's tarball (`scripts/sdkSource.mjs`, cached under `node_modules/.cache`), so regenerating needs no
install: `npm run gen:rest-catalog -- 2.27.1` generates against 2.27.1 and repins it.

The app starts at npm's latest, not at the pinned version: `resolveDefaultSdkVersions()` runs before the
first render, resolves both `latest` tags, and caches them for the tab so the reload an embed SDK switch needs
cannot land on a different version than the one before it. It has its own timeout and never rejects — a slow
network delays first paint rather than blocking it, and every failure path falls back to the pinned versions.
An explicit choice always wins over latest; sign-in offers a one-click fall back to the pinned version when a
chosen one will not load. The trade-off is deliberate: the app follows the SDK, so a repro from today is not
guaranteed to be a repro tomorrow — pin the version in the picker to hold one still.

The version pickers list every published version (jsDelivr's registry metadata) that this app can actually
drive. `MIN_SUPPORTED` in `src/thoughtspot/sdkLoader.ts` holds the floor: `rest-api-sdk` 1.x is an APIMATIC
build with one class per controller and no aggregate `ThoughtSpotRestApi`, so 2.0.0 is the oldest REST version
offered, a typed one below it is refused in the popover, and a stored one below it falls back to the pinned
version rather than failing on every visit. A URL cannot be judged from the string, so it is checked by the
import instead — which also asserts the exports the Explorer builds its calls from. The two packages
come from different CDNs, and `CDN_NAME` in `src/thoughtspot/sdkLoader.ts` says why: the Visual Embed SDK
publishes a self-contained browser bundle, so its file is taken off jsDelivr, while the REST SDK's bundle
opens with a bare `import "whatwg-fetch"` that no browser can resolve — it comes through esm.sh, which
rewrites specifiers. Verifying a REST version imports it for real (a client object costs nothing to load
twice), since "responds with JavaScript" and "imports" are not the same thing.

`src/studio/rest/catalog.ts` is the catalog for the pinned version, generated ahead of time by
`npm run gen:rest-catalog`. Pick a different version in the UI and `catalogGen.ts` builds that version's
catalog in the browser instead: the two files the generator parses (`dist/index.d.ts` for signatures,
`dist/index.js` for verb and path) are published for every version, so the same parse runs client-side and the
panel reports its progress while it does. A generated catalog is cached per version for the page.

If generation fails, `methodAvailability.ts` falls back to the shipped snapshot and reconciles it against the
loaded client's prototype: catalogued methods the loaded build lacks are listed as `absent` and cannot be
sent, and methods it has that the snapshot does not describe appear under *Not in this build's catalog*,
callable with positional JSON arguments.

The field also takes a URL: either a built ES module (custom CDN, self-hosted build), imported as-is, or a
`pkg.pr.new` per-commit link in either form —

```
https://pkg.pr.new/@thoughtspot/visual-embed-sdk@2ceed27
https://pkg.pr.new/thoughtspot/visual-embed-sdk/@thoughtspot/visual-embed-sdk@2ceed27
```

Those serve an npm tarball, so `src/thoughtspot/tarballModule.ts` fetches it, gunzips it with
`DecompressionStream`, reads the tar, and imports `dist/tsembed.es.js` as a blob URL — rewriting the bundle's
relative specifiers to the blob URLs of its sibling chunks, since the SDK's entry lazily imports one. Any URL
must be served with CORS. Whatever is entered is checked before it is stored — a tarball all the way to
locating its entry module — so a bad version is rejected in the popover rather than after a reload.

Switching the Visual Embed SDK reloads the page — the SDK keeps module-level state, so a version can only
change on a fresh document. The reload comes back to the embed that was open (session storage, so a new tab
still starts at Welcome) and confirms the new version with a toast. Saved configs are kept; the event log is
not. An embed a chosen release cannot build — `SpotterEmbed` on a release that predates it, say — reports
that on the embed surface instead of spinning.

The Visual Embed SDK's version is picked from the config panel header (so it sits next to the embed it
applies to, on all four embed types) and changing it reloads the page — `init()` and every live iframe hold
module-level state that cannot be swapped underneath them. The REST SDK's version is picked in the REST API
tab and takes effect on the next call, since its client is rebuilt per host/auth/version. A version that
fails to load leaves sign-in with a one-click fallback to the pinned one.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3030
```

Log in with your ThoughtSpot host + credentials on the login screen.

## Configuration

Copy `.env.example` to `.env` and set values as needed (all optional — defaults live in `src/studio/config.ts`).

## Scripts

- `npm run dev` — start the dev server
- `npm run dev:clean` — clear the Vite cache, then start dev (`vite --force`)
- `npm run dev:fresh` — `npm install`, clear the Vite cache, then start dev
- `npm run build` — type-check and build for production
- `npm run build:clean` — clear Vite cache, `dist`, and `*.tsbuildinfo`, then build
- `npm run gen:rest-catalog` — regenerate the REST method catalog (see below)
- `npm run gen:embed-schema` — regenerate the embed view-config schema the config panel renders

Cache-clearing scripts use Unix `rm -rf` / `find` — macOS/Linux only.

## Generating the REST catalog

The SDK Explorer's method list (`src/studio/rest/catalog.ts`) is auto-generated — never edit it by hand. To pick up new endpoints after a new SDK release:

```bash
npm run gen:rest-catalog -- 2.27.1   # generate against 2.27.1 and repin to it
npm run gen:rest-catalog             # or regenerate against the current pin
```

The generator (`scripts/gen-rest-catalog.mjs`) downloads that version's npm tarball and reads its `dist/`
(method signatures from `index.d.ts`, verbs/paths from `index.js`), then rewrites `catalog.ts` with every
aggregate-client method and updates `scripts/sdk-versions.json`. No `npm install` — the SDK is not a
dependency. `npm run gen:embed-schema -- 1.51.0` works the same way for the view-config schema, which also
emits the prop-name unions `sdkTypes.ts` builds the view-config types from.

## Generating the embed config schema

The config panel's prop list (`src/studio/embeds/viewConfigSchema.generated.ts`) is auto-generated — never edit it by hand. After bumping the Visual Embed SDK:

```bash
npm install
npm run gen:embed-schema
```

`scripts/gen-embed-schema.mjs` walks the installed package's `lib/src/**/*.d.ts`, flattens each embed's
`*ViewConfig` interface, and records each prop's name, value shape and the SDK enum behind it. Enum
*values* are read from the loaded SDK at runtime, so they always match the version in use.

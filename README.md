# ThoughtSpot Embed Studio

A playground for testing ThoughtSpot embeds and the v2 REST API against a live cluster.

## Features

- **Embeds** — Full App, Liveboard, Search, and Spotter, each in its own factory (`src/studio/embeds/`).
- **Host event composer** — fire `embed.trigger()` host events with editable JSON params.
- **Event console** — live stream of embed events, with event→host-event reactions and export.
- **REST API tab** — two modes:
  - *SDK Explorer*: call any of the ~160 `@thoughtspot/rest-api-sdk` methods, edit JSON args, inspect request/response.
  - *API Playground*: the hosted ThoughtSpot REST API playground, embedded and auto-configured.

Auth is cookieless trusted auth: the dev server (`vite.config.ts`) mints session tokens; credentials never reach the browser.

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
- `npm run build` — type-check and build for production
- `npm run gen:rest-catalog` — regenerate the REST method catalog (see below)

## Generating the REST catalog

The SDK Explorer's method list (`src/studio/rest/catalog.ts`) is auto-generated — never edit it by hand. To pick up new endpoints after a new SDK release:

```bash
# bump "@thoughtspot/rest-api-sdk" in package.json, then:
npm install
npm run gen:rest-catalog
```

The generator (`scripts/gen-rest-catalog.mjs`) reads the installed package's `dist/` (method signatures from `index.d.ts`, verbs/paths from `index.js`) and rewrites `catalog.ts` with every aggregate-client method.

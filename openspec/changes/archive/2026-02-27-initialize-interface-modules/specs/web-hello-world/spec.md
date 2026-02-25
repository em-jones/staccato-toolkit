---
td-board: initialize-interface-modules-web-hello-world
td-issue: td-378cc3
---

# Specification: Web Hello World

## Overview

Defines the minimal working web/PWA application for `src/staccato-toolkit/web` using go-app v10 (`github.com/maxence-charriere/go-app/v10`). go-app is a Go+WASM PWA framework where the same Go source compiles twice: once as a native Go HTTP server (backend), and once as a WASM binary (frontend). The server automatically generates and serves the PWA manifest, service worker, and WASM loader — no separate frontend toolchain is required.

## ADDED Requirements

### Requirement: go-app v10 dependency and go.mod update - td-c3b151

The `src/staccato-toolkit/web/go.mod` SHALL declare a dependency on `github.com/maxence-charriere/go-app/v10` at v10.x, enabling Go+WASM PWA application development.

#### Scenario: Dependency declared in go.mod

- **WHEN** `go.mod` in `src/staccato-toolkit/web` is read
- **THEN** it SHALL contain a `require` entry for `github.com/maxence-charriere/go-app/v10`

#### Scenario: Module resolves in workspace

- **WHEN** `go mod tidy` is run from `src/staccato-toolkit/web`
- **THEN** it SHALL succeed and `go.sum` SHALL contain hashes for `github.com/maxence-charriere/go-app/v10`

### Requirement: Hello component with Render method - td-839aaa

The `src/staccato-toolkit/web` package SHALL define a `Hello` struct that embeds `app.Compo` and implements a `Render() app.UI` method displaying "Hello, PWA World!" with an interactive click counter button, demonstrating go-app's declarative component model.

#### Scenario: Hello component renders greeting

- **WHEN** the WASM binary is loaded in a browser and the root route `/` is matched
- **THEN** the page SHALL display "Hello, PWA World!"

#### Scenario: Click counter updates on interaction

- **WHEN** the user clicks the button in the Hello component
- **THEN** the displayed click count SHALL increment by 1 without a page reload

#### Scenario: Component compiles as WASM

- **WHEN** `GOARCH=wasm GOOS=js go build -o web/app.wasm .` is run in `src/staccato-toolkit/web`
- **THEN** the build SHALL succeed and produce `web/app.wasm`

### Requirement: WASM client build target - td-1d67a1

The `src/staccato-toolkit/web` module SHALL support compilation to WebAssembly via `GOARCH=wasm GOOS=js`. The resulting `web/app.wasm` file SHALL be served by the go-app HTTP server and loaded by the browser.

#### Scenario: WASM binary is produced

- **WHEN** `GOARCH=wasm GOOS=js go build -o web/app.wasm .` is run
- **THEN** a valid WebAssembly binary SHALL be produced at `web/app.wasm`

#### Scenario: WASM binary is served

- **WHEN** the Go server is running and a browser requests `/web/app.wasm`
- **THEN** the server SHALL respond with the WASM binary and `Content-Type: application/wasm`

### Requirement: Go HTTP server with app.Handler - td-aad600

The native (non-WASM) build of `src/staccato-toolkit/web/main.go` SHALL configure and start an HTTP server using `app.Handler` as the root handler, serving the PWA shell, WASM binary, and all auto-generated assets on a configurable port (default `:8080`).

#### Scenario: Server starts and serves root

- **WHEN** the compiled `web` binary is run
- **THEN** it SHALL listen on `:8080` and respond to `GET /` with an HTML document

#### Scenario: app.Handler serves PWA assets

- **WHEN** a browser requests `/manifest.webmanifest` from the running server
- **THEN** the server SHALL respond with a valid JSON PWA manifest containing the app name

#### Scenario: app.Handler serves service worker

- **WHEN** a browser requests `/app-worker.js` from the running server
- **THEN** the server SHALL respond with the auto-generated service worker JavaScript

### Requirement: PWA manifest and service worker config - td-efa09f

The `app.Handler` configuration SHALL declare the PWA application name and description so that the auto-generated manifest and service worker correctly identify the application for browser install prompts and offline caching.

#### Scenario: Manifest contains app name

- **WHEN** the browser fetches `/manifest.webmanifest`
- **THEN** the JSON response SHALL contain `"name"` set to `"Staccato Web"`

#### Scenario: Service worker enables offline access

- **WHEN** a browser has visited the app once (service worker installed) and then goes offline
- **THEN** the app SHALL still load from the service worker cache

#### Scenario: App is installable as PWA

- **WHEN** a Chromium-based browser visits the app over HTTP or HTTPS
- **THEN** the browser SHALL present an install prompt (all PWA installability criteria met: manifest, service worker, HTTPS or localhost)

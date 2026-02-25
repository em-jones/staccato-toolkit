---
td-board: adopt-playwright-e2e-playwright-browser-selection
td-issue: td-a49163
---

# Specification: Playwright Browser Selection

## Overview

This spec defines how browsers are selected, configured, and tested to ensure cross-browser compatibility and performance.

## ADDED Requirements

### Requirement: Multi-Browser Project Configuration

The Playwright configuration SHALL define test projects for Chromium, Firefox, and WebKit. Each project SHALL have independent configuration including baseURL, timeout, and reporter settings.

#### Scenario: Running tests across browsers
- **WHEN** E2E tests execute
- **THEN** tests run in all configured browsers (Chromium, Firefox, WebKit) by default

#### Scenario: Running tests in a single browser
- **WHEN** a developer wants to run tests quickly during development
- **THEN** they can specify a single browser with `--project=chromium` flag

### Requirement: Browser-Specific Skip Decorators

Tests that cannot run in certain browsers (due to platform limitations or known browser bugs) SHALL use skip decorators. Tests SHALL be documented with the reason for skipping and the expected fix timeline.

#### Scenario: Skipping test in Firefox
- **WHEN** a test is incompatible with Firefox
- **THEN** the test is marked with `test.skip('firefox', 'reason for skip')` and includes a comment

#### Scenario: Platform-specific tests
- **WHEN** a test is only relevant for desktop browsers
- **THEN** the test can be skipped on mobile browser configurations

### Requirement: Viewport Configuration

Each test project SHALL define a standard viewport size. The configuration SHALL support both desktop (1280x720) and mobile (375x667) viewports with separate project definitions.

#### Scenario: Desktop viewport testing
- **WHEN** testing desktop UI
- **THEN** tests run with 1280x720 viewport

#### Scenario: Mobile viewport testing
- **WHEN** testing mobile responsiveness
- **THEN** separate project runs tests with mobile viewport size

### Requirement: User Agent and Device Emulation

Tests that verify user-agent handling or device features SHALL use emulation. The configuration SHALL allow per-test specification of device emulation (iPhone, Android) and custom user agents.

#### Scenario: Testing on emulated iPhone
- **WHEN** testing mobile Safari behavior
- **THEN** tests run with iPhone emulation including Safari user agent

#### Scenario: Testing custom user agents
- **WHEN** testing user-agent-specific behavior
- **THEN** fixture allows override of user agent for specific tests

### Requirement: Browser Launch Options

Browser launch options SHALL be configurable per project and per test. Common options include headless mode, slow-motion simulation, and service worker bypass.

#### Scenario: Running in headed mode
- **WHEN** a developer runs tests with `--headed` flag
- **THEN** browsers launch visibly for debugging

#### Scenario: Slow-motion replay
- **WHEN** debugging flaky tests
- **THEN** tests can run with `--debug` to slow down interactions

### Requirement: Trace and Video Recording Configuration

Test execution SHALL support optional tracing and video recording. Traces and videos SHALL be recorded only on first retry or on failure, to reduce storage overhead.

#### Scenario: Recording trace on failure
- **WHEN** a test fails
- **THEN** trace is automatically recorded and linked in test report

#### Scenario: Recording video on first retry
- **WHEN** a test fails and is retried
- **THEN** video is recorded during retry for failure analysis


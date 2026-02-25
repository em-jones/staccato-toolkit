import type { Page } from 'playwright';

/**
 * Stealth init page for playwright-cli sessions.
 *
 * Loaded via PLAYWRIGHT_MCP_INIT_PAGE=.playwright-cli-init.ts
 *
 * Applies Playwright API-level stealth setup per tab: extra headers,
 * realistic viewport, geolocation permission, and user-agent consistency.
 * Pair with PLAYWRIGHT_MCP_INIT_SCRIPT for DOM-level evasions (navigator.webdriver etc).
 *
 * Usage:
 *   export PLAYWRIGHT_MCP_INIT_PAGE="$(pwd)/.playwright-cli-init.ts"
 *   playwright-cli open https://example.com
 */
export default async ({ page }: { page: Page }) => {
  const context = page.context();

  // --- Context-level (applied once, affects all pages in session) ---

  // Realistic Accept-Language header — matches most desktop Chrome installs
  await context.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });

  // Grant notification permission so detection checks don't reveal automation
  // (headless browsers typically return 'denied' without this)
  await context.grantPermissions(['notifications']);

  // --- Page-level evasions (run before page scripts via addInitScript) ---

  await page.addInitScript(() => {
    // 1. Hide webdriver flag — the #1 bot signal
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // 2. Spoof plugin list — headless Chrome has 0 plugins; real Chrome has 3+
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
          { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
        ];
        return Object.assign(plugins, { item: (i: number) => plugins[i], namedItem: (n: string) => plugins.find(p => p.name === n) ?? null, refresh: () => {} });
      },
    });

    // 3. Spoof languages — empty array is a bot signal
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    // 4. Spoof hardware concurrency — 0 or 1 is suspicious
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
    });

    // 5. Spoof device memory — undefined is a bot signal
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });

    // 6. Restore chrome runtime object — absent in headless Chromium
    if (!(window as any).chrome) {
      (window as any).chrome = {
        runtime: {
          connect: () => {},
          sendMessage: () => {},
        },
        loadTimes: () => ({}),
        csi: () => ({}),
      };
    }

    // 7. Patch permissions query — bots often get 'denied' for notifications
    const originalQuery = window.navigator.permissions.query.bind(navigator.permissions);
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'default', onchange: null } as PermissionStatus);
      }
      return originalQuery(parameters);
    };

    // 8. Prevent iframe contentWindow access detection
    const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get() {
        const win = originalContentWindow?.get?.call(this);
        if (win) {
          try {
            Object.defineProperty(win.navigator, 'webdriver', { get: () => undefined });
          } catch {}
        }
        return win;
      },
    });
  });
};

// PNG export of a board view: `node design-build/board.mjs --png [--view specimen|guidelines|coverage] [--theme light] [--width 1280]`
// writes design-build/exports/board-<view>-<theme>-<width>.png; the live board serves the same at /__board/export.png.
// Uses Playwright from design-build/node_modules (the renderer render.mjs already needs); loaded only when asked.
let browserP = null;
async function browser() {
  if (!browserP) browserP = import('@playwright/test').then(({ chromium }) => chromium.launch()).catch((e) => { browserP = null; throw e; });
  return browserP;
}
/** Full-page PNG of `url` (?theme= is added) at `width`, as a Buffer. The page is shown with motion settled. */
export async function exportPng({ url, theme = 'light', width = 1280 }) {
  const b = await browser();
  const scheme = /(^|-)dark($|-)/.test(theme) ? 'dark' : 'light';
  const ctx = await b.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: 'reduce' });
  try {
    const page = await ctx.newPage();
    const u = new URL(url); u.searchParams.set('theme', theme);
    await page.goto(u.href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.documentElement.setAttribute('data-export', 'on'));
    return await page.screenshot({ fullPage: true, animations: 'disabled' });
  } finally { await ctx.close(); }
}
export async function closeExport() { if (browserP) { const b = await browserP.catch(() => null); browserP = null; if (b) await b.close(); } }

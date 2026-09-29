const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const files = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 600 }, deviceScaleFactor: 2 });
  for (const f of files) {
    await page.goto('file://' + path.resolve(f), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: f.replace(/\.html$/, '.png'), fullPage: true });
  }
  await browser.close();
})();

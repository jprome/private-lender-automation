import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { chromium } from 'playwright';

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function isRelevantUrl(url) {
  return (
    url.includes('privatelender.com') ||
    url.includes('get-terms') ||
    url.includes('wix') ||
    url.includes('sls')
  );
}

function isProbablyAnalyticsHost(url) {
  try {
    const h = new URL(url).host;
    return (
      h.includes('frog.wix.com') ||
      h.includes('panorama.wixapps.net') ||
      h.includes('analytics.google.com') ||
      h.includes('www.google.com') ||
      h.includes('google-analytics.com') ||
      h.includes('googletagmanager.com') ||
      h.includes('doubleclick.net') ||
      h.includes('connect.facebook.net')
    );
  } catch {
    return false;
  }
}

async function main() {
  const outDir = path.resolve(process.cwd(), 'captures');
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `privatelender_capture_${nowStamp()}.json`);

  // Persistent context keeps cookies/localStorage while you step through the flow.
  const userDataDir = path.join(outDir, '.pw-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
  });

  const page = await context.newPage();

  const captured = {
    format: 'playwright-capture/v1',
    capturedAt: new Date().toISOString(),
    startUrl: 'https://www.privatelender.com/get-terms',
    requests: [],
  };

  let blockRelevantPosts = false;

  // Optional safety: when enabled, abort relevant POSTs so you can press submit
  // to capture the final request details without actually sending it upstream.
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    if (blockRelevantPosts && req.method() === 'POST' && !isProbablyAnalyticsHost(url)) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  const requestIdByUrlAndMethod = new Map();

  page.on('request', async (req) => {
    try {
      const url = req.url();
      const method = req.method();

      // Always capture POSTs (the final form submit may go to a 3rd-party domain).
      // For non-POST noise, keep the existing relevance filter.
      if (method !== 'POST' && !isRelevantUrl(url)) return;
      const headers = req.headers();
      const postData = req.postData();
      const postDataBuffer = req.postDataBuffer();

      let postDataBase64 = null;
      if ((!postData || postData.length === 0) && postDataBuffer && postDataBuffer.length > 0) {
        postDataBase64 = postDataBuffer.toString('base64');
      }

      const entry = {
        ts: Date.now(),
        url,
        method,
        resourceType: req.resourceType(),
        headers,
        postData: postData ?? null,
        postDataBase64,
      };

      captured.requests.push(entry);

      // A loose key to help response correlation; not guaranteed unique but useful.
      requestIdByUrlAndMethod.set(`${method} ${url}`, captured.requests.length - 1);
    } catch {
      // ignore
    }
  });

  page.on('response', async (resp) => {
    try {
      const req = resp.request();
      const url = req.url();
      if (!isRelevantUrl(url)) return;

      const key = `${req.method()} ${url}`;
      const idx = requestIdByUrlAndMethod.get(key);
      if (typeof idx !== 'number') return;

      const status = resp.status();
      const headers = resp.headers();

      captured.requests[idx].response = { status, headers };
    } catch {
      // ignore
    }
  });

  console.log('Opening:', captured.startUrl);
  await page.goto(captured.startUrl, { waitUntil: 'domcontentloaded' });

  console.log('\nCapture running in a real browser.');
  console.log('- Step through the PrivateLender flow manually.');
  console.log('- Safety: press "b" to toggle blocking relevant POSTs (OFF by default).');
  console.log('  When blocking is ON, you can click the final submit to capture the request, and it will be aborted client-side.');
  console.log('- Press "q" (or Enter) to stop and write the capture file.\n');

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  await new Promise((resolve) => {
    const onKey = (_str, key) => {
      if (key?.name === 'b') {
        blockRelevantPosts = !blockRelevantPosts;
        console.log(`\n[mode] blockRelevantPosts=${blockRelevantPosts}`);
        return;
      }
      if (key?.name === 'q' || key?.name === 'return' || key?.name === 'enter') {
        process.stdin.off('keypress', onKey);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        resolve();
      }
    };
    process.stdin.on('keypress', onKey);
  });

  fs.writeFileSync(outFile, JSON.stringify(captured, null, 2), 'utf8');
  console.log(`\nWrote capture: ${outFile}`);

  await context.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

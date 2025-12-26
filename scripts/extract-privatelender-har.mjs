import fs from 'node:fs';

const KEYWORDS = [
  'firstname',
  'lastname',
  'phone',
  'email',
  'fico',
  'property',
  'purchase',
  'refi',
  'loan',
  'address',
  'zip',
  'postal',
  'experience',
];

function safeUrlHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function isProbablyAnalyticsHost(url) {
  const host = safeUrlHost(url);
  return (
    host.includes('frog.wix.com') ||
    host.includes('panorama.wixapps.net') ||
    host.includes('analytics.google.com') ||
    host.includes('www.google.com') ||
    host.includes('google-analytics.com') ||
    host.includes('googletagmanager.com') ||
    host.includes('doubleclick.net') ||
    host.includes('connect.facebook.net') ||
    host.includes('clarity.ms') ||
    host.includes('contentsquare')
  );
}

function usage() {
  console.error('Usage: node scripts/extract-privatelender-har.mjs file1.har|file1.json [file2.har|file2.json ...]');
  process.exit(2);
}

const files = process.argv.slice(2);
if (files.length === 0) usage();

function toHarEntries(data) {
  // HAR
  if (Array.isArray(data?.log?.entries)) return data.log.entries;

  // Playwright capture format (scripts/capture-privatelender-playwright.mjs)
  if (Array.isArray(data?.requests) && data?.format?.startsWith('playwright-capture/')) {
    return data.requests.map((r) => {
      const headersObj = r.headers ?? {};
      const headersArr = Object.entries(headersObj).map(([name, value]) => ({ name, value }));

      let postText = typeof r.postData === 'string' ? r.postData : undefined;
      if ((!postText || postText.length === 0) && typeof r.postDataBase64 === 'string' && r.postDataBase64.length > 0) {
        try {
          postText = Buffer.from(r.postDataBase64, 'base64').toString('utf8');
        } catch {
          // ignore
        }
      }

      return {
        request: {
          method: r.method,
          url: r.url,
          headers: headersArr,
          postData: postText
            ? {
                mimeType: headersObj['content-type'] || headersObj['Content-Type'] || undefined,
                text: postText,
              }
            : undefined,
        },
        response: r.response
          ? {
              status: r.response.status,
              headers: Object.entries(r.response.headers ?? {}).map(([name, value]) => ({ name, value })),
            }
          : undefined,
      };
    });
  }

  return null;
}

const mergedEntries = [];
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const input = JSON.parse(raw);
  const entries = toHarEntries(input);
  if (!Array.isArray(entries)) {
    console.error(`Invalid input (${file}): expected HAR (log.entries) or Playwright capture JSON (format + requests).`);
    process.exit(2);
  }
  mergedEntries.push(...entries);
}

const entries = mergedEntries;

const isRelevant = (e) => {
  const method = (e?.request?.method ?? '').toUpperCase();
  // Always include POSTs (final form submit can hit a 3rd-party domain).
  if (method === 'POST') return true;
  const url = e?.request?.url ?? '';
  return url.includes('privatelender.com') || url.includes('wix') || url.includes('get-terms') || url.includes('sls');
};

const relevant = entries.filter(isRelevant);

function summarizeEntry(e) {
  const req = e.request;
  const url = req.url;
  const method = req.method;
  const headers = Object.fromEntries((req.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]));
  const ct = headers['content-type'] ?? '';
  const post = req.postData;
  const postText = typeof post?.text === 'string' ? post.text : '';
  const score = KEYWORDS.reduce((acc, k) => acc + (postText.toLowerCase().includes(k) ? 1 : 0), 0);
  return {
    method,
    url,
    host: safeUrlHost(url),
    contentType: ct,
    hasPostData: Boolean(post),
    postDataMimeType: post?.mimeType,
    postDataParamKeys: Array.isArray(post?.params) ? post.params.map((p) => p.name) : undefined,
    postDataTextSnippet: postText ? postText.slice(0, 500) : undefined,
    responseStatus: e?.response?.status,
    likelySubmitScore: score,
    looksLikeAnalytics: isProbablyAnalyticsHost(url),
  };
}

const posts = relevant.filter((e) => (e?.request?.method ?? '').toUpperCase() === 'POST');
console.log('POST requests found:', posts.length);

const rankedPosts = posts
  .map((e) => ({ e, s: summarizeEntry(e) }))
  .sort((a, b) => {
    // Prefer higher keyword signal; deprioritize analytics; then longer bodies.
    const scoreDiff = (b.s.likelySubmitScore ?? 0) - (a.s.likelySubmitScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    const aPenalty = a.s.looksLikeAnalytics ? 1 : 0;
    const bPenalty = b.s.looksLikeAnalytics ? 1 : 0;
    if (aPenalty !== bPenalty) return aPenalty - bPenalty;
    const aLen = a.s.postDataTextSnippet?.length ?? 0;
    const bLen = b.s.postDataTextSnippet?.length ?? 0;
    return bLen - aLen;
  });

rankedPosts.slice(0, 25).forEach(({ e }, i) => {
  console.log(`\n--- POST #${i + 1} ---`);
  console.log(JSON.stringify(summarizeEntry(e), null, 2));
});

console.log(`\nAll relevant requests: ${relevant.length}`);

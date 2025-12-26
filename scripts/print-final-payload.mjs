import fs from 'node:fs';

const capturePath = process.argv[2] ?? './captures/privatelender_capture_20251225_155018.json';
const json = JSON.parse(fs.readFileSync(capturePath, 'utf8'));

const requests = Array.isArray(json.requests) ? json.requests : [];
const posts = requests.filter((r) => r?.method === 'POST' && String(r?.url ?? '').includes('intake-form-update.php'));

function decodeBody(r) {
  if (r?.postDataBase64) return Buffer.from(r.postDataBase64, 'base64').toString('utf8');
  return String(r?.postData ?? '');
}

const decoded = posts
  .map((r) => {
    const raw = decodeBody(r);
    let obj = null;
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
    return { url: r.url, ts: r.ts ?? r.timestamp ?? 0, obj, raw };
  })
  .filter((x) => x.obj && typeof x.obj === 'object');

const finals = decoded.filter((x) => x.obj.complete === true).sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
const last = finals.at(-1);

if (!last) {
  console.log('No complete=true payload found in capture:', capturePath);
  process.exit(0);
}

const formData = last.obj.form_data ?? {};

console.log('Found complete=true payload');
console.log('session_id:', last.obj.session_id);
console.log('Top-level keys:', Object.keys(last.obj).join(', '));
console.log('form_data key count:', Object.keys(formData).length);
console.log('form_data keys:', Object.keys(formData).sort().join(', '));
console.log('---');
const sampleKeys = [
  'email',
  'firstName',
  'lastName',
  'phoneNum',
  'selectionTagsBorrowerBroker',
  'selectionTagsFICO',
  'addressInput',
  'selectionTagsPropertyType',
  'loanPurpose',
  'selectionTagsPurchaseRefinance',
  'selectionTagsRefi6Months',
  'selectionTagsLoanType',
  'inputLandCost',
  'inputGUCPurchaseConstructionCost',
  'inputGUCARV',
  'selectionTagsBorrowerExperience',
  'selectionTagsPreferredClosing',
  'selectionTagsBrokerFee',
  'radioGroupLeadSource',
];
for (const k of sampleKeys) {
  if (Object.prototype.hasOwnProperty.call(formData, k)) {
    console.log(`${k}:`, JSON.stringify(formData[k]));
  }
}

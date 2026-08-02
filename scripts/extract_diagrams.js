#!/usr/bin/env node
/**
 * Extract original DIAGRAMS from ga4-study-simulator.html by evaluating
 * the svg helper + DIAGRAMS object in a sandbox, then write data/diagrams.json
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'ga4-study-simulator.html'), 'utf8');

const start = html.indexOf('const svgNS = "http://www.w3.org/2000/svg";');
const end = html.indexOf('// Confirmed real official videos');
if (start < 0 || end < 0) {
  console.error('Could not locate DIAGRAMS block');
  process.exit(1);
}

const block = html.slice(start, end);
// Evaluate helpers + DIAGRAMS
const sandbox = { DIAGRAMS: null };
const fn = new Function(`${block}\nreturn DIAGRAMS;`);
const diagrams = fn();

const out = {};
for (const [k, v] of Object.entries(diagrams)) {
  out[k] = v;
  console.log(k, String(v).length, 'chars');
}

const outPath = path.join(root, 'data', 'diagrams.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 0));
console.log('Wrote', outPath, Math.round(fs.statSync(outPath).size / 1024), 'KB', Object.keys(out).length, 'diagrams');

// Topic id -> diagram key mapping used in original topics
const map = {
  structure: 'structure',
  'dimensions-metrics': 'dimmetric',
  'key-events': 'keyevents',
  reports: 'realtime',
  explore: 'explore',
  scopes: 'scopes',
  attribution: 'attribution',
  'campaign-tracking': 'utm',
  advertising: 'advertising',
  governance: 'cardinality',
  'bigquery-api': 'bigquery',
  ga360: 'ga360',
  consent: 'consent',
  signalsads: 'signalsads',
  setupassist: 'setupassist',
  eventparams: 'eventparams',
  'enhanced-measurement': 'enhmeasure',
  debugview: 'debugview',
  'user-id': 'userid',
  'cross-domain': 'crossdomain',
  predictive: 'predictive',
  'channel-groups': 'channelgroups',
  'gtag-gtm': 'gtagvsgtm'
};
fs.writeFileSync(path.join(root, 'data', 'diagram-map.json'), JSON.stringify(map, null, 2));
console.log('Wrote diagram-map.json');

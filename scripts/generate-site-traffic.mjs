#!/usr/bin/env node
import { writeTrafficPayload } from './site-traffic-observer.mjs';
const [output = 'data/site-traffic.json', ...inputs] = process.argv.slice(2);
if (!inputs.length) { console.error('Usage: node scripts/generate-site-traffic.mjs <output-json> <access.log...>'); process.exit(2); }
writeTrafficPayload(inputs, output);

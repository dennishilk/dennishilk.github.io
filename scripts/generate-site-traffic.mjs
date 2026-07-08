#!/usr/bin/env node
import { writeTrafficPayload } from './site-traffic-observer.mjs';

const DEFAULT_ACCESS_LOG = process.env.SITE_TRAFFIC_ACCESS_LOG || '/var/log/nginx/access.log';
const [output = 'data/site-traffic.json', ...providedInputs] = process.argv.slice(2);
const inputs = providedInputs.length ? providedInputs : [DEFAULT_ACCESS_LOG];

writeTrafficPayload(inputs, output);

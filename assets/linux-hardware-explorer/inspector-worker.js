import { parseHardwareReport, parseIdentifier, identifyDevices } from './core.js';
import { catalog } from './catalog.js';
import { inspectLog } from '../linux-fix-lab/core.js';
import { catalog as fixLab } from '../linux-fix-lab/catalog.js';
import { correlateUsbReports } from './usb-topology.js';
import { enrichKernelResults } from './kernel-index-loader.js';

self.onmessage = async event => {
  const { id, report, format } = event.data || {};
  try {
    let parsed;
    if (typeof report === 'string' && /^(?:(?:pci|usb):)?[a-f0-9]{4}:[a-f0-9]{4}$/i.test(report.trim())) {
      parsed = { devices: [parseIdentifier(report)], formats: ['identifier'], lineCount: 1, shortened: 0, firmwareObservations: 0, warnings: [] };
    } else parsed = parseHardwareReport(report, { format });
    correlateUsbReports(parsed, report);
    // Reuse explainable Lab signatures, but never send matching raw log lines back to the UI.
    const findings = inspectLog(report, fixLab.patterns).findings.map(({ patternId, problemId, count }) => ({ patternId, problemId, count }));
    const results = await enrichKernelResults(identifyDevices(parsed, catalog));
    self.postMessage({ id, result: { parsed, results, findings } });
  } catch (error) {
    const allowed = ['invalid-input', 'invalid-format', 'too-large', 'too-many-lines', 'too-many-devices', 'json-depth-or-node-limit'];
    self.postMessage({ id, error: allowed.includes(error.message) ? error.message : 'invalid-report' });
  }
};

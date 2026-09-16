import p1 from "./failure-lab-payload-1.js";
import p2 from "./failure-lab-payload-2.js";
import p3 from "./failure-lab-payload-3.js";
import p4 from "./failure-lab-payload-4.js";

const payload = p1 + p2 + p3 + p4;
const compressed = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
const source = await new Response(stream).text();
const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
try {
  await import(moduleUrl);
} finally {
  URL.revokeObjectURL(moduleUrl);
}

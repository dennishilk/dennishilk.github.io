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

  const layoutPolish = document.createElement("style");
  layoutPolish.id = "failure-lab-layout-polish";
  layoutPolish.textContent = `
    html,body{max-width:100%;overflow-x:clip}
    .lab-shell{width:100%;max-width:1620px;margin-inline:auto;padding-inline:clamp(16px,2vw,28px)}
    .lab-header{grid-template-columns:minmax(0,.9fr) minmax(0,1.25fr);gap:24px}
    .lab-intro,.lab-topbar,.left-rail,.center-stage,.right-rail,.panel,.machine-frame,.timeline-panel,.diagnostic-drawer,.control-deck,.lab-footer{min-width:0;max-width:100%}
    .lab-grid{width:100%;grid-template-columns:minmax(250px,280px) minmax(0,1fr) minmax(250px,280px);gap:18px}
    .scenario-panel,.scenario-list,.scenario-option{min-width:0;max-width:100%}
    .scenario-list{overflow-x:hidden!important;scrollbar-gutter:stable}
    .scenario-option{overflow:hidden}
    .scenario-option strong{min-width:0;flex-wrap:wrap;align-items:flex-start;overflow-wrap:anywhere}
    .scenario-option small,.scenario-meta dd,.scenario-summary,.evidence-list li,.explanation-card p{overflow-wrap:anywhere}
    .severity-chip{flex:0 0 auto;max-width:100%}
    .failure-terminal{overflow-x:hidden;overflow-y:auto}
    .failure-terminal pre,.terminal-prompt{max-width:100%;min-width:0}
    .machine-toolbar,.machine-ident,.machine-flags,.timeline-header,.control-group,.control-state{min-width:0}

    @media(max-width:1480px){
      .lab-shell{max-width:1360px}
      .lab-header{grid-template-columns:minmax(0,.88fr) minmax(0,1.12fr);gap:20px}
      .lab-grid{grid-template-columns:240px minmax(0,1fr) 240px;gap:14px}
    }

    @media(max-width:1180px){
      .lab-shell{max-width:100%}
      .lab-grid{grid-template-columns:1fr}
      .scenario-list{overflow-x:hidden!important}
    }
  `;
  document.head.append(layoutPolish);
} finally {
  URL.revokeObjectURL(moduleUrl);
}

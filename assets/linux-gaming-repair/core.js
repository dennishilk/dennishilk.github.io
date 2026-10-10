/* Browser-local evidence classification. No requests, storage, or executable input.
 * Patterns describe reported events, not a proven cause or a compatibility verdict.
 * Every matcher works on one length-limited line; no arbitrary regular expressions.
 */
export const LIMITS = Object.freeze({
  characters: 1048576, lines: 12000, lineLength: 8192,
  evidencePerFinding: 3, evidenceLength: 500,
});

const bilingual = (en, de) => Object.freeze({ en, de });
const includesAny = (text, words) => words.some(word => text.includes(word));
const gpuContext = text => includesAny(text, ['amdgpu', 'radeon', 'nvrm', 'nvidia', 'i915', 'nouveau', ' xe ']);
const ataContext = text => /\bata\d{1,3}(?:\.\d{1,2})?:/.test(text);
const vulkanContext = text => includesAny(text, ['vulkan', 'vkcreate', 'vkenumerate', 'vkallocate', 'vkqueue', 'dxvk', 'vkd3d', 'radv', 'anv:']);
const explicitFailure = text => /(?:\berr:|\berror\b|\bfailed\b|\bfailure\b|\breturned\b|\bresult[=:])/.test(text);
const descriptionOnly = text => /^\s*(?:(?:info|warn|warning):\s*)?(?:example(?:\s+error)?|supported errors?|possible errors?|error definitions?|error enums?)\b/.test(text) || /\b(?:can return|may return)\s+vk_error_/.test(text);
const nonEvent = text => /^\s*(?:#|\/\/|;)/.test(text)
  || /^\s*(?:no|none|not)\s+(?:amdgpu|nvrm|dxvk|vkd3d|vulkan|pcie|ata\d+)\b/.test(text)
  || /\b(?:not|never)\s+(?:been\s+)?(?:observed|reported|seen|returned|called|failed|lost|reset)\b/.test(text)
  || /\b(?:not|never)\s+(?:an?\s+)?(?:error|failure|timeout|crash)\b/.test(text)
  || /\b(?:no|without)\s+(?:reported\s+)?(?:gpu\s+|vulkan\s+|amdgpu\s+)?(?:errors?|failures?|timeouts?|resets?)\s+(?:were\s+|was\s+)?(?:reported|observed|seen|detected|recorded|occurred)\b/.test(text)
  || /\b(?:errors?|failures?|timeouts?|resets?)\s+(?:were\s+|was\s+|have\s+been\s+|has\s+been\s+)?(?:not|never)\s+(?:reported|observed|seen|detected|recorded)\b/.test(text)
  || /\b(?:expected|anticipated|hypothetical|simulated)\s+(?:output|error|failure|result|code|message)\b/.test(text)
  || /\b(?:vk_success|vk_error_[a-z_]+)\s+(?:is\s+)?(?:expected|hypothetical|documented)\b/.test(text);
const spec = (id, category, severity, title, explanation, next, articleIds, match) => ({
  id, category, severity, title, explanation, next, articleIds: Object.freeze(articleIds), match,
});

// Short, explicit event signatures. Numeric IDs, versions, warnings and fixme are
// never themselves evidence of a failure. See the paired tests for each signature.
const signatures = [
  spec('vulkan-initialization', 'vulkan-instance', 'error',
    bilingual('Vulkan instance initialization failed', 'Vulkan-Instanz konnte nicht initialisiert werden'),
    bilingual('The supplied line reports an instance-creation failure. It does not identify the failing driver or prove that Vulkan is unavailable in every runtime.', 'Die Zeile meldet eine fehlgeschlagene Instanz-Erstellung. Sie benennt weder den fehlerhaften Treiber noch beweist sie, dass Vulkan in jeder Laufzeitumgebung fehlt.'),
    bilingual('Collect vulkaninfo --summary in the same environment and compare loader output with the game runtime and its architecture.', 'vulkaninfo --summary in derselben Umgebung erfassen und Loader-Ausgabe mit Laufzeitumgebung und Architektur des Spiels vergleichen.'),
    ['vulkan-initialization', 'vulkan-32-bit'],
    text => vulkanContext(text) && includesAny(text, ['failed to create vulkan instance', 'failed to create instance', 'vk_error_initialization_failed']) && explicitFailure(text)),
  spec('vulkan-no-drivers', 'vulkan-loader', 'error',
    bilingual('Vulkan loader found no usable driver', 'Vulkan-Loader fand keinen nutzbaren Treiber'),
    bilingual('The loader reports no driver or ICD that it can use. Search paths, architecture, runtime isolation and driver installation remain separate hypotheses.', 'Der Loader meldet keinen verwendbaren Treiber beziehungsweise ICD. Suchpfade, Architektur, isolierte Laufzeitumgebung und Treiberinstallation bleiben getrennte Hypothesen.'),
    bilingual('Inspect loader diagnostics and available ICD manifests in the affected environment. Do not copy an arbitrary ICD path from another machine.', 'Loader-Diagnose und verfügbare ICD-Manifeste in der betroffenen Umgebung prüfen. Keinen beliebigen ICD-Pfad von einem anderen Rechner übernehmen.'),
    ['vulkan-initialization', 'vulkan-32-bit'],
    text => vulkanContext(text) && includesAny(text, ['found no drivers', 'no drivers found', 'failed to load vulkan-1 library', 'cannot find a compatible vulkan installable client driver', 'failed to open libvulkan.so'])),
  spec('vulkan-missing-extension', 'vulkan-capability', 'error',
    bilingual('A requested Vulkan feature or extension failed', 'Angeforderte Vulkan-Funktion oder Erweiterung fehlt'),
    bilingual('A feature or extension requirement was rejected. The failing request may come from the game, a translation layer or an injected overlay; a warning about an optional extension alone is not this finding.', 'Eine Funktions- oder Erweiterungsanforderung wurde abgelehnt. Sie kann vom Spiel, einer Übersetzungsschicht oder einem Overlay stammen; eine Warnung zu einer optionalen Erweiterung allein ist kein solcher Befund.'),
    bilingual('Identify the caller and the selected device, then compare their reported capabilities with the exact DXVK or VKD3D-Proton requirements.', 'Aufrufer und ausgewähltes Gerät bestimmen; gemeldete Fähigkeiten mit den Anforderungen der konkreten DXVK- oder VKD3D-Proton-Version vergleichen.'),
    ['vulkan-initialization', 'dxvk-no-device', 'vkd3d-startup'],
    text => vulkanContext(text) && explicitFailure(text) && includesAny(text, ['vk_error_extension_not_present', 'vk_error_feature_not_present', 'required extension not supported', 'required vulkan extension is not supported'])),
  spec('vulkan-wrong-architecture', 'runtime-architecture', 'error',
    bilingual('Graphics library has the wrong ELF architecture', 'Grafikbibliothek hat die falsche ELF-Architektur'),
    bilingual('A Vulkan or graphics-library load reports an ELF-class mismatch. This is architecture evidence, not proof that a particular package is missing.', 'Beim Laden einer Vulkan- oder Grafikbibliothek wird ein ELF-Klassenkonflikt gemeldet. Das ist ein Architekturhinweis und kein Beweis für ein bestimmtes fehlendes Paket.'),
    bilingual('Compare 32-bit and 64-bit loader results inside the game runtime, then use the distribution-specific multilib guidance.', '32- und 64-Bit-Loader-Ergebnisse innerhalb der Spiel-Laufzeitumgebung vergleichen und distributionsspezifische Multilib-Hinweise verwenden.'),
    ['vulkan-32-bit'],
    text => includesAny(text, ['vulkan', 'libgl', 'libegl', 'icd']) && /\bwrong elf class:\s*elfclass(?:32|64)\b/.test(text)),
  spec('dxvk-no-adapters', 'dxvk-selection', 'error',
    bilingual('DXVK found no usable Vulkan adapter', 'DXVK fand keinen nutzbaren Vulkan-Adapter'),
    bilingual('DXVK reported an empty usable-adapter selection. Adapter filters and version-specific capability requirements can cause this even when vulkaninfo enumerates a device.', 'DXVK meldete eine leere Auswahl nutzbarer Adapter. Adapterfilter und versionsabhängige Anforderungen können das auch verursachen, wenn vulkaninfo ein Gerät auflistet.'),
    bilingual('Compare the DXVK version, device-filter launch options and game-runtime Vulkan enumeration before changing packages.', 'DXVK-Version, Gerätefilter in den Startoptionen und Vulkan-Geräte der Spiel-Laufzeitumgebung vergleichen, bevor Pakete geändert werden.'),
    ['dxvk-no-device', 'wrong-gpu', 'vulkan-32-bit'],
    text => /\bdxvk:\s*no adapters found\b/.test(text) || text.includes('dxvkinstance::enumadapters: failed to enumerate adapters')),
  spec('dxvk-device-create', 'dxvk-device', 'error',
    bilingual('DXVK device creation failed', 'DXVK-Geräteerstellung fehlgeschlagen'),
    bilingual('DXVK reached a device-creation failure. The error alone does not distinguish unsupported features, userspace problems or a kernel-device failure.', 'DXVK erreichte eine fehlgeschlagene Geräteerstellung. Der Fehler allein trennt fehlende Funktionen, Userspace-Probleme und einen Kernel-Gerätefehler nicht.'),
    bilingual('Keep the preceding adapter and extension lines and correlate the time with the kernel journal.', 'Vorherige Adapter- und Erweiterungszeilen behalten und den Zeitpunkt mit dem Kernel-Journal abgleichen.'),
    ['dxvk-no-device', 'vulkan-initialization'],
    text => includesAny(text, ['dxvkadapter:', 'dxvkadapter::', 'dxvkdevice:', 'dxvkdevice::']) && includesAny(text, ['failed to create device', 'failed to create vulkan device'])),
  spec('vkd3d-device-create', 'vkd3d-device', 'error',
    bilingual('VKD3D-Proton device creation failed', 'VKD3D-Proton-Geräteerstellung fehlgeschlagen'),
    bilingual('A Direct3D 12 translation-layer device request failed. This is distinct from a DXVK Direct3D 9–11 failure, and a generic fixme message is insufficient evidence.', 'Eine Geräteanforderung der Direct3D-12-Übersetzungsschicht schlug fehl. Das unterscheidet sich von DXVK für Direct3D 9–11; eine allgemeine fixme-Meldung reicht als Beleg nicht aus.'),
    bilingual('Collect the VKD3D-Proton version, selected Vulkan device, preceding capability checks and same-time kernel messages.', 'VKD3D-Proton-Version, ausgewähltes Vulkan-Gerät, vorherige Fähigkeitsprüfungen und zeitgleiche Kernel-Meldungen erfassen.'),
    ['vkd3d-startup', 'vulkan-initialization'],
    text => text.includes('vkd3d') && includesAny(text, ['failed to create vulkan device', 'failed to create d3d12 device', 'd3d12createdevice failed'])),
  spec('vulkan-device-lost', 'userspace-device-loss', 'error',
    bilingual('Vulkan reported a lost device', 'Vulkan meldete ein verlorenes Gerät'),
    bilingual('A Vulkan operation reported device loss. This is an observed userspace failure, not a diagnosis of defective hardware or a specific driver regression.', 'Ein Vulkan-Aufruf meldete Geräteverlust. Das ist ein beobachteter Userspace-Fehler und keine Diagnose defekter Hardware oder einer bestimmten Treiberregression.'),
    bilingual('Align the game log with the kernel journal. Check for independent GPU timeout, recovery, PCIe and storage events.', 'Spiel-Log und Kernel-Journal zeitlich abgleichen. Unabhängige GPU-Timeouts, Wiederherstellung, PCIe- und Speicherereignisse prüfen.'),
    ['amdgpu-ring-timeout', 'movement-freezes', 'vkd3d-startup'],
    text => text.includes('vk_error_device_lost') && explicitFailure(text)),
  spec('vulkan-device-memory', 'gpu-allocation', 'error',
    bilingual('A Vulkan device-memory allocation failed', 'Vulkan-Gerätespeicher-Zuweisung fehlgeschlagen'),
    bilingual('The caller reported a device-memory allocation failure. Memory budgets, fragmentation and allocation constraints can matter; this does not establish that physical VRAM was completely full.', 'Der Aufrufer meldete einen Fehler bei der Gerätespeicher-Zuweisung. Budgets, Fragmentierung und Zuweisungsgrenzen können relevant sein; vollständig belegter physischer VRAM ist dadurch nicht bewiesen.'),
    bilingual('Capture memory-budget and VRAM telemetry at the failure, and compare one reversible texture or resolution change.', 'Speicherbudget- und VRAM-Messwerte am Fehlerzeitpunkt erfassen und eine rückgängig machbare Textur- oder Auflösungsänderung vergleichen.'),
    ['vkd3d-startup', 'movement-freezes'],
    text => text.includes('vk_error_out_of_device_memory') && explicitFailure(text)),
  spec('vulkan-host-memory', 'host-allocation', 'error',
    bilingual('A Vulkan host-memory allocation failed', 'Vulkan-Hostspeicher-Zuweisung fehlgeschlagen'),
    bilingual('Vulkan reported host-memory allocation failure. This is distinct from device-memory failure and does not itself prove that the kernel killed a process.', 'Vulkan meldete eine fehlgeschlagene Hostspeicher-Zuweisung. Das unterscheidet sich vom Gerätespeicherfehler und beweist keinen vom Kernel beendeten Prozess.'),
    bilingual('Check process memory, system memory and resource limits around the failure, plus kernel OOM messages.', 'Prozessspeicher, Systemspeicher und Ressourcengrenzen am Fehlerzeitpunkt sowie OOM-Meldungen des Kernels prüfen.'),
    ['proton-startup', 'movement-freezes'],
    text => text.includes('vk_error_out_of_host_memory') && explicitFailure(text)),
  spec('kernel-oom-kill', 'system-memory', 'error',
    bilingual('The kernel reported an out-of-memory kill', 'Kernel meldete eine OOM-Prozessbeendigung'),
    bilingual('An explicit kernel OOM-kill line was observed. The killed process may be the game or an unrelated process; RAM pressure is distinct from a VRAM allocation failure.', 'Eine ausdrückliche OOM-Kill-Zeile des Kernels wurde beobachtet. Der beendete Prozess kann das Spiel oder ein anderer Prozess sein; RAM-Druck unterscheidet sich von einem VRAM-Zuweisungsfehler.'),
    bilingual('Inspect surrounding OOM messages and cgroup limits, and correlate the killed process with the game session.', 'Umgebende OOM-Meldungen und Cgroup-Grenzen prüfen und den beendeten Prozess der Spielsitzung zuordnen.'),
    ['proton-startup', 'movement-freezes'],
    text => text.includes('out of memory: killed process') || /\boom-kill:/.test(text) || /\bmemory cgroup out of memory: killed process\b/.test(text)),
  spec('amdgpu-ring-timeout', 'gpu-scheduler', 'error',
    bilingual('AMDGPU reported a ring timeout', 'AMDGPU meldete einen Ring-Timeout'),
    bilingual('The driver reported a job that did not complete in time on a GPU ring. Workload, kernel/firmware, graphics userspace and hardware/transport remain hypotheses.', 'Der Treiber meldete einen Auftrag, der auf einem GPU-Ring nicht rechtzeitig abgeschlossen wurde. Workload, Kernel/Firmware, Grafik-Userspace und Hardware/Transport bleiben Hypothesen.'),
    bilingual('Preserve the full timeout and recovery sequence, exact versions and reproduction steps before testing one change.', 'Vollständige Timeout- und Wiederherstellungsfolge, genaue Versionen und Reproduktionsschritte sichern, bevor eine einzelne Änderung getestet wird.'),
    ['amdgpu-ring-timeout', 'movement-freezes'],
    text => text.includes('amdgpu') && /\bring\s+[a-z0-9_.-]{1,48}\s+timeout(?:\s*[,!.]|\s*$)/.test(text)),
  spec('amdgpu-reset', 'gpu-recovery', 'warning',
    bilingual('AMDGPU began GPU recovery', 'AMDGPU begann eine GPU-Wiederherstellung'),
    bilingual('A reset/recovery attempt began. Recovery is a response to a problem, not proof of its cause or proof that the recovery succeeded.', 'Ein Reset beziehungsweise Wiederherstellungsversuch begann. Die Wiederherstellung ist eine Reaktion auf ein Problem und beweist weder Ursache noch Erfolg.'),
    bilingual('Read the events immediately before and after the reset, and distinguish successful recovery from a machine hard-lock.', 'Ereignisse unmittelbar vor und nach dem Reset lesen und erfolgreiche Wiederherstellung von einem vollständigen Systemstillstand trennen.'),
    ['amdgpu-ring-timeout'],
    text => text.includes('amdgpu') && (text.includes('gpu reset begin') || /\bstarting\s+[a-z0-9_.-]{1,48}\s+ring reset\b/.test(text))),
  spec('amdgpu-reset-failed', 'gpu-recovery-failure', 'error',
    bilingual('AMDGPU recovery failed', 'AMDGPU-Wiederherstellung fehlgeschlagen'),
    bilingual('The supplied line explicitly reports failed reset or recovery. It does not identify whether the initial fault came from hardware, firmware, kernel or userspace.', 'Die Zeile meldet ausdrücklich einen fehlgeschlagenen Reset oder eine fehlgeschlagene Wiederherstellung. Sie bestimmt nicht, ob der anfängliche Fehler aus Hardware, Firmware, Kernel oder Userspace kam.'),
    bilingual('Keep previous-boot logs and compare the original timeout with the recovery failure. A missing final record is still inconclusive.', 'Logs des vorherigen Starts sichern und ursprünglichen Timeout mit dem Wiederherstellungsfehler vergleichen. Eine fehlende letzte Meldung bleibt unklar.'),
    ['amdgpu-ring-timeout', 'movement-freezes'],
    text => text.includes('amdgpu') && (includesAny(text, ['gpu reset failed', 'gpu recovery failed', 'failed to reset gpu']) || /\bring\s+[a-z0-9_.-]{1,48}\s+reset failed\b/.test(text))),
  spec('gpu-lost-bus', 'gpu-transport', 'error',
    bilingual('The GPU was reported lost from the bus', 'GPU wurde als vom Bus verschwunden gemeldet'),
    bilingual('The driver reported loss of access to the GPU over its bus. PCIe topology/link, power, hardware and driver/firmware recovery merit investigation; this does not identify a bad cable or card.', 'Der Treiber meldete den Verlust des GPU-Zugriffs über den Bus. PCIe-Topologie und Verbindung, Versorgung, Hardware und Treiber-/Firmware-Wiederherstellung verdienen Prüfung; ein defektes Kabel oder eine defekte Karte ist dadurch nicht bestimmt.'),
    bilingual('Compare same-time PCIe AER and GPU events, document the physical topology and change only one variable per controlled test.', 'Zeitgleiche PCIe-AER- und GPU-Ereignisse vergleichen, physische Topologie dokumentieren und pro kontrolliertem Test nur eine Variable ändern.'),
    ['amdgpu-ring-timeout', 'movement-freezes'],
    text => gpuContext(text) && includesAny(text, ['device lost from bus', 'gpu has fallen off the bus', 'gpu lost from bus'])),
  spec('pcie-aer-uncorrected', 'pcie-uncorrected', 'error',
    bilingual('PCIe reported an uncorrected AER error', 'PCIe meldete einen unkorrigierten AER-Fehler'),
    bilingual('An uncorrected PCIe bus error was logged. A root-port report can describe a downstream device; the line alone does not establish that the GPU was responsible.', 'Ein unkorrigierter PCIe-Busfehler wurde protokolliert. Eine Root-Port-Meldung kann ein nachgelagertes Gerät betreffen; die Zeile allein macht die GPU nicht zur Ursache.'),
    bilingual('Map the reporting and affected BDFs with lspci -t and inspect the complete AER recovery block.', 'Meldende und betroffene BDFs mit lspci -t zuordnen und den vollständigen AER-Wiederherstellungsblock prüfen.'),
    ['movement-freezes', 'amdgpu-ring-timeout'],
    text => /\bpcie bus error:\s*severity=uncorrected\b/.test(text) || /\baer:\s*uncorrected\s*\((?:fatal|non-fatal)\)\s*error/.test(text)),
  spec('pcie-aer-corrected', 'pcie-corrected', 'warning',
    bilingual('PCIe reported a corrected AER event', 'PCIe meldete ein korrigiertes AER-Ereignis'),
    bilingual('A correctable PCIe error was reported and corrected by the link/protocol. An isolated corrected event is not proof of the cause of a game freeze.', 'Ein korrigierbarer PCIe-Fehler wurde gemeldet und durch Verbindung oder Protokoll korrigiert. Ein einzelnes korrigiertes Ereignis beweist keine Ursache eines Spielstillstands.'),
    bilingual('Check recurrence, device topology and timestamps. Treat this as transport context until it correlates with a reproducible failure.', 'Wiederholung, Gerätetopologie und Zeitstempel prüfen. Bis zur Korrelation mit einem reproduzierbaren Fehler als Transportkontext behandeln.'),
    ['movement-freezes'],
    text => /\bpcie bus error:\s*severity=corrected\b/.test(text) || /\baer:\s*corrected error received\b/.test(text)),
  spec('sata-interface', 'sata-transport', 'error',
    bilingual('SATA reported an interface or CRC error', 'SATA meldete einen Schnittstellen- oder CRC-Fehler'),
    bilingual('The ATA line reports transport/interface trouble, including CRC or handshake errors. This can produce I/O stalls independently of GPU failures; it is not proof of defective storage media.', 'Die ATA-Zeile meldet Transport- beziehungsweise Schnittstellenprobleme, etwa CRC- oder Handshake-Fehler. Sie können unabhängig von GPU-Fehlern I/O-Stalls erzeugen und beweisen keine defekten Speichermedien.'),
    bilingual('Map the ATA port to the drive, correlate timestamps and inspect cable/port and SMART evidence. A GPU hypothesis remains separate.', 'ATA-Port dem Laufwerk zuordnen, Zeitstempel abgleichen sowie Kabel/Port und SMART-Hinweise prüfen. Eine GPU-Hypothese bleibt davon getrennt.'),
    ['movement-freezes'],
    text => ataContext(text) && (text.includes('interface fatal error') || text.includes('serror:') && includesAny(text, ['badcrc', '10b8b', 'handshk', 'unrecovdata']))),
  spec('sata-link-reset', 'sata-recovery', 'warning',
    bilingual('SATA recovery reset a link', 'SATA-Wiederherstellung setzte eine Verbindung zurück'),
    bilingual('An ATA link-reset attempt was reported. A reset can interrupt I/O while recovery runs; a reset alone does not establish the original failure.', 'Ein ATA-Verbindungsreset wurde gemeldet. Während der Wiederherstellung kann I/O unterbrochen werden; der Reset allein erklärt den ursprünglichen Fehler nicht.'),
    bilingual('Read preceding ATA exceptions and failed-command messages, then compare their times with the frame-time stalls.', 'Vorherige ATA-Ausnahmen und fehlgeschlagene Befehle lesen und ihre Zeitpunkte mit den Frame-Time-Stalls vergleichen.'),
    ['movement-freezes'],
    text => ataContext(text) && includesAny(text, ['hard resetting link', 'softreset failed', 'hardreset failed'])),
  spec('ata-command-failed', 'ata-command', 'error',
    bilingual('An ATA read/write command failed', 'ATA-Lese- oder Schreibbefehl fehlgeschlagen'),
    bilingual('The kernel reports a failed storage command. READ FPDMA QUEUED is an ordinary queued read command; its name without a failure message is not an error.', 'Der Kernel meldet einen fehlgeschlagenen Speicherbefehl. READ FPDMA QUEUED ist ein normaler warteschlangenbasierter Lesebefehl; der Name ohne Fehlermeldung ist kein Fehler.'),
    bilingual('Inspect the ATA exception, SError and recovery block and map the affected drive before drawing a media or transport conclusion.', 'ATA-Ausnahme, SError und Wiederherstellungsblock prüfen sowie das betroffene Laufwerk zuordnen, bevor Medien- oder Transportursachen angenommen werden.'),
    ['movement-freezes'],
    text => ataContext(text) && /\bfailed command:\s*(?:read|write)\b/.test(text)),
  spec('storage-io-error', 'storage-io', 'error',
    bilingual('The storage layer reported an I/O error', 'Speicherschicht meldete einen I/O-Fehler'),
    bilingual('A block-device or NVMe I/O failure was reported. Controller, transport, drive and filesystem context are needed; it is separate evidence from a graphics timeout.', 'Ein Blockgeräte- oder NVMe-I/O-Fehler wurde gemeldet. Controller-, Transport-, Laufwerks- und Dateisystemkontext werden benötigt; der Befund ist von einem Grafik-Timeout getrennt.'),
    bilingual('Find the affected device and surrounding journal events. Compare activity and timestamps before attributing game stalls to storage.', 'Betroffenes Gerät und umgebende Journal-Ereignisse bestimmen. Aktivität und Zeitstempel vergleichen, bevor Spiel-Stalls dem Speicher zugeschrieben werden.'),
    ['movement-freezes'],
    text => /\b(?:i\/o error, dev|buffer i\/o error on dev|blk_update_request:\s*i\/o error)\b/.test(text) || /\bnvme\d{1,3}(?:n\d{1,3})?:\s*i\/o\s+\d{1,10}\s+q(?:id)?\s*\d{1,5}\s+timeout\b/.test(text)),
  spec('amdgpu-firmware-load', 'gpu-firmware', 'error',
    bilingual('GPU firmware loading failed', 'GPU-Firmware konnte nicht geladen werden'),
    bilingual('An explicit GPU-firmware load failure was observed. The error can reflect a missing file, access/runtime mismatch or initialization failure; no package name is inferred.', 'Ein ausdrücklicher Fehler beim Laden der GPU-Firmware wurde beobachtet. Er kann eine fehlende Datei, Zugriffs-/Laufzeitkonflikte oder einen Initialisierungsfehler bedeuten; ein Paketname wird nicht abgeleitet.'),
    bilingual('Keep the firmware filename and error code privately, then compare the booted kernel with the distribution firmware installation.', 'Firmware-Dateinamen und Fehlercode privat sichern und gestarteten Kernel mit der Firmware-Installation der Distribution vergleichen.'),
    ['amdgpu-ring-timeout'],
    text => text.includes('firmware') && text.includes('amdgpu') && includesAny(text, ['failed with error', 'failed to load', 'failed to request', 'firmware load failed'])),
  spec('nvidia-mismatch', 'nvidia-stack', 'error',
    bilingual('NVIDIA reported a driver/library mismatch', 'NVIDIA meldete einen Treiber-/Bibliothekskonflikt'),
    bilingual('NVIDIA explicitly reported an API or driver/library mismatch. This is stronger evidence than different version strings seen in unrelated log sessions.', 'NVIDIA meldete ausdrücklich einen API- oder Treiber-/Bibliothekskonflikt. Das ist belastbarer als unterschiedliche Versionszeichenfolgen aus unabhängigen Log-Sitzungen.'),
    bilingual('Compare the loaded kernel module and installed userspace libraries in the same boot and game runtime; use your distribution update procedure.', 'Geladenes Kernel-Modul und installierte Userspace-Bibliotheken im selben Systemstart und derselben Spiel-Laufzeitumgebung vergleichen; Update-Verfahren der Distribution verwenden.'),
    ['nvidia-mismatch'],
    text => text.includes('nvrm: api mismatch:') || text.includes('failed to initialize nvml: driver/library version mismatch')),
  spec('nvidia-xid', 'nvidia-reported-error', 'error',
    bilingual('NVIDIA reported an Xid event', 'NVIDIA meldete ein Xid-Ereignis'),
    bilingual('A numeric NVIDIA Xid event was logged. Xid codes describe different error classes; an Xid alone does not mean a faulty GPU or establish game compatibility.', 'Ein numerisches NVIDIA-Xid-Ereignis wurde protokolliert. Die Codes beschreiben verschiedene Fehlerklassen; ein Xid allein bedeutet keine defekte GPU und entscheidet nicht über Spielkompatibilität.'),
    bilingual('Preserve the exact Xid code and surrounding events and consult the NVIDIA Xid documentation for that event.', 'Genauen Xid-Code und umgebende Ereignisse sichern und NVIDIA-Dokumentation für dieses Ereignis nachschlagen.'),
    ['nvidia-mismatch', 'movement-freezes'],
    text => /\bnvrm:\s*xid\s*\([^\r\n)]{1,96}\):\s*\d{1,4}\b/.test(text)),
  spec('wine-missing-dll', 'windows-dependency', 'error',
    bilingual('Wine could not load a required DLL', 'Wine konnte eine benötigte DLL nicht laden'),
    bilingual('Wine explicitly failed to import a library. A missing DLL name does not mean it should be downloaded from an unofficial DLL site; architecture and the intended runtime matter.', 'Wine konnte eine Bibliothek ausdrücklich nicht importieren. Ein DLL-Name bedeutet nicht, dass sie von einer inoffiziellen DLL-Seite heruntergeladen werden sollte; Architektur und vorgesehene Laufzeitumgebung sind relevant.'),
    bilingual('Keep the original DLL name privately and compare game-file verification and official dependency installers before making prefix changes.', 'Ursprünglichen DLL-Namen privat behalten und Spiel-Dateiprüfung sowie offizielle Abhängigkeitsinstaller prüfen, bevor das Prefix geändert wird.'),
    ['proton-startup'],
    text => /\berr:module:(?:import_dll|ldrinitializethunk|attach_dlls)\b/.test(text) && includesAny(text, ['not found', 'importing dlls', 'failed (error'])),
  spec('wine-bad-executable', 'executable-format', 'error',
    bilingual('An executable or library format was rejected', 'Format einer Anwendung oder Bibliothek wurde abgelehnt'),
    bilingual('The launch/import line reports an invalid executable format or architecture mismatch. It does not identify a missing dependency on its own.', 'Die Start-/Importzeile meldet ein ungültiges Anwendungsformat oder einen Architekturkonflikt. Sie bestimmt für sich keine fehlende Abhängigkeit.'),
    bilingual('Check the executable architecture and source, game-file integrity and runtime before rebuilding or replacing a prefix.', 'Architektur und Herkunft der Anwendung, Spiel-Dateiintegrität und Laufzeitumgebung prüfen, bevor ein Prefix neu aufgebaut oder ersetzt wird.'),
    ['proton-startup', 'vulkan-32-bit'],
    text => (text.includes('wine') || text.includes('err:module:') || text.includes('proton')) && includesAny(text, ['bad exe format', 'invalid image format', 'failed (error c000007b)', 'cannot execute binary file: exec format error'])),
  spec('wine-prefix-permission', 'prefix-access', 'error',
    bilingual('Wine prefix access was denied', 'Zugriff auf Wine-Prefix verweigert'),
    bilingual('Wine reports an ownership or access problem for a prefix. Do not launch Steam or Wine as root to bypass it, and do not recursively change unrelated folders.', 'Wine meldet ein Eigentümer- oder Zugriffsproblem eines Prefix. Steam oder Wine nicht als root zum Umgehen starten und nicht rekursiv fremde Ordner ändern.'),
    bilingual('Inspect the specific prefix directory ownership and mount permissions read-only. Preserve the prefix and save files before any targeted repair.', 'Eigentümer und Mount-Rechte des konkreten Prefix-Verzeichnisses lesend prüfen. Prefix und Spielstände vor jeder gezielten Reparatur sichern.'),
    ['proton-startup'],
    text => text.includes('wine:') && (text.includes('is not owned by you') || includesAny(text, ['wineprefix', 'prefix', 'configuration directory']) && includesAny(text, ['permission denied', 'access denied']))),
  spec('wine-prefix-architecture', 'prefix-architecture', 'error',
    bilingual('Wine reported a prefix architecture conflict', 'Wine meldete einen Prefix-Architekturkonflikt'),
    bilingual('The chosen WINEARCH does not match the existing prefix, or the runtime explicitly rejected that prefix architecture. This is separate from Vulkan multilib availability.', 'WINEARCH passt nicht zum vorhandenen Prefix oder die Laufzeitumgebung hat dessen Architektur ausdrücklich abgelehnt. Das ist von verfügbarer Vulkan-Multilib-Unterstützung getrennt.'),
    bilingual('Record the runtime and prefix architecture. Prefer a separate disposable test prefix; preserve the original saves and settings.', 'Laufzeitumgebung und Prefix-Architektur notieren. Ein separates entbehrliches Test-Prefix bevorzugen; ursprüngliche Spielstände und Einstellungen sichern.'),
    ['proton-startup', 'vulkan-32-bit'],
    text => text.includes('wine:') && (text.includes('winearch set to win32') && text.includes('64-bit installation') || text.includes('winearch') && text.includes('not supported') || text.includes('prefix architecture mismatch'))),
  spec('wine-unhandled-exception', 'application-exception', 'error',
    bilingual('Wine reported an unhandled application exception', 'Wine meldete eine unbehandelte Anwendungsausnahme'),
    bilingual('Wine reported an unhandled exception/page fault. The failing code may be the application, its dependencies or the compatibility layer; this is not automatically a GPU crash.', 'Wine meldete eine unbehandelte Ausnahme beziehungsweise einen Seitenfehler. Fehlerhafter Code kann aus Anwendung, Abhängigkeiten oder Kompatibilitätsschicht stammen; das ist nicht automatisch ein GPU-Absturz.'),
    bilingual('Keep the stack trace and module context privately, then correlate with Proton and kernel logs from the same run.', 'Stacktrace und Modulkontext privat sichern und mit Proton- und Kernel-Logs desselben Laufs abgleichen.'),
    ['proton-startup'],
    text => text.includes('wine: unhandled page fault') || text.includes('wine: unhandled exception') || /\berr:seh:raise_exception\b/.test(text) && text.includes('unhandled exception')),
  spec('wine-display-unavailable', 'display-connection', 'error',
    bilingual('Wine could not connect to a display driver', 'Wine konnte keinen Display-Treiber verwenden'),
    bilingual('Wine reports no usable display/window driver. Session environment, XWayland/Wayland support and runtime access require checking; it does not prove Vulkan failed.', 'Wine meldet keinen nutzbaren Display-/Fenstertreiber. Sitzungsumgebung, XWayland-/Wayland-Unterstützung und Laufzeitzugriff müssen geprüft werden; ein Vulkan-Fehler ist dadurch nicht bewiesen.'),
    bilingual('Check the launch session and display variables, then compare the game under the normal desktop session without extra wrappers.', 'Startsitzung und Display-Variablen prüfen; Spiel anschließend in der normalen Desktop-Sitzung ohne zusätzliche Wrapper vergleichen.'),
    ['proton-startup', 'steam-deck-startup'],
    text => /\berr:winediag:nodrv_createwindow\b/.test(text) || text.includes('wine') && text.includes('cannot open display')),
  spec('gamescope-startup', 'compositor-startup', 'error',
    bilingual('Gamescope startup or its backend failed', 'Gamescope-Start oder Backend fehlgeschlagen'),
    bilingual('A Gamescope initialization/backend failure was reported. Gamescope is another layer; this does not establish that the game fails without it.', 'Ein Gamescope-Initialisierungs-/Backend-Fehler wurde gemeldet. Gamescope ist eine weitere Schicht; der Befund beweist keinen Fehler des Spiels ohne diese Schicht.'),
    bilingual('Remove only the temporary Gamescope wrapper for one comparison, keep the original options and inspect the backend error.', 'Nur den vorübergehenden Gamescope-Wrapper für einen Vergleich entfernen, ursprüngliche Optionen sichern und den Backend-Fehler prüfen.'),
    ['steam-deck-startup', 'vulkan-initialization'],
    text => text.includes('gamescope') && includesAny(text, ['failed to initialize', 'failed to create vulkan device', 'failed to create backend', 'could not initialize'])) ,
  spec('proton-launch-failed', 'compatibility-tool-startup', 'error',
    bilingual('Proton could not start its command', 'Proton konnte seinen Befehl nicht starten'),
    bilingual('The compatibility-tool startup explicitly failed or no compatibility-data path was supplied. This can occur before the game or graphics stack runs.', 'Der Start des Kompatibilitätswerkzeugs schlug ausdrücklich fehl oder ein Kompatibilitätsdaten-Pfad fehlte. Das kann vor dem Start von Spiel oder Grafikstack passieren.'),
    bilingual('Record the selected compatibility tool and Steam launch options. Compare a supported launch through Steam before altering the prefix.', 'Ausgewähltes Kompatibilitätswerkzeug und Steam-Startoptionen notieren. Unterstützten Start über Steam vergleichen, bevor das Prefix geändert wird.'),
    ['proton-startup', 'steam-deck-startup'],
    text => text.includes('proton:') && includesAny(text, ['no compat data path', 'failed to start', 'failed to execute', 'unable to launch'])),
  spec('steam-runtime-failed', 'steam-container', 'error',
    bilingual('Steam runtime/container startup failed', 'Steam-Laufzeitumgebung oder Container-Start fehlgeschlagen'),
    bilingual('A pressure-vessel or Steam Linux Runtime startup error was reported. Container setup failures are distinct from rendering failures inside a running game.', 'Ein Startfehler von pressure-vessel oder Steam Linux Runtime wurde gemeldet. Container-Einrichtungsfehler unterscheiden sich von Rendering-Fehlern in einem laufenden Spiel.'),
    bilingual('Keep the runtime error and compare a verified Steam runtime installation. Investigate the named access, namespace or filesystem operation first.', 'Laufzeitfehler sichern und eine geprüfte Steam-Runtime-Installation vergleichen. Zuerst den benannten Zugriff, Namespace- oder Dateisystemvorgang untersuchen.'),
    ['proton-startup', 'steam-deck-startup'],
    text => includesAny(text, ['pressure-vessel', 'steam linux runtime']) && (/\b(?:e|error):\s/.test(text) || includesAny(text, ['failed to initialize', 'failed to start', 'failed to create', 'bwrap: creating new namespace failed']))),
  spec('controller-permission', 'input-access', 'error',
    bilingual('An input-device access was denied', 'Zugriff auf Eingabegerät verweigert'),
    bilingual('The log reports denied access to an input or hidraw device. This is an access observation, not proof that a controller is unsupported or that a broad permission change is appropriate.', 'Das Log meldet verweigerten Zugriff auf ein Input- oder hidraw-Gerät. Das ist ein Zugriffsbefund und kein Beweis fehlender Controller-Unterstützung oder einer nötigen pauschalen Rechteänderung.'),
    bilingual('Compare kernel device detection, session ACLs and Steam Input. Use distribution-specific udev guidance; avoid chmod 777 on device nodes.', 'Kernel-Geräteerkennung, Sitzungs-ACLs und Steam Input vergleichen. Distributionsspezifische udev-Hinweise verwenden; kein chmod 777 für Geräteknoten.'),
    ['controller-input'],
    text => includesAny(text, ['/dev/input/', '/dev/hidraw']) && includesAny(text, ['permission denied', 'access denied', 'operation not permitted'])),
  spec('audio-backend-failed', 'audio-connection', 'error',
    bilingual('An audio backend or connection failed', 'Audio-Backend oder Verbindung fehlgeschlagen'),
    bilingual('A PulseAudio, PipeWire, ALSA or Wine audio-backend failure was reported. It does not show which output the user selected or prove that every audio stream failed.', 'Ein Fehler bei PulseAudio, PipeWire, ALSA oder einem Wine-Audio-Backend wurde gemeldet. Er zeigt weder die gewählte Ausgabe noch beweist er, dass alle Audioströme ausfielen.'),
    bilingual('Check the current audio server, selected output and per-application stream while the game runs, before changing audio configuration.', 'Aktuellen Audioserver, gewählte Ausgabe und Anwendungsstream während des Spiels prüfen, bevor die Audiokonfiguration geändert wird.'),
    ['proton-audio'],
    text => includesAny(text, ['pulse', 'pipewire', 'alsa', 'wineaudio', 'winealsa', 'winepulse']) && includesAny(text, ['connection refused', 'failed to connect', 'failed to initialize audio', 'cannot open audio device', 'failed to create audio client', 'snd_pcm_open failed'])),
  spec('filesystem-no-space', 'filesystem-capacity', 'error',
    bilingual('A write failed because space or quota was exhausted', 'Schreibzugriff scheiterte an Speicherplatz oder Quota'),
    bilingual('An explicit ENOSPC/no-space or quota failure was observed. The affected location can be a prefix, shader cache, runtime or another filesystem; it is distinct from RAM or VRAM exhaustion.', 'Ein ausdrücklicher ENOSPC-, Speicherplatz- oder Quota-Fehler wurde beobachtet. Prefix, Shadercache, Laufzeitumgebung oder ein anderes Dateisystem können betroffen sein; das unterscheidet sich von RAM- oder VRAM-Mangel.'),
    bilingual('Inspect filesystem usage and quota for the failing location read-only. Back up relevant data before choosing files to remove.', 'Dateisystembelegung und Quota am fehlgeschlagenen Ort lesend prüfen. Relevante Daten sichern, bevor Dateien zum Entfernen ausgewählt werden.'),
    ['proton-startup', 'shader-stutter'],
    text => text.includes('no space left on device') || text.includes('disk quota exceeded') || explicitFailure(text) && /\benospc\b/.test(text)),
  spec('software-renderer', 'software-device', 'info',
    bilingual('A software graphics device was reported', 'Software-Grafikgerät wurde gemeldet'),
    bilingual('A device or renderer field names llvmpipe, lavapipe or SwiftShader. A listed CPU device is not proof that the game selected it, and CPU rendering does not identify the underlying hardware.', 'Ein Geräte- oder Renderer-Feld nennt llvmpipe, lavapipe oder SwiftShader. Ein aufgelistetes CPU-Gerät beweist keine Auswahl durch das Spiel; CPU-Rendering identifiziert nicht die eigentliche Hardware.'),
    bilingual('Compare enumerated devices with the device actually selected in the game log, then inspect GPU-selection and ICD settings.', 'Aufgelistete Geräte mit dem tatsächlich ausgewählten Gerät im Spiel-Log vergleichen, danach GPU-Auswahl und ICD-Einstellungen prüfen.'),
    ['wrong-gpu', 'dxvk-no-device'],
    text => includesAny(text, ['llvmpipe', 'lavapipe', 'swiftshader']) && /\b(?:devicename|device name|opengl renderer string|renderer|selected device|using device)\s*[:=]/.test(text)),
  spec('shader-activity', 'shader-compilation', 'info',
    bilingual('Shader or pipeline compilation activity was reported', 'Shader- oder Pipeline-Kompilierung wurde gemeldet'),
    bilingual('The log explicitly reports compilation activity. This is normal work, not an error or proof that it caused observed stutter; timing and repeat-run behavior are needed.', 'Das Log meldet ausdrücklich Kompilierungsaktivität. Das ist normale Arbeit, kein Fehler und kein Beweis für die Ursache von Rucklern; Zeitbezug und Verhalten beim Wiederholungslauf werden benötigt.'),
    bilingual('Compare first and repeated passes through the same scene with frame-time telemetry. Preserve caches while gathering evidence.', 'Ersten und wiederholten Durchlauf derselben Szene mit Frame-Time-Messwerten vergleichen. Caches während der Beweissammlung erhalten.'),
    ['shader-stutter'],
    text => includesAny(text, ['dxvk', 'vkd3d', 'radv', 'fossilize']) && /\b(?:compiling|compiled)\s+(?:\d{1,10}\s+)?(?:shaders?|pipelines?)\b/.test(text)),
  spec('anti-cheat-startup', 'anti-cheat-initialization', 'error',
    bilingual('An anti-cheat runtime explicitly failed to initialize', 'Anti-Cheat-Laufzeitumgebung konnte nicht initialisiert werden'),
    bilingual('An Easy Anti-Cheat or BattlEye startup failure was observed. It does not prove universal Linux incompatibility; publisher enablement and current game-specific support must be verified.', 'Ein Startfehler von Easy Anti-Cheat oder BattlEye wurde beobachtet. Er beweist keine allgemeine Linux-Inkompatibilität; Freigabe durch den Publisher und aktueller spielspezifischer Support müssen geprüft werden.'),
    bilingual('Check the publisher or official support documentation for this exact game. Do not bypass anti-cheat or apply unrelated prefix tweaks.', 'Publisher- beziehungsweise offizielle Support-Dokumentation für genau dieses Spiel prüfen. Anti-Cheat nicht umgehen und keine unzusammenhängenden Prefix-Tweaks anwenden.'),
    ['proton-startup', 'steam-deck-startup'],
    text => includesAny(text, ['easyanticheat', 'easy anti-cheat', 'battleye']) && includesAny(text, ['failed to initialize', 'initialization failed', 'failed to load anti-cheat'])),
  spec('native-process-crash', 'native-process', 'error',
    bilingual('A process crash was reported', 'Prozessabsturz wurde gemeldet'),
    bilingual('A kernel segfault or explicit core-dump event was reported. The process may be the game, a launcher or an unrelated service; this is not a diagnosis of the GPU.', 'Ein Kernel-Segfault oder ausdrücklicher Core-Dump wurde gemeldet. Der Prozess kann Spiel, Launcher oder ein anderer Dienst sein; das ist keine GPU-Diagnose.'),
    bilingual('Identify the crashed executable privately and preserve the stack trace. Correlate it with the game run and separate kernel-device events.', 'Abgestürzte Anwendung privat bestimmen und Stacktrace sichern. Mit dem Spiellauf abgleichen und von Kernel-Geräteereignissen trennen.'),
    ['proton-startup', 'movement-freezes'],
    text => /\bsegfault at\s+[0-9a-f]{1,16}\b/.test(text) || /\bprocess\s+\d{1,10}\s+\([^\r\n)]{1,128}\)\s+of user\s+\d{1,10}\s+dumped core\b/.test(text)),
  spec('steam-disk-write', 'steam-library-write', 'error',
    bilingual("Steam reports a disk write error", "Steam meldet einen Schreibfehler"),
    bilingual("Steam reports a disk write failure, but the line does not establish whether filesystem permissions, storage or cache corruption caused it.", "Steam meldet einen Schreibfehler. Die Zeile unterscheidet weder Rechteprobleme noch Speichermedium oder Cache-Schäden."),
    bilingual("Inspect filesystem space and journal events at the affected library before re-downloading.", "Speicherplatz und Journalereignisse an der betroffenen Bibliothek vor erneutem Download prüfen."),
    ['steam-update-download'],
    text => text.includes('steam') && text.includes('disk write error')),
  spec('steam-corrupt-update', 'steam-content-verification', 'error',
    bilingual("Steam content verification reports corrupt update files", "Steam-Inhaltsprüfung meldet beschädigte Updatedateien"),
    bilingual("The client reports content validation failure, not an established disk defect or network outage.", "Der Client meldet fehlgeschlagene Inhaltsprüfung, keinen nachgewiesenen Defekt von Datenträger oder Netzwerk."),
    bilingual("Retain the content error, inspect the library's write path and run one supported verification.", "Inhaltsfehler sichern, Schreibpfad prüfen und eine unterstützte Dateiprüfung ausführen."),
    ['steam-update-download'],
    text => text.includes('steam') && text.includes('corrupt update files')),
  spec('steam-library-noexec', 'steam-library-exec-policy', 'error',
    bilingual("Steam library execution was denied", "Ausführung in Steam-Bibliothek wurde verweigert"),
    bilingual("A steamapps executable encountered an execution permission denial; the mount policy and ownership are still distinct hypotheses.", "Eine ausführbare Datei unter steamapps wurde am Start gehindert; Mount-Regeln und Eigentümer sind getrennte Hypothesen."),
    bilingual("Inspect effective mount options for the exact path and file permissions read-only.", "Effektive Mount-Optionen des Pfads und Dateirechte zunächst nur lesend prüfen."),
    ['steam-library-mount'],
    text => text.includes('steamapps/') && /(?:execve|execute|execution):?/.test(text) && text.includes('permission denied')),
  spec('steam-library-readonly', 'steam-library-readonly', 'error',
    bilingual("Steam library write encountered a read-only filesystem", "Steam-Bibliothek liegt für einen Schreibvorgang schreibgeschützt"),
    bilingual("The target library or compatdata write failed with EROFS; this does not identify why the filesystem is read-only.", "Ein Schreibvorgang in Bibliothek oder compatdata scheiterte an EROFS; die Ursache des Schreibschutzes ist ungeklärt."),
    bilingual("Read the mount state and nearby kernel I/O errors before modifying the filesystem.", "Mount-Zustand und Kernel-E/A-Meldungen vor Dateisystemänderungen prüfen."),
    ['steam-library-mount'],
    text => includesAny(text,['steamapps/','compatdata/']) && includesAny(text,['read-only file system','read only filesystem','erofs']) && explicitFailure(text)),
  spec('flatpak-steam-access', 'steam-flatpak-sandbox', 'error',
    bilingual("Steam Flatpak was denied a library path", "Steam-Flatpak erhielt keinen Zugriff auf Bibliothekspfad"),
    bilingual("The Flatpak Steam context reported denied filesystem access; it does not prove which grant or portal was required.", "Steam in Flatpak meldete verweigerten Dateisystemzugriff; welche Freigabe oder welches Portal fehlt, bleibt offen."),
    bilingual("Compare exact library mount visibility inside the sandbox and on the host without widening all permissions.", "Exakten Bibliothekspfad in Sandbox und Host vergleichen, ohne sämtliche Rechte auszuweiten."),
    ['steam-flatpak-permissions'],
    text => text.includes('flatpak') && text.includes('steam') && includesAny(text,['permission denied','access denied'])),
  spec('pressure-vessel-namespace', 'steam-runtime-namespace', 'error',
    bilingual("Pressure Vessel could not create a namespace", "Pressure Vessel konnte keinen Namespace erzeugen"),
    bilingual("The container setup failed at namespace creation, before attributing any error to game rendering.", "Der Container scheiterte beim Erstellen eines Namespace; ein Grafikfehler des Spiels ist dadurch nicht belegt."),
    bilingual("Capture pressure-vessel diagnostics and check container and host sandbox context.", "Pressure-Vessel-Diagnose sichern und Host- sowie Container-Sandboxkontext prüfen."),
    ['steam-runtime-pressure-vessel'],
    text => text.includes('pressure-vessel') && text.includes('namespace') && includesAny(text,['failed','denied','operation not permitted'])),
  spec('pressure-vessel-runtime-missing', 'steam-runtime-availability', 'error',
    bilingual("Steam Linux Runtime reports a missing runtime", "Steam Linux Runtime meldet fehlende Runtime"),
    bilingual("A required runtime path could not be found in the container context; the host filesystem might still contain it.", "Ein Runtime-Pfad konnte im Container nicht gefunden werden; auf dem Host kann er dennoch existieren."),
    bilingual("Compare selected runtime VERSION metadata and scoped mount visibility before reinstalling.", "Versionsmetadaten und eingeschränkte Mount-Sichtbarkeit vor einer Neuinstallation vergleichen."),
    ['steam-runtime-pressure-vessel'],
    text => includesAny(text,['pressure-vessel','steam linux runtime']) && text.includes('runtime') && includesAny(text,['not found','does not exist','missing runtime']) && explicitFailure(text)),
  spec('legendary-authentication', 'heroic-store-auth', 'error',
    bilingual("Legendary reports authentication failure", "Legendary meldet fehlgeschlagene Anmeldung"),
    bilingual("Epic authentication failed in Legendary; game execution, Vulkan and Wine may not have started at all.", "Epic-Anmeldung über Legendary schlug fehl; Spielausführung, Vulkan und Wine könnten noch gar nicht gestartet sein."),
    bilingual("Inspect the Heroic/Legendary authentication stage privately; never publish tokens.", "Anmeldeschritt von Heroic/Legendary privat prüfen; niemals Token veröffentlichen."),
    ['heroic-login-failures'],
    text => text.includes('legendary') && includesAny(text,['authentication failed','login failed','failed to authenticate'])),
  spec('heroic-legendary-start', 'heroic-runner-invocation', 'error',
    bilingual("Heroic could not start Legendary", "Heroic konnte Legendary nicht starten"),
    bilingual("The frontend failed to start its store backend, not necessarily the game executable or Wine.", "Die Oberfläche konnte den Store-Unterbau nicht starten; weder Spiel-EXE noch Wine müssen betroffen sein."),
    bilingual("Capture Heroic launch logs and check the installed backend path before changing prefixes.", "Heroic-Startlogs erfassen und den Backend-Pfad vor Prefixänderungen prüfen."),
    ['heroic-login-failures'],
    text => text.includes('heroic') && text.includes('legendary') && includesAny(text,['failed to start','failed to launch','could not spawn'])),
  spec('wine-loader-status-c0000135', 'wine-loader-dependency-status', 'error',
    bilingual("Wine loader reports STATUS_DLL_NOT_FOUND", "Wine-Loader meldet STATUS_DLL_NOT_FOUND"),
    bilingual("The loader reports a missing DLL or dependent module; the library name and runtime architecture are still required.", "Der Loader meldet eine fehlende DLL oder abhängige Komponente; Bibliotheksname und Architektur müssen geprüft werden."),
    bilingual("Identify the referenced DLL and runner/prefix without installing random DLL packages.", "Betroffene DLL und Runner/Prefix ermitteln, keine zufälligen DLL-Pakete installieren."),
    ['proton-prefix-recovery'],
    text => includesAny(text,['wine','proton','loader']) && includesAny(text,['status_dll_not_found','c0000135']) && explicitFailure(text)),
  spec('wine-loader-status-c000007b', 'wine-loader-image-format', 'error',
    bilingual("Wine loader rejected a binary image format", "Wine-Loader lehnte das Binärformat ab"),
    bilingual("An invalid image format status is consistent with runtime architecture or library loading trouble, not proof of GPU failure.", "Ein ungültiges Imageformat kann zu Architektur- oder Bibliotheksproblemen passen, beweist aber keinen GPU-Fehler."),
    bilingual("Check game executable and involved library architectures and the selected runner.", "Architektur von Spiel-EXE und beteiligten Bibliotheken sowie Runner prüfen."),
    ['proton-prefix-recovery'],
    text => includesAny(text,['wine','proton','loader']) && includesAny(text,['status_invalid_image_format','c000007b']) && explicitFailure(text)),
  spec('dxvk-shader-cache-write', 'dxvk-cache-write', 'error',
    bilingual("DXVK shader cache write explicitly failed", "DXVK-Shadercache konnte nicht geschrieben werden"),
    bilingual("A DXVK cache write failed; this is not a demonstrated shader-compilation stall or a corrupt GPU.", "Ein DXVK-Cache-Schreibvorgang scheiterte; weder Shader-Stottern noch GPU-Defekt sind damit bewiesen."),
    bilingual("Check the reported cache path, mount and available space while preserving the cache for analysis.", "Cachepfad, Mount und Speicherplatz prüfen; Cache für die Analyse erhalten."),
    ['shader-stutter'],
    text => text.includes('dxvk') && includesAny(text,['shader cache','state cache']) && includesAny(text,['failed to write','write failed','permission denied'])),
];

export const PATTERNS = Object.freeze(signatures.map(({ match, ...metadata }) => Object.freeze(metadata)));
const byId = new Map(PATTERNS.map(pattern => [pattern.id, pattern]));

const stripFormatting = value => value
  .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
  .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
  .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '');

const sensitiveKey = key => /(?:password|passwd|pwd|secret|token|credential|apikey|privatekey|session|auth|oauth|login|username|logname|steamuser|steamid|account|hostname|host|machine|computername|serial|uuid)/i.test(key.replace(/[_.\s-]/g, '')) || /^user$/i.test(key);

function redactAssignedFields(text) {
  const fields = /\b((?:steam\s+(?:user(?:name| name)?|account(?: name| id)?|id)|user name|account name|account id|host name|login name)|[a-z][a-z0-9_.-]{0,80})["']?\s*[:=]\s*/gi;
  let output = ''; let cursor = 0; let field;
  while ((field = fields.exec(text))) {
    if (!sensitiveKey(field[1])) continue;
    const start = fields.lastIndex;
    const quote = text[start];
    let end = start;
    if (quote === '"' || quote === "'") {
      let escaped = false; end++;
      while (end < text.length) {
        if (!escaped && text[end] === quote) { end++; break; }
        if (!escaped && text[end] === '\\') escaped = true; else escaped = false;
        end++;
      }
    } else if (quote === '[') {
      const closing = text.indexOf(']', start + 1); end = closing === -1 ? text.length : closing + 1;
    } else {
      // Unquoted multiword identities/credentials have no trustworthy word boundary.
      while (end < text.length && !/[,;)}\]<>]/.test(text[end])) end++;
    }
    output += text.slice(cursor, field.index) + `${field[1]}=[redacted]`;
    cursor = end; fields.lastIndex = end;
  }
  return output + text.slice(cursor);
}

function redactLine(line) {
  let result = stripFormatting(line);
  // Terminal/journal identity fields, including usernames and single-label hosts.
  result = result.replace(/^(\s*(?:[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}|\d{4}-\d{2}-\d{2}T[0-9:.+-]+Z?)\s+)\S+(?=\s+[A-Za-z0-9_.@-]+(?:\[\d+\])?:)/, '$1[host]');
  // Tokenize first: an unanchored letter-run before @ or / retries long prefixes.
  result = result.replace(/[^\s<>"'`;,]+/gu, value => value.includes('@') ? '[identity]' : value);
  result = result.replace(/^(\s*)(?:\([^\r\n)]{1,80}\)\s*)?[\p{L}\p{N}_-]{1,64}\s+[#$>]\s/gu, '$1[user] $ ');
  result = result.replace(/^(\s*)[\p{L}\p{N}_-]{1,64}\s+(?:\/|~)[^\r\n]{1,256}[#$>]\s/gu, '$1[user] [path] $ ');
  // Whole headers are removed before token assignments, including spaced Bearer values.
  result = result.replace(/\b(?:authorization|proxy-authorization|cookie|set-cookie)\s*[:=][^\r\n]*/gi, '[credentials redacted]');
  result = result.replace(/\b(?:bearer|basic)\s+[A-Za-z0-9_+\/.=-]{3,}/gi, '[credentials redacted]');
  result = redactAssignedFields(result);
  result = result.replace(/\b(?:logged in as|logging in as|login user)\s*[:=]?\s*[^,;)}\]<>\r\n]+/gi, '[identity redacted]');
  result = result.replace(/\b(?:github_pat_[A-Za-z0-9_]{10,}|gh[opusr]_[A-Za-z0-9]{10,}|glpat-[A-Za-z0-9_-]{10,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{12,})\b/g, '[token]');
  result = result.replace(/\beyJ[A-Za-z0-9_-]{3,}\.[A-Za-z0-9_-]{3,}\.[A-Za-z0-9_-]{3,}\b/g, '[token]');
  result = result.replace(/(-login\s+)[^\r\n]*/gi, '$1[credentials redacted]');
  // Any URL may include private hosts, credentials or query-string account tokens.
  result = result.replace(/\b[a-z][a-z0-9+.-]{1,15}:\/\/[^\s<>"'`]+/gi, '[url]');
  // Quoted paths include spaces; unquoted absolute and relative paths follow.
  result = result.replace(/"(?:[a-z]:[\\/]|\\\\|\/|~[\p{L}\p{N}_-]*\/|\.\.?\/)[^"\r\n]*"/giu, '"[path]"');
  result = result.replace(/'(?:[a-z]:[\\/]|\\\\|\/|~[\p{L}\p{N}_-]*\/|\.\.?\/)[^'\r\n]*'/giu, "'[path]'");
  // An unquoted path with spaces has no reliable end: hide the remaining field.
  result = result.replace(/(^|[\s=(:])(?:[a-z]:[\\/]|\\\\|~[\p{L}\p{N}_-]*\/|\.\.?\/|\/)[^<>"'`|;,)}\]\r\n]*/gimu, '$1[path]');
  result = result.replace(/\bI\/O\b/g, 'I[io]O');
  result = result.replace(/\bdriver\/library\b/g, 'driver[slash]library');
  result = result.replace(/(^|[^\p{L}\p{N}_.-])[\p{L}\p{N}_.-]+[\\/][^<>"'`|;,)}\]\r\n]*/gu, '$1[path]');
  result = result.replace(/I\[io\]O/g, 'I/O').replace(/driver\[slash\]library/g, 'driver/library');
  result = result.replace(/[^\s<>"'`;,|]+/g, value => {
    if (!/%[0-9a-f]{2}/i.test(value)) return value;
    let decoded;
    try { decoded = decodeURIComponent(value); } catch { return '[encoded-value]'; }
    if (/[\\/@]/.test(decoded) || sensitiveKey(decoded.split(/[:=]/, 1)[0]) && /[:=]/.test(decoded)) return '[encoded-value]';
    const labels = decoded.split('.');
    if (labels.length > 1 && /^[\p{L}]/u.test(labels.at(-1))) return '[encoded-value]';
    return value;
  });
  result = result.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[identifier]');
  result = result.replace(/\b7656119\d{10}\b/g, '[steam-id]');
  result = result.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[address]');
  result = result.replace(/[0-9a-f:]{3,}(?:\.\d+){0,3}(?:%[a-z0-9_-]+)?/gi, value => {
    if ((value.match(/:/g) || []).length < 2 || /^(?:[0-9a-f]{4}:)?[0-9a-f]{2}:[0-9a-f]{2}\.[0-7]$/i.test(value)) return value;
    return '[address]';
  });
  // Hostnames and dotted filenames can reveal identity; remove both conservatively.
  result = result.replace(/[\p{L}\p{N}_.-]+/gu, value => value.includes('.') && /^(?:[\p{L}\p{N}_-]+\.)+[\p{L}][\p{L}\p{N}_-]*$/u.test(value) ? '[host-or-file]' : value);
  return result;
}

/** Best-effort common-format redaction. Free-form prose can contain unlabelled secrets.
 * Summaries deliberately omit all evidence, even after this redaction pass. */
export function redactSensitive(text) {
  if (typeof text !== 'string') return '';
  if (text.length > LIMITS.characters) return '[text exceeds redaction limit]';
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > LIMITS.lines) return '[text exceeds redaction line limit]';
  return lines.map(line => line.length > LIMITS.lineLength ? '[line exceeds redaction limit]' : redactLine(line)).join('\n');
}

const emptyReport = () => ({
  findings: [], layers: { gpuIdentification: 'unreported', driverBinding: 'unreported', vulkanEnumeration: 'unreported', rendering: 'unreported' },
  versions: { kernel: null, mesa: null, proton: null, dxvk: null, vkd3d: null, vulkan: null },
  notices: [], stats: { lines: 0, characters: 0 }, error: null,
});
const fail = (report, code, en, de) => ({ ...report, error: { code, message: bilingual(en, de) } });
const numericVersion = /\b(\d{1,3}\.\d{1,3}(?:\.(?:\d{1,5}|x))?)(?![\d.])/i;
const versionFields = [
  ['kernel', /\b(?:linux version|kernel(?: version)?|system:\s*linux)\s*[:=]?\s*/i],
  ['mesa', /\bmesa(?:\s*\([^\r\n)]{1,64}\))?(?: version)?\s*[:=]?\s*/i],
  ['dxvk', /\bdxvk(?: version)?\s*[:=]\s*v?/i],
  ['vkd3d', /\bvkd3d(?:-proton)?(?: version)?\s*[:=]\s*v?/i],
  ['vulkan', /\b(?:vulkan(?: instance| api)?(?: version)?|apiversion)\s*[:=]\s*/i],
];

function extractVersions(line, report, seenVersions) {
  for (const [key, prefix] of versionFields) {
    const marker = prefix.exec(line);
    if (!marker) continue;
    const match = numericVersion.exec(line.slice(marker.index + marker[0].length, marker.index + marker[0].length + 40));
    if (match && match.index === 0) {
      seenVersions[key].add(match[1]);
      if (!report.versions[key]) report.versions[key] = match[1];
    }
  }
  const proton = /\b(?:proton:\s*|proton version[:=]?\s*|(?:ge-proton|proton-ge)\s*[-:]?\s*)(experimental\b|\d{1,3}(?:[.-]\d{1,5}){1,3})/i.exec(line);
  if (proton) {
    const value = /^experimental$/i.test(proton[1]) ? 'Experimental' : proton[1];
    seenVersions.proton.add(value);
    if (!report.versions.proton) report.versions.proton = value;
  }
}

function observeLayers(line, index, state, layers) {
  const lower = line.toLowerCase();
  const pciHeader = /^(?:[0-9a-f]{4}:)?[0-9a-f]{2}:[0-9a-f]{2}\.[0-7]\s/i.test(line.trimStart());
  if (pciHeader) { state.gpuPci = /\b(?:vga compatible|3d|display) controller\b/i.test(line); state.gpuLine = index; }
  if (pciHeader && state.gpuPci) layers.gpuIdentification = 'observed';
  if (state.gpuPci && index - state.gpuLine <= 16 && /^\s*kernel driver in use:\s*(?:amdgpu|radeon|i915|xe|nvidia|nouveau)\b/i.test(line)) layers.driverBinding = 'observed';
  if (/\b(?:vkphysicaldeviceproperties|physical devices:)\b/i.test(line) || /^\s*gpu\d{1,3}:\s*$/i.test(line)) state.vulkanLine = index;
  const property = /\bdevice(?:\s*name|name)\s*[:=]\s*\S/i.test(line);
  if (property && index - state.vulkanLine <= 30) {
    layers.gpuIdentification = 'observed';
    layers.vulkanEnumeration = 'observed';
  }
  if (/(?:dxvk|vkd3d)[^\r\n]{0,80}\b(?:using|selected) device\s*[:=]\s*\S/i.test(line)) {
    layers.gpuIdentification = 'observed'; layers.vulkanEnumeration = 'observed';
  }
  if (/\b(?:opengl renderer string|vulkan device)\s*[:=]\s*\S/i.test(line)) layers.gpuIdentification = 'observed';
  // Successful enumeration/device creation is never promoted to successful rendering.
  if (lower.includes('vkqueuepresentkhr') && /\b(?:returned\s+vk_success|result\s*[:=]\s*vk_success)\b/i.test(line) && !includesAny(lower, ['failed', 'error', 'err:'])) layers.rendering = 'observed';
}

/** Parse a bounded complete input; limit errors never contain partial findings. */
export function parseLog(input) {
  const report = emptyReport();
  if (typeof input !== 'string') return fail(report, 'input-type', 'Supply a text log.', 'Ein Text-Log angeben.');
  report.stats.characters = input.length;
  if (input.length > LIMITS.characters) return fail(report, 'character-limit', 'The log exceeds the 1,048,576-character limit. Choose a complete relevant excerpt; nothing was analyzed.', 'Das Log überschreitet die Grenze von 1.048.576 Zeichen. Einen vollständigen relevanten Ausschnitt wählen; es wurde nichts analysiert.');
  const lines = input.replace(/\r\n?/g, '\n').split('\n');
  report.stats.lines = input === '' ? 0 : lines.length;
  if (lines.length > LIMITS.lines) return fail(report, 'line-limit', 'The log exceeds the 12,000-line limit. Nothing was analyzed.', 'Das Log überschreitet die Grenze von 12.000 Zeilen. Es wurde nichts analysiert.');
  if (lines.some(line => line.length > LIMITS.lineLength)) return fail(report, 'line-length-limit', 'A line exceeds 8,192 characters. Choose a complete shorter excerpt; nothing was analyzed.', 'Eine Zeile überschreitet 8.192 Zeichen. Einen vollständigen kürzeren Ausschnitt wählen; es wurde nichts analysiert.');
  if (!input.trim()) return fail(report, 'empty-input', 'Paste a relevant text log first.', 'Zuerst ein relevantes Text-Log einfügen.');
  const found = new Map();
  const seenVersions = Object.fromEntries(Object.keys(report.versions).map(key => [key, new Set()]));
  const state = { gpuPci: false, gpuLine: -Infinity, vulkanLine: -Infinity };
  for (let index = 0; index < lines.length; index++) {
    const line = stripFormatting(lines[index]);
    const lower = line.toLowerCase();
    if (/\bfixme:[a-z0-9_]/.test(lower) || descriptionOnly(lower) || nonEvent(lower)) continue;
    extractVersions(line, report, seenVersions);
    observeLayers(line, index, state, report.layers);
    let safeEvidence = null;
    for (const signature of signatures) {
      if (!signature.match(lower)) continue;
      let finding = found.get(signature.id);
      if (!finding) {
        const metadata = byId.get(signature.id);
        finding = { ...metadata, evidence: [], count: 0 };
        found.set(signature.id, finding);
      }
      finding.count++;
      if (finding.evidence.length < LIMITS.evidencePerFinding) {
        if (safeEvidence === null) {
          const safe = redactLine(line);
          safeEvidence = safe.length > LIMITS.evidenceLength ? safe.slice(0, LIMITS.evidenceLength) + '…' : safe;
        }
        finding.evidence.push({ line: index + 1, text: safeEvidence });
      }
    }
  }
  report.findings = [...found.values()];
  report.notices.push(bilingual('These are observations in the supplied excerpt, not confirmed root causes. Absence of a matching line does not rule out a failure.', 'Dies sind Beobachtungen im gelieferten Ausschnitt, keine bestätigten Ursachen. Eine fehlende passende Zeile schließt einen Fehler nicht aus.'));
  report.notices.push(bilingual('Evidence hides common credentials, identities, hosts and paths automatically. Unlabelled secrets may remain; review before sharing. Exported summaries omit all log lines.', 'Belege verbergen gängige Zugangsdaten, Identitäten, Hosts und Pfade automatisch. Unbeschriftete Geheimnisse können verbleiben; vor dem Teilen prüfen. Exportierte Zusammenfassungen enthalten keine Log-Zeilen.'));
  if (!report.findings.length) report.notices.push(bilingual('No supported event signature matched. This is not a clean bill of health; provide the failure window and describe what happened.', 'Keine unterstützte Ereignissignatur passte. Das bescheinigt keinen fehlerfreien Zustand; Fehlerzeitraum angeben und den Ablauf beschreiben.'));
  const gpuFailure = report.findings.some(finding => ['gpu-scheduler', 'gpu-recovery', 'gpu-recovery-failure', 'gpu-transport', 'userspace-device-loss', 'nvidia-reported-error'].includes(finding.category));
  const storageFailure = report.findings.some(finding => ['sata-transport', 'sata-recovery', 'ata-command', 'storage-io'].includes(finding.category));
  if (!gpuFailure) report.notices.push(bilingual('No GPU-failure signature was matched in this excerpt. A hard-lock can prevent the final useful kernel message from being written.', 'Dieser Ausschnitt enthält keine passende GPU-Fehlersignatur. Ein Hard-Lock kann das Schreiben der letzten brauchbaren Kernel-Meldung verhindern.'));
  if (gpuFailure && storageFailure) report.notices.push(bilingual('GPU and storage events were both observed. Investigate them independently; this parser does not establish causal ordering or a shared cause.', 'GPU- und Speicherereignisse wurden beobachtet. Unabhängig untersuchen; dieser Parser bestimmt weder kausale Reihenfolge noch eine gemeinsame Ursache.'));
  if (Object.values(seenVersions).some(values => values.size > 1)) report.notices.push(bilingual('Multiple versions of a component were reported. The first is displayed; the extract may combine sessions or runtimes.', 'Mehrere Versionen einer Komponente wurden gemeldet. Die erste wird angezeigt; der Ausschnitt kann Sitzungen oder Laufzeitumgebungen vermischen.'));
  if (Object.values(report.versions).some(Boolean)) report.notices.push(bilingual('Versions are reported text, not independently verified release or compatibility information.', 'Versionen stammen aus dem Text und sind keine unabhängig geprüften Release- oder Kompatibilitätsangaben.'));
  return report;
}

const contextValues = Object.freeze({
  distro: { arch: 'Arch Linux', nixos: 'NixOS', debian: 'Debian', ubuntu: 'Ubuntu', fedora: 'Fedora', mint: 'Linux Mint', steamos: 'SteamOS', other: 'Other / andere' },
  runtime: { proton: 'Proton', wine: 'Wine', native: 'Native / nativ' },
  api: { unknown: 'Unknown / unbekannt', 'dx9-11': 'Direct3D 9–11', dx12: 'Direct3D 12', 'native-vulkan': 'Native Vulkan' },
  assistantId: { 'proton-startup': 'Proton startup', 'vulkan-stack': 'Vulkan stack', 'gpu-crash': 'GPU crash', 'frame-stutter': 'Frame-time stutter', 'controller-input': 'Controller input', 'audio-deck': 'Audio / Steam Deck' },
});
const layerLabels = {
  gpuIdentification: bilingual('GPU identification', 'GPU-Identifikation'), driverBinding: bilingual('Kernel-driver binding', 'Kernel-Treiberbindung'),
  vulkanEnumeration: bilingual('Vulkan device enumeration', 'Vulkan-Geräteauflistung'), rendering: bilingual('Reported frame presentation', 'Gemeldete Frame-Präsentation'),
};

/** Privacy-safe text export. Only reviewed metadata and bounded public values pass.
 * No raw logs, evidence, free-text context, custom titles, commands or notices. */
export function buildSummary(report, context = {}, lang = 'en') {
  const language = lang === 'de' ? 'de' : 'en';
  const tr = (en, de) => language === 'de' ? de : en;
  const output = [tr('Linux Gaming Repair Center — local evidence summary', 'Linux Gaming Repair Center — lokale Befundzusammenfassung'),
    tr('Observations are not confirmed root causes. No log lines are included.', 'Beobachtungen sind keine bestätigten Ursachen. Es sind keine Log-Zeilen enthalten.')];
  if (!report || typeof report !== 'object' || report.error) {
    output.push(tr('No complete valid analysis is available.', 'Es liegt keine vollständige gültige Analyse vor.'));
    return output.join('\n');
  }
  for (const [key, options] of Object.entries(contextValues)) {
    const value = context?.[key];
    if (typeof value === 'string' && Object.hasOwn(options, value)) output.push(`${key}: ${options[value]}`);
  }
  output.push('');
  for (const [key, label] of Object.entries(layerLabels)) {
    output.push(`${label[language]}: ${report.layers?.[key] === 'observed' ? tr('observed in supplied text', 'im gelieferten Text beobachtet') : tr('unreported', 'nicht gemeldet')}`);
  }
  const knownVersions = {};
  for (const key of ['kernel', 'mesa', 'proton', 'dxvk', 'vkd3d', 'vulkan']) {
    const value = report.versions?.[key];
    if (typeof value === 'string' && (/^\d{1,3}(?:[.-]\d{1,5}){1,3}$/.test(value) || /^\d{1,3}\.\d{1,3}\.x$/.test(value) || key === 'proton' && value === 'Experimental')) knownVersions[key] = value;
  }
  if (Object.keys(knownVersions).length) {
    output.push('', tr('Reported versions (unverified):', 'Gemeldete Versionen (ungeprüft):'));
    for (const [key, value] of Object.entries(knownVersions)) output.push(`${key}: ${value}`);
  }
  output.push('', tr('Matched observations:', 'Erkannte Beobachtungen:'));
  const known = Array.isArray(report.findings) ? report.findings.slice(0, PATTERNS.length).map(finding => ({ finding, metadata: byId.get(finding?.id) })).filter(item => item.metadata) : [];
  if (!known.length) output.push(tr('No supported signature matched. Missing events are not proof of absence.', 'Keine unterstützte Signatur passte. Fehlende Ereignisse beweisen keine Fehlerfreiheit.'));
  for (const { finding, metadata } of known) {
    const count = Number.isInteger(finding.count) && finding.count >= 1 && finding.count <= LIMITS.lines ? finding.count : 1;
    output.push(`- ${metadata.title[language]} (${count})`, `  ${metadata.explanation[language]}`, `  ${tr('Next', 'Nächster Schritt')}: ${metadata.next[language]}`);
  }
  output.push('', tr('A hard-lock may leave no final GPU error. GPU, PCIe, storage, kernel/firmware and graphics-userspace hypotheses require separate evidence.', 'Ein Hard-Lock kann ohne letzte GPU-Fehlermeldung bleiben. GPU-, PCIe-, Speicher-, Kernel-/Firmware- und Grafik-Userspace-Hypothesen benötigen getrennte Belege.'));
  return output.join('\n');
}

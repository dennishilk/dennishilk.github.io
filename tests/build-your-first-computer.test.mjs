import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {freshState,restoreState,validCable,postDiagnostic,STAGES,STORAGE_KEY} from '../museum/build-your-first-computer/workbench.js';

const landing=fs.readFileSync(new URL('../museum/index.html',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../museum/build-your-first-computer/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../museum/build-your-first-computer/workbench.css',import.meta.url),'utf8');
test('route, card, canonical, and existing experiments remain intact',()=>{assert.match(page,/canonical[^>]+museum\/build-your-first-computer\//);assert.match(landing,/Build Your First Computer/);assert.match(landing,/Build Your First Computer[\s\S]{0,500}AVAILABLE|AVAILABLE[\s\S]{0,500}Build Your First Computer/);assert.match(landing,/Try a Debian Server/);assert.match(landing,/The Lost Administrator/);assert.equal((landing.match(/Future Interactive Experiment/g)||[]).length,1)});
test('real workbench and complete sequence are present',()=>{assert.match(page,/id="machine"/);assert.match(page,/LGA SOCKET/);assert.match(page,/CPU_FAN/);assert.match(page,/PCIe 5\.0/);assert.equal(STAGES.length,16);assert.match(STAGES.flat(2).join(' '),/Linux boot/)});
test('state persists safely and malformed versions reset',()=>{const state=freshState();state.currentStage=8;state.headerConnections.power=true;assert.equal(restoreState(JSON.stringify(state)).currentStage,8);assert.equal(restoreState('{bad').currentStage,0);assert.equal(restoreState('{"version":99}').currentStage,0);assert.match(STORAGE_KEY,/v1$/)});
test('connector validation rejects EPS and PCIe mismatch',()=>{assert.equal(validCable('EPS8','MB_EPS8'),true);assert.equal(validCable('PCIE','MB_EPS8'),false);assert.equal(validCable('EPS8','GPU_PCIE_A'),false);assert.equal(validCable('USB3','MB_HD_AUDIO'),false)});
test('POST diagnostics derive from actual state',()=>{const s=freshState();assert.equal(postDiagnostic(s),'POWER_SWITCH_OPEN');s.headerConnections.power=true;assert.equal(postDiagnostic(s),'CPU_LED');s.cableConnections.eps=true;assert.equal(postDiagnostic(s),'DRAM_LED');s.installedComponents.memory=true;assert.equal(postDiagnostic(s),'VGA_LED');s.cableConnections.gpu=true;assert.equal(postDiagnostic(s),'CPU_FAN_WARNING');s.cableConnections.cpuFan=true;assert.equal(postDiagnostic(s),'PASS')});
test('module initializes without a DOM',()=>{const source=fs.readFileSync(new URL('../museum/build-your-first-computer/workbench.js',import.meta.url),'utf8').replace(/^export /gm,'');assert.doesNotThrow(()=>new vm.Script(source))});
test('keyboard labels, live region, mobile containment and reduced motion exist',()=>{assert.match(page,/aria-live="polite"/);assert.match(page,/Undo last operation/);assert.match(page,/Escape closes|id="zoom"/);assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/overflow:auto/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)});

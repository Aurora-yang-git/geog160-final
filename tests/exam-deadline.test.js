// Run with: bun test
import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(iso) {
  const time = new Date(iso).getTime();
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [time])); } static now() { return time; } }
  const ctx = vm.createContext({ Date: Clock, Math, S: {settings:{exam:'2026-11-10'}, cards:{}, t0:new Date(2026,10,9,18).getTime()}, CARDS:[{id:'fresh', t:['onlist'], i:0}], unlocked:()=>true });
  const constants = script.slice(script.indexOf('const DAY ='), script.indexOf('/* ---------- storage'));
  const deadline = script.match(/const examTime = .*?; };/)[0];
  const scheduler = script.slice(script.indexOf('function daysLeft()'), script.indexOf('/* ---------- render:'));
  const banner = script.slice(script.indexOf('const DNAMES ='), script.indexOf('function renderChips()'));
  vm.runInContext(constants + deadline + scheduler + banner, ctx);
  return (expr) => vm.runInContext(expr, ctx);
}
test('entire app script parses', () => { expect(() => new vm.Script(script)).not.toThrow(); });
for (const when of ['2026-11-09T23:59:59','2026-11-10T00:00:00','2026-11-10T13:00:00','2026-11-10T14:59:59.999']) {
  test(`unseen cards available at ${when}`, () => {
    const run = setup(when); expect(run('newAllowed()')).toBe(true); expect(run('counts().newLeft')).toBe(1); expect(run('pick().id')).toBe('fresh');
  });
}
for (const when of ['2026-11-10T15:00:00','2026-11-10T16:00:00','2026-11-11T09:00:00']) {
  test(`new cards stop at ${when}`, () => {
    const run = setup(when); expect(run('newAllowed()')).toBe(false); expect(run('counts().newLeft')).toBe(0); expect(run('pick()')).toBe(null);
    run("S.cards.fresh = {s:'review', dueDay:today()}"); expect(run('pick().id')).toBe('fresh');
  });
}
test('deadline, pacing and exam-day copy use 15:00', () => {
  const run = setup('2026-11-10T14:00:00');
  expect(run('new Date(examTime()).getHours()')).toBe(15);
  expect(run('new Date(milestones().final).getHours()')).toBe(14);
  expect(run('bannerText()')).toContain('New cards remain available');
  expect(setup('2026-11-10T15:00:00')('bannerText()')).toContain('The exam has started');
});
test('eligibility and queue reads preserve saved progress', () => {
  const run = setup('2026-11-10T14:00:00');
  const before = run('JSON.stringify(S)'); run('counts(); pick(); milestones(); bannerText()'); expect(run('JSON.stringify(S)')).toBe(before);
  expect(html).toContain('const KEY = "geog160-srs-v3"');
});

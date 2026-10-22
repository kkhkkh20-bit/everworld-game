import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const SEEDS = [1, 7, 25, 51, 125, 1442, 1893, 4762, 8321, 9999];
const HTML = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = HTML.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'Game script must be embedded in index.html');

class Element {
  constructor() {
    this.children = [];
    this.classList = { add() {}, remove() {}, toggle() {} };
    this.nextElementSibling = { textContent: '' };
    this.textContent = '';
    this.clientWidth = 900;
    this.clientHeight = 700;
    this.dataset = {};
  }
  getContext() { return {}; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = [...children]; }
  addEventListener() {}
}

const elements = new Map();
const get = id => {
  if (!elements.has(id)) elements.set(id, new Element());
  return elements.get(id);
};
const doc = {
  getElementById: get,
  createElement: () => new Element(),
  querySelector: () => new Element(),
  querySelectorAll: () => []
};
const window = { innerHeight: 844, devicePixelRatio: 1, addEventListener() {} };
const ctx = {
  document: doc, window,
  performance: { now: () => 100 },
  localStorage: { getItem: () => null, setItem() {} },
  requestAnimationFrame() {},
  console
};
vm.runInNewContext(match[1], ctx, { filename: 'index.html', timeout: 30000 });
const game = window.__EVERWORLD__;
assert.ok(game, 'Game should initialize and expose simulation controls');

function snapshot(seed, day, prev) {
  const s = game.getState();
  const residents = game.getNPCs().filter(n => n.alive);
  const aliveIds = new Set(residents.map(n => n.id));
  const holders = s.seats.filter(st => st.holder !== null).map(st => st.holder);
  assert.equal(s.day, day + 1, 'World clock must advance one day per 24 ticks');
  assert.equal(s.pop, residents.length, 'Population must agree with resident list');
  assert.equal(new Set(holders).size, holders.length, 'Office holders must be unique');
  assert.ok(holders.every(id => aliveIds.has(id)), 'Deceased or emigrated NPC cannot hold office');
  assert.ok(residents.filter(n => n.role === '왕').length <= 1, 'Multiple living kings');
  assert.ok(residents.every(n => n.gold >= 0 && Number.isFinite(n.gold) && Number.isFinite(n.hp)), 'Invalid NPC finances or health');
  assert.ok(s.food >= 0 && s.market >= 0 && s.treasury >= 0, 'Negative public economic inventory');
  assert.ok(s.food < 5000 && s.market < 20000, 'Runaway food or clearinghouse balance');
  assert.ok(s.pop <= s.housingCapacity + 10, 'Population wildly above available housing');
  assert.ok(s.deaths >= prev.deaths && s.arrivals >= prev.arrivals, 'Event counts must not decline');

  return {
    seed, day,
    pop: s.pop, deaths: s.deaths, arrivals: s.arrivals,
    departures: s.departures, food: s.food,
    market: +s.market.toFixed(1), treasury: +s.treasury.toFixed(1),
    residentGold: residents.reduce((sum, n) => sum + n.gold, 0),
    houses: s.housingCapacity, vacant: s.seats.filter(x => !x.holder).length,
    socialAid: s.socialSupport, loanMade: s.loansMade,
    loanRepaid: s.loansRepaid, investment: s.investments,
    shopsOpened: s.shopsOpened, guestNights: s.guestNights,
    careerReferrals: s.jobReferrals, ageRange: 'annual'
  };
}

const all = [];
for (const seed of SEEDS) {
  game.reset(seed);
  let previous = { deaths: 0, arrivals: 0 };
  let elapsed = 0;
  for (const day of [30, 90, 180]) {
    game.advance((day - elapsed) * 24);
    const record = snapshot(seed, day, previous);
    all.push(record);
    elapsed = day;
    previous = record;
  }
}

function average(key, day) {
  const group = all.filter(r => r.day === day);
  return (group.reduce((n, r) => n + r[key], 0) / group.length).toFixed(1);
}

console.log('SIMULATION AUDIT', new Date().toISOString());
console.log('Seeds:', SEEDS.join(', '));
console.log('day | population | deaths | food | market | resident gold | loans | loan repayment | vacancies');
for (const day of [30, 90, 180]) {
  console.log(
    [day, '30/90/180'.includes(String(day)) ? average('pop',day) : '-',
    average('deaths',day),average('food',day),
    average('market',day),average('residentGold',day),
    average('loanMade',day),average('loanRepaid',day),average('vacant',day)].join(' | ')
  );
}
console.log('AUDIT RESULT: PASS (' + all.length + ' recorded checkpoints)');

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    '## Everworld: autonomous simulation audit',
    '',
    '10 fixed world seeds, 30 / 90 / 180 days per world. Values are model output, not empirical human-population benchmarks.',
    '',
    '| Day | Population | Deaths | Food | Market G | Residents G | Loans G | Repaid G | Vacancies |',
    '|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  ];
  for (const day of [30,90,180]) {
    lines.push('| ' + [day,'pop','deaths','food','market','residentGold','loanMade','loanRepaid','vacant'].map(x=>typeof x==='number'?x:average(x,day)).join(' | ') + ' |');
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}

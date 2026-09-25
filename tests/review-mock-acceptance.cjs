// Run with: node tests/review-mock-acceptance.cjs
// Uses the real review store and Mock provider without making an API request.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { indexedDB } = require('fake-indexeddb');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ indexedDB, crypto: require('node:crypto').webcrypto, URL });
context.window = context;
context.WriteFlow = { Storage: { getSettings: async () => ({ provider: 'mock' }) } };
for (const file of ['review/backup.js', 'review/store.js', 'services/ai.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

(async () => {
  const store = context.ReviewStore;
  const project = await store.project('Supplier Review');
  const item = await store.create({ projectId: project.id, text: 'The supplier guarantees 99.9% uptime.' });
  assert.equal(item.id, 'R-001');

  const quantify = await store.ask(item.id, 'quantify', 'Quantify');
  const first = await context.WriteFlow.AI.generateReview(quantify);
  await store.answer(item.id, quantify.round.id, first);
  assert.equal(first.demonstration, true);
  assert.match(first.text, /Mock demonstration — no sources checked/);

  const challenge = await store.ask(item.id, 'challenge', 'Challenge');
  const second = await context.WriteFlow.AI.generateReview(challenge);
  await store.answer(item.id, challenge.round.id, second);
  assert.match(second.text, /CHALLENGE: Challenge/);
  await assert.rejects(
    store.answer(item.id, quantify.round.id, { text: 'overwrite', provider: 'Mock' }),
    /already answered/
  );

  const source = await store.source(item.id, quantify.round.id, {
    citation: 'Example supplier agreement, section 4',
    proposition: 'Claims a 99.9% uptime guarantee',
    url: 'https://example.com/agreement'
  });
  await store.sourceStatus(source.id, 'disputed');
  await store.status(item.id, 'pending');

  // JSON export is the serialized store; restoring it must preserve exact links and rounds.
  const backup = JSON.parse(JSON.stringify(await store.read()));
  await store.create({ projectId: project.id, text: 'Temporary item removed on restore' });
  await store.restore(backup);
  const restored = await store.read();
  assert.equal(restored.items.length, 1);
  assert.equal(restored.items[0].id, item.id);
  assert.equal(restored.items[0].status, 'pending');
  assert.deepEqual(Array.from(restored.items[0].rounds, round => round.instruction), ['Quantify', 'Challenge']);
  assert.equal(restored.items[0].rounds[0].answer.text, first.text);
  assert.equal(restored.items[0].rounds[1].answer.text, second.text);
  assert.equal(restored.sources[0].status, 'disputed');
  assert.equal(restored.sources[0].links[0].itemId, item.id);
  assert.equal(restored.sources[0].links[0].roundId, quantify.round.id);

  const broken = JSON.parse(JSON.stringify(backup));
  broken.sources[0].links[0].roundId = 'nonexistent-round';
  assert.throws(() => store.restore(broken), /missing answer/);
  assert.deepEqual(JSON.parse(JSON.stringify(await store.read())), restored);
  console.log('PASS: Mock Quantify + Challenge, original answer preserved, disputed source linked to exact answer, JSON restore, invalid restore rejected.');
})().catch(error => { console.error(error); process.exitCode = 1; });

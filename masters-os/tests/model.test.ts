import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { currentStatus, freshStore, matching, newApplication, progress, tasksFor, validateBackup, isOpportunity } from '../src/lib/model.ts';
import type { Opportunity } from '../src/lib/model.ts';
const seed = JSON.parse(readFileSync(new URL('../src/data/opportunities.json', import.meta.url), 'utf8')) as Opportunity[];
const course = seed[0];
const scholarship = (eligibility: Opportunity['eligibility']): Opportunity => ({ ...course, kind: 'scholarship', id: 'test-award', eligibility });
test('catalogue has only documented next-year opportunities and no stale funding rounds', () => {
  assert.ok(seed.length >= 6);
  for (const o of seed) {
    assert.ok(isOpportunity(o));
    assert.match(o.cycle, /^2027/);
    assert.ok(!o.cycle.includes('2026'));
    if (o.deadline) assert.ok(Date.parse(o.deadline) > Date.parse('2026-10-06T20:50:00Z'));
    if (o.kind === 'scholarship') {
      assert.equal(o.id, 'oxford-clarendon');
      assert.ok(o.relatedIds.length > 0);
      for (const id of o.relatedIds) assert.equal(seed.find(item => item.id === id)?.cycle, '2027/28');
    }
  }
});
test('Humanitarian Protection and a pending asylum claim are treated distinctly', () => {
  const p = freshStore().profile;
  const award = scholarship({ statuses: ['asylum-seeker'], note: 'Pending claims only' });
  assert.equal(matching(award, p).level, 'review');
  assert.equal(matching(award, { ...p, visa: 'asylum-seeker' }).level, 'status-fit');
});
test('Palestinian nationality does not override residence or undergraduate exclusions', () => {
  const p = freshStore().profile;
  assert.equal(matching(scholarship({ residence: ['Palestine'], nationalities: ['Palestinian'], note: '' }), p).level, 'excluded');
  assert.equal(matching(scholarship({ excludesUK: true, note: '' }), p).level, 'excluded');
  assert.equal(matching(scholarship({ mastersExcluded: true, note: '' }), p).level, 'excluded');
});
test('student finance restrictions stay unresolved until assessed', () => {
  const p = freshStore().profile;
  const award = scholarship({ noStudentFinance: true, statuses: ['humanitarian-protection'], note: 'Other criteria apply' });
  assert.equal(matching(award, p).level, 'review');
  assert.equal(matching(award, { ...p, studentFinance: 'yes' }).level, 'excluded');
  assert.equal(matching(award, { ...p, studentFinance: 'no' }).level, 'status-fit');
});
test('checklist completion is derived only from the relevant tasks', () => {
  const a = newApplication();
  assert.equal(progress(course, a), 0);
  a.tasks[tasksFor(course)[0]] = true;
  a.tasks['Unrelated old task'] = true;
  assert.equal(progress(course, a), 14);
  for (const t of tasksFor(course)) a.tasks[t] = true;
  assert.equal(progress(course, a), 100);
});
test('published opening status expires at the exact deadline', () => {
  assert.equal(currentStatus(course, new Date('2027-01-06T11:59:59Z')), 'open');
  assert.equal(currentStatus(course, new Date('2027-01-06T12:00:00Z')), 'closed');
  assert.equal(currentStatus({ ...course, deadline: null, status: 'unknown' }), 'unknown');
});
test('automatic-consideration funding does not ask for a separate scholarship form', () => {
  const award = seed.find(o => o.id === 'oxford-clarendon')!;
  assert.ok(award);
  assert.ok(tasksFor(award).every(t => !t.includes('Submit scholarship application')));
  assert.ok(tasksFor(award).some(t => t.includes('course application')));
});
test('valid backups restore and malformed backups are rejected', () => {
  const s = freshStore(); s.applications[course.id] = newApplication();
  assert.ok(validateBackup(JSON.parse(JSON.stringify(s))));
  assert.equal(validateBackup({ ...s, profile: { ...s.profile, visa: 'invented-status' } }), false);
  assert.equal(validateBackup({ ...s, applications: { bad: { stage: 'preparing' } } }), false);
  assert.equal(validateBackup({ ...s, custom: [{ ...course, source: 'javascript:alert(1)' }] }), false);
});

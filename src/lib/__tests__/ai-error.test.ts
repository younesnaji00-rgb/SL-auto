// Run: npx tsx --test src/lib/__tests__/ai-error.test.ts
//
// QA bug 070 (2026-10-26): the plate scanner showed Google's raw « 402 Payment
// Required » error. AI failures are now sorted into « service unavailable »
// and « failed », each with one French sentence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLATE_SCAN_MESSAGES, classifyAiError } from '../ai-error';

test('the 402 the tester saw is « unavailable »', () => {
  const err = Object.assign(
    new Error('UNKNOWN: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/x:generateContent: [402 Payment Required] Your prepayment credits are depleted.'),
    { status: 'UNKNOWN' },
  );
  assert.equal(classifyAiError(err), 'unavailable');
});

test('quota, overload, refused key and network errors are « unavailable »', () => {
  assert.equal(classifyAiError({ status: 'RESOURCE_EXHAUSTED', message: 'x' }), 'unavailable');
  assert.equal(classifyAiError({ code: 429, message: 'x' }), 'unavailable');
  assert.equal(classifyAiError({ code: 503, message: 'x' }), 'unavailable');
  assert.equal(classifyAiError(new Error('The model is overloaded. Please try again later.')), 'unavailable');
  assert.equal(classifyAiError(new Error('API key not valid. Please pass a valid API key.')), 'unavailable');
  assert.equal(classifyAiError(new Error('fetch failed')), 'unavailable');
});

test('anything else is « failed »', () => {
  assert.equal(classifyAiError(new Error('Unexpected token < in JSON')), 'failed');
  assert.equal(classifyAiError(null), 'failed');
  assert.equal(classifyAiError(undefined), 'failed');
});

test('the messages never carry technical detail', () => {
  for (const msg of Object.values(PLATE_SCAN_MESSAGES)) {
    assert.match(msg, /liste des missions/);
    assert.doesNotMatch(msg, /\d{3}|error|unknown/i);
  }
});

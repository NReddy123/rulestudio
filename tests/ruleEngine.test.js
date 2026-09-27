import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateConditions, getConditionFlowTargets, isConditionValid, normalizeRule, parseRuleImport } from '../src/ruleEngine.js'

const condition = (field, operator, value, joinWith) => ({ field, operator, value, joinWith })

test('legacy conditions without connectors keep AND semantics', () => {
  const rule = normalizeRule({
    conditions: [
      condition('customer.age', 'gte', '18'),
      condition('order.total', 'gte', '100'),
    ],
  })

  assert.deepEqual(rule.conditions.map(item => item.joinWith), ['AND', 'AND'])
  assert.deepEqual(evaluateConditions(rule.conditions, { customer: { age: 24 }, order: { total: 50 } }), {
    matched: false,
    outcomes: [true, false],
  })
})

test('OR starts an alternative group and short-circuits after a match', () => {
  const conditions = [
    condition('customer.age', 'gte', '18', 'AND'),
    condition('order.total', 'gte', '100', 'OR'),
  ]

  assert.deepEqual(evaluateConditions(conditions, { customer: { age: 24 } }), {
    matched: true,
    outcomes: [true, null],
  })
  assert.deepEqual(evaluateConditions(conditions, { customer: { age: 16 }, order: { total: 125 } }), {
    matched: true,
    outcomes: [false, true],
  })
})

test('AND binds tighter than OR', () => {
  const conditions = [
    condition('customer.age', 'gte', '18', 'AND'),
    condition('order.total', 'gte', '100', 'OR'),
    condition('customer.score', 'gte', '50', 'AND'),
  ]

  assert.deepEqual(evaluateConditions(conditions, {
    customer: { age: 24, score: 10 },
    order: { total: 50 },
  }), { matched: true, outcomes: [true, null, null] })

  assert.deepEqual(evaluateConditions(conditions, {
    customer: { age: 16, score: 60 },
    order: { total: 125 },
  }), { matched: true, outcomes: [false, true, true] })

  assert.deepEqual(evaluateConditions(conditions, {
    customer: { age: 16, score: 10 },
    order: { total: 125 },
  }), { matched: false, outcomes: [false, true, false] })
})

test('a successful OR alternative can still fail on its following AND', () => {
  const conditions = [
    condition('customer.age', 'gte', '18', 'AND'),
    condition('order.total', 'gte', '100', 'OR'),
    condition('customer.score', 'gte', '50', 'AND'),
  ]

  assert.deepEqual(evaluateConditions(conditions, {
    customer: { age: 16, score: 10 },
    order: { total: 125 },
  }), { matched: false, outcomes: [false, true, false] })
  assert.deepEqual(getConditionFlowTargets(conditions, 1), {
    trueTarget: 'condition-2',
    falseTarget: 'no-match',
  })
})

test('conditions short-circuited inside a failed AND group are not read', () => {
  const conditions = [
    condition('customer.age', 'gte', '18', 'AND'),
    condition('order.total', 'gte', '100', 'AND'),
    condition('customer.region', 'equals', 'US', 'OR'),
  ]

  assert.deepEqual(evaluateConditions(conditions, {
    customer: { age: 16, region: 'US' },
  }), { matched: true, outcomes: [false, null, true] })
})

test('visual flow follows AND groups and advances to the next OR alternative on false', () => {
  const conditions = [
    condition('customer.age', 'gte', '18', 'AND'),
    condition('order.total', 'gte', '100', 'AND'),
    condition('customer.region', 'equals', 'US', 'OR'),
    condition('customer.score', 'gte', '50', 'AND'),
  ]

  assert.deepEqual(getConditionFlowTargets(conditions, 0), {
    trueTarget: 'condition-1',
    falseTarget: 'condition-2',
  })
  assert.deepEqual(getConditionFlowTargets(conditions, 1), {
    trueTarget: 'match',
    falseTarget: 'condition-2',
  })
  assert.deepEqual(getConditionFlowTargets(conditions, 3), {
    trueTarget: 'match',
    falseTarget: 'no-match',
  })
})

test('condition validation rejects unsupported operators and invalid thresholds', () => {
  assert.equal(isConditionValid(condition('customer.age', 'gte', '18', 'AND')), true)
  assert.equal(isConditionValid(condition('customer.age', 'gte', 'adult', 'AND')), false)
  assert.equal(isConditionValid(condition('customer.age', 'startsWith', '1', 'AND')), false)
})

test('backup import accepts an array or rules envelope and normalizes legacy connectors', () => {
  const legacyRule = {
    name: 'Imported eligibility',
    conditions: [condition('customer.age', 'gte', '18')],
  }

  assert.deepEqual(parseRuleImport(JSON.stringify([legacyRule]))[0].conditions[0].joinWith, 'AND')
  assert.deepEqual(parseRuleImport({ rules: [legacyRule] })[0].result, true)
})

test('backup import rejects invalid JSON and malformed rule rows', () => {
  assert.throws(() => parseRuleImport('{'), /not valid JSON/)
  assert.throws(() => parseRuleImport({ rules: [] }), /at least one rule/)
  assert.throws(() => parseRuleImport([{ name: 'Broken', conditions: null }]), /Rule 1/)
})
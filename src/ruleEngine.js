const supportedOperators = new Set(['gte', 'lt', 'equals'])
const numericOperators = new Set(['gte', 'lt'])

export function normalizeCondition(condition = {}) {
  const source = condition && typeof condition === 'object' ? condition : {}
  return {
    ...source,
    joinWith: source.joinWith === 'OR' ? 'OR' : 'AND',
  }
}

export function normalizeRule(rule, index = 0) {
  const source = rule && typeof rule === 'object' ? rule : {}
  return {
    ...source,
    id: source.id || `legacy_rule_${index + 1}`,
    conditions: Array.isArray(source.conditions) ? source.conditions.map(normalizeCondition) : [],
  }
}

export function parseRuleImport(content) {
  let parsed
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : content
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }

  const importedRules = Array.isArray(parsed) ? parsed : parsed?.rules
  if (!Array.isArray(importedRules) || importedRules.length === 0) {
    throw new Error('The backup must contain at least one rule.')
  }

  const invalidIndex = importedRules.findIndex(rule => (
    !rule
    || typeof rule !== 'object'
    || Array.isArray(rule)
    || typeof rule.name !== 'string'
    || !rule.name.trim()
    || !Array.isArray(rule.conditions)
    || rule.conditions.some(condition => !condition || typeof condition !== 'object' || Array.isArray(condition))
  ))
  if (invalidIndex !== -1) throw new Error(`Rule ${invalidIndex + 1} is missing a name or valid conditions list.`)

  return importedRules.map((rule, index) => ({
    ...normalizeRule(rule, index),
    name: rule.name.trim(),
    description: typeof rule.description === 'string' ? rule.description : '',
    result: typeof rule.result === 'boolean' ? rule.result : true,
  }))
}

export function isConditionValid(condition) {
  const { field, operator, value } = condition
  const normalizedValue = String(value ?? '').trim()
  return Boolean(String(field ?? '').trim())
    && supportedOperators.has(operator)
    && Boolean(normalizedValue)
    && (!numericOperators.has(operator) || Number.isFinite(Number(normalizedValue)))
}

function evaluateCondition({ field, operator, value }, data) {
  const actual = field.split('.').reduce((object, key) => object?.[key], data)
  if (actual === undefined) throw new Error(`Missing value: ${field}`)

  if (numericOperators.has(operator)) {
    const actualNumber = typeof actual === 'number' || typeof actual === 'string' && actual.trim() ? Number(actual) : NaN
    const expectedNumber = typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN
    if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) {
      throw new Error(`Expected numeric values for ${field}.`)
    }
    return operator === 'gte' ? actualNumber >= expectedNumber : actualNumber < expectedNumber
  }

  return String(actual).toLowerCase() === String(value).toLowerCase()
}

export function evaluateConditions(conditions, data) {
  const outcomes = Array(conditions.length).fill(null)
  let groupMatched = true
  let groupEvaluated = false

  for (let index = 0; index < conditions.length; index += 1) {
    const condition = normalizeCondition(conditions[index])

    if (index > 0 && condition.joinWith === 'OR') {
      if (groupEvaluated && groupMatched) return { matched: true, outcomes }
      groupMatched = true
      groupEvaluated = false
    }

    if (!groupMatched) continue

    const conditionMatched = evaluateCondition(condition, data)
    outcomes[index] = conditionMatched
    groupMatched = conditionMatched
    groupEvaluated = true
  }

  return { matched: groupEvaluated && groupMatched, outcomes }
}

export function getConditionFlowTargets(conditions, index) {
  const nextCondition = conditions[index + 1]
  const nextAlternativeIndex = conditions.findIndex((condition, candidateIndex) => (
    candidateIndex > index && normalizeCondition(condition).joinWith === 'OR'
  ))

  return {
    trueTarget: !nextCondition || normalizeCondition(nextCondition).joinWith === 'OR'
      ? 'match'
      : `condition-${index + 1}`,
    falseTarget: nextAlternativeIndex === -1 ? 'no-match' : `condition-${nextAlternativeIndex}`,
  }
}
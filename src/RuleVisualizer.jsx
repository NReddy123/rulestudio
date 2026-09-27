import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './RuleVisualizer.css'
import { getConditionFlowTargets } from './ruleEngine.js'

const operatorLabels = {
  gte: 'is greater than or equal to',
  lt: 'is less than',
  equals: 'equals',
}

function InputNode({ data }) {
  return (
    <div className="flow-node flow-input-node">
      <div className="flow-node-kicker">INPUT</div>
      <strong>Rule data</strong>
      <small>{data.fields || 'No fields used'}</small>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  )
}

function ConditionNode({ data }) {
  return (
    <div className="flow-node flow-condition-node">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="flow-node-heading">
        <span className="flow-node-kicker">CHECK {String(data.index + 1).padStart(2, '0')}</span>
        <span className="flow-and-tag">{data.index === 0 ? 'IF' : data.joinWith || 'AND'}</span>
      </div>
      <strong className="flow-field">{data.field}</strong>
      <div className="flow-comparison">
        <span>{operatorLabels[data.operator] || data.operator}</span>
        <b>{String(data.value ?? '').trim() || 'Value not set'}</b>
      </div>
      <div className="flow-branches">
        <span>FALSE</span>
        <span>TRUE</span>
      </div>
      <Handle type="source" position={Position.Left} id="false" className="flow-false-handle" />
      <Handle type="source" position={Position.Bottom} id="true" className="flow-true-handle" />
      {typeof data.testOutcome === 'boolean' && (
        <span className={`flow-test-marker ${data.testOutcome ? 'passed' : 'failed'}`} aria-label={data.testOutcome ? 'Condition passed' : 'Condition failed'} />
      )}
      {data.testOutcome === null && <span className="flow-test-marker skipped" aria-label="Condition not evaluated" />}
    </div>
  )
}

function OutcomeNode({ data }) {
  const isMatch = data.variant === 'match'
  const outcomeClass = data.outcomeState ? `flow-result-${data.outcomeState}` : ''

  return (
    <div className={`flow-node flow-outcome-node ${isMatch ? 'flow-match-node' : 'flow-no-match-node'} ${outcomeClass}`}>
      <Handle
        type="target"
        position={isMatch || data.compact ? Position.Top : Position.Right}
        id="in"
      />
      <span className="flow-outcome-mark" aria-hidden="true">{isMatch ? '✓' : '×'}</span>
      <div>
        <strong>{data.title}</strong>
        <small>{data.detail}</small>
      </div>
    </div>
  )
}

function EmptyNode() {
  return (
    <div className="flow-node flow-empty-node">
      <Handle type="target" position={Position.Top} id="in" />
      <div className="flow-node-kicker">NO CHECKS</div>
      <strong>Add a condition</strong>
      <small>An empty rule cannot match.</small>
    </div>
  )
}

const nodeTypes = {
  entry: InputNode,
  condition: ConditionNode,
  outcome: OutcomeNode,
  empty: EmptyNode,
}

function createEdge(id, source, target, options = {}) {
  const color = options.state === 'pass'
    ? 'var(--flow-pass)'
    : options.state === 'fail'
      ? 'var(--flow-fail)'
      : 'var(--flow-neutral)'

  return {
    id,
    source,
    target,
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle || 'in',
    type: 'smoothstep',
    label: options.label,
    labelStyle: { fill: options.state ? color : 'var(--flow-label)', fontSize: 10, fontWeight: 700 },
    labelBgStyle: { fill: 'var(--ui-raised)', fillOpacity: 0.96 },
    style: { stroke: color, strokeWidth: options.state ? 2.5 : 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color },
  }
}

function FlowActions({ onEdit, onTest }) {
  return (
    <div className="flow-actions">
      <button className="flow-secondary-button" type="button" onClick={onEdit}>Edit conditions</button>
      <button className="flow-primary-button" type="button" onClick={onTest}>Run test</button>
    </div>
  )
}

function FitFlowToNodes({ fitKey }) {
  const { fitView } = useReactFlow()
  const nodesInitialized = useNodesInitialized()

  useEffect(() => {
    if (nodesInitialized) fitView({ padding: 0.04, duration: 180, minZoom: 0.35, maxZoom: 1.15 })
  }, [fitKey, fitView, nodesInitialized])

  return null
}

function RuleVisualizer({ rule, testResult, onEdit, onTest }) {
  const canvasRef = useRef(null)
  const [canvasWidth, setCanvasWidth] = useState(() => typeof window === 'undefined' ? 0 : window.innerWidth)
  const compact = canvasWidth < 520

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const measureCanvas = () => setCanvasWidth(Math.round(canvas.getBoundingClientRect().width))
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureCanvas)
    measureCanvas()
    observer?.observe(canvas)
    window.addEventListener('resize', measureCanvas)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measureCanvas)
    }
  }, [])

  const layoutKey = `${rule.id}-${rule.conditions.length}-${compact}-${Math.round(canvasWidth / 80)}`
  const { nodes, edges } = useMemo(() => {
    const conditions = rule.conditions || []
    const compactOutcomeWidth = Math.max(96, Math.floor((canvasWidth - 42) / 2))
    const conditionWidth = compact ? Math.max(180, canvasWidth - 24) : 260
    const outcomeWidth = compact ? compactOutcomeWidth : 205
    const conditionX = compact ? 0 : 300
    const outcomeX = compact ? 0 : 25
    const matchX = compact ? compactOutcomeWidth + 16 : conditionX
    const firstConditionY = 160
    const conditionGap = 190
    const flowNodes = [
      {
        id: 'entry',
        type: 'entry',
        position: { x: conditionX, y: 12 },
        style: { width: compact ? conditionWidth : 250 },
        data: { fields: [...new Set(conditions.map(condition => condition.field))].join(' / ') },
      },
    ]
    const flowEdges = []

    if (conditions.length === 0) {
      flowNodes.push({
        id: 'empty',
        type: 'empty',
        position: { x: conditionX, y: firstConditionY },
        style: { width: conditionWidth },
        data: {},
      })
      flowEdges.push(createEdge('input-empty', 'entry', 'empty', { sourceHandle: 'out' }))
      return { nodes: flowNodes, edges: flowEdges }
    }

    conditions.forEach((condition, index) => {
      const conditionId = `condition-${index}`
      const conditionY = firstConditionY + index * conditionGap
      const outcome = testResult?.outcomes?.[index]
      const { trueTarget, falseTarget } = getConditionFlowTargets(conditions, index)

      flowNodes.push({
        id: conditionId,
        type: 'condition',
        position: { x: conditionX, y: conditionY },
        style: { width: conditionWidth },
        data: { ...condition, index, testOutcome: outcome },
      })
      flowEdges.push(createEdge(
        `continue-${index}`,
        conditionId,
        trueTarget,
        { sourceHandle: 'true', label: 'TRUE', state: outcome === true ? 'pass' : undefined },
      ))
      flowEdges.push(createEdge(
        `stop-${index}`,
        conditionId,
        falseTarget,
        { sourceHandle: 'false', label: 'FALSE', targetHandle: 'in', state: outcome === false ? 'fail' : undefined },
      ))
    })

    const lastConditionY = firstConditionY + (conditions.length - 1) * conditionGap
    const outcomeY = compact
      ? lastConditionY + 175
      : firstConditionY + Math.floor((conditions.length - 1) / 2) * conditionGap
    flowNodes.push({
      id: 'no-match',
      type: 'outcome',
      position: { x: outcomeX, y: outcomeY },
      style: { width: outcomeWidth },
      data: {
        variant: 'no-match',
        title: 'No match',
        detail: 'No result returned',
        compact,
        outcomeState: testResult ? testResult.matched ? 'inactive' : 'active' : undefined,
      },
    })
    flowNodes.push({
      id: 'match',
      type: 'outcome',
      position: { x: matchX, y: lastConditionY + 175 },
      style: { width: outcomeWidth },
      data: {
        variant: 'match',
        title: 'Matched',
        detail: `Return ${JSON.stringify(rule.result)}`,
        outcomeState: testResult ? testResult.matched ? 'active' : 'inactive' : undefined,
      },
    })
    flowEdges.unshift(createEdge('input-condition-0', 'entry', 'condition-0', { sourceHandle: 'out' }))

    return { nodes: flowNodes, edges: flowEdges }
  }, [canvasWidth, compact, rule, testResult])
  return (
    <section className="visualizer-view" aria-label={`Visual rule flow for ${rule.name}`}>
      <div className="visualizer-heading">
        <div>
          <span className="eyebrow">RULE FLOW</span>
          <h3>{rule.name}</h3>
          <p>AND binds before OR. FALSE tries the next OR alternative.</p>
        </div>
        <FlowActions onEdit={onEdit} onTest={onTest} />
      </div>
      <div
        className="visualizer-canvas"
        ref={canvasRef}
        style={{ height: compact
          ? `${Math.min(920, Math.max(640, 430 + rule.conditions.length * 160))}px`
          : `${Math.min(900, Math.max(610, 250 + rule.conditions.length * 190))}px` }}
      >
        <ReactFlow
          key={layoutKey}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.04, minZoom: 0.35, maxZoom: 1.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          minZoom={0.25}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--flow-grid)" />
          <Controls position="bottom-left" showInteractive={false} />
          <FitFlowToNodes fitKey={layoutKey} />
        </ReactFlow>
      </div>
      <div className="visualizer-footer">
        <span><i className="flow-legend-true" /> TRUE completes a group</span>
        <span><i className="flow-legend-false" /> FALSE tries the next OR group</span>
        <b>{rule.conditions.length} {rule.conditions.length === 1 ? 'condition' : 'conditions'}</b>
      </div>
    </section>
  )
}

export default RuleVisualizer
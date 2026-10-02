import React, { useState } from 'react'
import { Card } from '../common/Card'
import type { EducationalFeatureMetadata } from '../../types/education'

const FEATURES: EducationalFeatureMetadata[] = [
  {
    id: 'qa',
    title: 'Intelligent Educational Q&A',
    shortDescription: 'Multi-turn question answering with textbook and lecture notes context.',
    fullDescription:
      'Grounded question answering pipeline leveraging Google Gemini models. Incorporates prompt validation, context ingestion, citation awareness, and prepared support for real-time web-search grounding.',
    badge: 'Core Engine',
    icon: '💬',
    status: 'foundation_ready',
    capabilities: [
      'Configurable Gemini model routing',
      'Context token optimization',
      'Future Web Search Grounding hook',
      'Citation and reference extraction',
    ],
  },
  {
    id: 'concept-explanation',
    title: 'Concept Explanation',
    shortDescription: 'Multi-tiered pedagogical breakdown adjusted by cognitive audience level.',
    fullDescription:
      'Structured concept explanations breaking complex topics into intuitive analogies, first-principles derivations, and real-world examples tailored from elementary to undergraduate or professional depth.',
    badge: 'Pedagogy',
    icon: '💡',
    status: 'foundation_ready',
    capabilities: [
      'Audience-tailored explanations',
      'First-principles decomposition',
      'Interactive analogy generation',
      'Follow-up exploratory prompts',
    ],
  },
  {
    id: 'quiz-generation',
    title: 'Adaptive Quiz Generation',
    shortDescription: 'Dynamic assessment generation with distractors and answer explanations.',
    fullDescription:
      'Generates strictly formatted multiple-choice and conceptual assessment items with verifiable correct answers, realistic distractors, and educational rationale for each option.',
    badge: 'Assessment',
    icon: '📝',
    status: 'foundation_ready',
    capabilities: [
      'Strict JSON schema validation',
      'Configurable difficulty & question count',
      'Plausible distractor generation',
      'Detailed rationale per choice',
    ],
  },
  {
    id: 'text-summarization',
    title: 'Lecture & Text Summarization',
    shortDescription: 'Executive distillation of textbook chapters, papers, and lecture transcripts.',
    fullDescription:
      'High-fidelity summarization producing hierarchical takeaways, bullet summaries, and key formula/definition highlights without hallucination or loss of critical nuance.',
    badge: 'Synthesis',
    icon: '📚',
    status: 'foundation_ready',
    capabilities: [
      'Executive summary formatting',
      'Key definition extraction',
      'Bullet-point distillation',
      'Token window budgeting',
    ],
  },
  {
    id: 'learning-path',
    title: 'Personalized Learning Pathways',
    shortDescription: 'Targeted milestone roadmap built around learner goals and prerequisites.',
    fullDescription:
      'Synthesizes dependency graphs of prerequisite knowledge, creating structured week-by-week learning roadmaps tailored to the student current baseline and target mastery objectives.',
    badge: 'Roadmap',
    icon: '🎯',
    status: 'foundation_ready',
    capabilities: [
      'Prerequisite knowledge mapping',
      'Milestone & module scaffolding',
      'Estimated completion pacing',
      'Adaptive checkpoint assessments',
    ],
  },
]

export const ArchitectureRoadmap: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string>('qa')

  const active = FEATURES.find((f) => f.id === selectedFeature) || FEATURES[0]

  return (
    <Card
      id="architecture-roadmap-card"
      title="Educational Capabilities Architecture"
      subtitle="Engineering blueprints for Gemini-powered educational capabilities"
      badge="FOUNDATION PHASE"
      badgeColor="var(--color-primary-light)"
    >
      <div style={styles.container}>
        <div style={styles.tabsList} role="tablist">
          {FEATURES.map((feature) => {
            const isSelected = feature.id === selectedFeature
            return (
              <button
                key={feature.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedFeature(feature.id)}
                style={{
                  ...styles.tabButton,
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-subtle)',
                  background: isSelected
                    ? 'rgba(99, 102, 241, 0.15)'
                    : 'rgba(255, 255, 255, 0.02)',
                  color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                }}
              >
                <span style={styles.tabIcon}>{feature.icon}</span>
                <div style={styles.tabText}>
                  <div style={styles.tabTitle}>{feature.title}</div>
                  <div style={styles.tabBadge}>{feature.badge}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div style={styles.detailPanel}>
          <div style={styles.detailHeader}>
            <div style={styles.detailTitleGroup}>
              <span style={styles.largeIcon}>{active.icon}</span>
              <div>
                <h4 style={styles.detailTitle}>{active.title}</h4>
                <p style={styles.detailSub}>{active.shortDescription}</p>
              </div>
            </div>
            <span style={styles.statusPill}>Contract Defined</span>
          </div>

          <p style={styles.descriptionText}>{active.fullDescription}</p>

          <div style={styles.capabilitiesBox}>
            <span style={styles.capTitle}>Architectural Specifications & Planned Pipeline:</span>
            <ul style={styles.capList}>
              {active.capabilities.map((cap, idx) => (
                <li key={idx} style={styles.capItem}>
                  <span style={styles.checkMark}>✓</span>
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={styles.phaseAlert}>
            <span style={styles.alertIcon}>ℹ️</span>
            <div>
              <strong>Software Engineering Principle:</strong> This capability has its backend contract,
              typed interfaces, and error boundaries established. The Gemini orchestration implementation
              will be introduced in the next phase without mock strings or fake AI responses.
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 320px) 1fr',
    gap: '24px',
    alignItems: 'start',
  },
  tabsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    borderWidth: '1px',
    borderStyle: 'solid',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    outline: 'none',
  },
  tabIcon: {
    fontSize: '20px',
  },
  tabText: {
    display: 'flex',
    flexDirection: 'column',
  },
  tabTitle: {
    fontSize: '14px',
    fontWeight: 600,
  },
  tabBadge: {
    fontSize: '11px',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginTop: '2px',
  },
  detailPanel: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
  },
  detailTitleGroup: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
  },
  largeIcon: {
    fontSize: '32px',
  },
  detailTitle: {
    fontSize: '18px',
    fontWeight: 700,
  },
  detailSub: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  statusPill: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--color-success)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  descriptionText: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--text-main)',
  },
  capabilitiesBox: {
    background: '#070b12',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
  },
  capTitle: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-dim)',
    fontWeight: 600,
    display: 'block',
    marginBottom: '10px',
  },
  capList: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px',
  },
  capItem: {
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-main)',
  },
  checkMark: {
    color: 'var(--color-cyan)',
    fontWeight: 'bold',
  },
  phaseAlert: {
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    fontSize: '13px',
    lineHeight: 1.5,
    color: 'var(--text-muted)',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  alertIcon: {
    fontSize: '16px',
  },
}

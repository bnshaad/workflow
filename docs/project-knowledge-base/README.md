# Workflow Project Knowledge Base

**Canonical status date:** 2026-07-13

This directory is the maintained source of truth for Workflow. When documentation conflicts with the implemented repository, inspect the repository first and update this knowledge base rather than changing working code to match stale documentation.

## Current project identity

Workflow is a human-in-the-loop, explainable AI-assisted workforce operations and field-execution platform. Its main academic contribution is explainable multi-criteria workforce assignment with manager approval, override feedback, and evaluation against manual assignment. A controlled multi-agent coordinator connects job understanding, workforce decision support, operations insight, and grounded knowledge retrieval.

## Canonical terminology

- Use **job**, not task, for the primary operational entity.
- Use `jobs` and `jobActivities` as implemented collections.
- AI recommendations remain advisory.
- Adaptive learning means feedback collection and analysis in the MVP; it does not mean automatic retraining.
- Real-time must only be claimed where live listeners, streams, or push updates are actually implemented.

## Current implementation status

See `03-development/12_Current_Implementation_Status.md`.

## Multi-agent architecture

See `02-architecture/09_Multi_Agent_AI_Architecture.md`.

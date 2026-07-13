# Codex Playbook

Version: 1.0

Status: Approved

---

# Purpose

This document defines how Codex should work on the Workflow project.

Workflow has already been fully planned.

Codex is responsible for implementation, not product decisions.

Codex must follow the approved architecture, database design, product specification and design assets.

It must never invent features or redesign the application.

---

# Sources of Truth

Always follow this priority order.

Priority 1

project-knowledge-base/

Business logic

Architecture

Database

Product specification

Priority 2

design-assets/

Design system

Approved screens

Priority 3

Existing source code

Never ignore higher priority documents.

---

# Development Philosophy

Workflow is built incrementally.

Each feature should be completed before starting the next.

Never generate the whole application in one step.

---

# Technology Stack

Frontend

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

Lucide React

Backend

Firebase Authentication

Cloud Firestore

Firebase Storage

Do not introduce additional frameworks without approval.

---

# Architecture Rules

Never:

• Add Flask

• Add Express

• Add Node backend

• Add Redux

• Add Zustand

• Add unnecessary packages

• Add machine learning

• Change database architecture

• Change folder structure

---

# UI Rules

The design has already been approved.

Implement the design exactly.

Do not redesign layouts.

Do not change colors.

Do not change spacing.

Do not invent components.

Use reusable components wherever possible.

---

# Component Rules

Every UI element should become a reusable component.

Examples

Sidebar

Header

MetricCard

StatusBadge

JobTable

SuggestedWorkerCard

Timeline

ProofGallery

IssueCard

LoadingSkeleton

EmptyState

Dialog

Toast

Avoid duplicated UI.

---

# Business Rules

Use terminology defined in the Product Specification.

UI terminology

Jobs

Team

Suggested Worker

Business

Work Proof

Job Issues

Internal code terminology

tasks

users

recommendations

organizationId

incidents

Never rename database entities.

---

# Database Rules

Use the approved Firestore collections only.

organizations

users

tasks

recommendations

incidents

notifications

auditLogs

Never create additional collections without approval.

---

# Firestore Rules

Every business document must contain

organizationId

createdAt

updatedAt

isActive

Never bypass tenant isolation.

Never bypass RBAC.

---

# Coding Standards

Prefer

Small components

Reusable logic

Custom hooks

Service layer

Strong typing

Readable code

Avoid

Large components

Repeated code

Business logic inside pages

Firestore queries inside UI components

---

# Service Layer

All Firebase operations must go through services.

Components never communicate directly with Firestore.

---

# Performance

Minimize Firestore reads.

Use embedded data where defined.

Avoid duplicate queries.

Avoid unnecessary re-renders.

---

# Design Implementation

Use

Tailwind CSS

shadcn/ui

Lucide Icons

Desktop-first

Light theme

Minimal animations

---

# Development Roadmap

Always build Workflow in the approved phase order.

## Phase A

Foundation

## Phase B

Authentication

User Profiles

RBAC

Tenant Isolation

Firestore Security Rules

## Phase C

Web Core

Jobs

Team

Dashboard

## Phase D

Web AI

AI Job Understanding

Intelligent Task Assignment

Explainable AI

Adaptive Learning

Decision Support

```text
WEB COMPLETE
```

## Phase E

Employee Mobile

Authentication

Assigned Jobs

Job Details

Status Updates

Work Proof

Issue Reporting

## Phase F

Mobile AI

Conversational AI

Knowledge Assistant

## Phase G

Notifications

Audit Logs

Performance

Testing

Never skip ahead.

---

# Git Workflow

After completing each module

Run

npm run build

Fix all TypeScript errors.

Commit the module.

Only then begin the next.

---

# When Unsure

Never guess.

Never invent features.

Never redesign.

Instead:

Explain the uncertainty.

Suggest options.

Wait for approval.

---

# Definition of Done

A module is complete when

• TypeScript has zero errors

• Build succeeds

• Uses reusable components

• Matches approved design

• Uses service layer

• Follows architecture

• Uses correct terminology

• Is responsive

• Contains no placeholder logic

Only after that should the next module begin.

# Multi-Agent Implementation Rules (2026-07-13)

- Audit the repository before implementing; do not force code to match stale documentation.
- Reuse existing auth, tenant, service, jobs, assignment, activity, and audit abstractions.
- Do not let model code call Firestore directly.
- Add typed tool adapters around existing services.
- Use rule-first routing and invoke only required specialists.
- Every critical write must use a structured proposal and explicit confirmation flow.
- Revalidate identity, organization, permissions, proposal expiry, and current entity state at execution time.
- Add maximum-step, maximum-call, timeout, schema-validation, and idempotency protections.
- Do not create temporary files, debug files, duplicate documentation, backup files, or new dependencies unless strictly necessary.
- Modify the minimum required files, review `git status`, and do not commit secrets or generated files.


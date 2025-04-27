# Frontend (Next.js) Trading App Rebuild Roadmap

This document tracks all progress, epics, user stories, and technical decisions for the new Next.js trading UI. All previous separate roadmap/epic files should be deleted in favor of this single source of truth.

---

## Epics & User Stories

### Epic 1: Project Setup
- [ ] Scaffold new Next.js app in `/next-client`
- [ ] Set up folder structure (features, trpc, types, utils, components)
- [ ] Configure Typescript, ESLint, Prettier
- [ ] Set up tRPC client to connect to backend API
- [ ] Set up TanStack Query for data fetching/caching

### Epic 2: Broker Credential Management
- [ ] Create broker credential form (apiKey, identifier, password, isDemo)
- [ ] Connect form to backend `/broker-credentials` endpoint (tRPC mutation)
- [ ] Display feedback for success/failure
- [ ] List saved broker credentials

### Epic 3: Bot Management
- [ ] Bot creation form (strategy, pair, timeframe, risk settings, broker selection)
- [ ] Connect to backend bot creation endpoint (tRPC mutation)
- [ ] List user bots with status, actions (start/stop/delete)
- [ ] Show error/success feedback

### Epic 4: Trading Dashboard
- [ ] Display recent trades, P&L, performance stats per bot
- [ ] Show real-time activity/logs

### Epic 5: General Improvements
- [ ] Add detailed logging to UI
- [ ] Responsive/mobile-friendly design
- [ ] Error boundary and fallback UI

---

## Technical Decisions
- No code sharing between frontend and backend for types/routers (for simple deployment)
- tRPC client in frontend mirrors backend routers/types manually
- Old roadmap/epic files will be deleted

---

## Progress Log
- [ ] Project scaffolded
- [ ] Folder structure created
- [ ] tRPC client set up
- [ ] Broker credential flow implemented
- [ ] Bot management flow implemented
- [ ] Trading dashboard implemented

---

_This file is the single source of truth for frontend rebuild progress. Update as you go!_

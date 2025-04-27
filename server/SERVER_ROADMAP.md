# Server (Backend) tRPC Migration Roadmap

This file tracks all progress, epics, user stories, and technical decisions for refactoring the backend to support tRPC for seamless, type-safe integration with the new Next.js frontend.

---

## Epics & User Stories

### Epic 1: tRPC Project Setup
- [ ] Add tRPC and Zod dependencies
- [ ] Scaffold `/src/trpc` folder for routers
- [ ] Set up root tRPC router and context
- [ ] Expose `/trpc` API endpoint in server (Express/Fastify/etc.)
- [ ] Add example router (e.g., `helloWorld`)

### Epic 2: Feature Routers
- [ ] Broker router (CRUD for broker credentials)
- [ ] Bots router (CRUD and management)
- [ ] Trading router (trading actions, stats, logs)
- [ ] Auth/user router (if needed)

### Epic 3: Migration
- [ ] Migrate existing REST endpoints to tRPC (as needed)
- [ ] Update backend types/interfaces for tRPC
- [ ] Ensure Zod validation for all procedures

### Epic 4: Testing & Integration
- [ ] Test tRPC endpoints with Postman or frontend
- [ ] Integrate with new Next.js frontend
- [ ] Add logging and error handling

---

## Technical Decisions
- tRPC routers/types live only in backend (no shared package)
- Frontend mimics backend routers/types manually for deployment simplicity
- Gradually migrate REST endpoints; keep legacy endpoints as needed for compatibility

---

## Progress Log
- [ ] tRPC dependencies added
- [ ] Folder structure created
- [ ] Root router and example endpoint working
- [ ] Feature routers implemented
- [ ] Frontend integration tested

---

_This file is the single source of truth for backend migration progress. Update as you go!_

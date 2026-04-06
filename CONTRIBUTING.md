# Contributing to DialerJazz

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to DialerJazz. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Setup Your Environment

1.  **Fork the repo** and create your branch from `main`.
2.  If you've added code that should be tested, **add tests**.
3.  If you've changed APIs, **update the documentation**.
4.  Ensure the test suite passes locally (`cd server && npm test`).
5.  Make sure your code lints correctly.

## Pull Request Process

1.  **Describe your changes** in the PR accurately. Link the PR to any related Issues.
2.  Ensure your branch is up to date with `origin/main` before opening the PR.
3.  If your changes include a UI modification, please provide a screenshot or GIF showing the before and after.
4.  The core team will review your PR and either merge it or request modifications.

## Development Workflows

-   `npm run install:all` to install dependencies across the monorepo.
-   `npm run dev` to start the frontend and backend servers concurrently.
-   `cd server && npm test` to run the backend test suite (Vitest).

### Project Structure

```
DialerJazz/
├── client/          # React + Vite + TypeScript frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── contexts/     # React contexts (Auth, Telnyx)
│       ├── pages/        # Route-level page components
│       └── lib/          # Utilities (api.ts, insforge.ts)
├── server/          # Node.js + Express + TypeScript backend
│   └── src/
│       ├── routes/       # API route handlers
│       ├── middleware/   # Auth, error handling
│       └── services/     # Business logic
└── docs/plans/      # Project documentation & planning
```

Be mindful of our architecture: UI logic belongs in `/client`, while API routes and business logic belong in `/server`.

## Code Style

-   We use `Prettier`. Please ensure your editor runs Prettier on save, or run it manually before committing your code.
-   Variables and functions should use `camelCase`. Files returning React components should be `PascalCase.tsx`.
-   CSS uses Tailwind CSS 3.4. Do not upgrade to v4.

## Current Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI | Tailwind CSS 3.4, shadcn/ui, Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Database/Auth | InsForge (PostgreSQL BaaS) |
| Telephony | Telnyx WebRTC SDK |
| Deployment | Render (Docker) |

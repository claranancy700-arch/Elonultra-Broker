# ELON-ULTRA — Frontend

Quick dev setup and commands for the frontend.

Prerequisites
- Node.js and npm installed

Install dev dependencies:

```powershell
npm install
```

Run a local dev server (live reload):

```powershell
npm run dev
```

Format and lint:

```powershell
npm run format
npm run lint
```

VS Code recommended extensions: Live Server, Prettier, ESLint.

## Code quality and linting

This repo uses ESLint with additional rules to keep code clean and non-spaghetti:

* Complexity, max-lines, max-statements and similar rules are enabled in `.eslintrc.json`.
* Run `npm run lint` regularly; it will auto‑fix many issues.
* A `precommit` script (and you can add a husky hook) will run lint before commits.
* Aim to break up large files, remove unused code, and avoid global logs.

Refer to the project documentation for architecture patterns and avoidance of spaghetti code (check the `REACT_*` docs).

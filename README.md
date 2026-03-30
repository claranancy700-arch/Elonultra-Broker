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

## Python Chat Service (Optional Realtime)

You can run a dedicated Python realtime chat service while keeping the main Node API.

1. Install Python dependencies:

```powershell
cd python-chat-service
pip install -r requirements.txt
```

2. Configure environment:

```powershell
copy .env.example .env
```

3. Start Python chat service:

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 5100 --reload
```

4. In `frontend/.env`, set:

```env
VITE_CHAT_SOCKET_URL=http://localhost:5100
```

When `VITE_CHAT_SOCKET_URL` is set, React chat sockets connect to Python service. Existing REST chat APIs remain on Node.

## Code quality and linting

This repo uses ESLint with additional rules to keep code clean and non-spaghetti:

* Complexity, max-lines, max-statements and similar rules are enabled in `.eslintrc.json`.
* Run `npm run lint` regularly; it will auto‑fix many issues.
* A `precommit` script (and you can add a husky hook) will run lint before commits.
* Aim to break up large files, remove unused code, and avoid global logs.

Refer to the project documentation for architecture patterns and avoidance of spaghetti code (check the `REACT_*` docs).

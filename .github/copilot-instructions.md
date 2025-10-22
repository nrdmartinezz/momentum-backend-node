# Copilot Instructions for Momentum Backend Node

## Project Overview
This is a Firebase Cloud Functions backend for the Momentum Web App. It uses Express.js to expose RESTful APIs, with user management and settings stored in a MySQL database. The backend is located in `momentum-backend-node/functions`.

## Architecture
- **Express App**: Defined in `functions/index.js`, exposes routes under `/users` (see `api/Users.js`).
- **Cloud Functions**: The Express app is exported as a single HTTPS function (`exports.api`).
- **Database**: MySQL connection via `config/db.js`, credentials from environment variables.
- **Routes**: User-related endpoints in `api/Users.js`. Add new route modules in `api/` and register in `index.js`.

## Developer Workflows
- **Local Development**: Use `npm run serve` to start Firebase emulators for functions.
- **Deploy**: Use `npm run deploy` to deploy functions to Firebase.
- **Logs**: Use `npm run logs` to view function logs.
- **Testing**: No formal test suite detected; use `firebase-functions-test` for unit tests if needed.

## Conventions & Patterns
- **Route Registration**: All API routes are registered in `index.js` using Express routers.
- **Database Access**: Use the shared `db` instance from `config/db.js`. Always close connections with `db.end()` after queries.
- **Error Handling**: Return JSON error responses with status codes. Log errors to console.
- **Environment Variables**: Use `.env` for DB and JWT secrets. Load with `dotenv`.
- **User Auth**: Passwords hashed with bcrypt, JWTs generated with `jsonwebtoken`.
- **Settings**: User settings managed via dedicated endpoints (`get_user_settings`, `update_user_settings`).

## Integration Points
- **Firebase**: Functions deployed and served via Firebase CLI.
- **MySQL**: All persistent data stored in MySQL. Ensure DB is running and accessible.
- **JWT**: Used for user authentication; secret must be set in environment.

## Key Files & Directories
- `functions/index.js`: Main entry, Express app and Cloud Function export.
- `functions/api/Users.js`: User management routes and logic.
- `functions/config/db.js`: MySQL connection setup.
- `functions/package.json`: Scripts and dependencies.

## Example Patterns
- **Adding a Route**:
  1. Create a new file in `api/` (e.g., `Tasks.js`).
  2. Export an Express router.
  3. Register in `index.js`: `app.use('/tasks', require('./api/Tasks'))`.
- **Database Query**:
  ```js
  const [result] = await db.query('SELECT ...');
  db.end();
  ```
- **Error Response**:
  ```js
  res.status(400).json({ error: 'Message' });
  ```

---

If any conventions or workflows are unclear or missing, please provide feedback to improve these instructions.

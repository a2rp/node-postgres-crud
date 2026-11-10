# Node PostgreSQL CRUD

A small Express REST API for creating, listing, reading, updating, and deleting Todo records in PostgreSQL.

## Requirements

- Node.js 22 or newer
- npm
- PostgreSQL

## Set up the database

Create the database, then create the `todo` table:

```powershell
createdb todo_database
psql -d todo_database -f app/database/database.sql
```

Copy `.env.example` to `.env` and update the `DATABASE_URL` password for your local PostgreSQL user. Percent-encode special characters in the password when placing it in a connection URL.

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

By default, the API listens on `http://127.0.0.1:1198`. Configure `PORT` or `HOST` in `.env` to change the listener.

## API

All endpoints use JSON. Todo descriptions are trimmed and must contain 1 to 255 characters.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/todos` | Create a Todo from `{"description":"Buy milk"}` |
| `GET` | `/todos?limit=50&offset=0` | List todos with pagination metadata |
| `GET` | `/todos/:id` | Read one Todo |
| `PUT` | `/todos/:id` | Replace the description |
| `DELETE` | `/todos/:id` | Delete one Todo |

List requests default to 50 records and accept a limit from 1 to 100. The API uses parameterized SQL queries and returns `400` for invalid input, `404` for missing records, and generic database errors without exposing server details.

`rest.http` contains sample requests for the VS Code REST Client extension.

## Scope

This project is a local CRUD demo with no authentication or authorization. It binds to localhost by default and should use disposable data only. Add access controls and a security review before exposing it to a network or using real user data.

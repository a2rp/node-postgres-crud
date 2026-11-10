require("dotenv").config();

const express = require("express");
const pool = require("./app/database/db");

const app = express();
const MAX_PAGE_SIZE = 100;

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb", strict: true }));

function parsePositiveInteger(value) {
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function parseBoundedInteger(value, fallback, min, max) {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

function readDescription(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "Send a JSON object containing a description." };
    }
    if (Object.keys(body).some((key) => key !== "description")) {
        return { error: "Only the description field is supported." };
    }
    if (typeof body.description !== "string") {
        return { error: "Description must be a string." };
    }

    const description = body.description.trim();
    if (description.length < 1 || description.length > 255) {
        return { error: "Description must contain 1 to 255 characters." };
    }
    return { description };
}

function databaseError(res, error) {
    console.error("Todo database request failed:", error.code || error.name);
    return res.status(500).json({ success: false, message: "An unexpected database error occurred." });
}

app.post("/todos", async (req, res) => {
    const { description, error } = readDescription(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    try {
        const result = await pool.query(
            "INSERT INTO todo (description) VALUES ($1) RETURNING todo_id, description",
            [description]
        );
        return res.status(201).json({ success: true, todo: result.rows[0] });
    } catch (queryError) {
        return databaseError(res, queryError);
    }
});

app.get("/todos", async (req, res) => {
    const limit = parseBoundedInteger(req.query.limit, 50, 1, MAX_PAGE_SIZE);
    const offset = parseBoundedInteger(req.query.offset, 0, 0, 1000000);
    if (limit === null || offset === null) {
        return res.status(400).json({ success: false, message: `Use limit 1-${MAX_PAGE_SIZE} and a non-negative offset.` });
    }

    try {
        const [result, countResult] = await Promise.all([
            pool.query(
                "SELECT todo_id, description FROM todo ORDER BY todo_id DESC LIMIT $1 OFFSET $2",
                [limit, offset]
            ),
            pool.query("SELECT COUNT(*)::int AS total FROM todo")
        ]);
        const total = countResult.rows[0].total;
        return res.json({
            success: true,
            todos: result.rows,
            pagination: { limit, offset, total, hasMore: offset + result.rows.length < total }
        });
    } catch (queryError) {
        return databaseError(res, queryError);
    }
});

app.get("/todos/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (id === null) return res.status(400).json({ success: false, message: "Todo id must be a positive integer." });

    try {
        const result = await pool.query(
            "SELECT todo_id, description FROM todo WHERE todo_id = $1",
            [id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Todo not found." });
        return res.json({ success: true, todo: result.rows[0] });
    } catch (queryError) {
        return databaseError(res, queryError);
    }
});

app.put("/todos/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (id === null) return res.status(400).json({ success: false, message: "Todo id must be a positive integer." });

    const { description, error } = readDescription(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    try {
        const result = await pool.query(
            "UPDATE todo SET description = $1 WHERE todo_id = $2 RETURNING todo_id, description",
            [description, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Todo not found." });
        return res.json({ success: true, todo: result.rows[0] });
    } catch (queryError) {
        return databaseError(res, queryError);
    }
});

app.delete("/todos/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (id === null) return res.status(400).json({ success: false, message: "Todo id must be a positive integer." });

    try {
        const result = await pool.query(
            "DELETE FROM todo WHERE todo_id = $1 RETURNING todo_id",
            [id]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Todo not found." });
        return res.json({ success: true, message: "Todo deleted." });
    } catch (queryError) {
        return databaseError(res, queryError);
    }
});

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found." }));

app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "Request body must contain valid JSON." });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({ success: false, message: "Request body is too large." });
    }

    console.error("Request failed:", error.code || error.name);
    return res.status(500).json({ success: false, message: "An unexpected server error occurred." });
});

async function startServer() {
    if (!process.env.DATABASE_URL) {
        throw Object.assign(new Error("DATABASE_URL is required."), { code: "CONFIGURATION_ERROR" });
    }

    const port = Number(process.env.PORT || 1198);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw Object.assign(new Error("PORT must be an integer between 1 and 65535."), { code: "CONFIGURATION_ERROR" });
    }

    await pool.query("SELECT 1");
    const host = process.env.HOST || "127.0.0.1";
    return new Promise((resolve, reject) => {
        const server = app.listen(port, host, () => {
            console.log(`Todo API listening at http://${host}:${port}`);
            resolve(server);
        });
        server.once("error", reject);
    });
}

if (require.main === module) {
    startServer().catch(async (error) => {
        if (error.code === "CONFIGURATION_ERROR") {
            console.error(error.message);
        } else {
            console.error("Could not start Todo API:", error.code || error.name);
        }
        await pool.end().catch(() => {});
        process.exitCode = 1;
    });
}

module.exports = app;

const express = require('express');
const app = express();
const pool = require("./app/database/db");

app.use(express.json()); // req.body

// create todo
app.post("/todos", async (req, res) => {
    const { description } = req.body;
    try {
        const newTodo = await pool.query("INSERT INTO todo (description) VALUES ($1) RETURNING *", [description]);
        res.json({
            succcess: true,
            ...newTodo.rows[0]
        });
    } catch (error) {
        res.json({
            succcess: false,
            message: error.message
        });
    }
});

// get all todo
app.get("/todos", async (req, res) => {
    try {
        const allTodos = await pool.query("SELECT * from todo");
        res.json({
            succcess: true,
            ...allTodos.rows
        });
    } catch (error) {
        res.json({
            succcess: false,
            message: error.message
        });
    }
});

// get a todo
app.get("/todos/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const todo = await pool.query("SELECT * from todo where todo_id = $1", [id]);
        res.json({
            succcess: true,
            ...todo.rows
        });
    } catch (error) {
        res.json({
            succcess: false,
            message: error.message
        });
    }
});

// update a todo
app.put("/todos/:id", async (req, res) => {
    const { id } = req.params;
    const { description } = req.body;

    try {
        const updateTodo = await pool.query("UPDATE todo SET description = $1 WHERE todo_id = $2", [description, id]);

        res.json({
            succcess: true,
            message: "updated successfully"
        });
    } catch (error) {
        res.json({
            succcess: false,
            message: error.message
        });
    }
});

// delete a todo
app.delete("/todos/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const deleteTodo = await pool.query("DELETE FROM todo WHERE todo_id = $1", [id]);

        res.json({
            succcess: true,
            message: "deleted successfully"
        });
    } catch (error) {
        res.json({
            succcess: false,
            message: error.message
        });
    }
});


const PORT = 1198;
app.listen(PORT, console.log("runnin gon port ", PORT));


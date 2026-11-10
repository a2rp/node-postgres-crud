CREATE TABLE IF NOT EXISTS todo (
    todo_id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL
        CHECK (char_length(btrim(description)) BETWEEN 1 AND 255)
);

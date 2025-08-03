const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

const app = express();
const port = 5000;

// HTTP + Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// PostgreSQL pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'taskmasterdb',
    password: 'stav1122',
    port: 5432,
});

app.use(cors());
app.use(express.json());

// קבלת כל המשימות
app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        id,
        title,
        description,
        status,
        priority,
        to_char(due_date, 'YYYY-MM-DD') AS due_date,
        due_soon_notified
      FROM tasks
      ORDER BY due_date ASC NULLS LAST
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// מחזיר משימה לפי ה-id
app.get('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
      SELECT
        id,
        title,
        description,
        status,
        priority,
        to_char(due_date, 'YYYY-MM-DD') AS due_date,
        due_soon_notified
      FROM tasks
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// יצירת משימה 
app.post('/api/tasks', async (req, res) => {
    const { title, description, status, priority = 3, due_date } = req.body;
    try {
        const result = await pool.query(`
      INSERT INTO tasks
        (title, description, status, priority, due_date)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING
        id,
        title,
        description,
        status,
        priority,
        to_char(due_date, 'YYYY-MM-DD') AS due_date,
        due_soon_notified
    `, [title, description, status, priority, due_date]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// עידכון משימה
app.put('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority = 3, due_date } = req.body;

    try {
        const result = await pool.query(`
      UPDATE tasks
      SET
        title       = $1,
        description = $2,
        status      = $3,
        priority    = $4,
        due_date    = $5
      WHERE id = $6
      RETURNING
        id,
        title,
        description,
        status,
        priority,
        to_char(due_date, 'YYYY-MM-DD') AS due_date,
        due_soon_notified
    `, [title, description, status, priority, due_date, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// מחיקת משימה
app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

cron.schedule('* * * * *', async () => {
    console.log('Monitoring Tasks with Imminent Deadlines 🔔');
    try {
        const { rows } = await pool.query(`
      SELECT
        id,
        title,
        to_char(due_date, 'YYYY-MM-DD') AS due_date
      FROM tasks
      WHERE due_date BETWEEN now() AND now() + interval '24 hours'
        AND due_soon_notified = FALSE
    `);
        for (const task of rows) {
            io.emit('dueSoon', {
                id: task.id,
                title: task.title,
                due_date: task.due_date
            });
            await pool.query(
                `UPDATE tasks SET due_soon_notified = TRUE WHERE id = $1`,
                [task.id]
            );
        }
    } catch (err) {
        console.error('שגיאת cron:', err);
    }
});

// הרצת השרת
server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
});

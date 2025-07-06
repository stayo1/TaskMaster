const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 5000;

// הפעלת CORS וניתוח JSON
app.use(cors());
app.use(express.json());

// חיבור ל-PostgreSQL
const pool = new Pool({
    user: 'postgres',          // שנה לפי המשתמש שלך
    host: 'localhost',
    database: 'taskmasterdb',  // שם מסד הנתונים שיצרת
    password: 'stav1122',      // אם יש סיסמה, תוסיף כאן
    port: 5432,
});

// נקודת קצה: קבלת כל המשימות
app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM tasks ORDER BY due_date ASC NULLS LAST'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// נקודת קצה: קבלת משימה לפי id
app.get('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`→ GET /api/tasks/${id}`);   // ← הוספת לוג
    try {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        console.log(`   → no task with id=${id}`);
        return res.status(404).json({ error: 'Task not found' });
      }
      console.log(`   → found task:`, result.rows[0]);
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  

// יצירת משימה חדשה
app.post('/api/tasks', async (req, res) => {
    const { title, description, status, priority = 3, due_date } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO tasks (title, description, status, priority, due_date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [title, description, status, priority, due_date]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// עדכון משימה
app.put('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority = 3, due_date } = req.body;
    try {
        const result = await pool.query(
            `UPDATE tasks
             SET title       = $1,
                 description = $2,
                 status      = $3,
                 priority    = $4,
                 due_date    = $5
             WHERE id = $6
             RETURNING *`,
            [title, description, status, priority, due_date, id]
        );
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
        res.json({ message: 'Task deleted', task: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// הפעלת השרת
app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
});

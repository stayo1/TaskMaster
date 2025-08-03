import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TaskForm.css';

export default function TaskForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: '',     
  });
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`http://localhost:5000/api/tasks/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject('Task not found'))
      .then(data => {
        setForm({
          title: data.title || '',
          description: data.description || '',
          due_date: data.due_date ? data.due_date.slice(0, 10) : '',
          priority: data.priority ? Number(data.priority) : '',
        });
        setLoading(false);
      })
      .catch(e => { setError(e); setLoading(false); });
  }, [id, isEdit]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handlePriorityClick = n => {
    setForm(f => ({ ...f, priority: n }));
  };

  const handleSubmit = e => {
    e.preventDefault();

    const payload = { ...form, status: 'טרם טופל' };
    const endpoint = isEdit
      ? `http://localhost:5000/api/tasks/${id}`
      : `http://localhost:5000/api/tasks`;
    const method = isEdit ? 'PUT' : 'POST';

    fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(() => navigate('/'))
      .catch(err => alert('שגיאה בשמירה: ' + err.message));
  };

  const handleDelete = () => {
    if (!window.confirm('בטוח שברצונך למחוק משימה זו?')) return;
    fetch(`http://localhost:5000/api/tasks/${id}`, { method: 'DELETE' })
      .then(r => r.ok ? r.json() : Promise.reject('Failed to delete'))
      .then(() => navigate('/'))
      .catch(e => alert('Error deleting task: ' + e));
  };

  if (loading) return <div className="loading">טוען…</div>;
  if (error) return <div className="error">שגיאה: {error}</div>;

  return (
    <div className="centered-text">
      <div className="app-container">
        <header className="header">
          <h2>{isEdit ? 'ערוך משימה' : 'משימה חדשה'}</h2>
        </header>

        <form onSubmit={handleSubmit} className="task-form">
          {/* שדות רגילים */}
          <div className="form-field">
            <label>Title</label>
            <input name="title" value={form.title} onChange={handleChange} required />
          </div>

          <div className="form-field">
            <label>Deadline</label>
            <input
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* בר בחירת עדיפות 1–5 */}
          <div className="form-field">
            <label>Priority</label>
            <div className="priority-select">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  type="button"
                  key={n}
                  className={form.priority === n ? 'selected' : ''}
                  onClick={() => handlePriorityClick(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* כפתורי פעולה */}
          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)}>Cancel</button>
            {isEdit && (
              <button
                type="button"
                className="delete-btn"
                onClick={handleDelete}
              >
                🗑️
              </button>
            )}
            <button type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

  // convert returned date (Date object or ISO string) into "YYYY-MM-DD" for <input type="date">
  const parseDateToInput = dateValue => {
    if (!dateValue) return '';
    // if it's already a string in ISO form
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    const d = new Date(dateValue);
    const tzOffsetMs = d.getTimezoneOffset() * 60000;
    const localISO = new Date(d.getTime() - tzOffsetMs).toISOString();
    return localISO.split('T')[0];
  };

  useEffect(() => {
    if (!isEdit) return;
    fetch(`http://localhost:5000/api/tasks/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('משימה לא נמצאה');
        return res.json();
      })
      .then(data => {
        setForm({
          title: data.title || '',
          description: data.description || '',
          due_date: parseDateToInput(data.due_date),
          priority: data.priority || '',
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
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
    const payload = {
      title: form.title,
      description: form.description,
      due_date: form.due_date,
      priority: form.priority,
      status: 'טרם טופל',
    };
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
        if (!res.ok) throw new Error('שגיאה בשמירה');
        return res.json();
      })
      .then(() => navigate('/'))
      .catch(err => alert('שגיאה: ' + err.message));
  };

  const handleDelete = () => {
    if (!window.confirm('בטוח שברצונך למחוק משימה זו?')) return;
    fetch(`http://localhost:5000/api/tasks/${id}`, { method: 'DELETE' })
      .then(r => {
        if (!r.ok) throw new Error('שגיאה במחיקה');
        return r.json();
      })
      .then(() => navigate('/'))
      .catch(err => alert('שגיאה: ' + err.message));
  };

  if (loading) return <div className="loading">טוען…</div>;
  if (error) return <div className="error">שגיאה: {error}</div>;

  return (
    <div className="centered-text">
      <div className="app-container">
        <header className="header">
          <h2>{isEdit ? 'Edit Task' : 'Create Task'}</h2>
        </header>

        <form onSubmit={handleSubmit} className="task-form">
          {/* Title */}
          <div className="form-field">
            <label>Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>

          {/* Deadline */}
          <div className="form-field">
            <label>Deadline</label>
            <input
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={handleChange}
            />
          </div>

          {/* Description */}
          <div className="form-field">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* Priority bar 1–5 */}
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

          {/* Actions */}
          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)}>
              Cancel
            </button>
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

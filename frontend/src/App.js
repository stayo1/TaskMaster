import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TaskForm from './TaskForm';
import './App.css';

function Home() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortCriteria, setSortCriteria] = useState(() => localStorage.getItem('sortCriteria') || null);
  const [sortDirection, setSortDirection] = useState(() => localStorage.getItem('sortDirection') || 'desc');
  const [showSortOptions, setShowSortOptions] = useState(false);

  const navigate = useNavigate();
  const sortRef = useRef();

  useEffect(() => {
    fetch('http://localhost:5000/api/tasks')
      .then(r => r.json())
      .then(data => { setTasks(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (sortCriteria) localStorage.setItem('sortCriteria', sortCriteria);
    else localStorage.removeItem('sortCriteria');
  }, [sortCriteria]);

  useEffect(() => {
    localStorage.setItem('sortDirection', sortDirection);
  }, [sortDirection]);

  useEffect(() => {
    const onClick = e => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortOptions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const sortedTasks = React.useMemo(() => {
    if (!sortCriteria) return tasks;
    const arr = [...tasks];
    const dir = sortDirection === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortCriteria) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status':
          const orderS = ['טרם טופל', 'בטיפול', 'בוצע'];
          cmp = orderS.indexOf(a.status) - orderS.indexOf(b.status);
          break;
        case 'priority':
          cmp = Number(a.priority) - Number(b.priority);
          break;
        case 'due_date':
          const da = a.due_date ? new Date(a.due_date).getTime() : 0;
          const db = b.due_date ? new Date(b.due_date).getTime() : 0;
          cmp = da - db;
          break;
        default:
          cmp = 0;
          break;
      }
      return dir * cmp;
    });
    return arr;
  }, [tasks, sortCriteria, sortDirection]);

  if (loading) return <div className="loading">טוען...</div>;
  if (error) return <div className="error">שגיאה: {error}</div>;

  const handleDelete = id => {
    if (!window.confirm('בטוח שברצונך למחוק משימה זו?')) return;
    fetch(`http://localhost:5000/api/tasks/${id}`, { method: 'DELETE' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to delete');
        return r.json();
      })
      .then(() => {
        setTasks(ts => ts.filter(t => t.id !== id));
      })
      .catch(err => alert('Error deleting task: ' + err.message));
  };

  return (
    <div className="centered-text">
      <div className="app-container">
        <header className="header">
          <h1>רשימת משימות</h1>
        </header>

        <div className="toolbar">
          <button className="btn add-btn" onClick={() => navigate('/tasks/new')}>＋</button>

          <div className="sort-wrapper" ref={sortRef}>
            <button className="btn sort-btn" onClick={() => setShowSortOptions(s => !s)}>Sort</button>
            <button className="btn toggle-btn" onClick={() => setSortDirection(d => d === 'desc' ? 'asc' : 'desc')}>⇅</button>
            {showSortOptions && (
              <div className="sort-options">
                <div onClick={() => { setSortCriteria('title'); setSortDirection('desc'); setShowSortOptions(false); }}>שם</div>
                <div onClick={() => { setSortCriteria('status'); setSortDirection('desc'); setShowSortOptions(false); }}>סטטוס</div>
                <div onClick={() => { setSortCriteria('priority'); setSortDirection('desc'); setShowSortOptions(false); }}>עדיפות</div>
                <div onClick={() => { setSortCriteria('due_date'); setSortDirection('desc'); setShowSortOptions(false); }}>תאריך יעד</div>
              </div>
            )}
          </div>
        </div>

        <div className="task-list">
          {sortedTasks.map(task => (
            <div className="task-item" key={task.id}>
              <div
                className="task-title"
                onClick={() => navigate(`/tasks/${task.id}`)}
                style={{ cursor: 'pointer' }}
              >
                {task.title}
              </div>
              <div
                className="task-status"
                onClick={() => {
                  const statuses = ['טרם טופל', 'בטיפול', 'בוצע'];
                  const idx = statuses.indexOf(task.status);
                  const next = statuses[(idx + 1) % statuses.length];
                  fetch(`http://localhost:5000/api/tasks/${task.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...task, status: next }),
                  })
                    .then(r => r.json())
                    .then(updated => setTasks(ts => ts.map(t => t.id === updated.id ? updated : t)));
                }}
                style={{
                  cursor: 'pointer',
                  borderColor: task.status === 'בוצע' ? 'green' : undefined,
                  color: task.status === 'בוצע' ? 'green' : undefined,
                }}
              >
                {task.status}
              </div>
              <button
                className="btn delete-btn"
                onClick={() => handleDelete(task.id)}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // מתחברים ל־Socket.io
    const socket = io('http://localhost:5000');
    // מאזינים לאירוע dueSoon
    socket.on('dueSoon', ({ title, due_date }) => {
      const when = new Date(due_date).toLocaleString();
      toast.info(`משימה "${title}" פוגעת ב־${when}`);
    });
    return () => socket.disconnect();
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tasks/new" element={<TaskForm />} />
          <Route path="/tasks/:id" element={<TaskForm />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="bottom-right" />
    </>
  );
}

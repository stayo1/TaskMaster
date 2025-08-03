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

  // כותרת שניתנת לעריכה
  const [headerTitle, setHeaderTitle] = useState('TaskMaster');
  const [isEditingHeader, setIsEditingHeader] = useState(false);

  const navigate = useNavigate();
  const sortRef = useRef();
  const today = new Date().setHours(0, 0, 0, 0);

  // מפה להצגת שמות סטטוס באנגלית
  const statusLabels = {
    'טרם טופל': 'Pending',
    'בטיפול': 'In Progress',
    'בוצע': 'Completed'
  };

  useEffect(() => {
    fetch('http://localhost:5000/api/tasks')
      .then(r => r.json())
      .then(data => { setTasks(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // סנכרון מיון ל־localStorage
  useEffect(() => {
    sortCriteria
      ? localStorage.setItem('sortCriteria', sortCriteria)
      : localStorage.removeItem('sortCriteria');
  }, [sortCriteria]);
  useEffect(() => {
    localStorage.setItem('sortDirection', sortDirection);
  }, [sortDirection]);

  // סגירת התפריט בלחיצה מחוץ
  useEffect(() => {
    const handler = e => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortOptions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // מיון
  const sortedTasks = React.useMemo(() => {
    if (!sortCriteria) return tasks;
    const arr = [...tasks];
    const dir = sortDirection === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortCriteria) {
        case 'title':
          cmp = a.title.localeCompare(b.title); break;
        case 'status':
          const order = ['טרם טופל', 'בטיפול', 'בוצע'];
          cmp = order.indexOf(a.status) - order.indexOf(b.status);
          break;
        case 'priority':
          cmp = Number(a.priority) - Number(b.priority); break;
        case 'due_date':
          cmp = (new Date(a.due_date).getTime() || 0) - (new Date(b.due_date).getTime() || 0);
          break;
        default:
          cmp = 0;
      }
      return dir * cmp;
    });
    return arr;
  }, [tasks, sortCriteria, sortDirection]);

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const activeTasks = sortedTasks.filter(t => t.status !== 'בוצע');
  const completedTasks = sortedTasks.filter(t => t.status === 'בוצע');

  return (
    <div className="centered-text">
      <div className="app-container">

        <header className="header">
          {isEditingHeader
            ? <input
              className="header-input"
              value={headerTitle}
              autoFocus
              onBlur={() => setIsEditingHeader(false)}
              onChange={e => setHeaderTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setIsEditingHeader(false)}
            />
            : <h1 onClick={() => setIsEditingHeader(true)}>
              {headerTitle}
            </h1>
          }
        </header>

        <div className="toolbar">
          <button
            className="btn add-btn"
            onClick={() => navigate('/tasks/new')}
          >＋</button>

          <div className="sort-wrapper" ref={sortRef}>
            <button
              className="btn sort-btn"
              onClick={() => setShowSortOptions(s => !s)}
            >Sort</button>
            <button
              className="btn toggle-btn"
              onClick={() => setSortDirection(d => d === 'desc' ? 'asc' : 'desc')}
            >⇅</button>
            {showSortOptions && (
              <div className="sort-options">
                <div onClick={() => { setSortCriteria('title'); setSortDirection('desc'); setShowSortOptions(false); }}>Name</div>
                <div onClick={() => { setSortCriteria('status'); setSortDirection('desc'); setShowSortOptions(false); }}>Status</div>
                <div onClick={() => { setSortCriteria('priority'); setSortDirection('desc'); setShowSortOptions(false); }}>Priority</div>
                <div onClick={() => { setSortCriteria('due_date'); setSortDirection('desc'); setShowSortOptions(false); }}>Due Date</div>
              </div>
            )}
          </div>
        </div>

        <div className="task-list">
          {activeTasks.map(task => (
            <div
              className="task-item"
              key={task.id}
              data-status={task.status}
              onClick={() => navigate(`/tasks/${task.id}`)}
            >
              <div className="task-details">
                <span className="task-title">{task.title}</span>
                <span className="divider" />
                <span
                  className="task-status"
                  onClick={e => {
                    e.stopPropagation();
                    const statuses = ['טרם טופל', 'בטיפול', 'בוצע'];
                    const next = statuses[(statuses.indexOf(task.status) + 1) % statuses.length];
                    fetch(`http://localhost:5000/api/tasks/${task.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...task, status: next })
                    })
                      .then(r => r.json())
                      .then(u => setTasks(ts => ts.map(t => t.id === u.id ? u : t)));
                  }}
                >
                  {statusLabels[task.status]}
                </span>
              </div>
            </div>
          ))}

          {completedTasks.length > 0 && <>
            <hr className="completed-divider" />
            <div className="completed-header">
              Completed ({completedTasks.length})
            </div>
            {completedTasks.map(task => (
              <div
                className="task-item completed"
                key={task.id}
                data-status="restore"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="task-details">
                  <span className="task-title">{task.title}</span>
                  <span className="divider" />
                  <button
                    className="restore-btn"
                    onClick={e => {
                      e.stopPropagation();
                      const due = new Date(task.due_date).setHours(0, 0, 0, 0);
                      if (due < today) {
                        navigate(`/tasks/${task.id}`);
                      } else {
                        fetch(`http://localhost:5000/api/tasks/${task.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...task, status: 'טרם טופל' })
                        })
                          .then(r => r.json())
                          .then(u => setTasks(ts => ts.map(t => t.id === u.id ? u : t)));
                      }
                    }}
                  >Restore</button>
                </div>
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.on('dueSoon', ({ title, due_date }) => {
      toast.info(`Task "${title}" is due on ${due_date}`);
    });
    return () => socket.disconnect();
  }, []);

  return <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tasks/new" element={<TaskForm />} />
        <Route path="/tasks/:id" element={<TaskForm />} />
      </Routes>
    </BrowserRouter>
    <ToastContainer position="bottom-right" />
  </>;
}

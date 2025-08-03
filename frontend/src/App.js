import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TaskForm from './TaskForm';
import './App.css';

export default function App() {
  // מעלים את ה-state לישום כולו
  const [bgImage, setBgImage] = useState(() => localStorage.getItem('bgImage') || null);
  const [bgColor, setBgColor] = useState(() => localStorage.getItem('bgColor') || '#ffffff');
  const brushInputRef = useRef();
  const colorInputRef = useRef();

  // ברגע שמשתנה ה־bgImage או ה־bgColor נשמור ב־localStorage
  useEffect(() => {
    if (bgImage) localStorage.setItem('bgImage', bgImage);
    else localStorage.removeItem('bgImage');
  }, [bgImage]);
  useEffect(() => {
    localStorage.setItem('bgColor', bgColor);
  }, [bgColor]);

  // handlers להפעלת picker
  const pickImage = () => brushInputRef.current.click();
  const pickColor = () => colorInputRef.current.click();

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBgImage(ev.target.result);
    reader.readAsDataURL(file);
  };
  const handleColorChange = e => {
    setBgColor(e.target.value);
    setBgImage(null);
  };

  // סטייל לרקע
  const containerStyle = bgImage
    ? { backgroundImage: `url(${bgImage})` }
    : { backgroundColor: bgColor };

  return (
    <>
      {/* קלטים מוסתרים */}
      <input ref={brushInputRef} type="file" accept="image/*"
             onChange={handleImageChange} style={{ display:'none' }} />
      <input ref={colorInputRef} type="color" value={bgColor}
             onChange={handleColorChange} style={{ display:'none' }} />

      <div className="centered-text" style={containerStyle}>
        <div className="app-container">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={
                <Home
                  pickImage={pickImage}
                  pickColor={pickColor}
                />
              }/>
              <Route path="/tasks/new" element={
                <TaskForm
                  pickImage={pickImage}
                  pickColor={pickColor}
                />
              }/>
              <Route path="/tasks/:id" element={
                <TaskForm
                  pickImage={pickImage}
                  pickColor={pickColor}
                />
              }/>
            </Routes>
          </BrowserRouter>
        </div>
      </div>
      <ToastContainer position="bottom-right"/>
    </>
  );
}

function Home({ pickImage, pickColor }) {
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [sortCriteria, setSortCriteria]   = useState(() => localStorage.getItem('sortCriteria') || null);
  const [sortDirection, setSortDirection] = useState(() => localStorage.getItem('sortDirection') || 'desc');
  const [showSortOptions, setShowSortOptions] = useState(false);

  const [headerTitle, setHeaderTitle]         = useState('TaskMaster');
  const [isEditingHeader, setIsEditingHeader] = useState(false);

  const navigate = useNavigate();
  const sortRef  = useRef();
  const today    = new Date().setHours(0,0,0,0);

  const statusLabels = {
    'טרם טופל': 'Pending',
    'בטיפול':   'In Progress',
    'בוצע':     'Completed'
  };

  useEffect(() => {
    fetch('http://localhost:5000/api/tasks')
      .then(r => r.json())
      .then(data => { setTasks(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    sortCriteria
      ? localStorage.setItem('sortCriteria', sortCriteria)
      : localStorage.removeItem('sortCriteria');
  }, [sortCriteria]);
  useEffect(() => {
    localStorage.setItem('sortDirection', sortDirection);
  }, [sortDirection]);

  useEffect(() => {
    const handler = e => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortOptions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sortedTasks = React.useMemo(() => {
    if (!sortCriteria) return tasks;
    const arr = [...tasks];
    const dir = sortDirection === 'asc' ? 1 : -1;
    arr.sort((a,b) => {
      let cmp = 0;
      switch(sortCriteria) {
        case 'title':
          cmp = a.title.localeCompare(b.title); break;
        case 'status': {
          const order = ['טרם טופל','בטיפול','בוצע'];
          cmp = order.indexOf(a.status) - order.indexOf(b.status); break;
        }
        case 'priority':
          cmp = Number(a.priority) - Number(b.priority); break;
        case 'due_date':
          cmp = (new Date(a.due_date).getTime()||0) - (new Date(b.due_date).getTime()||0);
          break;
        default: cmp = 0;
      }
      return dir * cmp;
    });
    return arr;
  }, [tasks, sortCriteria, sortDirection]);

  if (loading) return <div className="loading">Loading…</div>;
  if (error)   return <div className="error">Error: {error}</div>;

  const activeTasks    = sortedTasks.filter(t => t.status !== 'בוצע');
  const completedTasks = sortedTasks.filter(t => t.status === 'בוצע');

  return (
    <>
      <header className="header">
        {isEditingHeader ? (
          <input
            className="header-input"
            value={headerTitle}
            autoFocus
            onBlur={() => setIsEditingHeader(false)}
            onChange={e => setHeaderTitle(e.target.value)}
            onKeyDown={e => e.key==='Enter' && setIsEditingHeader(false)}
          />
        ) : (
          <h1 onClick={() => setIsEditingHeader(true)}>
            {headerTitle}
          </h1>
        )}
      </header>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn add-btn" onClick={() => navigate('/tasks/new')}>＋</button>
          <button className="btn brush-btn" onClick={pickImage} title="Change Background">🖌️</button>
          <button className="btn color-btn" onClick={pickColor} title="Pick Color">🎨</button>
        </div>

        <div className="toolbar-right">
          <div className="sort-wrapper" ref={sortRef}>
            <button className="btn sort-btn" onClick={() => setShowSortOptions(s => !s)}>Sort</button>
            <button className="btn toggle-btn" onClick={() => setSortDirection(d => d==='desc'?'asc':'desc')}>⇅</button>
            {showSortOptions && (
              <div className="sort-options">
                <div onClick={() => { setSortCriteria('title');    setSortDirection('desc'); setShowSortOptions(false); }}>Name</div>
                <div onClick={() => { setSortCriteria('status');   setSortDirection('desc'); setShowSortOptions(false); }}>Status</div>
                <div onClick={() => { setSortCriteria('priority'); setSortDirection('desc'); setShowSortOptions(false); }}>Priority</div>
                <div onClick={() => { setSortCriteria('due_date'); setSortDirection('desc'); setShowSortOptions(false); }}>Due Date</div>
              </div>
            )}
          </div>
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
              <span className="divider"/>
              <span
                className="task-status"
                onClick={e => {
                  e.stopPropagation();
                  const statuses = ['טרם טופל','בטיפול','בוצע'];
                  const next = statuses[(statuses.indexOf(task.status)+1)%statuses.length];
                  fetch(`http://localhost:5000/api/tasks/${task.id}`, {
                    method:'PUT',
                    headers:{ 'Content-Type':'application/json' },
                    body: JSON.stringify({ ...task, status: next })
                  })
                  .then(r => r.json())
                  .then(u => setTasks(ts => ts.map(t => t.id===u.id?u:t)));
                }}
              >
                {statusLabels[task.status]}
              </span>
            </div>
          </div>
        ))}

        {completedTasks.length>0 && (
          <>
            <hr className="completed-divider"/>
            <div className="completed-header">Completed ({completedTasks.length})</div>
            {completedTasks.map(task => (
              <div
                className="task-item completed"
                key={task.id}
                data-status="restore"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="task-details">
                  <span className="task-title">{task.title}</span>
                  <span className="divider"/>
                  <button
                    className="restore-btn"
                    onClick={e => {
                      e.stopPropagation();
                      const due = new Date(task.due_date).setHours(0,0,0,0);
                      if (due < today) {
                        navigate(`/tasks/${task.id}`);
                      } else {
                        fetch(`http://localhost:5000/api/tasks/${task.id}`, {
                          method:'PUT',
                          headers:{ 'Content-Type':'application/json' },
                          body: JSON.stringify({ ...task, status: 'טרם טופל' })
                        })
                        .then(r => r.json())
                        .then(u => setTasks(ts => ts.map(t => t.id===u.id?u:t)));
                      }
                    }}
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// National AI Lab — Sahifa boshqaruvchi
//   Login → rolga qarab panel (Admin / O'qituvchi / O'quvchi-Talaba)
//   Panel → Laboratoriya (erkin yoki vazifa rejimida) → Quiz sahifalari
// ═══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import App            from './App';
import QuizPage       from './pages/QuizPage';
import ClosedQuizPage from './pages/ClosedQuizPage';
import Login          from './platform/Login';
import AdminPanel     from './platform/AdminPanel';
import TeacherPanel   from './platform/TeacherPanel';
import StudentPanel   from './platform/StudentPanel';
import { currentUser, logout } from './platform/db';

const PANELS = { admin: AdminPanel, teacher: TeacherPanel, student: StudentPanel };

export default function AppRoot() {
  const [user, setUser] = useState(currentUser);
  const [page, setPage] = useState('panel');   // 'panel' | 'lab' | 'quiz-open' | 'quiz-closed'
  const [task, setTask] = useState(null);      // { assignmentId, expId } — vazifa rejimi

  if (!user) return <Login onLogin={(u) => { setUser(u); setPage('panel'); }} />;

  const toPanel = () => { setTask(null); setPage('panel'); };
  const doLogout = () => { logout(); setUser(null); setTask(null); setPage('panel'); };

  if (page === 'quiz-open')   return <QuizPage      onBack={() => setPage('lab')} />;
  if (page === 'quiz-closed') return <ClosedQuizPage onBack={() => setPage('lab')} />;
  if (page === 'lab') {
    return (
      <App
        key={task ? task.assignmentId : 'free'}
        user={user}
        task={task}
        onExit={toPanel}
        onOpenQuiz={(mode) => setPage(mode === 'closed' ? 'quiz-closed' : 'quiz-open')}
      />
    );
  }
  const Panel = PANELS[user.role];
  return <Panel user={user} onLogout={doLogout} onOpenLab={(t = null) => { setTask(t && t.expId ? t : null); setPage('lab'); }} />;
}

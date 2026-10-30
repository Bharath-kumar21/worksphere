import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TaskModal from './components/TaskModal';
import ProjectModal from './components/ProjectModal';
import TeamModal from './components/TeamModal';
import UserModal from './components/UserModal';
import ChatDrawer from './components/ChatDrawer';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Kanban from './pages/Kanban';
import Tasks from './pages/Tasks';
import Teams from './pages/Teams';
import Reports from './pages/Reports';
import Activity from './pages/Activity';
import UsersManagement from './pages/UsersManagement';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';
import NotificationsPage from './pages/NotificationsPage';

import { api } from './services/api';

export default function App() {
  const { user, token, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Modals State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [activeProjectForNewTask, setActiveProjectForNewTask] = useState(null);
  const [activeStatusForNewTask, setActiveStatusForNewTask] = useState('to_do');

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // Chat Drawer State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatProject, setChatProject] = useState({ id: null, name: '' });

  // Shared Data for Modals
  const [projectsList, setProjectsList] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Sync browser URL history
  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const refreshCommonData = async () => {
    if (!token) return;
    try {
      const [projsRes, teamsRes, usersRes] = await Promise.all([
        api.projects.list(),
        api.teams.list(),
        api.users.list(),
      ]);
      if (projsRes.success) setProjectsList(projsRes.projects || []);
      if (teamsRes.success) setTeamsList(teamsRes.teams || []);
      if (usersRes.success) setUsersList(usersRes.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      refreshCommonData();
    }
  }, [token]);

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading WorkSphere SaaS...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login or Register
  if (!token) {
    if (currentPath === '/register') {
      return <Register onNavigate={navigate} />;
    }
    return <Login onNavigate={navigate} />;
  }

  // Modal Triggers
  const handleOpenNewTask = (projectId = null, status = 'to_do') => {
    setActiveTaskId(null);
    setActiveProjectForNewTask(projectId);
    setActiveStatusForNewTask(status);
    setTaskModalOpen(true);
  };

  const handleOpenTaskDetails = (taskId) => {
    setActiveTaskId(taskId);
    setTaskModalOpen(true);
  };

  const handleOpenProjectChat = (projectId, projectName) => {
    setChatProject({ id: projectId, name: projectName });
    setChatOpen(true);
  };

  // Route Dispatcher
  const renderCurrentPage = () => {
    if (currentPath === '/dashboard' || currentPath === '/') {
      return (
        <Dashboard
          onNavigate={navigate}
          onOpenNewTask={() => handleOpenNewTask()}
          onOpenTaskDetails={handleOpenTaskDetails}
          onOpenNewProject={() => setProjectModalOpen(true)}
          onOpenNewUser={() => setUserModalOpen(true)}
        />
      );
    }
    if (currentPath === '/projects') {
      return (
        <Projects
          onNavigate={navigate}
          onOpenNewProject={() => setProjectModalOpen(true)}
          onOpenProjectChat={handleOpenProjectChat}
        />
      );
    }
    if (currentPath.startsWith('/projects/')) {
      const parts = currentPath.split('/');
      const projId = parts[2];
      return (
        <ProjectDetail
          projectId={projId}
          onNavigate={navigate}
          onOpenNewTask={(pId, status) => handleOpenNewTask(pId, status)}
          onOpenTaskDetails={handleOpenTaskDetails}
          onOpenProjectChat={handleOpenProjectChat}
        />
      );
    }
    if (currentPath === '/kanban') {
      return (
        <Kanban
          onOpenNewTask={(pId, status) => handleOpenNewTask(pId, status)}
          onOpenTaskDetails={handleOpenTaskDetails}
        />
      );
    }
    if (currentPath === '/tasks') {
      return (
        <Tasks
          onOpenNewTask={() => handleOpenNewTask()}
          onOpenTaskDetails={handleOpenTaskDetails}
        />
      );
    }
    if (currentPath === '/calendar') {
      return <Calendar onOpenTaskDetails={handleOpenTaskDetails} />;
    }
    if (currentPath === '/notifications') {
      return (
        <NotificationsPage
          onNavigate={navigate}
          onOpenTaskDetails={handleOpenTaskDetails}
        />
      );
    }
    if (currentPath === '/profile') {
      return <Profile />;
    }
    if (currentPath === '/settings') {
      return <Profile />;
    }

    // Role-protected routes for Admin & Project Managers
    if (currentPath === '/teams') {
      if (user?.role === 'team_member') {
        return <Dashboard onNavigate={navigate} onOpenNewTask={() => handleOpenNewTask()} onOpenTaskDetails={handleOpenTaskDetails} />;
      }
      return (
        <Teams
          onOpenNewTeam={() => setTeamModalOpen(true)}
          onNavigate={navigate}
        />
      );
    }
    if (currentPath === '/reports') {
      if (user?.role === 'team_member') {
        return <Dashboard onNavigate={navigate} onOpenNewTask={() => handleOpenNewTask()} onOpenTaskDetails={handleOpenTaskDetails} />;
      }
      return <Reports />;
    }
    if (currentPath === '/activity') {
      return <Activity />;
    }
    if (currentPath === '/users') {
      if (user?.role === 'team_member') {
        return <Dashboard onNavigate={navigate} onOpenNewTask={() => handleOpenNewTask()} onOpenTaskDetails={handleOpenTaskDetails} />;
      }
      return <UsersManagement onOpenNewUser={() => setUserModalOpen(true)} />;
    }

    // Default Fallback
    return (
      <Dashboard
        onNavigate={navigate}
        onOpenNewTask={() => handleOpenNewTask()}
        onOpenTaskDetails={handleOpenTaskDetails}
        onOpenNewProject={() => setProjectModalOpen(true)}
        onOpenNewUser={() => setUserModalOpen(true)}
      />
    );
  };

  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden text-zinc-900">
      {/* Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={navigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={navigate}
          onOpenNewTask={() => handleOpenNewTask()}
          onOpenTaskDetails={handleOpenTaskDetails}
          onOpenNewUser={() => setUserModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderCurrentPage()}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <TaskModal
        isOpen={taskModalOpen}
        taskId={activeTaskId}
        onClose={() => setTaskModalOpen(false)}
        onTaskUpdated={() => refreshCommonData()}
        projects={projectsList}
        users={usersList}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onProjectSaved={() => refreshCommonData()}
        teams={teamsList}
        users={usersList}
      />

      <TeamModal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        onTeamSaved={() => refreshCommonData()}
        users={usersList}
      />

      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onUserCreated={() => refreshCommonData()}
      />

      {/* Live Project Chat Drawer */}
      <ChatDrawer
        isOpen={chatOpen}
        projectId={chatProject.id}
        projectName={chatProject.name}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}

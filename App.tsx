
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';
import HomePage from './pages/HomePage';
import MatchDetailPage from './pages/MatchDetailPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminMatchesPage from './pages/admin/AdminMatchesPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminMatchFormPage from './pages/admin/AdminMatchFormPage';
import AdminTeamsPage from './pages/admin/AdminTeamsPage'; 
import AdminImportInteractivePage from './pages/admin/AdminImportInteractivePage';
import AdminImportTxtPage from './pages/admin/AdminImportTxtPage'; 

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          {/* Updated Match Detail Page Route */}
          <Route path="match/:leagueSlug/:teamsSlug/:matchId" element={<MatchDetailPage />} />
        </Route>        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="matches" element={<AdminMatchesPage />} />
          <Route path="matches/new" element={<AdminMatchFormPage />} />
          <Route path="matches/edit/:matchId" element={<AdminMatchFormPage />} />
          <Route path="teams" element={<AdminTeamsPage />} />
          <Route path="import" element={<AdminImportInteractivePage />} />
          <Route path="import-txt" element={<AdminImportTxtPage />} /> 
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;

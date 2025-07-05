

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAppContext } from '../../AppContext';
import Spinner from '../common/Spinner';

const AdminLayout: React.FC = () => {
  const { session, globalLoading } = useAppContext();

  // Show a loading spinner while the session and initial data are being loaded.
  if (globalLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-neutral-darker">
        <Spinner size="lg" color="text-accent" />
      </div>
    );
  }

  // If loading is finished and there's no session, redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  // If a session exists, render the admin panel
  return (
    <div className="min-h-screen flex bg-neutral-dark text-neutral-text">
      <AdminSidebar />
      <main className="flex-grow p-6 sm:p-8 lg:p-10 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

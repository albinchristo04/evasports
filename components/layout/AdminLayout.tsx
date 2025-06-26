
import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout: React.FC = () => {
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
    
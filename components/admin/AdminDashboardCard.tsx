
import React from 'react';
import { Link } from 'react-router-dom';

interface AdminDashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  linkTo?: string;
  colorClass?: string; // e.g. bg-blue-500
}

const AdminDashboardCard: React.FC<AdminDashboardCardProps> = ({ title, value, icon, linkTo, colorClass = "bg-secondary" }) => {
  const content = (
    <div className={`${colorClass} p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-transform duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider opacity-80">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="text-4xl opacity-70">{icon}</div>
      </div>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }
  return content;
};

export default AdminDashboardCard;
    
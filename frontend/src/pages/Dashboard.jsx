import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

const Dashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div style={{ maxWidth: 800, margin: '2rem auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        <div>
          <span style={{ marginRight: '1rem' }}>Hi, {user?.firstName}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>
      <p>Welcome to the Lead Management System.</p>
    </div>
  );
};

export default Dashboard;

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Protect admin route
  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>
      <p>Admin content will be here</p>
    </div>
  );
};

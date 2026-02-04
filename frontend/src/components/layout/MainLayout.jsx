import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import MobileBottomNav from '../pages/Dashboard/MobileBottomNav';
import ThemeFab from './ThemeFab';
import TestimoniesScrollBanner from '../common/TestimoniesScrollBanner';
import ParticleBackground from '../background/ParticleBackground';
import './MainLayout.css';

export const MainLayout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Protect all routes under MainLayout - redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show nothing while checking authentication
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      <ParticleBackground />
      <Header />
      <TestimoniesScrollBanner />
      <div className="app-wrapper">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <ThemeFab />
    </>
  );
};


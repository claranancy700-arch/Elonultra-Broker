import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import MobileBottomNav from '../pages/Dashboard/MobileBottomNav';
import ThemeFab from './ThemeFab';
import ParticleBackground from '../background/ParticleBackground';
import './MainLayout.css';

export const MainLayout = () => {
  return (
    <>
      <ParticleBackground />
      <Header />
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


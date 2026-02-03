import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ParticleBackground from './components/background/ParticleBackground';
import { MainLayout } from './components/layout/MainLayout';
import { LandingPage } from './components/pages/LandingPage';
import { LoginPage } from './components/pages/Auth/LoginPage';
import { DashboardPage } from './components/pages/Dashboard/DashboardPage';
import { MarketsPage } from './components/pages/Markets/MarketsPage';
import { TransactionsPage } from './components/pages/Transactions/TransactionsPage';
import { SettingsPage } from './components/pages/Settings/SettingsPage';
import { HelpPage } from './components/pages/Help/HelpPage';
import { AdminPage } from './components/pages/Admin/AdminPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <ParticleBackground />
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/markets" element={<MarketsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

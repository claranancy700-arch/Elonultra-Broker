import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './components/pages/Auth/LoginPage';
import { DashboardPage } from './components/pages/Dashboard/DashboardPage';
import { MarketsPage } from './components/pages/Markets/MarketsPage';
import { AdminPage } from './components/pages/Admin/AdminPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/markets" element={<MarketsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

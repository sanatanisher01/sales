import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Auth
import LoginPage from './pages/LoginPage';

// Admin
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOwners from './pages/admin/AdminOwners';

// Owner
import OwnerLayout from './layouts/OwnerLayout';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerTeam from './pages/owner/OwnerTeam';
import OwnerMap from './pages/owner/OwnerMap';
import OwnerOrders from './pages/owner/OwnerOrders';
import OwnerHistory from './pages/owner/OwnerHistory';

// Salesman
import SalesmanLayout from './layouts/SalesmanLayout';
import SalesmanDashboard from './pages/salesman/SalesmanDashboard';
import SalesmanOrders from './pages/salesman/SalesmanOrders';
import NewOrder from './pages/salesman/NewOrder';

// Accountant
import AccountantLayout from './layouts/AccountantLayout';
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import AccountantOrders from './pages/accountant/AccountantOrders';

import ProtectedRoute from './components/ProtectedRoute';
import InstallPrompt from './components/InstallPrompt';

export default function App() {
  const { user } = useAuthStore();

  return (
    <>
      <InstallPrompt />
      <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="owners" element={<AdminOwners />} />
      </Route>

      {/* Owner */}
      <Route path="/owner" element={<ProtectedRoute role="owner"><OwnerLayout /></ProtectedRoute>}>
        <Route index element={<OwnerDashboard />} />
        <Route path="team" element={<OwnerTeam />} />
        <Route path="map" element={<OwnerMap />} />
        <Route path="orders" element={<OwnerOrders />} />
        <Route path="history" element={<OwnerHistory />} />
      </Route>

      {/* Salesman */}
      <Route path="/salesman" element={<ProtectedRoute role="salesman"><SalesmanLayout /></ProtectedRoute>}>
        <Route index element={<SalesmanDashboard />} />
        <Route path="orders" element={<SalesmanOrders />} />
        <Route path="orders/new" element={<NewOrder />} />
      </Route>

      {/* Accountant */}
      <Route path="/accountant" element={<ProtectedRoute role="accountant"><AccountantLayout /></ProtectedRoute>}>
        <Route index element={<AccountantDashboard />} />
        <Route path="orders" element={<AccountantOrders />} />
      </Route>

      {/* Root redirect */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={`/${user.role}`} replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

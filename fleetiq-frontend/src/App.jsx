import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';

// admin pages
import AdminDashboard     from './pages/admin/AdminDashboard';
import AdminShipments     from './pages/admin/AdminShipments';
import AdminFleet         from './pages/admin/AdminFleet';
import AdminDrivers       from './pages/admin/AdminDrivers';
import AdminWarehouses    from './pages/admin/AdminWarehouses';
import AdminUsers         from './pages/admin/AdminUsers';
import AdminMap           from './pages/admin/AdminMap';
import AdminAnalytics     from './pages/admin/AdminAnalytics';
import AdminMemos         from './pages/admin/AdminMemos';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSettings      from './pages/admin/AdminSettings';

// manager + driver (placeholders for now)
import ManagerDashboard from './pages/ManagerDashboard';
import DriverDashboard  from './pages/DriverDashboard';

function RoleRedirect() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin')   return <Navigate to="/admin"   replace />;
    if (user.role === 'manager') return <Navigate to="/manager" replace />;
    if (user.role === 'driver')  return <Navigate to="/driver"  replace />;
    return <Navigate to="/login" replace />;
}

function AdminWrapper({ page: Page }) {
    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
                <Page />
            </AdminLayout>
        </ProtectedRoute>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/"      element={<RoleRedirect />} />

                    {/* admin routes */}
                    <Route path="/admin"               element={<AdminWrapper page={AdminDashboard}     />} />
                    <Route path="/admin/shipments"     element={<AdminWrapper page={AdminShipments}     />} />
                    <Route path="/admin/fleet"         element={<AdminWrapper page={AdminFleet}         />} />
                    <Route path="/admin/drivers"       element={<AdminWrapper page={AdminDrivers}       />} />
                    <Route path="/admin/warehouses"    element={<AdminWrapper page={AdminWarehouses}    />} />
                    <Route path="/admin/users"         element={<AdminWrapper page={AdminUsers}         />} />
                    <Route path="/admin/map"           element={<AdminWrapper page={AdminMap}           />} />
                    <Route path="/admin/analytics"     element={<AdminWrapper page={AdminAnalytics}     />} />
                    <Route path="/admin/memos"         element={<AdminWrapper page={AdminMemos}         />} />
                    <Route path="/admin/notifications" element={<AdminWrapper page={AdminNotifications} />} />
                    <Route path="/admin/settings"      element={<AdminWrapper page={AdminSettings}      />} />

                    {/* manager + driver */}
                    <Route path="/manager" element={
                        <ProtectedRoute allowedRoles={['manager']}>
                            <ManagerDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/driver" element={
                        <ProtectedRoute allowedRoles={['driver']}>
                            <DriverDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
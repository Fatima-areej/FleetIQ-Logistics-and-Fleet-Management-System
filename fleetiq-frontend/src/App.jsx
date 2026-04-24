import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';

// admin pages
import AdminDashboard     from './pages/admin/AdminDashboard';
import AdminShipmentsView from './pages/admin/AdminShipmentsView';
import AdminFleet         from './pages/admin/AdminFleet';
import AdminDrivers       from './pages/admin/AdminDrivers';
import AdminWarehouses    from './pages/admin/AdminWarehouses';
import AdminUsers         from './pages/admin/AdminUsers';
import AdminMap           from './pages/admin/AdminMap';
import AdminAnalytics     from './pages/admin/AdminAnalytics';
import AdminMemos         from './pages/admin/AdminMemos';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSettings      from './pages/admin/AdminSettings';

// manager pages
import ManagerLayout      from './pages/manager/ManagerLayout';
import ManagerDashboard   from './pages/manager/ManagerDashboard';
import ManagerShipments   from './pages/manager/ManagerShipments';
import ManagerWarehouses  from './pages/manager/ManagerWarehouses';
import ManagerRequests    from './pages/manager/ManagerRequests';

// driver (existing)
import DriverLayout     from './pages/driver/DriverLayout';
import DriverShipments  from './pages/driver/DriverShipments';
import DriverVehicles   from './pages/driver/DriverVehicles';

function RoleRedirect() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin')   return <Navigate to="/admin"   replace />;
    if (user.role === 'manager') return <Navigate to="/manager/dashboard" replace />;
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

function ManagerWrapper({ page: Page }) {
    return (
        <ProtectedRoute allowedRoles={['manager']}>
            <ManagerLayout>
                <Page />
            </ManagerLayout>
        </ProtectedRoute>
    );
}

function DriverWrapper({ page: Page }) {
    return (
        <ProtectedRoute allowedRoles={['driver']}>
            <DriverLayout>
                <Page />
            </DriverLayout>
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
                    <Route path="/admin/shipments"     element={<AdminWrapper page={AdminShipmentsView} />} />
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
                    <Route path="/manager"            element={<Navigate to="/manager/dashboard" replace />} />
                    <Route path="/manager/dashboard"  element={<ManagerWrapper page={ManagerDashboard}  />} />
                    <Route path="/manager/shipments"  element={<ManagerWrapper page={ManagerShipments}  />} />
                    <Route path="/manager/warehouses" element={<ManagerWrapper page={ManagerWarehouses} />} />
                    <Route path="/manager/requests"   element={<ManagerWrapper page={ManagerRequests}   />} />
                    <Route path="/manager/memos"      element={<ManagerWrapper page={AdminMemos} />} />
                    <Route path="/driver"           element={<Navigate to="/driver/shipments" replace />} />
                    <Route path="/driver/shipments" element={<DriverWrapper page={DriverShipments} />} />
                    <Route path="/driver/vehicles"  element={<DriverWrapper page={DriverVehicles} />} />
                    <Route path="/driver/memos"     element={<DriverWrapper page={AdminMemos} />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
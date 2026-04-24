import AdminShipments from '../admin/AdminShipments';

// Reuse the existing Shipments panel for managers.
// Admin view is made read-only separately; managers will be the operational users.
export default function ManagerShipments() {
    return <AdminShipments managerLocked />;
}


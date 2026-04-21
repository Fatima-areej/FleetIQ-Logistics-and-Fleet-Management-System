import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const STATUS_COLORS = {
    created:          { bg: '#f3f4f6', text: '#6b7280' },
    assigned:         { bg: '#e1effe', text: '#1a56db' },
    in_transit:       { bg: '#fef3c7', text: '#92400e' },
    at_warehouse:     { bg: '#e0f2fe', text: '#0369a1' },
    out_for_delivery: { bg: '#def7ec', text: '#057a55' },
    delivered:        { bg: '#def7ec', text: '#057a55' },
    cancelled:        { bg: '#fde8e8', text: '#e02424' },
};

const PRIORITY_COLORS = {
    urgent: { bg: '#fde8e8', text: '#e02424' },
    high:   { bg: '#fef3c7', text: '#92400e' },
    normal: { bg: '#e1effe', text: '#1a56db' },
    low:    { bg: '#f3f4f6', text: '#6b7280' },
};

export default function DriverDashboard() {
    const { user, logout } = useAuth();
    const navigate         = useNavigate();

    const [profile,        setProfile]        = useState(null);
    const [activeShipments,setActiveShipments] = useState([]);
    const [allShipments,   setAllShipments]    = useState([]);
    const [notifications,  setNotifications]   = useState([]);
    const [analytics,      setAnalytics]       = useState(null);
    const [loading,        setLoading]         = useState(true);
    const [activeTab,      setActiveTab]       = useState('today');
    const [statusMsg,      setStatusMsg]       = useState('');

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const [activeRes, allRes, notifRes, analyticsRes] = await Promise.all([
                API.get('/shipments'),
                API.get('/shipments/all'),
                API.get('/notifications'),
                API.get(`/analytics/driver/${user.driver_id}`),
            ]);
            setActiveShipments(activeRes.data);
            setAllShipments(allRes.data);
            setNotifications(notifRes.data);
            setAnalytics(analyticsRes.data);

            // get driver profile
            if (user.driver_id) {
                const drvRes = await API.get(`/drivers/${user.driver_id}`);
                setProfile(drvRes.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (shipment_id, newStatus) => {
        try {
            if (newStatus === 'delivered') {
                await API.post(`/shipments/${shipment_id}/complete`);
            } else {
                await API.patch(`/shipments/${shipment_id}/status`, { status: newStatus });
            }
            setStatusMsg('Status updated successfully.');
            setTimeout(() => setStatusMsg(''), 2000);
            fetchAll();
        } catch (err) {
            setStatusMsg(err.response?.data?.error || 'Failed to update status.');
        }
    };

    const markNotifRead = async (id) => {
        try {
            await API.patch(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const nextStatus = (current) => {
        const flow = {
            assigned:         'in_transit',
            in_transit:       'out_for_delivery',
            out_for_delivery: 'delivered',
        };
        return flow[current] || null;
    };

    if (loading) return <div style={styles.loading}>Loading...</div>;

    const d  = profile?.driver || {};
    const a  = analytics || {};
    const unread = notifications.filter(n => !n.is_read).length;

    const tabs = ['today', 'history', 'notifications'];

    return (
        <div style={styles.page}>

            {/* navbar */}
            <div style={styles.navbar}>
                <span style={styles.navLogo}>FleetIQ</span>
                <div style={styles.navTabs}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            style={{
                                ...styles.navTab,
                                ...(activeTab === tab ? styles.navTabActive : {})
                            }}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'notifications'
                                ? `Notifications${unread > 0 ? ` (${unread})` : ''}`
                                : tab.charAt(0).toUpperCase() + tab.slice(1)
                            }
                        </button>
                    ))}
                </div>
                <span style={styles.navRole}>{user?.name}</span>
                <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
            </div>

            <div style={styles.body}>

                {/* TODAY TAB */}
                {activeTab === 'today' && (
                    <>
                        <h2 style={styles.pageTitle}>My deliveries</h2>

                        {/* driver stat cards */}
                        <div style={styles.cardGrid}>
                            <StatCard
                                label="Total deliveries"
                                value={d.total_deliveries || 0}
                                color="#1a56db"
                            />
                            <StatCard
                                label="Rating"
                                value={d.rating || '—'}
                                color={d.rating >= 4.5 ? '#057a55' : '#e3a008'}
                            />
                            <StatCard
                                label="On time"
                                value={a.on_time_deliveries || 0}
                                color="#057a55"
                            />
                            <StatCard
                                label="Delayed"
                                value={a.delayed_deliveries || 0}
                                color="#e02424"
                            />
                            <StatCard
                                label="Avg delivery hrs"
                                value={a.avg_delivery_hours || '—'}
                                color="#9061f9"
                            />
                            <StatCard
                                label="Status"
                                value={d.availability_status || '—'}
                                color={d.availability_status === 'available' ? '#057a55' : '#e3a008'}
                            />
                        </div>

                        {statusMsg && (
                            <div style={{
                                ...styles.statusMsg,
                                background: statusMsg.includes('success') ? '#def7ec' : '#fde8e8',
                                color:      statusMsg.includes('success') ? '#057a55' : '#e02424',
                            }}>
                                {statusMsg}
                            </div>
                        )}

                        {/* active shipments */}
                        {activeShipments.length === 0 ? (
                            <div style={styles.emptyBox}>
                                <p style={styles.emptyText}>No active deliveries right now.</p>
                            </div>
                        ) : (
                            activeShipments.map((s, i) => (
                                <div key={i} style={styles.shipCard}>
                                    <div style={styles.shipCardTop}>
                                        <div>
                                            <span style={styles.shipId}>
                                                Shipment #{s.shipment_id}
                                            </span>
                                            <Badge val={s.status}   map={STATUS_COLORS} />
                                            <Badge val={s.priority} map={PRIORITY_COLORS} />
                                        </div>
                                        {nextStatus(s.status) && (
                                            <button
                                                style={styles.progressBtn}
                                                onClick={() => updateStatus(
                                                    s.shipment_id,
                                                    nextStatus(s.status)
                                                )}
                                            >
                                                Mark as {nextStatus(s.status).replace(/_/g, ' ')}
                                            </button>
                                        )}
                                    </div>

                                    <div style={styles.shipDetails}>
                                        <div style={styles.shipDetail}>
                                            <span style={styles.detailLabel}>Destination</span>
                                            <span style={styles.detailVal}>
                                                {s.destination_address}
                                            </span>
                                        </div>
                                        <div style={styles.shipDetail}>
                                            <span style={styles.detailLabel}>Origin warehouse</span>
                                            <span style={styles.detailVal}>
                                                {s.origin_warehouse || s.origin_city || '—'}
                                            </span>
                                        </div>
                                        <div style={styles.shipDetail}>
                                            <span style={styles.detailLabel}>Vehicle</span>
                                            <span style={styles.detailVal}>
                                                {s.vehicle_plate || '—'} ({s.vehicle_type || '—'})
                                            </span>
                                        </div>
                                        <div style={styles.shipDetail}>
                                            <span style={styles.detailLabel}>Est. delivery</span>
                                            <span style={{
                                                ...styles.detailVal,
                                                color: s.estimated_delivery &&
                                                    new Date(s.estimated_delivery) < new Date()
                                                    ? '#e02424' : '#111827'
                                            }}>
                                                {s.estimated_delivery
                                                    ? new Date(s.estimated_delivery)
                                                        .toLocaleString()
                                                    : '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* status timeline */}
                                    <div style={styles.timeline}>
                                        {['created','assigned','in_transit',
                                          'out_for_delivery','delivered'].map((step, idx) => {
                                            const statuses = [
                                                'created','assigned','in_transit',
                                                'out_for_delivery','delivered'
                                            ];
                                            const currentIdx = statuses.indexOf(s.status);
                                            const done = idx <= currentIdx;
                                            return (
                                                <div key={step} style={styles.timelineStep}>
                                                    <div style={{
                                                        ...styles.timelineDot,
                                                        background: done ? '#1a56db' : '#e5e7eb',
                                                    }} />
                                                    <span style={{
                                                        ...styles.timelineLabel,
                                                        color: done ? '#1a56db' : '#9ca3af',
                                                        fontWeight: done ? 600 : 400,
                                                    }}>
                                                        {step.replace(/_/g, ' ')}
                                                    </span>
                                                    {idx < 4 && (
                                                        <div style={{
                                                            ...styles.timelineLine,
                                                            background: idx < currentIdx
                                                                ? '#1a56db' : '#e5e7eb',
                                                        }} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <>
                        <h2 style={styles.pageTitle}>Delivery history</h2>
                        <div style={styles.fullCard}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {['ID','Status','Priority',
                                          'Destination','Created','Delivered'].map(h => (
                                            <th key={h} style={styles.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allShipments.map((s, i) => (
                                        <tr key={i}
                                            style={i % 2 === 0 ? styles.rowEven : {}}>
                                            <td style={styles.td}>#{s.shipment_id}</td>
                                            <td style={styles.td}>
                                                <Badge val={s.status}   map={STATUS_COLORS} />
                                            </td>
                                            <td style={styles.td}>
                                                <Badge val={s.priority} map={PRIORITY_COLORS} />
                                            </td>
                                            <td style={styles.td}>
                                                {s.destination_address?.slice(0, 30)}...
                                            </td>
                                            <td style={styles.td}>
                                                {new Date(s.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={styles.td}>
                                                {s.delivered_at
                                                    ? new Date(s.delivered_at)
                                                        .toLocaleDateString()
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <>
                        <h2 style={styles.pageTitle}>Notifications</h2>
                        {notifications.length === 0 ? (
                            <div style={styles.emptyBox}>
                                <p style={styles.emptyText}>No notifications yet.</p>
                            </div>
                        ) : (
                            notifications.map((n, i) => (
                                <div
                                    key={i}
                                    style={{
                                        ...styles.notifCard,
                                        background: n.is_read ? '#fff' : '#eff6ff',
                                        borderLeft: n.is_read
                                            ? '3px solid #e5e7eb'
                                            : '3px solid #1a56db',
                                    }}
                                >
                                    <div style={styles.notifTop}>
                                        <span style={styles.notifTitle}>
                                            {n.title || 'Notification'}
                                        </span>
                                        <span style={styles.notifTime}>
                                            {new Date(n.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <p style={styles.notifMsg}>{n.message}</p>
                                    {!n.is_read && (
                                        <button
                                            style={styles.readBtn}
                                            onClick={() => markNotifRead(n.notification_id)}
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div style={styles.statCard}>
            <p style={styles.statLabel}>{label}</p>
            <p style={{ ...styles.statValue, color }}>{value}</p>
        </div>
    );
}

function Badge({ val, map }) {
    const c = map[val] || { bg: '#f3f4f6', text: '#6b7280' };
    return (
        <span style={{
            padding: '2px 8px', borderRadius: 99, fontSize: 12,
            fontWeight: 500, background: c.bg, color: c.text,
            marginLeft: 6,
        }}>
            {val}
        </span>
    );
}

const styles = {
    page:         { minHeight: '100vh', background: '#f3f4f6' },
    loading:      { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#6b7280' },
    navbar:       { background: '#1a56db', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', gap: 12 },
    navLogo:      { color: '#fff', fontWeight: 700, fontSize: 20 },
    navTabs:      { display: 'flex', gap: 4, flex: 1, marginLeft: 24 },
    navTab:       { background: 'transparent', border: 'none', color: '#bfdbfe', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
    navTabActive: { background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 },
    navRole:      { color: '#bfdbfe', fontSize: 13 },
    logoutBtn:    { background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
    body:         { padding: '1.5rem 2rem', maxWidth: 1100, margin: '0 auto' },
    pageTitle:    { fontSize: 22, fontWeight: 600, color: '#111827', marginBottom: '1rem' },
    cardGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: '1.5rem' },
    statCard:     { background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    statLabel:    { margin: 0, fontSize: 13, color: '#6b7280' },
    statValue:    { margin: '6px 0 0', fontSize: 26, fontWeight: 700 },
    statusMsg:    { padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: 13, fontWeight: 500 },
    emptyBox:     { background: '#fff', borderRadius: 10, padding: '3rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    emptyText:    { color: '#6b7280', fontSize: 15 },
    shipCard:     { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1rem' },
    shipCardTop:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    shipId:       { fontWeight: 600, fontSize: 15, color: '#111827', marginRight: 8 },
    progressBtn:  { background: '#1a56db', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
    shipDetails:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 16 },
    shipDetail:   { display: 'flex', flexDirection: 'column', gap: 2 },
    detailLabel:  { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' },
    detailVal:    { fontSize: 13, color: '#111827', fontWeight: 500 },
    timeline:     { display: 'flex', alignItems: 'center', gap: 0, paddingTop: 12, borderTop: '1px solid #f3f4f6' },
    timelineStep: { display: 'flex', alignItems: 'center', gap: 4 },
    timelineDot:  { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
    timelineLabel:{ fontSize: 11, whiteSpace: 'nowrap' },
    timelineLine: { width: 24, height: 2, flexShrink: 0 },
    fullCard:     { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' },
    table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    th:           { textAlign: 'left', padding: '8px 10px', color: '#6b7280', fontWeight: 500, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
    td:           { padding: '8px 10px', color: '#111827', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' },
    rowEven:      { background: '#f9fafb' },
    notifCard:    { borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    notifTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    notifTitle:   { fontWeight: 600, fontSize: 14, color: '#111827' },
    notifTime:    { fontSize: 12, color: '#9ca3af' },
    notifMsg:     { margin: 0, fontSize: 13, color: '#374151' },
    readBtn:      { marginTop: 8, background: 'transparent', border: '1px solid #1a56db', color: '#1a56db', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 },
};
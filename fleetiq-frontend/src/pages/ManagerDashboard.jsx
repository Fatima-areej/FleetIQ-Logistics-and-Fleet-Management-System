import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';

const PRIORITY_COLORS = {
    urgent: { bg: '#fde8e8', text: '#e02424' },
    high:   { bg: '#fef3c7', text: '#92400e' },
    normal: { bg: '#e1effe', text: '#1a56db' },
    low:    { bg: '#f3f4f6', text: '#6b7280' },
};

const STATUS_COLORS = {
    created:          { bg: '#f3f4f6', text: '#6b7280' },
    assigned:         { bg: '#e1effe', text: '#1a56db' },
    in_transit:       { bg: '#fef3c7', text: '#92400e' },
    at_warehouse:     { bg: '#e0f2fe', text: '#0369a1' },
    out_for_delivery: { bg: '#def7ec', text: '#057a55' },
    delivered:        { bg: '#def7ec', text: '#057a55' },
    cancelled:        { bg: '#fde8e8', text: '#e02424' },
};

export default function ManagerDashboard() {
    const { user, logout } = useAuth();
    const navigate         = useNavigate();

    const [dashboard,  setDashboard]  = useState(null);
    const [shipments,  setShipments]  = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [delayed,    setDelayed]    = useState([]);
    const [drivers,    setDrivers]    = useState([]);
    const [available,  setAvailable]  = useState({ drivers: [], vehicles: [] });
    const [loading,    setLoading]    = useState(true);
    const [activeTab,  setActiveTab]  = useState('overview');

    // assign shipment modal state
    const [assigning,   setAssigning]   = useState(null);
    const [selDriver,   setSelDriver]   = useState('');
    const [selVehicle,  setSelVehicle]  = useState('');
    const [assignMsg,   setAssignMsg]   = useState('');

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const [dashRes, shipRes, whRes, delRes, drvRes, availDrvRes, availVehRes] =
                await Promise.all([
                    API.get('/analytics/dashboard'),
                    API.get('/shipments/all'),
                    API.get('/warehouses'),
                    API.get('/shipments/delayed'),
                    API.get('/drivers/performance'),
                    API.get('/drivers/available'),
                    API.get('/vehicles/available'),
                ]);
            setDashboard(dashRes.data);
            setShipments(shipRes.data);
            setWarehouses(whRes.data);
            setDelayed(delRes.data);
            setDrivers(drvRes.data);
            setAvailable({
                drivers:  availDrvRes.data,
                vehicles: availVehRes.data,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (shipment_id) => {
        setAssigning(shipment_id);
        setSelDriver('');
        setSelVehicle('');
        setAssignMsg('');
    };

    const submitAssign = async () => {
        if (!selDriver || !selVehicle) {
            setAssignMsg('Please select both a driver and a vehicle.');
            return;
        }
        try {
            await API.post(`/shipments/${assigning}/assign`, {
                driver_id:  parseInt(selDriver),
                vehicle_id: parseInt(selVehicle),
            });
            setAssignMsg('Assigned successfully!');
            setTimeout(() => { setAssigning(null); fetchAll(); }, 1200);
        } catch (err) {
            setAssignMsg(err.response?.data?.error || 'Assignment failed.');
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    if (loading) return <div style={styles.loading}>Loading...</div>;

    const t = dashboard?.totals || {};

    const tabs = ['overview', 'shipments', 'warehouses', 'drivers'];

    return (
        <div style={styles.page}>

            {/* navbar */}
            <div style={styles.navbar}>
                <span style={styles.navLogo}>FleetIQ</span>
                <div style={styles.navTabs}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            style={{ ...styles.navTab, ...(activeTab === tab ? styles.navTabActive : {}) }}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <span style={styles.navRole}>Manager — {user?.name}</span>
                <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
            </div>

            <div style={styles.body}>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <>
                        <h2 style={styles.pageTitle}>Manager overview</h2>

                        <div style={styles.cardGrid}>
                            <StatCard label="Active shipments"  value={t.active_shipments  || 0} color="#1a56db" />
                            <StatCard label="Delayed"           value={t.delayed_count     || 0} color="#e02424" />
                            <StatCard label="Delivered total"   value={t.total_delivered   || 0} color="#057a55" />
                            <StatCard label="Shipments today"   value={t.shipments_today   || 0} color="#9061f9" />
                        </div>

                        {/* warehouse capacity bars */}
                        <div style={styles.fullCard}>
                            <h3 style={styles.cardTitle}>Warehouse capacity</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={warehouses}>
                                    <XAxis dataKey="warehouse_name" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={v => `${v}%`} />
                                    <Bar dataKey="load_percentage" name="Load %">
                                        {warehouses.map((w, i) => (
                                            <Cell
                                                key={i}
                                                fill={
                                                    w.load_percentage > 80 ? '#e02424' :
                                                    w.load_percentage > 50 ? '#e3a008' : '#057a55'
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* delayed shipments alert */}
                        {delayed.length > 0 && (
                            <div style={styles.alertBox}>
                                <p style={styles.alertTitle}>
                                    {delayed.length} delayed shipment{delayed.length > 1 ? 's' : ''} require attention
                                </p>
                                {delayed.map((s, i) => (
                                    <div key={i} style={styles.alertRow}>
                                        <span>#{s.shipment_id} — {s.destination_address}</span>
                                        <span style={{ color: '#e02424' }}>{s.hours_overdue} hrs overdue</span>
                                        <Badge val={s.priority} map={PRIORITY_COLORS} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* SHIPMENTS TAB */}
                {activeTab === 'shipments' && (
                    <>
                        <h2 style={styles.pageTitle}>All shipments</h2>
                        <div style={styles.fullCard}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {['ID','Status','Priority','Driver','Origin','Destination','Created'].map(h => (
                                            <th key={h} style={styles.th}>{h}</th>
                                        ))}
                                        <th style={styles.th}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shipments.map((s, i) => (
                                        <tr key={i} style={i % 2 === 0 ? styles.rowEven : {}}>
                                            <td style={styles.td}>#{s.shipment_id}</td>
                                            <td style={styles.td}><Badge val={s.status}   map={STATUS_COLORS} /></td>
                                            <td style={styles.td}><Badge val={s.priority} map={PRIORITY_COLORS} /></td>
                                            <td style={styles.td}>{s.driver_name || '—'}</td>
                                            <td style={styles.td}>{s.origin_warehouse || s.origin_city || '—'}</td>
                                            <td style={styles.td}>{s.destination_address?.slice(0, 28)}...</td>
                                            <td style={styles.td}>{new Date(s.created_at).toLocaleDateString()}</td>
                                            <td style={styles.td}>
                                                {s.status === 'created' && (
                                                    <button
                                                        style={styles.assignBtn}
                                                        onClick={() => handleAssign(s.shipment_id)}
                                                    >
                                                        Assign
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* WAREHOUSES TAB */}
                {activeTab === 'warehouses' && (
                    <>
                        <h2 style={styles.pageTitle}>Warehouses</h2>
                        <div style={styles.cardGrid}>
                            {warehouses.map((w, i) => (
                                <div key={i} style={styles.whCard}>
                                    <p style={styles.whName}>{w.warehouse_name}</p>
                                    <p style={styles.whCity}>{w.city}</p>
                                    <div style={styles.progressWrap}>
                                        <div style={{
                                            ...styles.progressBar,
                                            width: `${Math.min(w.load_percentage, 100)}%`,
                                            background:
                                                w.load_percentage > 80 ? '#e02424' :
                                                w.load_percentage > 50 ? '#e3a008' : '#057a55',
                                        }} />
                                    </div>
                                    <p style={styles.whLoad}>
                                        {w.current_load} / {w.capacity_units} units
                                        ({w.load_percentage}%)
                                    </p>
                                    <p style={styles.whStat}>
                                        Shipments handled: {w.total_shipments_handled}
                                    </p>
                                    <p style={styles.whStat}>
                                        Avg dwell: {w.avg_dwell_hours || 0} hrs
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* DRIVERS TAB */}
                {activeTab === 'drivers' && (
                    <>
                        <h2 style={styles.pageTitle}>Driver performance</h2>
                        <div style={styles.fullCard}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {['Driver','Status','Completed','On time','Delayed','Avg hrs','Rating'].map(h => (
                                            <th key={h} style={styles.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {drivers.map((d, i) => (
                                        <tr key={i} style={i % 2 === 0 ? styles.rowEven : {}}>
                                            <td style={styles.td}>{d.driver_name}</td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    ...styles.pill,
                                                    background: d.availability_status === 'available' ? '#def7ec' : '#fef3c7',
                                                    color:      d.availability_status === 'available' ? '#057a55' : '#92400e',
                                                }}>
                                                    {d.availability_status}
                                                </span>
                                            </td>
                                            <td style={styles.td}>{d.completed_deliveries}</td>
                                            <td style={styles.td}>{d.on_time_deliveries}</td>
                                            <td style={styles.td}>{d.delayed_deliveries}</td>
                                            <td style={styles.td}>{d.avg_delivery_hours || '—'}</td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    ...styles.pill,
                                                    background: d.rating >= 4.5 ? '#def7ec' : d.rating >= 3.5 ? '#fef3c7' : '#fde8e8',
                                                    color:      d.rating >= 4.5 ? '#057a55' : d.rating >= 3.5 ? '#92400e' : '#e02424',
                                                }}>
                                                    {d.rating}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* assign modal */}
            {assigning && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h3 style={{ margin: '0 0 1rem' }}>
                            Assign shipment #{assigning}
                        </h3>

                        <label style={styles.label}>Select driver</label>
                        <select
                            style={styles.select}
                            value={selDriver}
                            onChange={e => setSelDriver(e.target.value)}
                        >
                            <option value="">— choose driver —</option>
                            {available.drivers.map(d => (
                                <option key={d.driver_id} value={d.driver_id}>
                                    {d.name} (rating: {d.rating})
                                </option>
                            ))}
                        </select>

                        <label style={styles.label}>Select vehicle</label>
                        <select
                            style={styles.select}
                            value={selVehicle}
                            onChange={e => setSelVehicle(e.target.value)}
                        >
                            <option value="">— choose vehicle —</option>
                            {available.vehicles.map(v => (
                                <option key={v.vehicle_id} value={v.vehicle_id}>
                                    {v.plate_number} — {v.vehicle_type}
                                </option>
                            ))}
                        </select>

                        {assignMsg && (
                            <p style={{
                                fontSize: 13,
                                color: assignMsg.includes('success') ? '#057a55' : '#e02424',
                                margin: '8px 0',
                            }}>
                                {assignMsg}
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                            <button style={styles.confirmBtn} onClick={submitAssign}>
                                Confirm
                            </button>
                            <button style={styles.cancelBtn} onClick={() => setAssigning(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 12,
                       fontWeight: 500, background: c.bg, color: c.text }}>
            {val}
        </span>
    );
}

const styles = {
    page:        { minHeight: '100vh', background: '#f3f4f6' },
    loading:     { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#6b7280' },
    navbar:      { background: '#1a56db', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', gap: 12 },
    navLogo:     { color: '#fff', fontWeight: 700, fontSize: 20 },
    navTabs:     { display: 'flex', gap: 4, flex: 1, marginLeft: 24 },
    navTab:      { background: 'transparent', border: 'none', color: '#bfdbfe', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
    navTabActive:{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 },
    navRole:     { color: '#bfdbfe', fontSize: 13 },
    logoutBtn:   { background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
    body:        { padding: '1.5rem 2rem', maxWidth: 1200, margin: '0 auto' },
    pageTitle:   { fontSize: 22, fontWeight: 600, color: '#111827', marginBottom: '1rem' },
    cardGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: '1.5rem' },
    statCard:    { background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    statLabel:   { margin: 0, fontSize: 13, color: '#6b7280' },
    statValue:   { margin: '6px 0 0', fontSize: 28, fontWeight: 700 },
    fullCard:    { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.5rem', overflowX: 'auto' },
    cardTitle:   { margin: '0 0 1rem', fontSize: 15, fontWeight: 600, color: '#111827' },
    alertBox:    { background: '#fde8e8', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' },
    alertTitle:  { margin: '0 0 10px', fontWeight: 600, color: '#e02424', fontSize: 14 },
    alertRow:    { display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: '#374151', marginBottom: 6 },
    whCard:      { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    whName:      { margin: 0, fontWeight: 600, fontSize: 14, color: '#111827' },
    whCity:      { margin: '2px 0 10px', fontSize: 12, color: '#6b7280' },
    progressWrap:{ background: '#e5e7eb', borderRadius: 99, height: 8, marginBottom: 6 },
    progressBar: { height: 8, borderRadius: 99, transition: 'width 0.4s' },
    whLoad:      { margin: 0, fontSize: 12, fontWeight: 500, color: '#374151' },
    whStat:      { margin: '4px 0 0', fontSize: 12, color: '#6b7280' },
    table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    th:          { textAlign: 'left', padding: '8px 10px', color: '#6b7280', fontWeight: 500, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
    td:          { padding: '8px 10px', color: '#111827', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' },
    rowEven:     { background: '#f9fafb' },
    pill:        { padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 500 },
    assignBtn:   { background: '#1a56db', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 },
    modalOverlay:{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
    modal:       { background: '#fff', borderRadius: 12, padding: '1.5rem', width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
    label:       { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4, marginTop: 12 },
    select:      { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' },
    confirmBtn:  { flex: 1, background: '#1a56db', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', cursor: 'pointer', fontWeight: 600 },
    cancelBtn:   { flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '9px', cursor: 'pointer' },
};
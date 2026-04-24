import { useEffect, useState, useCallback } from 'react';
import { T } from '../../styles/theme';
import API from '../../api/axios';
import Badge from '../../components/ui/Badge';
import Btn from '../../components/ui/Btn';
import Modal from '../../components/ui/Modal';
import Drawer from '../../components/ui/Drawer';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';
import { SkeletonCard } from '../../components/ui/Skeleton';

function Card({ children, style = {} }) {
    return (
        <div style={{
            background: T.cardBg, border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg, boxShadow: T.shadow, ...style,
        }}>
            {children}
        </div>
    );
}

const VEHICLE_STATUS_MAP = {
    available:   { color: T.success, bg: T.successLight, label: 'Available'   },
    in_use:      { color: T.accent,  bg: T.accentLight,  label: 'In Use'      },
    maintenance: { color: T.warning, bg: T.warningLight, label: 'Maintenance' },
};

export default function AdminFleet() {
    const [vehicles,    setVehicles]    = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [msg,         setMsg]         = useState(null);
    const [viewFilter,  setViewFilter]  = useState('all');
    const [search,      setSearch]      = useState('');

    // drawer
    const [drawer,      setDrawer]      = useState(null);

    // modals
    const [addModal,    setAddModal]    = useState(false);
    const [maintModal,  setMaintModal]  = useState(null); // vehicle

    // forms
    const [newVeh, setNewVeh] = useState({
        plate_number: '', vehicle_type: 'Van',
        capacity_kg: '', purchase_date: '',
    });

    const [managers,   setManagers]   = useState([]);
    const [selManager, setSelManager] = useState('');
    const [maintNote,  setMaintNote]  = useState('');
    const [maintPrio,  setMaintPrio]  = useState('normal');

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    const fetchVehicles = useCallback(async () => {
        try {
            setLoading(true);
            const res = await API.get('/vehicles');
            setVehicles(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

    const openDrawer = async (vehicle) => {
        setDrawer(vehicle);
    };

    const submitAdd = async () => {
        try {
            await API.post('/vehicles', newVeh);
            setAddModal(false);
            setNewVeh({ plate_number: '', vehicle_type: 'Van',
                        capacity_kg: '', purchase_date: '' });
            showMsg('Vehicle added successfully.');
            fetchVehicles();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to add vehicle.', false);
        }
    };

    const openMaintenance = async (vehicle) => {
        setMaintModal(vehicle);
        setSelManager('');
        setMaintNote('');
        setMaintPrio('normal');
        try {
            const res = await API.get('/org/users?role=manager');
            setManagers(res.data || []);
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to load managers.', false);
            setManagers([]);
        }
    };

    const submitMaintenance = async () => {
        if (!maintModal?.vehicle_id) return;
        if (!selManager) {
            showMsg('Select a manager.', false);
            return;
        }
        try {
            await API.post('/maintenance-requests/admin', {
                vehicle_id: maintModal.vehicle_id,
                assigned_manager_id: parseInt(selManager),
                title: `Admin maintenance request — ${maintModal.plate_number}`,
                description: maintNote,
                priority: maintPrio,
            });
            showMsg('Maintenance request created.');
            setMaintModal(null);
            fetchVehicles();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to create request.', false);
        }
    };

    const filtered = vehicles.filter(v => {
        if (viewFilter !== 'all' && v.current_status !== viewFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            if (!v.plate_number?.toLowerCase().includes(q) &&
                !v.vehicle_type?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const stats = {
        total:       vehicles.length,
        available:   vehicles.filter(v => v.current_status === 'available').length,
        inUse:       vehicles.filter(v => v.current_status === 'in_use').length,
        maintenance: vehicles.filter(v => v.current_status === 'maintenance').length,
    };

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>

            {msg && <Toast msg={msg} />}

            {/* ── STATS ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12, marginBottom: '1.5rem',
            }}>
                {[
                    { label: 'Total Fleet',  value: stats.total,       color: T.textPri },
                    { label: 'Available',    value: stats.available,   color: T.success },
                    { label: 'In Use',       value: stats.inUse,       color: T.accent  },
                    { label: 'Maintenance',  value: stats.maintenance, color: T.warning },
                ].map(s => (
                    <Card key={s.label} style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: 11, color: T.textMuted,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.06em', fontWeight: 600 }}>
                            {s.label}
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 800,
                                      color: s.color, fontFamily: T.fontHead,
                                      marginTop: 4 }}>
                            {s.value}
                        </div>
                    </Card>
                ))}
            </div>

            {/* ── TOOLBAR ── */}
            <Card style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: 10,
                              alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                        <span style={{
                            position: 'absolute', left: 10,
                            top: '50%', transform: 'translateY(-50%)',
                            color: T.textMuted, fontSize: 13,
                        }}>🔍</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by plate or type..."
                            style={{
                                width: '100%', padding: '7px 12px 7px 32px',
                                background: T.inputBg,
                                border: `1px solid ${T.border}`,
                                borderRadius: T.radius, fontSize: 13,
                                color: T.textPri, outline: 'none',
                                fontFamily: T.fontBody,
                            }}
                        />
                    </div>

                    {/* status filter tabs */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        {['all', 'available', 'in_use', 'maintenance'].map(f => (
                            <button key={f}
                                onClick={() => setViewFilter(f)}
                                style={{
                                    padding: '6px 12px', fontSize: 12,
                                    borderRadius: T.radius, cursor: 'pointer',
                                    fontWeight: viewFilter === f ? 600 : 400,
                                    background: viewFilter === f
                                        ? T.accentLight : 'transparent',
                                    color: viewFilter === f ? T.accent : T.textSec,
                                    border: `1px solid ${viewFilter === f
                                        ? T.accent + '30' : T.border}`,
                                    transition: 'all 0.15s',
                                    fontFamily: T.fontBody,
                                }}>
                                {f === 'all' ? 'All' : f.replace('_', ' ')
                                    .replace(/\b\w/g, c => c.toUpperCase())}
                                {f !== 'all' && (
                                    <span style={{
                                        marginLeft: 6, fontSize: 10,
                                        background: T.border,
                                        borderRadius: T.radiusFull,
                                        padding: '1px 5px',
                                        color: T.textMuted,
                                    }}>
                                        {f === 'available'   ? stats.available
                                       : f === 'in_use'      ? stats.inUse
                                       : stats.maintenance}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div style={{ marginLeft: 'auto' }}>
                        <Btn onClick={() => setAddModal(true)} icon="＋">
                            Add Vehicle
                        </Btn>
                    </div>
                </div>
            </Card>

            {/* ── VEHICLE GRID ── */}
            {loading ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 14,
                }}>
                    {[...Array(6)].map((_, i) => (
                        <SkeletonCard key={i} height={200} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🚗</div>
                    <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
                        No vehicles found
                    </p>
                </Card>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 14,
                }}>
                    {filtered.map((v, i) => (
                        <VehicleCard
                            key={v.vehicle_id}
                            vehicle={v}
                            onView={() => openDrawer(v)}
                            onRequestMaintenance={() => openMaintenance(v)}
                        />
                    ))}
                </div>
            )}

            {/* ── VEHICLE DETAIL DRAWER ── */}
            {drawer && (
                <Drawer
                    title={`${drawer.vehicle_type} — ${drawer.plate_number}`}
                    onClose={() => setDrawer(null)}
                >
                    {/* status badge */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <Badge val={drawer.current_status}
                               map={VEHICLE_STATUS_MAP} dot />
                    </div>

                    {/* stats grid */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: 10, marginBottom: '1.5rem',
                    }}>
                        {[
                            ['Plate',       drawer.plate_number],
                            ['Type',        drawer.vehicle_type],
                            ['Capacity',    `${drawer.capacity_kg || '—'} kg`],
                            ['Total Trips', drawer.total_trips || 0],
                        ].map(([label, val]) => (
                            <div key={label} style={{
                                padding: '10px 12px',
                                background: T.pageBg,
                                borderRadius: T.radius,
                            }}>
                                <div style={{ fontSize: 10, color: T.textMuted,
                                              textTransform: 'uppercase',
                                              letterSpacing: '0.06em',
                                              fontWeight: 600, marginBottom: 3 }}>
                                    {label}
                                </div>
                                <div style={{ fontSize: 14, color: T.textPri,
                                              fontWeight: 600 }}>
                                    {val}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* actions */}
                    <div style={{ display: 'flex', gap: 8,
                                  marginBottom: '1.5rem',
                                  paddingBottom: '1.25rem',
                                  borderBottom: `1px solid ${T.border}` }}>
                    </div>
                </Drawer>
            )}

            {/* ── ADD VEHICLE MODAL ── */}
            {addModal && (
                <Modal title="Add New Vehicle"
                       onClose={() => setAddModal(false)}>
                    <FormInput
                        label="Plate Number" required
                        value={newVeh.plate_number}
                        onChange={v => setNewVeh({...newVeh, plate_number: v})}
                        placeholder="LHR-2024-001"
                    />
                    <FormSelect
                        label="Vehicle Type" required
                        value={newVeh.vehicle_type}
                        onChange={v => setNewVeh({...newVeh, vehicle_type: v})}
                        options={['Truck','Van','Motorcycle','Pickup','Mini Truck']
                            .map(x => ({ value: x, label: x }))}
                    />
                    <FormInput
                        label="Capacity (kg)" required
                        value={newVeh.capacity_kg}
                        onChange={v => setNewVeh({...newVeh, capacity_kg: v})}
                        placeholder="2000" type="number"
                    />
                    <FormInput
                        label="Purchase Date"
                        value={newVeh.purchase_date}
                        onChange={v => setNewVeh({...newVeh, purchase_date: v})}
                        type="date"
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Btn onClick={submitAdd} fullWidth>Add Vehicle</Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setAddModal(false)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}

            {maintModal && (
                <Modal
                    title={`Create maintenance request — ${maintModal.plate_number}`}
                    onClose={() => setMaintModal(null)}
                    width={520}
                >
                    <FormSelect
                        label="Assign to manager"
                        value={selManager}
                        onChange={setSelManager}
                        required
                        placeholder="— select manager —"
                        options={managers.map(m => ({
                            value: m.user_id,
                            label: `${m.name} (${m.email})`,
                        }))}
                    />
                    <FormSelect
                        label="Priority"
                        value={maintPrio}
                        onChange={setMaintPrio}
                        options={[
                            { value: 'low', label: 'Low' },
                            { value: 'normal', label: 'Normal' },
                            { value: 'high', label: 'High' },
                            { value: 'urgent', label: 'Urgent' },
                        ]}
                    />
                    <FormInput
                        label="Description (optional)"
                        value={maintNote}
                        onChange={setMaintNote}
                        placeholder="Reason / details…"
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Btn onClick={submitMaintenance} fullWidth>
                            Create request
                        </Btn>
                        <Btn variant="secondary" fullWidth onClick={() => setMaintModal(null)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}

        </div>
    );
}

// ── VEHICLE CARD ─────────────────────────────────────────────
function VehicleCard({ vehicle: v, onView, onRequestMaintenance }) {
    const [hovered, setHovered] = useState(false);
    const statusInfo = VEHICLE_STATUS_MAP[v.current_status] ||
        { color: T.textMuted, bg: T.pageBg, label: v.current_status };

    const typeIcon = v.vehicle_type === 'Truck'      ? '🚛'
                   : v.vehicle_type === 'Van'         ? '🚐'
                   : v.vehicle_type === 'Motorcycle'  ? '🏍'
                   : '🚚';

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background:   T.cardBg,
                border:       `1px solid ${hovered ? statusInfo.color + '40' : T.border}`,
                borderRadius: T.radiusLg,
                padding:      '1.25rem',
                boxShadow:    hovered ? T.shadowMd : T.shadow,
                transition:   'all 0.2s',
                transform:    hovered ? 'translateY(-2px)' : 'none',
            }}
        >
            {/* header */}
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 40, height: 40,
                        background: statusInfo.bg,
                        borderRadius: T.radius,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 20,
                    }}>
                        {typeIcon}
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700,
                                      color: T.textPri,
                                      fontFamily: T.fontHead }}>
                            {v.plate_number}
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted }}>
                            {v.vehicle_type}
                        </div>
                    </div>
                </div>
                <span style={{
                    padding: '4px 10px', borderRadius: T.radiusFull,
                    fontSize: 11, fontWeight: 600,
                    color: statusInfo.color, background: statusInfo.bg,
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    <span style={{
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: statusInfo.color,
                    }} />
                    {statusInfo.label}
                </span>
            </div>

            {/* stats */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: 6, marginBottom: '1rem',
            }}>
                {[
                    ['Capacity', `${v.capacity_kg || '—'}kg`],
                    ['Trips',    v.total_trips || 0],
                    ['Status',   statusInfo.label],
                ].map(([label, val]) => (
                    <div key={label} style={{
                        padding: '8px 6px',
                        background: T.pageBg,
                        borderRadius: T.radiusSm,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 700,
                                      color: T.textPri }}>
                            {val}
                        </div>
                        <div style={{ fontSize: 10, color: T.textMuted,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em', marginTop: 2 }}>
                            {label}
                        </div>
                    </div>
                ))}
            </div>

            {/* actions */}
            <div style={{ display: 'flex', gap: 8 }}>
                <Btn size="sm" variant="secondary"
                     onClick={onView} fullWidth>
                    View Details
                </Btn>
                {v.current_status === 'available' && (
                    <Btn size="sm" onClick={onRequestMaintenance}>
                        Maintenance
                    </Btn>
                )}
            </div>
        </div>
    );
}

// ── TOAST ────────────────────────────────────────────────────
function Toast({ msg }) {
    return (
        <div style={{
            position: 'fixed', top: 80, right: 24,
            zIndex: 9999, padding: '10px 18px',
            background: msg.good ? T.successLight : T.dangerLight,
            border: `1px solid ${msg.good ? T.success : T.danger}40`,
            borderRadius: T.radius,
            color: msg.good ? T.success : T.danger,
            fontSize: 13, fontWeight: 500,
            boxShadow: T.shadowMd,
            animation: 'slideUp 0.2s ease',
        }}>
            {msg.text}
        </div>
    );
}
import { useEffect, useState, useCallback } from 'react';
import { T } from '../../styles/theme';
import API from '../../api/axios';
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

function Toast({ msg }) {
    return (
        <div style={{
            position: 'fixed', top: 80, right: 24, zIndex: 9999,
            padding: '10px 18px',
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

export default function AdminWarehouses() {
    const [warehouses,  setWarehouses]  = useState([]);
    const [managers,    setManagers]    = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [msg,         setMsg]         = useState(null);
    const [search,      setSearch]      = useState('');
    const [sortBy,      setSortBy]      = useState('load');

    // drawer
    const [drawer,      setDrawer]      = useState(null);
    const [drawerData,  setDrawerData]  = useState(null);
    const [drawerLoad,  setDrawerLoad]  = useState(false);

    // modals
    const [addModal,    setAddModal]    = useState(false);
    const [editModal,   setEditModal]   = useState(null);
    const [assignModal, setAssignModal] = useState(null);
    const [selManager,  setSelManager]  = useState('');

    // overflow alerts
    const [overflowAlerts, setOverflowAlerts] = useState([]);

    // nearest
    const [nearestModal,setNearestModal]= useState(false);
    const [nearLat,     setNearLat]     = useState('');
    const [nearLng,     setNearLng]     = useState('');
    const [nearResult,  setNearResult]  = useState(null);
    const [nearLoad,    setNearLoad]    = useState(false);

    // forms
    const [newWh, setNewWh] = useState({
        name: '', city: '', address: '',
        latitude: '', longitude: '', capacity_units: '',
    });
    const [editForm, setEditForm] = useState({
        name: '', city: '', address: '', capacity_units: '',
    });

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    const fetchWarehouses = useCallback(async () => {
        try {
            setLoading(true);
            const [whRes, mgrRes, alertRes] = await Promise.all([
                API.get('/warehouses'),
                API.get('/org/users?role=manager'),
                API.get('/warehouses/overflow-alerts').catch(() => ({ data: [] })),
            ]);
            setWarehouses(whRes.data);
            setManagers(mgrRes.data);
            setOverflowAlerts(alertRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

    const openDrawer = async (warehouse) => {
        setDrawer(warehouse);
        setDrawerLoad(true);
        setDrawerData(null);
        try {
            const res = await API.get(`/warehouses/${warehouse.warehouse_id}`);
            setDrawerData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setDrawerLoad(false);
        }
    };

    const submitAdd = async () => {
        try {
            await API.post('/warehouses', newWh);
            setAddModal(false);
            setNewWh({ name: '', city: '', address: '',
                       latitude: '', longitude: '', capacity_units: '' });
            showMsg('Warehouse created.');
            fetchWarehouses();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed.', false);
        }
    };

    const submitEdit = async () => {
        try {
            await API.patch(`/warehouses/${editModal}`, editForm);
            setEditModal(null);
            showMsg('Warehouse updated.');
            fetchWarehouses();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed.', false);
        }
    };

    const submitAssignManager = async () => {
        if (!selManager) return;
        try {
            await API.post(`/warehouses/${assignModal}/assign-manager`, {
                manager_id: parseInt(selManager),
            });
            setAssignModal(null);
            setSelManager('');
            showMsg('Manager assigned.');
            fetchWarehouses();
            if (drawer?.warehouse_id === assignModal) {
                openDrawer(drawer);
            }
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed.', false);
        }
    };

    const removeManager = async (warehouse_id, manager_id) => {
        try {
            await API.delete(
                `/warehouses/${warehouse_id}/managers/${manager_id}`
            );
            showMsg('Manager removed.');
            fetchWarehouses();
            if (drawer) openDrawer(drawer);
        } catch (err) {
            showMsg('Failed.', false);
        }
    };

    const findNearest = async () => {
        if (!nearLat || !nearLng) return;
        setNearLoad(true);
        setNearResult(null);
        try {
            const res = await API.get(
                `/warehouses/nearest?lat=${nearLat}&lng=${nearLng}`
            );
            setNearResult(res.data);
        } catch (err) {
            showMsg('Failed to find nearest warehouse.', false);
        } finally {
            setNearLoad(false);
        }
    };

    // filter + sort
    const filtered = warehouses
        .filter(w => {
            if (!search) return true;
            const q = search.toLowerCase();
            return w.warehouse_name?.toLowerCase().includes(q) ||
                   w.city?.toLowerCase().includes(q);
        })
        .sort((a, b) => {
            if (sortBy === 'load')       return parseFloat(b.load_percentage || 0)
                                              - parseFloat(a.load_percentage || 0);
            if (sortBy === 'throughput') return (b.total_shipments_handled || 0)
                                              - (a.total_shipments_handled || 0);
            if (sortBy === 'name')       return a.warehouse_name?.localeCompare(b.warehouse_name);
            return 0;
        });

    const stats = {
        total:    warehouses.length,
        avgLoad:  warehouses.length > 0
            ? Math.round(warehouses.reduce((s, w) =>
                s + parseFloat(w.load_percentage || 0), 0) / warehouses.length)
            : 0,
        critical: warehouses.filter(w =>
            parseFloat(w.load_percentage || 0) > 80).length,
        totalCapacity: warehouses.reduce((s, w) =>
            s + (w.capacity_units || 0), 0),
    };

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {msg && <Toast msg={msg} />}

            {/* ── OVERFLOW ALERTS ── */}
            {overflowAlerts.length > 0 && (
                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {overflowAlerts.map(a => (
                        <div key={a.warehouse_id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 16px',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: T.radiusLg,
                            fontSize: 13,
                        }}>
                            <span style={{ fontSize: 16 }}>⚠</span>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 700, color: '#DC2626' }}>
                                    {a.warehouse_name}
                                </span>
                                <span style={{ color: '#7F1D1D' }}>
                                    {' '}forecast at {a.forecast_load_pct}% capacity
                                    {' '}(currently {a.current_load_pct}%).
                                </span>
                            </div>
                            {a.alt_name && (
                                <div style={{
                                    fontSize: 12, color: '#166534', fontWeight: 600,
                                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                                    borderRadius: T.radius, padding: '4px 10px',
                                    whiteSpace: 'nowrap',
                                }}>
                                    Redirect to: {a.alt_name}, {a.alt_city}
                                    {' '}· {a.alt_load_pct}% load
                                    {' '}· {a.distance_km} km away
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── STATS ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12, marginBottom: '1.5rem',
            }}>
                {[
                    { label: 'Total Warehouses', value: stats.total,
                      color: T.textPri },
                    { label: 'Avg Load',
                      value: `${stats.avgLoad}%`,
                      color: stats.avgLoad > 70 ? T.danger
                           : stats.avgLoad > 40 ? T.warning : T.success },
                    { label: 'Critical (>80%)', value: stats.critical,
                      color: stats.critical > 0 ? T.danger : T.success },
                    { label: 'Total Capacity',
                      value: stats.totalCapacity.toLocaleString(),
                      color: T.accent },
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
                    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                        <span style={{
                            position: 'absolute', left: 10,
                            top: '50%', transform: 'translateY(-50%)',
                            color: T.textMuted, fontSize: 13,
                        }}>🔍</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or city..."
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

                    <select value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        style={{
                            padding: '7px 10px', fontSize: 12,
                            border: `1px solid ${T.border}`,
                            borderRadius: T.radius, background: T.inputBg,
                            color: T.textSec, outline: 'none',
                            cursor: 'pointer', fontFamily: T.fontBody,
                        }}>
                        <option value="load">Sort: Load %</option>
                        <option value="throughput">Sort: Throughput</option>
                        <option value="name">Sort: Name</option>
                    </select>

                    <Btn variant="secondary"
                         onClick={() => {
                             setNearestModal(true);
                             setNearLat(''); setNearLng('');
                             setNearResult(null);
                         }}>
                        📍 Find Nearest
                    </Btn>

                    <Btn onClick={() => setAddModal(true)} icon="＋">
                        Add Warehouse
                    </Btn>
                </div>
            </Card>

            {/* ── WAREHOUSE GRID ── */}
            {loading ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 14,
                }}>
                    {[...Array(4)].map((_, i) => (
                        <SkeletonCard key={i} height={240} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🏭</div>
                    <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
                        No warehouses found
                    </p>
                </Card>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 14,
                }}>
                    {filtered.map(w => (
                        <WarehouseCard
                            key={w.warehouse_id}
                            warehouse={w}
                            onView={() => openDrawer(w)}
                            onEdit={() => {
                                setEditModal(w.warehouse_id);
                                setEditForm({
                                    name:           w.warehouse_name || '',
                                    city:           w.city           || '',
                                    address:        w.address        || '',
                                    capacity_units: w.capacity_units || '',
                                });
                            }}
                            onAssignManager={() => {
                                setAssignModal(w.warehouse_id);
                                setSelManager('');
                            }}
                        />
                    ))}
                </div>
            )}

            {/* ── WAREHOUSE DETAIL DRAWER ── */}
            {drawer && (
                <Drawer
                    title={drawer.warehouse_name}
                    onClose={() => setDrawer(null)}
                >
                    {/* load bar */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex',
                                      justifyContent: 'space-between',
                                      marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600,
                                           color: T.textPri }}>
                                Capacity utilization
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 800,
                                           fontFamily: T.fontHead,
                                           color: parseFloat(drawer.load_percentage) > 80
                                               ? T.danger
                                               : parseFloat(drawer.load_percentage) > 50
                                               ? T.warning : T.success }}>
                                {drawer.load_percentage}%
                            </span>
                        </div>
                        <div style={{ background: T.pageBg,
                                      borderRadius: T.radiusFull, height: 10 }}>
                            <div style={{
                                width: `${Math.min(
                                    parseFloat(drawer.load_percentage || 0), 100
                                )}%`,
                                height: 10, borderRadius: T.radiusFull,
                                background: parseFloat(drawer.load_percentage) > 80
                                    ? T.danger
                                    : parseFloat(drawer.load_percentage) > 50
                                    ? T.warning : T.success,
                                transition: 'width 0.6s ease',
                            }} />
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted,
                                      marginTop: 4 }}>
                            {drawer.current_load} / {drawer.capacity_units} units
                        </div>
                    </div>

                    {/* info grid */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: 8, marginBottom: '1.5rem',
                    }}>
                        {[
                            ['City',       drawer.city || '—'],
                            ['Throughput', drawer.total_shipments_handled || 0],
                            ['Avg Dwell',  `${drawer.avg_dwell_hours || 0}h`],
                            ['Capacity',   drawer.capacity_units],
                        ].map(([label, val]) => (
                            <div key={label} style={{
                                padding: '10px 12px', background: T.pageBg,
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
                        <Btn size="sm" variant="secondary"
                             onClick={() => {
                                 setEditModal(drawer.warehouse_id);
                                 setEditForm({
                                     name: drawer.warehouse_name || '',
                                     city: drawer.city || '',
                                     address: drawer.address || '',
                                     capacity_units: drawer.capacity_units || '',
                                 });
                             }}>
                            Edit
                        </Btn>
                        <Btn size="sm" variant="secondary"
                             onClick={() => {
                                 setAssignModal(drawer.warehouse_id);
                                 setSelManager('');
                             }}>
                            + Assign Manager
                        </Btn>
                    </div>

                    {/* assigned managers */}
                    <p style={{ margin: '0 0 10px', fontSize: 13,
                                fontWeight: 600, color: T.textPri }}>
                        Assigned managers
                    </p>

                    {drawerLoad ? (
                        <SkeletonCard height={60} />
                    ) : drawerData?.managers?.length === 0 ? (
                        <div style={{
                            padding: '1rem', background: T.pageBg,
                            borderRadius: T.radius, marginBottom: '1.25rem',
                            textAlign: 'center',
                        }}>
                            <p style={{ color: T.textMuted, fontSize: 13,
                                        margin: 0 }}>
                                No managers assigned yet
                            </p>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '1.25rem' }}>
                            {drawerData?.managers?.map((m, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center',
                                    gap: 10, padding: '9px 12px',
                                    background: T.pageBg,
                                    borderRadius: T.radius, marginBottom: 6,
                                }}>
                                    <div style={{
                                        width: 32, height: 32,
                                        borderRadius: '50%',
                                        background: T.accentLight,
                                        color: T.accent,
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 13, fontWeight: 700,
                                        flexShrink: 0,
                                    }}>
                                        {m.name?.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13,
                                                      fontWeight: 500,
                                                      color: T.textPri }}>
                                            {m.name}
                                        </div>
                                        <div style={{ fontSize: 11,
                                                      color: T.textMuted }}>
                                            {m.email}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeManager(
                                            drawer.warehouse_id, m.user_id
                                        )}
                                        style={{
                                            background: 'none',
                                            border: `1px solid ${T.border}`,
                                            borderRadius: T.radiusSm,
                                            color: T.danger,
                                            cursor: 'pointer',
                                            fontSize: 11, padding: '3px 8px',
                                            fontFamily: T.fontBody,
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = T.dangerLight;
                                            e.currentTarget.style.borderColor = T.danger;
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'none';
                                            e.currentTarget.style.borderColor = T.border;
                                        }}>
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* active shipments */}
                    <p style={{ margin: '0 0 10px', fontSize: 13,
                                fontWeight: 600, color: T.textPri }}>
                        Active shipments
                    </p>

                    {drawerLoad ? (
                        <SkeletonCard height={60} />
                    ) : drawerData?.shipments?.length === 0 ? (
                        <p style={{ color: T.textMuted, fontSize: 13 }}>
                            No active shipments
                        </p>
                    ) : (
                        drawerData?.shipments?.map((s, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: T.pageBg,
                                borderRadius: T.radius, marginBottom: 6,
                            }}>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600,
                                                  color: T.textPri }}>
                                        #{s.shipment_id}
                                    </div>
                                    <div style={{ fontSize: 11,
                                                  color: T.textMuted }}>
                                        {s.driver_name || 'Unassigned'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex',
                                              flexDirection: 'column',
                                              alignItems: 'flex-end', gap: 3 }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: T.radiusFull,
                                        fontSize: 10, fontWeight: 600,
                                        color: T.status[s.status]?.color || T.textSec,
                                        background: T.status[s.status]?.bg || T.pageBg,
                                    }}>
                                        {T.status[s.status]?.label || s.status}
                                    </span>
                                    <span style={{
                                        fontSize: 10, fontWeight: 600,
                                        color: T.priority[s.priority]?.color
                                            || T.textMuted,
                                    }}>
                                        {s.priority}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </Drawer>
            )}

            {/* ── ADD WAREHOUSE MODAL ── */}
            {addModal && (
                <Modal title="Add New Warehouse"
                       onClose={() => setAddModal(false)}
                       width={480}>
                    <FormInput
                        label="Warehouse Name" required
                        value={newWh.name}
                        onChange={v => setNewWh({...newWh, name: v})}
                        placeholder="Lahore Central Hub"
                    />
                    <FormInput
                        label="City" required
                        value={newWh.city}
                        onChange={v => setNewWh({...newWh, city: v})}
                        placeholder="Lahore"
                    />
                    <FormInput
                        label="Address"
                        value={newWh.address}
                        onChange={v => setNewWh({...newWh, address: v})}
                        placeholder="Plot 5, Sundar Industrial Estate"
                    />
                    <div style={{ display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 12 }}>
                        <FormInput
                            label="Latitude"
                            value={newWh.latitude}
                            onChange={v => setNewWh({...newWh, latitude: v})}
                            placeholder="31.5204" type="number"
                            hint="e.g. 31.5204 for Lahore"
                        />
                        <FormInput
                            label="Longitude"
                            value={newWh.longitude}
                            onChange={v => setNewWh({...newWh, longitude: v})}
                            placeholder="74.3587" type="number"
                            hint="e.g. 74.3587 for Lahore"
                        />
                    </div>
                    <FormInput
                        label="Capacity (units)" required
                        value={newWh.capacity_units}
                        onChange={v => setNewWh({...newWh, capacity_units: v})}
                        placeholder="500" type="number"
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Btn onClick={submitAdd} fullWidth>
                            Create Warehouse
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setAddModal(false)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* ── EDIT MODAL ── */}
            {editModal && (
                <Modal title="Edit Warehouse"
                       onClose={() => setEditModal(null)}>
                    <FormInput
                        label="Name"
                        value={editForm.name}
                        onChange={v => setEditForm({...editForm, name: v})}
                    />
                    <FormInput
                        label="City"
                        value={editForm.city}
                        onChange={v => setEditForm({...editForm, city: v})}
                    />
                    <FormInput
                        label="Address"
                        value={editForm.address}
                        onChange={v => setEditForm({...editForm, address: v})}
                    />
                    <FormInput
                        label="Capacity (units)"
                        value={editForm.capacity_units}
                        onChange={v => setEditForm({...editForm,
                            capacity_units: v})}
                        type="number"
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Btn onClick={submitEdit} fullWidth>
                            Save Changes
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setEditModal(null)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* ── ASSIGN MANAGER MODAL ── */}
            {assignModal && (
                <Modal title="Assign Manager to Warehouse"
                       onClose={() => setAssignModal(null)}>
                    <FormSelect
                        label="Select Manager" required
                        value={selManager}
                        onChange={setSelManager}
                        placeholder="— choose manager —"
                        options={managers.map(m => ({
                            value: m.user_id,
                            label: `${m.name} (${m.email})`,
                        }))}
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Btn onClick={submitAssignManager} fullWidth>
                            Assign Manager
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setAssignModal(null)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* ── FIND NEAREST MODAL ── */}
            {nearestModal && (
                <Modal title="📍 Find Nearest Warehouse"
                       onClose={() => setNearestModal(false)}>
                    <p style={{ margin: '0 0 16px', fontSize: 13,
                                color: T.textSec }}>
                        Enter a location's coordinates to find the closest
                        warehouse in your organization.
                    </p>
                    <div style={{ display: 'grid',
                                  gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <FormInput
                            label="Latitude"
                            value={nearLat}
                            onChange={setNearLat}
                            placeholder="31.5204" type="number"
                        />
                        <FormInput
                            label="Longitude"
                            value={nearLng}
                            onChange={setNearLng}
                            placeholder="74.3587" type="number"
                        />
                    </div>

                    <Btn onClick={findNearest} fullWidth
                         disabled={!nearLat || !nearLng || nearLoad}>
                        {nearLoad ? 'Searching...' : 'Find Nearest'}
                    </Btn>

                    {nearResult && (
                        <div style={{
                            marginTop: 16, padding: '1rem',
                            background: T.accentLight,
                            border: `1px solid ${T.accent}30`,
                            borderRadius: T.radius,
                        }}>
                            <p style={{ margin: '0 0 8px', fontSize: 12,
                                        fontWeight: 600, color: T.accent }}>
                                ✓ Nearest warehouse found
                            </p>
                            <div style={{ fontSize: 15, fontWeight: 700,
                                          color: T.textPri,
                                          fontFamily: T.fontHead }}>
                                {nearResult.name}
                            </div>
                            <div style={{ fontSize: 13, color: T.textSec,
                                          marginTop: 2 }}>
                                📍 {nearResult.city}
                            </div>
                            <div style={{
                                display: 'flex', gap: 16, marginTop: 10,
                            }}>
                                <div>
                                    <div style={{ fontSize: 10,
                                                  color: T.textMuted,
                                                  textTransform: 'uppercase',
                                                  letterSpacing: '0.05em' }}>
                                        Distance
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 700,
                                                  color: T.accent }}>
                                        {nearResult.distance_km} km
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10,
                                                  color: T.textMuted,
                                                  textTransform: 'uppercase',
                                                  letterSpacing: '0.05em' }}>
                                        Load
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 700,
                                                  color: T.textPri }}>
                                        {nearResult.current_load}/
                                        {nearResult.capacity_units}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
}

// ── WAREHOUSE CARD ───────────────────────────────────────────
function WarehouseCard({ warehouse: w, onView, onEdit, onAssignManager }) {
    const [hovered, setHovered] = useState(false);
    const pct = parseFloat(w.load_percentage || 0);
    const loadColor = pct > 80 ? T.danger
                    : pct > 50 ? T.warning
                    : T.success;

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background:   T.cardBg,
                border:       `1px solid ${hovered ? loadColor + '40' : T.border}`,
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
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700,
                                  color: T.textPri, fontFamily: T.fontHead }}>
                        {w.warehouse_name}
                    </div>
                    <div style={{ fontSize: 12, color: T.textMuted,
                                  marginTop: 2 }}>
                        📍 {w.city}
                    </div>
                </div>
                <span style={{
                    padding: '4px 10px', borderRadius: T.radiusFull,
                    fontSize: 12, fontWeight: 700,
                    color: loadColor,
                    background: pct > 80 ? T.dangerLight
                              : pct > 50 ? T.warningLight
                              : T.successLight,
                }}>
                    {pct}%
                </span>
            </div>

            {/* capacity bar */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ background: T.pageBg,
                              borderRadius: T.radiusFull, height: 8,
                              marginBottom: 4 }}>
                    <div style={{
                        width: `${Math.min(pct, 100)}%`,
                        height: 8, borderRadius: T.radiusFull,
                        background: loadColor,
                        transition: 'width 0.6s ease',
                        boxShadow: `0 0 6px ${loadColor}40`,
                    }} />
                </div>
                <div style={{ fontSize: 11, color: T.textMuted }}>
                    {w.current_load} / {w.capacity_units} units
                </div>
            </div>

            {/* stats */}
            <div style={{ display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 6, marginBottom: '1rem' }}>
                {[
                    ['Shipments handled', w.total_shipments_handled || 0],
                    ['Avg dwell time',    `${w.avg_dwell_hours || 0}h`],
                ].map(([label, val]) => (
                    <div key={label} style={{
                        padding: '8px 10px', background: T.pageBg,
                        borderRadius: T.radiusSm,
                    }}>
                        <div style={{ fontSize: 10, color: T.textMuted,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em', marginBottom: 2 }}>
                            {label}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600,
                                      color: T.textPri }}>
                            {val}
                        </div>
                    </div>
                ))}
            </div>

            {/* critical warning */}
            {pct > 80 && (
                <div style={{
                    padding: '6px 10px', background: T.dangerLight,
                    borderRadius: T.radiusSm, marginBottom: '1rem',
                    fontSize: 12, color: T.danger, fontWeight: 500,
                }}>
                    ⚠ Near capacity — consider transfers
                </div>
            )}

            {/* actions */}
            <div style={{ display: 'flex', gap: 6 }}>
                <Btn size="sm" variant="secondary" onClick={onView} fullWidth>
                    View Details
                </Btn>
                <Btn size="sm" variant="secondary" onClick={onEdit}>
                    ✏️
                </Btn>
                <Btn size="sm" variant="secondary" onClick={onAssignManager}>
                    👤
                </Btn>
            </div>
        </div>
    );
}
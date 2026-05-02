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

function Th({ children }) {
    return (
        <th style={{
            textAlign: 'left', padding: '10px 14px',
            fontSize: 11, fontWeight: 600,
            color: T.textMuted, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            borderBottom: `1px solid ${T.border}`,
            whiteSpace: 'nowrap', background: T.pageBg,
            fontFamily: T.fontBody,
        }}>
            {children}
        </th>
    );
}

function Td({ children, style = {} }) {
    return (
        <td style={{
            padding: '11px 14px', fontSize: 13,
            color: T.textPri, borderBottom: `1px solid ${T.border}`,
            whiteSpace: 'nowrap', fontFamily: T.fontBody, ...style,
        }}>
            {children}
        </td>
    );
}

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'created',          label: 'Created'          },
    { value: 'assigned',         label: 'Assigned'         },
    { value: 'in_transit',       label: 'In Transit'       },
    { value: 'at_warehouse',     label: 'At Warehouse'     },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered',        label: 'Delivered'        },
    { value: 'cancelled',        label: 'Cancelled'        },
];

const PRIORITY_OPTIONS = [
    { value: '',       label: 'All priorities' },
    { value: 'low',    label: 'Low'    },
    { value: 'normal', label: 'Normal' },
    { value: 'high',   label: 'High'   },
    { value: 'urgent', label: 'Urgent' },
];

export default function AdminShipments({ readOnly = false, managerLocked = false }) {
    const [shipments,    setShipments]    = useState([]);
    const [warehouses,   setWarehouses]   = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPri,    setFilterPri]    = useState('');
    const [filterDelay,  setFilterDelay]  = useState(false);
    const [search,       setSearch]       = useState('');
    const [msg,          setMsg]          = useState(null);

    // drawer
    const [drawer,       setDrawer]       = useState(null);
    const [drawerData,   setDrawerData]   = useState(null);
    const [drawerLoad,   setDrawerLoad]   = useState(false);

    // modals
    const [createModal,  setCreateModal]  = useState(false);
    const [assignModal,  setAssignModal]  = useState(null);
    const [transferModal,setTransferModal]= useState(null);

    // assign
    const [availD,    setAvailD]    = useState([]);
    const [availV,    setAvailV]    = useState([]);
    const [selD,      setSelD]      = useState('');
    const [selV,      setSelV]      = useState('');
    const [assignMode,setAssignMode]= useState('direct'); // direct | via_warehouse
    const [assignWh,  setAssignWh]  = useState('');
    const [suggested, setSuggested] = useState(null);
    const [assignMsg, setAssignMsg] = useState('');

    // create form
    const [newShip, setNewShip] = useState({
        origin_warehouse_id: '', destination_address: '',
        destination_lat: '', destination_lng: '',
        weight_kg: '', priority: 'normal',
        estimated_delivery: '', items: [],
    });
    const [newItem, setNewItem] = useState({
        item_name: '', quantity: '', weight: '', category: '',
    });

    // transfer
    const [transferWh, setTransferWh] = useState('');

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    const fetchShipments = useCallback(async () => {
        try {
            setLoading(true);
            const res = await API.get('/shipments/all');
            setShipments(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchShipments();
        API.get(managerLocked ? '/warehouses/my' : '/warehouses')
            .then(r => setWarehouses(r.data));
    }, [fetchShipments, managerLocked]);

    useEffect(() => {
        if (!assignModal || assignMode !== 'via_warehouse' || !assignWh) return;
        const s = shipments.find(sh => sh.shipment_id == assignModal);
        const oid = s?.origin_warehouse_id;
        if (oid != null && parseInt(assignWh, 10) === Number(oid)) {
            setAssignWh('');
        }
    }, [assignModal, assignMode, assignWh, shipments]);

    useEffect(() => {
        if (!transferModal || !transferWh) return;
        const s = shipments.find(sh => sh.shipment_id == transferModal);
        const oid = s?.origin_warehouse_id;
        if (oid != null && parseInt(transferWh, 10) === Number(oid)) {
            setTransferWh('');
        }
    }, [transferModal, transferWh, shipments]);

    const openDrawer = async (shipment_id) => {
        setDrawer(shipment_id);
        setDrawerLoad(true);
        setDrawerData(null);
        try {
            const res = await API.get(`/shipments/${shipment_id}`);
            setDrawerData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setDrawerLoad(false);
        }
    };

    const openAssign = async (shipment_id) => {
        setAssignModal(shipment_id);
        setSelD(''); setSelV('');
        setAssignMode('direct');
        setAssignWh('');
        setAssignMsg(''); setSuggested(null);
        const [dRes, vRes, sugRes] = await Promise.all([
            API.get('/drivers/available'),
            API.get('/vehicles/available'),
            API.get(`/shipments/${shipment_id}/suggest-assignment`).catch(() => ({ data: null })),
        ]);
        setAvailD(dRes.data);
        setAvailV(vRes.data);
        if (sugRes.data) {
            setSuggested(sugRes.data);
            setSelD(sugRes.data.suggested_driver?.driver_id?.toString() || '');
            setSelV(sugRes.data.suggested_vehicle?.vehicle_id?.toString() || '');
        }
    };

    const submitAssign = async () => {
        if (!selD || !selV) {
            setAssignMsg('Please select both a driver and vehicle.');
            return;
        }
        if (assignMode === 'via_warehouse' && !assignWh) {
            setAssignMsg('Please select a transfer warehouse.');
            return;
        }
        const assignShip = shipments.find(s => s.shipment_id == assignModal);
        const originId = assignShip?.origin_warehouse_id;
        if (
            assignMode === 'via_warehouse' &&
            originId != null &&
            parseInt(assignWh, 10) === Number(originId)
        ) {
            setAssignMsg('Transfer warehouse cannot be the same as the origin warehouse.');
            return;
        }
        try {
            await API.post(`/shipments/${assignModal}/assign`, {
                driver_id: parseInt(selD), vehicle_id: parseInt(selV),
                delivery_mode: assignMode,
                transfer_warehouse_id: assignMode === 'via_warehouse' ? parseInt(assignWh) : null,
            });
            setAssignModal(null);
            showMsg('Shipment assigned successfully.');
            fetchShipments();
        } catch (err) {
            setAssignMsg(err.response?.data?.error || 'Assignment failed.');
        }
    };

    const submitCreate = async () => {
        try {
            await API.post('/shipments', newShip);
            setCreateModal(false);
            setNewShip({
                origin_warehouse_id: '', destination_address: '',
                destination_lat: '', destination_lng: '',
                weight_kg: '', priority: 'normal',
                estimated_delivery: '', items: [],
            });
            showMsg('Shipment created.');
            fetchShipments();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to create shipment.', false);
        }
    };

    const addItem = () => {
        if (!newItem.item_name) return;
        setNewShip(prev => ({
            ...prev,
            items: [...prev.items, { ...newItem }]
        }));
        setNewItem({ item_name: '', quantity: '', weight: '', category: '' });
    };

    const removeItem = (i) => {
        setNewShip(prev => ({
            ...prev,
            items: prev.items.filter((_, idx) => idx !== i),
        }));
    };

    const cancelShipment = async (id) => {
        if (!window.confirm('Cancel this shipment?')) return;
        try {
            await API.patch(`/shipments/${id}/cancel`);
            showMsg('Shipment cancelled.');
            fetchShipments();
            if (drawer === id) setDrawer(null);
        } catch (err) {
            showMsg('Failed to cancel.', false);
        }
    };

    const completeShipment = async (id) => {
        try {
            await API.post(`/shipments/${id}/complete`);
            showMsg('Marked as delivered.');
            fetchShipments();
            if (drawer === id) openDrawer(id);
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed.', false);
        }
    };

    const submitTransfer = async () => {
        if (!transferWh) return;
        try {
            const ship = shipments.find(s => s.shipment_id == transferModal);
            const setTransferWarehouseOnly =
                ship &&
                ship.delivery_mode === 'via_warehouse' &&
                !ship.transfer_warehouse_id &&
                ['assigned', 'in_transit', 'at_warehouse'].includes(ship.status);

            if (
                setTransferWarehouseOnly &&
                ship.origin_warehouse_id != null &&
                parseInt(transferWh, 10) === Number(ship.origin_warehouse_id)
            ) {
                showMsg('Transfer warehouse cannot be the same as the origin warehouse.', false);
                return;
            }

            if (setTransferWarehouseOnly) {
                await API.patch(`/shipments/${transferModal}/transfer-warehouse`, {
                    transfer_warehouse_id: parseInt(transferWh),
                });
                showMsg('Transfer warehouse saved.');
            } else {
                await API.post(`/shipments/${transferModal}/transfer`, {
                    warehouse_id: parseInt(transferWh),
                });
                showMsg('Transferred to warehouse.');
            }
            setTransferModal(null);
            fetchShipments();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed.', false);
        }
    };

    // filter logic
    const filtered = shipments.filter(s => {
        if (filterStatus && s.status !== filterStatus)   return false;
        if (filterPri    && s.priority !== filterPri)    return false;
        if (filterDelay  && (!s.estimated_delivery ||
            new Date(s.estimated_delivery) >= new Date() ||
            s.status === 'delivered'))                   return false;
        if (search) {
            const q = search.toLowerCase();
            const matches =
                s.shipment_id?.toString().includes(q)        ||
                s.driver_name?.toLowerCase().includes(q)     ||
                s.destination_address?.toLowerCase().includes(q) ||
                s.origin_warehouse?.toLowerCase().includes(q);
            if (!matches) return false;
        }
        return true;
    });

    const stats = {
        total:     shipments.length,
        active:    shipments.filter(s => !['delivered','cancelled'].includes(s.status)).length,
        delayed:   shipments.filter(s => s.estimated_delivery &&
                       new Date(s.estimated_delivery) < new Date() &&
                       s.status !== 'delivered').length,
        delivered: shipments.filter(s => s.status === 'delivered').length,
    };

    const assignShipForModal = assignModal
        ? shipments.find(s => s.shipment_id == assignModal)
        : null;
    const assignOriginId = assignShipForModal?.origin_warehouse_id;
    const transferWarehousesForAssign =
        assignOriginId == null
            ? warehouses
            : warehouses.filter(w => Number(w.warehouse_id) !== Number(assignOriginId));

    const transferShipForModal = transferModal
        ? shipments.find(s => s.shipment_id == transferModal)
        : null;
    const transferOriginId = transferShipForModal?.origin_warehouse_id;
    const transferWarehousesForTransferModal =
        transferOriginId == null
            ? warehouses
            : warehouses.filter(w => Number(w.warehouse_id) !== Number(transferOriginId));

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>

            {/* msg toast */}
            {msg && (
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
            )}

            {/* ── STATS ROW ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12, marginBottom: '1.5rem',
            }}>
                {[
                    { label: 'Total',     value: stats.total,     color: T.accent   },
                    { label: 'Active',    value: stats.active,    color: T.info     },
                    { label: 'Delayed',   value: stats.delayed,   color: T.danger   },
                    { label: 'Delivered', value: stats.delivered, color: T.success  },
                ].map(s => (
                    <Card key={s.label} style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: 11, color: T.textMuted,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.06em',
                                      fontWeight: 600 }}>
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
                <div style={{
                    display: 'flex', gap: 10,
                    alignItems: 'center', flexWrap: 'wrap',
                }}>
                    {/* search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <span style={{
                            position: 'absolute', left: 10,
                            top: '50%', transform: 'translateY(-50%)',
                            color: T.textMuted, fontSize: 13,
                        }}>🔍</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by ID, driver, destination..."
                            style={{
                                width: '100%', padding: '7px 12px 7px 32px',
                                background: T.inputBg,
                                border: `1px solid ${T.border}`,
                                borderRadius: T.radius,
                                fontSize: 13, color: T.textPri,
                                outline: 'none', fontFamily: T.fontBody,
                            }}
                        />
                    </div>

                    {/* filters */}
                    <select value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        style={{
                            padding: '7px 10px', fontSize: 12,
                            border: `1px solid ${T.border}`,
                            borderRadius: T.radius,
                            background: filterStatus ? T.accentLight : T.inputBg,
                            color: filterStatus ? T.accent : T.textSec,
                            outline: 'none', cursor: 'pointer',
                            fontFamily: T.fontBody,
                        }}>
                        {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    <select value={filterPri}
                        onChange={e => setFilterPri(e.target.value)}
                        style={{
                            padding: '7px 10px', fontSize: 12,
                            border: `1px solid ${T.border}`,
                            borderRadius: T.radius,
                            background: filterPri ? T.accentLight : T.inputBg,
                            color: filterPri ? T.accent : T.textSec,
                            outline: 'none', cursor: 'pointer',
                            fontFamily: T.fontBody,
                        }}>
                        {PRIORITY_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setFilterDelay(v => !v)}
                        style={{
                            padding: '7px 12px', fontSize: 12,
                            border: `1px solid ${filterDelay ? T.danger : T.border}`,
                            borderRadius: T.radius,
                            background: filterDelay ? T.dangerLight : T.inputBg,
                            color: filterDelay ? T.danger : T.textSec,
                            cursor: 'pointer', fontWeight: filterDelay ? 600 : 400,
                            fontFamily: T.fontBody,
                        }}>
                        ⚠ Delayed only
                    </button>

                    {!readOnly && (
                        <div style={{ marginLeft: 'auto' }}>
                            <Btn onClick={() => setCreateModal(true)} icon="＋">
                                New Shipment
                            </Btn>
                        </div>
                    )}
                </div>

                {/* active filter chips */}
                {(filterStatus || filterPri || filterDelay || search) && (
                    <div style={{ display: 'flex', gap: 6,
                                  marginTop: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: T.textMuted,
                                       alignSelf: 'center' }}>
                            Filters:
                        </span>
                        {filterStatus && (
                            <Chip label={filterStatus}
                                  onRemove={() => setFilterStatus('')} />
                        )}
                        {filterPri && (
                            <Chip label={filterPri}
                                  onRemove={() => setFilterPri('')} />
                        )}
                        {filterDelay && (
                            <Chip label="Delayed"
                                  onRemove={() => setFilterDelay(false)} />
                        )}
                        {search && (
                            <Chip label={`"${search}"`}
                                  onRemove={() => setSearch('')} />
                        )}
                        <button onClick={() => {
                            setFilterStatus(''); setFilterPri('');
                            setFilterDelay(false); setSearch('');
                        }} style={{
                            fontSize: 11, color: T.textMuted,
                            background: 'none', border: 'none',
                            cursor: 'pointer', padding: '2px 6px',
                        }}>
                            Clear all
                        </button>
                    </div>
                )}
            </Card>

            {/* ── TABLE ── */}
            <Card>
                <div style={{
                    padding: '10px 14px',
                    borderBottom: `1px solid ${T.border}`,
                    fontSize: 12, color: T.textMuted,
                }}>
                    Showing {filtered.length} of {shipments.length} shipments
                </div>

                {loading ? (
                    <div style={{ padding: '1.5rem' }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} style={{ marginBottom: 12 }}>
                                <SkeletonCard height={40} />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                        <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
                            No shipments match your filters
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%',
                                        borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <Th>ID</Th>
                                    <Th>Status</Th>
                                    <Th>Priority</Th>
                                    <Th>Driver</Th>
                                    <Th>Vehicle</Th>
                                    <Th>Origin</Th>
                                    <Th>Destination</Th>
                                    <Th>ETA</Th>
                                    <Th>Actions</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s, i) => {
                                    const isDelayed =
                                        s.estimated_delivery &&
                                        new Date(s.estimated_delivery) < new Date() &&
                                        s.status !== 'delivered';

                                    return (
                                        <tr key={s.shipment_id}
                                            style={{ transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.pageBg}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <Td>
                                                <button onClick={() => openDrawer(s.shipment_id)}
                                                    style={{
                                                        background: 'none', border: 'none',
                                                        color: T.accent, fontWeight: 700,
                                                        cursor: 'pointer', fontSize: 13,
                                                        padding: 0,
                                                    }}>
                                                    #{s.shipment_id}
                                                </button>
                                            </Td>
                                            <Td>
                                                <Badge val={s.status}
                                                       map={T.status} dot />
                                            </Td>
                                            <Td>
                                                <Badge val={s.priority}
                                                       map={T.priority} />
                                            </Td>
                                            <Td style={{ color: T.textSec }}>
                                                {s.driver_name || '—'}
                                            </Td>
                                            <Td style={{ color: T.textSec }}>
                                                {s.plate_number || '—'}
                                            </Td>
                                            <Td style={{ color: T.textSec }}>
                                                {s.origin_warehouse || '—'}
                                            </Td>
                                            <Td style={{ color: T.textSec,
                                                         maxWidth: 180,
                                                         overflow: 'hidden',
                                                         textOverflow: 'ellipsis' }}>
                                                {s.destination_address?.slice(0, 30)}
                                                {s.destination_address?.length > 30 ? '...' : ''}
                                            </Td>
                                            <Td>
                                                {s.estimated_delivery ? (
                                                    <span style={{
                                                        color: isDelayed ? T.danger : T.textSec,
                                                        fontWeight: isDelayed ? 600 : 400,
                                                        fontSize: 12,
                                                    }}>
                                                        {isDelayed && '⚠ '}
                                                        {new Date(s.estimated_delivery)
                                                            .toLocaleDateString()}
                                                    </span>
                                                ) : '—'}
                                            </Td>
                                            <Td>
                                                <div style={{ display: 'flex',
                                                              gap: 5 }}>
                                                    <Btn size="sm" variant="secondary"
                                                        onClick={() => openDrawer(s.shipment_id)}>
                                                        View
                                                    </Btn>
                                                    {!readOnly && s.status === 'created' && (
                                                        <Btn size="sm"
                                                            onClick={() => openAssign(s.shipment_id)}>
                                                            Assign
                                                        </Btn>
                                                    )}
                                                    {!readOnly && !managerLocked && s.delivery_mode !== 'direct' && ['assigned','in_transit','at_warehouse'].includes(s.status) && (
                                                        <Btn size="sm" variant="secondary"
                                                            onClick={() => {
                                                                setTransferModal(s.shipment_id);
                                                                setTransferWh('');
                                                            }}>
                                                            Transfer
                                                        </Btn>
                                                    )}
                                                    {!readOnly && managerLocked && s.delivery_mode === 'via_warehouse' && !s.transfer_warehouse_id && ['assigned','in_transit','at_warehouse'].includes(s.status) && (
                                                        <Btn size="sm" variant="secondary"
                                                            onClick={() => {
                                                                setTransferModal(s.shipment_id);
                                                                setTransferWh('');
                                                            }}>
                                                            Set transfer warehouse
                                                        </Btn>
                                                    )}
                                                    {!readOnly && !managerLocked && s.status === 'out_for_delivery' && (
                                                        <Btn size="sm" color={T.success}
                                                            onClick={() => completeShipment(s.shipment_id)}>
                                                            Deliver
                                                        </Btn>
                                                    )}
                                                    {!readOnly && managerLocked && s.status === 'created' && (
                                                        <Btn size="sm" variant="danger"
                                                            onClick={() => cancelShipment(s.shipment_id)}>
                                                            Delete
                                                        </Btn>
                                                    )}
                                                    {!readOnly && !managerLocked && !['delivered','cancelled'].includes(s.status) && (
                                                        <Btn size="sm" variant="danger"
                                                            onClick={() => cancelShipment(s.shipment_id)}>
                                                            Cancel
                                                        </Btn>
                                                    )}
                                                </div>
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* ── DETAIL DRAWER ── */}
            {drawer && (
                <Drawer
                    title={`Shipment #${drawer}`}
                    onClose={() => setDrawer(null)}
                >
                    {drawerLoad ? (
                        <div style={{ display: 'flex', flexDirection: 'column',
                                      gap: 12 }}>
                            {[...Array(4)].map((_, i) => (
                                <SkeletonCard key={i} height={60} />
                            ))}
                        </div>
                    ) : drawerData ? (
                        <ShipmentDetail
                            data={drawerData}
                            readOnly={readOnly}
                            managerLocked={managerLocked}
                            onAssign={() => openAssign(drawer)}
                            onCancel={() => cancelShipment(drawer)}
                            onComplete={() => completeShipment(drawer)}
                            onTransfer={() => {
                                setTransferModal(drawer);
                                setTransferWh('');
                            }}
                        />
                    ) : (
                        <p style={{ color: T.textMuted }}>
                            Failed to load shipment details.
                        </p>
                    )}
                </Drawer>
            )}

            {/* ── ASSIGN MODAL ── */}
            {!readOnly && assignModal && (
                <Modal title={`Assign Shipment #${assignModal}`}
                       onClose={() => setAssignModal(null)}>
                    {suggested && (
                        <div style={{
                            padding: '10px 14px',
                            background: T.accentLight,
                            border: `1px solid ${T.accent}30`,
                            borderRadius: T.radius,
                            marginBottom: 16,
                        }}>
                            <p style={{ margin: '0 0 4px', fontSize: 12,
                                        fontWeight: 600, color: T.accent }}>
                                ✨ Smart suggestion
                            </p>
                            <p style={{ margin: 0, fontSize: 12,
                                        color: T.textSec }}>
                                {suggested.suggested_driver?.name} +{' '}
                                {suggested.suggested_vehicle?.plate_number} —{' '}
                                {suggested.reason}
                            </p>
                        </div>
                    )}

                    <FormSelect
                        label="Driver"
                        value={selD}
                        onChange={setSelD}
                        required
                        placeholder="— select available driver —"
                        options={availD.map(d => ({
                            value: d.driver_id,
                            label: `${d.name} (★ ${d.rating} · ${d.total_deliveries} trips)`,
                        }))}
                    />
                    <FormSelect
                        label="Vehicle"
                        value={selV}
                        onChange={setSelV}
                        required
                        placeholder="— select available vehicle —"
                        options={availV.map(v => ({
                            value: v.vehicle_id,
                            label: `${v.plate_number} — ${v.vehicle_type} (${v.capacity_kg}kg)`,
                        }))}
                    />

                    <div style={{
                        margin: '10px 0 12px',
                        padding: 10,
                        border: `1px solid ${T.border}`,
                        borderRadius: T.radius,
                        background: T.pageBg,
                    }}>
                        <div style={{ fontSize: 11, color: T.textMuted,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.08em',
                                      fontWeight: 700, marginBottom: 8 }}>
                            Routing
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center',
                                            color: T.textSec, fontSize: 13, cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="assignMode"
                                    checked={assignMode === 'direct'}
                                    onChange={() => setAssignMode('direct')}
                                />
                                Transfer to destination (direct)
                            </label>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center',
                                            color: T.textSec, fontSize: 13, cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="assignMode"
                                    checked={assignMode === 'via_warehouse'}
                                    onChange={() => setAssignMode('via_warehouse')}
                                />
                                Transfer to warehouse first
                            </label>
                        </div>

                        {assignMode === 'via_warehouse' && (
                            <div style={{ marginTop: 10 }}>
                                <FormSelect
                                    label="Transfer Warehouse"
                                    value={assignWh}
                                    onChange={setAssignWh}
                                    required
                                    placeholder="— select warehouse —"
                                    options={transferWarehousesForAssign.map(w => ({
                                        value: w.warehouse_id,
                                        label: `${w.warehouse_name} — ${w.city}`,
                                    }))}
                                />
                            </div>
                        )}
                    </div>

                    {assignMsg && (
                        <p style={{ fontSize: 12, color: T.danger,
                                    margin: '0 0 12px' }}>
                            {assignMsg}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <Btn onClick={submitAssign} fullWidth>
                            Confirm Assignment
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setAssignModal(null)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* ── CREATE SHIPMENT MODAL ── */}
            {!readOnly && createModal && (
                <Modal title="Create New Shipment"
                       onClose={() => setCreateModal(false)}
                       width={520}>
                    <FormSelect
                        label="Origin Warehouse"
                        value={newShip.origin_warehouse_id}
                        onChange={v => setNewShip({...newShip, origin_warehouse_id: v})}
                        required
                        options={warehouses.map(w => ({
                            value: w.warehouse_id,
                            label: `${w.warehouse_name} — ${w.city}`,
                        }))}
                    />
                    <FormInput
                        label="Destination Address"
                        value={newShip.destination_address}
                        onChange={v => setNewShip({...newShip, destination_address: v})}
                        placeholder="House 5, Block A, Gulberg Lahore"
                        required
                    />
                    <div style={{ display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 12 }}>
                        <FormInput
                            label="Destination Latitude"
                            value={newShip.destination_lat}
                            onChange={v => setNewShip({...newShip, destination_lat: v})}
                            placeholder="31.5204" type="number"
                        />
                        <FormInput
                            label="Destination Longitude"
                            value={newShip.destination_lng}
                            onChange={v => setNewShip({...newShip, destination_lng: v})}
                            placeholder="74.3587" type="number"
                        />
                    </div>
                    <div style={{ display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 12 }}>
                        <FormInput
                            label="Weight (kg)"
                            value={newShip.weight_kg}
                            onChange={v => setNewShip({...newShip, weight_kg: v})}
                            placeholder="25.5" type="number"
                        />
                        <FormSelect
                            label="Priority"
                            value={newShip.priority}
                            onChange={v => setNewShip({...newShip, priority: v})}
                            options={[
                                { value: 'low',    label: 'Low'    },
                                { value: 'normal', label: 'Normal' },
                                { value: 'high',   label: 'High'   },
                                { value: 'urgent', label: 'Urgent' },
                            ]}
                        />
                    </div>
                    <FormInput
                        label="Estimated Delivery"
                        value={newShip.estimated_delivery}
                        onChange={v => setNewShip({...newShip, estimated_delivery: v})}
                        type="datetime-local"
                    />

                    {/* items */}
                    <div style={{
                        border: `1px solid ${T.border}`,
                        borderRadius: T.radius,
                        padding: '12px',
                        marginBottom: 16,
                    }}>
                        <p style={{ margin: '0 0 10px', fontSize: 12,
                                    fontWeight: 600, color: T.textSec,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em' }}>
                            Items
                        </p>

                        {newShip.items.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                                {newShip.items.map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 8px',
                                        background: T.pageBg,
                                        borderRadius: T.radiusSm,
                                        marginBottom: 4,
                                        fontSize: 12,
                                    }}>
                                        <span style={{ color: T.textPri }}>
                                            {item.item_name} ×{item.quantity}
                                        </span>
                                        <div style={{ display: 'flex',
                                                      gap: 8, alignItems: 'center' }}>
                                            <span style={{ color: T.textMuted }}>
                                                {item.weight}kg
                                            </span>
                                            <button onClick={() => removeItem(i)}
                                                style={{ background: 'none',
                                                         border: 'none',
                                                         color: T.danger,
                                                         cursor: 'pointer',
                                                         fontSize: 14 }}>
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'grid',
                                      gridTemplateColumns: '2fr 1fr 1fr',
                                      gap: 6, marginBottom: 6 }}>
                            <input
                                value={newItem.item_name}
                                onChange={e => setNewItem({...newItem, item_name: e.target.value})}
                                placeholder="Item name"
                                style={{
                                    padding: '6px 10px', fontSize: 12,
                                    border: `1px solid ${T.border}`,
                                    borderRadius: T.radiusSm,
                                    background: T.inputBg,
                                    color: T.textPri, outline: 'none',
                                    fontFamily: T.fontBody,
                                }}
                            />
                            <input
                                value={newItem.quantity}
                                onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                                placeholder="Qty"
                                type="number"
                                style={{
                                    padding: '6px 10px', fontSize: 12,
                                    border: `1px solid ${T.border}`,
                                    borderRadius: T.radiusSm,
                                    background: T.inputBg,
                                    color: T.textPri, outline: 'none',
                                    fontFamily: T.fontBody,
                                }}
                            />
                            <input
                                value={newItem.weight}
                                onChange={e => setNewItem({...newItem, weight: e.target.value})}
                                placeholder="kg"
                                type="number"
                                style={{
                                    padding: '6px 10px', fontSize: 12,
                                    border: `1px solid ${T.border}`,
                                    borderRadius: T.radiusSm,
                                    background: T.inputBg,
                                    color: T.textPri, outline: 'none',
                                    fontFamily: T.fontBody,
                                }}
                            />
                        </div>
                        <Btn size="sm" variant="secondary"
                             onClick={addItem}>
                            + Add Item
                        </Btn>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <Btn onClick={submitCreate} fullWidth>
                            Create Shipment
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setCreateModal(false)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* ── TRANSFER MODAL ── */}
            {!readOnly && transferModal && (
                <Modal title={`${
                    (() => {
                        const ship = shipments.find(s => s.shipment_id == transferModal);
                        const setOnly = ship &&
                            ship.delivery_mode === 'via_warehouse' &&
                            !ship.transfer_warehouse_id &&
                            ['assigned', 'in_transit', 'at_warehouse'].includes(ship.status);
                        return setOnly ? 'Set transfer warehouse' : 'Transfer shipment';
                    })()
                } #${transferModal}`}
                       onClose={() => setTransferModal(null)}>
                    <FormSelect
                        label="Transfer to Warehouse"
                        value={transferWh}
                        onChange={setTransferWh}
                        required
                        placeholder="— select warehouse —"
                        options={transferWarehousesForTransferModal.map(w => ({
                            value: w.warehouse_id,
                            label: `${w.warehouse_name} — ${w.city} (${w.current_load}/${w.capacity_units})`,
                        }))}
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Btn onClick={submitTransfer} fullWidth>
                            {(() => {
                                const ship = shipments.find(s => s.shipment_id == transferModal);
                                const setOnly = ship &&
                                    ship.delivery_mode === 'via_warehouse' &&
                                    !ship.transfer_warehouse_id &&
                                    ['assigned', 'in_transit', 'at_warehouse'].includes(ship.status);
                                return setOnly ? 'Save transfer warehouse' : 'Confirm Transfer';
                            })()}
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setTransferModal(null)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ── SHIPMENT DETAIL (inside drawer) ─────────────────────────
function ShipmentDetail({ data, readOnly, managerLocked, onAssign, onCancel, onComplete, onTransfer }) {
    const { shipment, history, items, stops } = data;

    const deliveryModeLabel =
        shipment.delivery_mode === 'via_warehouse' ? 'Via warehouse' : 'Direct';

    const transferWarehouseLabel = (() => {
        if (shipment.delivery_mode !== 'via_warehouse') return '—';
        if (shipment.transfer_warehouse) {
            const city = shipment.transfer_city ? ` (${shipment.transfer_city})` : '';
            return `${shipment.transfer_warehouse}${city}`;
        }
        if (shipment.transfer_warehouse_id) {
            return `Warehouse #${shipment.transfer_warehouse_id} (name not loaded)`;
        }
        return 'Not set yet';
    })();

    const isDelayed = shipment.estimated_delivery &&
        new Date(shipment.estimated_delivery) < new Date() &&
        shipment.status !== 'delivered';

    const TIMELINE_STEPS = [
        'created', 'assigned', 'in_transit',
        'out_for_delivery', 'delivered'
    ];
    const currentIdx = TIMELINE_STEPS.indexOf(shipment.status);

    return (
        <div>
            {/* status + priority */}
            <div style={{ display: 'flex', gap: 8,
                          marginBottom: '1.25rem' }}>
                <Badge val={shipment.status} map={T.status} dot />
                <Badge val={shipment.priority} map={T.priority} />
                {isDelayed && (
                    <span style={{
                        padding: '3px 10px', borderRadius: T.radiusFull,
                        fontSize: 11, fontWeight: 600,
                        color: T.danger, background: T.dangerLight,
                    }}>
                        ⚠ Delayed
                    </span>
                )}
            </div>

            {/* progress timeline */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {TIMELINE_STEPS.map((step, i) => (
                        <div key={step} style={{
                            display: 'flex', alignItems: 'center', flex: 1,
                        }}>
                            <div style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: 4,
                            }}>
                                <div style={{
                                    width: 20, height: 20,
                                    borderRadius: '50%',
                                    background: i <= currentIdx
                                        ? T.accent : T.border,
                                    border: `2px solid ${i <= currentIdx ? T.accent : T.border}`,
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10, color: '#fff',
                                    fontWeight: 700,
                                }}>
                                    {i < currentIdx ? '✓' : ''}
                                </div>
                                <span style={{
                                    fontSize: 9, color: i <= currentIdx
                                        ? T.accent : T.textMuted,
                                    fontWeight: i === currentIdx ? 700 : 400,
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {step.replace(/_/g, ' ')}
                                </span>
                            </div>
                            {i < TIMELINE_STEPS.length - 1 && (
                                <div style={{
                                    flex: 1, height: 2,
                                    background: i < currentIdx
                                        ? T.accent : T.border,
                                    margin: '0 2px',
                                    marginBottom: 18,
                                }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* details grid */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 10, marginBottom: '1.25rem',
            }}>
                {[
                    ['Driver',    shipment.driver_name  || '—'],
                    ['Vehicle',   shipment.plate_number || '—'],
                    ['Origin',    shipment.origin_warehouse || '—'],
                    ['Delivery mode', deliveryModeLabel],
                    ['Transfer warehouse', transferWarehouseLabel],
                    ['Weight',    shipment.weight_kg ? `${shipment.weight_kg} kg` : '—'],
                    ['Created',   new Date(shipment.created_at).toLocaleString()],
                    ['ETA',       shipment.estimated_delivery
                        ? new Date(shipment.estimated_delivery).toLocaleString() : '—'],
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
                        <div style={{ fontSize: 13, color: T.textPri,
                                      fontWeight: 500 }}>
                            {val}
                        </div>
                    </div>
                ))}
            </div>

            {/* destination */}
            <div style={{
                padding: '10px 12px', background: T.pageBg,
                borderRadius: T.radius, marginBottom: '1.25rem',
            }}>
                <div style={{ fontSize: 10, color: T.textMuted,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              fontWeight: 600, marginBottom: 3 }}>
                    Destination
                </div>
                <div style={{ fontSize: 13, color: T.textPri }}>
                    {shipment.destination_address}
                </div>
            </div>

            {/* items */}
            {items?.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12,
                                fontWeight: 600, color: T.textSec }}>
                        Items ({items.length})
                    </p>
                    {items.map((item, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: T.pageBg, borderRadius: T.radiusSm,
                            marginBottom: 4, fontSize: 12,
                        }}>
                            <span style={{ color: T.textPri,
                                           fontWeight: 500 }}>
                                {item.item_name}
                            </span>
                            <div style={{ display: 'flex', gap: 12,
                                          color: T.textMuted }}>
                                <span>×{item.quantity}</span>
                                <span>{item.weight}kg</span>
                                {item.category && (
                                    <span style={{
                                        background: T.accentLight,
                                        color: T.accent,
                                        padding: '1px 6px',
                                        borderRadius: T.radiusFull,
                                        fontSize: 10, fontWeight: 600,
                                    }}>
                                        {item.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* warehouse stops */}
            {stops?.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12,
                                fontWeight: 600, color: T.textSec }}>
                        Warehouse stops
                    </p>
                    {stops.map((stop, i) => (
                        <div key={i} style={{
                            padding: '8px 10px',
                            background: T.pageBg,
                            borderRadius: T.radiusSm,
                            marginBottom: 4,
                            borderLeft: `3px solid ${T.accent}`,
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 600,
                                          color: T.textPri }}>
                                {stop.warehouse_name}
                            </div>
                            <div style={{ fontSize: 11, color: T.textMuted,
                                          marginTop: 2 }}>
                                Arrived: {stop.arrival_time
                                    ? new Date(stop.arrival_time).toLocaleString() : '—'}
                                {stop.departure_time && (
                                    <> · Departed: {new Date(stop.departure_time).toLocaleString()}</>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* history timeline */}
            {history?.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12,
                                fontWeight: 600, color: T.textSec }}>
                        Status history
                    </p>
                    <div style={{ position: 'relative' }}>
                        {history.map((h, i) => (
                            <div key={i} style={{
                                display: 'flex', gap: 10,
                                paddingBottom: i < history.length - 1 ? 12 : 0,
                                position: 'relative',
                            }}>
                                <div style={{ display: 'flex',
                                              flexDirection: 'column',
                                              alignItems: 'center' }}>
                                    <div style={{
                                        width: 10, height: 10,
                                        borderRadius: '50%',
                                        background: T.accent,
                                        flexShrink: 0, marginTop: 2,
                                    }} />
                                    {i < history.length - 1 && (
                                        <div style={{
                                            width: 1, flex: 1,
                                            background: T.border,
                                            minHeight: 20,
                                        }} />
                                    )}
                                </div>
                                <div style={{ paddingBottom: 4 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600,
                                                  color: T.textPri,
                                                  textTransform: 'capitalize' }}>
                                        {h.status?.replace(/_/g, ' ')}
                                    </div>
                                    <div style={{ fontSize: 11,
                                                  color: T.textMuted }}>
                                        {new Date(h.changed_at).toLocaleString()}
                                        {h.notes && ` · ${h.notes}`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap',
                          gap: 8, paddingTop: '1rem',
                          borderTop: `1px solid ${T.border}` }}>
                {!readOnly && shipment.status === 'created' && (
                    <Btn size="sm" onClick={onAssign}>Assign Driver</Btn>
                )}
                {!readOnly && !managerLocked && shipment.delivery_mode !== 'direct' && ['assigned','in_transit','at_warehouse'].includes(shipment.status) && (
                    <Btn size="sm" variant="secondary" onClick={onTransfer}>
                        Transfer
                    </Btn>
                )}
                {!readOnly && managerLocked && shipment.delivery_mode === 'via_warehouse' && !shipment.transfer_warehouse_id && ['assigned','in_transit','at_warehouse'].includes(shipment.status) && (
                    <Btn size="sm" variant="secondary" onClick={onTransfer}>
                        Set transfer warehouse
                    </Btn>
                )}
                {!readOnly && !managerLocked && shipment.status === 'out_for_delivery' && (
                    <Btn size="sm" color={T.success} onClick={onComplete}>
                        Mark Delivered
                    </Btn>
                )}
                {!readOnly && managerLocked && shipment.status === 'created' && (
                    <Btn size="sm" variant="danger" onClick={onCancel}>
                        Delete
                    </Btn>
                )}
                {!readOnly && !managerLocked && !['delivered','cancelled'].includes(shipment.status) && (
                    <Btn size="sm" variant="danger" onClick={onCancel}>
                        Cancel
                    </Btn>
                )}
            </div>
        </div>
    );
}

// ── CHIP ─────────────────────────────────────────────────────
function Chip({ label, onRemove }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', background: T.accentLight,
            border: `1px solid ${T.accent}30`,
            borderRadius: T.radiusFull, fontSize: 11,
            color: T.accent, fontWeight: 500,
        }}>
            {label}
            <button onClick={onRemove} style={{
                background: 'none', border: 'none',
                color: T.accent, cursor: 'pointer',
                fontSize: 13, lineHeight: 1, padding: 0,
            }}>×</button>
        </span>
    );
}
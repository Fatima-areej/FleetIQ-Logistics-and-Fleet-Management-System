import { useCallback, useEffect, useState } from 'react';
import API from '../../api/axios';
import { T } from '../../styles/theme';
import Badge from '../../components/ui/Badge';
import Btn from '../../components/ui/Btn';
import Modal from '../../components/ui/Modal';
import FormInput from '../../components/ui/FormInput';
import { SkeletonCard } from '../../components/ui/Skeleton';

function Card({ children, style = {} }) {
    return (
        <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            boxShadow: T.shadow,
            ...style,
        }}>
            {children}
        </div>
    );
}

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

function computeNext(status, delivery_mode) {
    const mode = delivery_mode === 'via_warehouse' ? 'via_warehouse' : 'direct';
    if (mode === 'direct') {
        if (status === 'assigned') return 'out_for_delivery';
        if (status === 'out_for_delivery') return 'delivered';
        return null;
    }
    // via_warehouse
    if (status === 'assigned') return 'in_transit';
    if (status === 'in_transit') return 'at_warehouse';
    if (status === 'at_warehouse') return 'out_for_delivery';
    if (status === 'out_for_delivery') return 'delivered';
    return null;
}

function nextActionHint(shipment, next) {
    const wh = shipment?.transfer_warehouse
        ? `${shipment.transfer_warehouse}${shipment.transfer_city ? ` (${shipment.transfer_city})` : ''}`
        : (shipment?.transfer_warehouse_id ? `warehouse #${shipment.transfer_warehouse_id}` : 'the transfer warehouse');

    if (shipment?.delivery_mode === 'via_warehouse' && shipment?.status === 'assigned' && next === 'in_transit') {
        return `Head to ${wh}, then tap the button when you are on the way.`;
    }
    if (shipment?.delivery_mode === 'via_warehouse' && shipment?.status === 'in_transit' && next === 'at_warehouse') {
        return `Confirm when you arrive at ${wh}.`;
    }
    if (next === 'out_for_delivery') {
        return 'Continue to the customer destination for final delivery.';
    }
    if (next === 'delivered') {
        return 'Confirm delivery is completed.';
    }
    return null;
}

function nextActionLabel(shipment, next) {
    if (!next) return '';
    if (next === 'delivered') return 'Mark delivered';
    if (next === 'at_warehouse') return 'Reached warehouse';
    if (next === 'out_for_delivery') return 'Out for delivery';
    if (next === 'in_transit') {
        return shipment?.delivery_mode === 'via_warehouse'
            ? 'Left for warehouse'
            : 'In transit';
    }
    return `Mark ${next.replace(/_/g, ' ')}`;
}

export default function DriverShipments() {
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState([]);
    const [driver, setDriver] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [msg, setMsg] = useState(null);
    const [reqModal, setReqModal] = useState(null); // { vehicle_id, plate_number }
    const [reqNote, setReqNote] = useState('');

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const [shipRes, drvRes, vehRes] = await Promise.all([
                API.get('/shipments'),
                API.get('/drivers/me'),
                API.get('/drivers/me/vehicles'),
            ]);
            setActive(shipRes.data);
            setDriver(drvRes.data.driver);
            setVehicles(vehRes.data.vehicles || []);
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to load.', false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const progress = async (shipment_id, next_status) => {
        try {
            await API.post(`/shipments/${shipment_id}/driver-progress`, { next_status });
            showMsg('Updated.');
            fetchAll();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed.', false);
        }
    };

    const submitMaintenanceRequest = async () => {
        if (!reqModal?.vehicle_id) return;
        try {
            await API.post('/maintenance-requests/driver', {
                vehicle_id: reqModal.vehicle_id,
                description: reqNote,
            });
            showMsg('Request sent.');
            setReqModal(null);
            setReqNote('');
            fetchAll();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to send request.', false);
        }
    };

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {msg && <Toast msg={msg} />}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: '1.25rem',
            }}>
                <Card style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: 11, color: T.textMuted,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em', fontWeight: 600 }}>
                        Active shipments
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800,
                                  color: T.textPri, fontFamily: T.fontHead,
                                  marginTop: 4 }}>
                        {active.length}
                    </div>
                </Card>
                <Card style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: 11, color: T.textMuted,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em', fontWeight: 600 }}>
                        Assigned vehicles
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800,
                                  color: T.textPri, fontFamily: T.fontHead,
                                  marginTop: 4 }}>
                        {vehicles.length}
                    </div>
                </Card>
                <Card style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: 11, color: T.textMuted,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em', fontWeight: 600 }}>
                        Availability
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800,
                                  color: T.textPri, marginTop: 8 }}>
                        {driver?.availability_status || '—'}
                    </div>
                </Card>
            </div>

            <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline',
                              justifyContent: 'space-between', gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800,
                                      color: T.textPri, fontFamily: T.fontHead }}>
                            My assigned shipments
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                            Steps depend on routing: <b>direct</b> skips the warehouse leg; <b>via warehouse</b> includes a transfer stop first.
                        </div>
                    </div>
                    <button onClick={fetchAll} style={{
                        border: `1px solid ${T.border}`,
                        background: T.inputBg,
                        color: T.textSec,
                        borderRadius: T.radiusSm,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontSize: 12,
                    }}>
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                        {[...Array(4)].map((_, i) => (
                            <SkeletonCard key={i} height={70} />
                        ))}
                    </div>
                ) : active.length === 0 ? (
                    <div style={{ padding: 14, color: T.textMuted }}>
                        No active shipments right now.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                        {active.map(s => {
                            const next = computeNext(s.status, s.delivery_mode);
                            const hint = nextActionHint(s, next);
                            return (
                                <div key={s.shipment_id} style={{
                                    padding: 12,
                                    borderRadius: T.radiusLg,
                                    border: `1px solid ${T.border}`,
                                    background: T.pageBg,
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <div style={{ color: T.textPri, fontWeight: 800, fontFamily: T.fontHead }}>
                                                Shipment #{s.shipment_id}
                                            </div>
                                            <Badge val={s.status} map={T.status} dot />
                                            <Badge val={s.priority} map={T.priority} />
                                        </div>
                                        <div style={{ marginTop: 8, color: T.textSec, fontSize: 13 }}>
                                            <div><b style={{ color: T.textMuted }}>Destination:</b> {s.destination_address}</div>
                                            <div style={{ marginTop: 2 }}>
                                                <b style={{ color: T.textMuted }}>Vehicle:</b> {s.vehicle_plate || '—'} ({s.vehicle_type || '—'})
                                            </div>
                                            {s.delivery_mode === 'via_warehouse' && (
                                                <div style={{ marginTop: 2 }}>
                                                    <b style={{ color: T.textMuted }}>Transfer warehouse:</b>{' '}
                                                    {s.transfer_warehouse
                                                        ? <>{s.transfer_warehouse}{s.transfer_city ? ` — ${s.transfer_city}` : ''}</>
                                                        : <span style={{ color: T.warning }}>Not set yet — tell your manager.</span>}
                                                </div>
                                            )}
                                            {s.estimated_delivery && (
                                                <div style={{ marginTop: 2 }}>
                                                    <b style={{ color: T.textMuted }}>ETA:</b>{' '}
                                                    {new Date(s.estimated_delivery).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {next && (
                                            <>
                                                {hint && (
                                                    <div style={{
                                                        maxWidth: 220,
                                                        fontSize: 11,
                                                        lineHeight: 1.35,
                                                        color: T.textMuted,
                                                        textAlign: 'right',
                                                    }}>
                                                        {hint}
                                                    </div>
                                                )}
                                                <Btn size="sm"
                                                     onClick={() => progress(s.shipment_id, next)}>
                                                    {nextActionLabel(s, next)}
                                                </Btn>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {reqModal && (
                <Modal title={`Request maintenance — ${reqModal.plate_number || `Vehicle #${reqModal.vehicle_id}`}`}
                       onClose={() => { setReqModal(null); setReqNote(''); }}
                       width={520}>
                    <FormInput
                        label="Note (optional)"
                        value={reqNote}
                        onChange={setReqNote}
                        placeholder="Describe the issue (noise, brake problem, tire, etc.)"
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Btn onClick={submitMaintenanceRequest} fullWidth>
                            Send request
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => { setReqModal(null); setReqNote(''); }}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}


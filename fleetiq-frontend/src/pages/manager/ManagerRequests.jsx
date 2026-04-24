import { useCallback, useEffect, useState } from 'react';
import API from '../../api/axios';
import { T } from '../../styles/theme';
import Btn from '../../components/ui/Btn';
import Modal from '../../components/ui/Modal';
import FormSelect from '../../components/ui/FormSelect';
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

export default function ManagerRequests() {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [msg, setMsg] = useState(null);
    const [assignModal, setAssignModal] = useState(null); // maintenance request row
    const [availVehicles, setAvailVehicles] = useState([]);
    const [selVehicle, setSelVehicle] = useState('');
    const [note, setNote] = useState('');

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const res = await API.get('/maintenance-requests/manager');
            setRows(res.data || []);
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to load requests.', false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const openAssignReplacement = async (row) => {
        setAssignModal(row);
        setSelVehicle('');
        setNote('');
        try {
            const res = await API.get('/vehicles/available');
            setAvailVehicles(res.data || []);
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to load available vehicles.', false);
            setAvailVehicles([]);
        }
    };

    const submitReplacement = async () => {
        if (!assignModal) return;
        if (!selVehicle) {
            showMsg('Select a replacement vehicle.', false);
            return;
        }
        try {
            await API.post(`/maintenance-requests/${assignModal.request_id}/assign-replacement`, {
                replacement_vehicle_id: parseInt(selVehicle),
                note,
            });
            showMsg('Replacement assigned.');
            setAssignModal(null);
            fetchRequests();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to assign replacement.', false);
        }
    };

    const setStatus = async (requestId, status) => {
        try {
            const res = await API.patch(`/maintenance-requests/${requestId}/status`, { status });
            const updated = res.data?.request;
            if (updated?.request_id) {
                setRows(prev => prev.map(r => r.request_id === updated.request_id ? { ...r, ...updated } : r));
            } else {
                fetchRequests();
            }
            showMsg('Updated.');
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to update request.', false);
        }
    };

    const driverRequests = (rows || []).filter(r => r.source === 'driver');
    const adminRequests = (rows || []).filter(r => r.source === 'admin');
    const hasReplacementAssigned = (r) => {
        const d = String(r?.description || '');
        return d.includes('Replacement assigned:');
    };

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {msg && <Toast msg={msg} />}

            <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline',
                              justifyContent: 'space-between', gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800,
                                      color: T.textPri, fontFamily: T.fontHead }}>
                            Maintenance requests
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                            Requests assigned to you (driver + admin).
                        </div>
                    </div>
                    <button onClick={fetchRequests} style={{
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
                ) : rows.length === 0 ? (
                    <div style={{ padding: 14, color: T.textMuted }}>
                        No requests.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
                        {[
                            { title: 'Driver requests', rows: driverRequests },
                            { title: 'Admin requests', rows: adminRequests },
                        ].map(section => (
                            <div key={section.title}>
                                <div style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: T.textPri,
                                    fontFamily: T.fontHead,
                                    marginBottom: 10,
                                }}>
                                    {section.title}
                                    <span style={{
                                        marginLeft: 8,
                                        fontSize: 11,
                                        color: T.textMuted,
                                        fontWeight: 700,
                                        fontFamily: T.fontBody,
                                    }}>
                                        ({section.rows.length})
                                    </span>
                                </div>

                                {section.rows.length === 0 ? (
                                    <div style={{ padding: 12, color: T.textMuted, border: `1px dashed ${T.border}`, borderRadius: T.radiusLg }}>
                                        No {section.title.toLowerCase()}.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {section.rows.map(r => (
                                            <div key={r.request_id} style={{
                                                padding: 12,
                                                borderRadius: T.radiusLg,
                                                border: `1px solid ${T.border}`,
                                                background: T.pageBg,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                gap: 12,
                                            }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ color: T.textPri, fontWeight: 800, fontFamily: T.fontHead }}>
                                                        {r.title || `Request #${r.request_id}`}
                                                    </div>
                                                    <div style={{ marginTop: 6, color: T.textSec, fontSize: 13 }}>
                                                        <div>
                                                            Vehicle: <b>{r.plate_number || `#${r.vehicle_id}`}</b>
                                                            {r.warehouse_name ? <> · Warehouse: <b>{r.warehouse_name}</b></> : null}
                                                        </div>
                                                        <div style={{ marginTop: 4 }}>
                                                            {r.source === 'driver' ? (
                                                                <>
                                                                    Requested by driver:{' '}
                                                                    <b>{r.requested_by_name || `user #${r.requested_by}`}</b>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Requested by:{' '}
                                                                    <b>{r.requested_by_name || `user #${r.requested_by}`}</b>
                                                                </>
                                                            )}
                                                            {r.shipment_id != null && r.shipment_id !== '' ? (
                                                                <>
                                                                    {' '}
                                                                    · Shipment: <b>#{r.shipment_id}</b>
                                                                </>
                                                            ) : null}
                                                        </div>
                                                        {r.description ? (
                                                            <div style={{ marginTop: 4 }}>{r.description}</div>
                                                        ) : null}
                                                    </div>
                                                    <div style={{ marginTop: 6, color: T.textMuted, fontSize: 12 }}>
                                                        {new Date(r.created_at).toLocaleString()} · Status: {r.status} · Priority: {r.priority}
                                                    </div>
                                                </div>

                                                <div style={{ flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    {!['resolved', 'cancelled'].includes(r.status) && (
                                                        <>
                                                            {r.status !== 'in_progress' && (
                                                                <Btn size="sm" variant="secondary"
                                                                     onClick={() => setStatus(r.request_id, 'in_progress')}>
                                                                    Start
                                                                </Btn>
                                                            )}
                                                            <Btn size="sm" variant="secondary"
                                                                 onClick={() => setStatus(r.request_id, 'resolved')}>
                                                                Resolve
                                                            </Btn>
                                                            <Btn size="sm" variant="secondary"
                                                                 onClick={() => setStatus(r.request_id, 'cancelled')}>
                                                                Cancel
                                                            </Btn>
                                                        </>
                                                    )}
                                                    {r.source === 'driver' && r.shipment_id && !hasReplacementAssigned(r) ? (
                                                        <Btn size="sm" onClick={() => openAssignReplacement(r)}>
                                                            Assign replacement (required)
                                                        </Btn>
                                                    ) : null}
                                                    {r.source === 'driver' && r.shipment_id && hasReplacementAssigned(r) ? (
                                                        <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 700 }}>
                                                            Assigned replacement vehicle
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {assignModal && (
                <Modal title="Assign replacement vehicle"
                       onClose={() => setAssignModal(null)}
                       width={520}>
                    <div style={{
                        marginBottom: 14,
                        padding: '10px 12px',
                        borderRadius: T.radius,
                        border: `1px solid ${T.border}`,
                        background: T.pageBg,
                        fontSize: 13,
                        color: T.textSec,
                    }}>
                        {assignModal.source === 'driver' ? (
                            <div>
                                Driver: <b>{assignModal.requested_by_name || `user #${assignModal.requested_by}`}</b>
                            </div>
                        ) : null}
                        {assignModal.shipment_id != null && assignModal.shipment_id !== '' ? (
                            <div style={{ marginTop: assignModal.source === 'driver' ? 4 : 0 }}>
                                Shipment: <b>#{assignModal.shipment_id}</b>
                            </div>
                        ) : null}
                    </div>
                    <FormSelect
                        label="Replacement vehicle"
                        value={selVehicle}
                        onChange={setSelVehicle}
                        required
                        placeholder="— select available vehicle —"
                        options={availVehicles.map(v => ({
                            value: v.vehicle_id,
                            label: `${v.plate_number} — ${v.vehicle_type} (${v.capacity_kg}kg)`,
                        }))}
                    />
                    <FormInput
                        label="Note (optional)"
                        value={note}
                        onChange={setNote}
                        placeholder="Any dispatch note…"
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Btn onClick={submitReplacement} fullWidth>
                            Assign
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setAssignModal(null)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}


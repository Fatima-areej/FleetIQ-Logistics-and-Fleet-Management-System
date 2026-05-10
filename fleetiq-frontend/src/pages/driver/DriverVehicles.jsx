import { useCallback, useEffect, useState } from 'react';
import API from '../../api/axios';
import { T } from '../../styles/theme';
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

export default function DriverVehicles() {
    const [loading, setLoading] = useState(true);
    const [vehicles, setVehicles] = useState([]);
    const [activeReqByVehicle, setActiveReqByVehicle] = useState({});
    const [msg, setMsg] = useState(null);
    const [reqModal, setReqModal] = useState(null); // vehicle object
    const [reqNote, setReqNote] = useState('');
    const [locatingId, setLocatingId] = useState(null);

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    const fetchVehicles = useCallback(async () => {
        try {
            setLoading(true);
            const [vehRes, reqRes] = await Promise.all([
                API.get('/drivers/me/vehicles'),
                API.get('/maintenance-requests/driver'),
            ]);
            setVehicles(vehRes.data.vehicles || []);
            const map = {};
            for (const r of (reqRes.data || [])) {
                if (r?.vehicle_id && !map[r.vehicle_id]) map[r.vehicle_id] = r;
            }
            setActiveReqByVehicle(map);
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to load vehicles.', false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

    const shareLocation = (vehicleId) => {
        if (!navigator.geolocation) {
            showMsg('Geolocation is not supported by your browser.', false);
            return;
        }
        setLocatingId(vehicleId);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    await API.patch(`/vehicles/${vehicleId}/location`, {
                        latitude:  pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    });
                    showMsg('Location shared successfully.');
                } catch (err) {
                    showMsg(err.response?.data?.error || 'Failed to share location.', false);
                } finally {
                    setLocatingId(null);
                }
            },
            () => {
                showMsg('Could not get your location. Check browser permissions.', false);
                setLocatingId(null);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
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
            fetchVehicles();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to send request.', false);
        }
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
                            Assigned vehicles
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                            Request maintenance for a vehicle you are currently assigned to.
                        </div>
                    </div>
                    <button onClick={fetchVehicles} style={{
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
                        {[...Array(3)].map((_, i) => (
                            <SkeletonCard key={i} height={60} />
                        ))}
                    </div>
                ) : vehicles.length === 0 ? (
                    <div style={{ padding: 14, color: T.textMuted }}>
                        No vehicle assigned right now.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                        {vehicles.map(v => (
                            <div key={v.vehicle_id} style={{
                                padding: 12,
                                borderRadius: T.radiusLg,
                                border: `1px solid ${T.border}`,
                                background: T.pageBg,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                            }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color: T.textPri, fontWeight: 800, fontFamily: T.fontHead }}>
                                        {v.plate_number}
                                    </div>
                                    <div style={{ marginTop: 4, color: T.textSec, fontSize: 13 }}>
                                        {v.vehicle_type} · {v.vehicle_status}
                                    </div>
                                </div>
                                <div style={{ flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button
                                        onClick={() => shareLocation(v.vehicle_id)}
                                        disabled={locatingId === v.vehicle_id}
                                        title="Share your current GPS location for this vehicle"
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: 12, fontWeight: 600,
                                            borderRadius: T.radiusSm,
                                            border: `1px solid #0284C740`,
                                            background: locatingId === v.vehicle_id ? T.inputBg : '#0284C710',
                                            color: locatingId === v.vehicle_id ? T.textMuted : '#0284C7',
                                            cursor: locatingId === v.vehicle_id ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s',
                                            display: 'flex', alignItems: 'center', gap: 5,
                                        }}>
                                        {locatingId === v.vehicle_id ? '...' : '📍'} Share location
                                    </button>
                                    {activeReqByVehicle[v.vehicle_id] ? (
                                        <div style={{
                                            fontSize: 12,
                                            color: T.textMuted,
                                            fontWeight: 700,
                                        }}>
                                            Requested for maintenance
                                        </div>
                                    ) : (
                                        <Btn size="sm" variant="secondary"
                                             onClick={() => { setReqModal(v); setReqNote(''); }}>
                                            Request maintenance
                                        </Btn>
                                    )}
                                </div>
                            </div>
                        ))}
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


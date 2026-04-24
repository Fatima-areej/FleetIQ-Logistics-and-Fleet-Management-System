import { useCallback, useEffect, useState } from 'react';
import { T } from '../../styles/theme';
import API from '../../api/axios';
import Drawer from '../../components/ui/Drawer';
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

function Kpi({ label, value, color = T.textPri }) {
    return (
        <Card style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 11, color: T.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em', fontWeight: 600 }}>
                {label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800,
                          color, fontFamily: T.fontHead, marginTop: 4 }}>
                {value}
            </div>
        </Card>
    );
}

export default function ManagerWarehouses() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drawer, setDrawer] = useState(null);
    const [drawerLoad, setDrawerLoad] = useState(false);
    const [drawerData, setDrawerData] = useState(null);

    const fetchMine = useCallback(async () => {
        try {
            setLoading(true);
            const res = await API.get('/warehouses/my');
            setWarehouses(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMine(); }, [fetchMine]);

    const openDrawer = async (w) => {
        setDrawer(w);
        setDrawerLoad(true);
        setDrawerData(null);
        try {
            const res = await API.get(`/warehouses/${w.warehouse_id}`);
            setDrawerData(res.data);
        } catch {
            setDrawerData(null);
        } finally {
            setDrawerLoad(false);
        }
    };

    const avgLoad = warehouses.length > 0
        ? Math.round(warehouses.reduce((s, w) =>
            s + parseFloat(w.load_percentage || 0), 0) / warehouses.length)
        : 0;

    const critical = warehouses.filter(w =>
        parseFloat(w.load_percentage || 0) > 80).length;

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12, marginBottom: '1.5rem',
            }}>
                <Kpi label="Assigned warehouses"
                     value={warehouses.length}
                     color={T.textPri} />
                <Kpi label="Avg load"
                     value={`${avgLoad}%`}
                     color={avgLoad > 70 ? T.danger : avgLoad > 40 ? T.warning : T.success} />
                <Kpi label="Critical (>80%)"
                     value={critical}
                     color={critical > 0 ? T.danger : T.success} />
                <Kpi label="Total capacity"
                     value={warehouses.reduce((s, w) => s + (w.capacity_units || 0), 0).toLocaleString()}
                     color={T.accent} />
            </div>

            <Card style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800,
                                      color: T.textPri, fontFamily: T.fontHead }}>
                            My Warehouses
                        </div>
                        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                            Only warehouses assigned to you.
                        </div>
                    </div>
                    <button onClick={fetchMine} style={{
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[...Array(4)].map((_, i) => (
                            <SkeletonCard key={i} height={70} />
                        ))}
                    </div>
                ) : warehouses.length === 0 ? (
                    <div style={{ padding: 14, color: T.textMuted }}>
                        No warehouses assigned yet.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr>
                                    {['Warehouse', 'City', 'Load', 'Capacity', 'Shipments handled', 'Avg dwell (hrs)', ''].map(h => (
                                        <th key={h} style={{
                                            textAlign: 'left',
                                            padding: '10px 12px',
                                            borderBottom: `1px solid ${T.border}`,
                                            color: T.textMuted,
                                            fontSize: 11,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {warehouses.map((w) => (
                                    <tr key={w.warehouse_id}>
                                        <td style={{ padding: '12px', borderBottom: `1px solid ${T.border}`, color: T.textPri }}>
                                            {w.warehouse_name}
                                        </td>
                                        <td style={{ padding: '12px', borderBottom: `1px solid ${T.border}`, color: T.textSec }}>
                                            {w.city}
                                        </td>
                                        <td style={{ padding: '12px', borderBottom: `1px solid ${T.border}` }}>
                                            <span style={{
                                                padding: '2px 10px',
                                                borderRadius: 999,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                background:
                                                    parseFloat(w.load_percentage || 0) > 80 ? T.dangerLight
                                                  : parseFloat(w.load_percentage || 0) > 50 ? T.warningLight
                                                  : T.successLight,
                                                color:
                                                    parseFloat(w.load_percentage || 0) > 80 ? T.danger
                                                  : parseFloat(w.load_percentage || 0) > 50 ? T.warning
                                                  : T.success,
                                                border: `1px solid ${T.border}`,
                                            }}>
                                                {w.load_percentage}%
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', borderBottom: `1px solid ${T.border}`, color: T.textSec }}>
                                            {w.current_load} / {w.capacity_units}
                                        </td>
                                        <td style={{ padding: '12px', borderBottom: `1px solid ${T.border}`, color: T.textSec }}>
                                            {(w.total_shipments_handled || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px', borderBottom: `1px solid ${T.border}`, color: T.textSec }}>
                                            {w.avg_dwell_hours ?? '—'}
                                        </td>
                                        <td style={{ padding: '12px', borderBottom: `1px solid ${T.border}` }}>
                                            <button onClick={() => openDrawer(w)} style={{
                                                border: `1px solid ${T.border}`,
                                                background: 'transparent',
                                                color: T.textPri,
                                                borderRadius: T.radiusSm,
                                                padding: '6px 10px',
                                                cursor: 'pointer',
                                                fontSize: 12,
                                            }}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {drawer && (
                <Drawer title={drawer.warehouse_name}
                        onClose={() => setDrawer(null)}>
                    {drawerLoad ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[...Array(4)].map((_, i) => (
                                <SkeletonCard key={i} height={60} />
                            ))}
                        </div>
                    ) : drawerData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ color: T.textPri, fontWeight: 800, fontSize: 14 }}>
                                Details
                            </div>
                            <div style={{ color: T.textSec, fontSize: 13 }}>
                                <div><b style={{ color: T.textMuted }}>Address:</b> {drawerData.warehouse?.address}</div>
                                <div><b style={{ color: T.textMuted }}>Capacity:</b> {drawerData.warehouse?.capacity_units}</div>
                                <div><b style={{ color: T.textMuted }}>Current load:</b> {drawerData.warehouse?.current_load}</div>
                            </div>
                            <div style={{ marginTop: 10, color: T.textPri, fontWeight: 800, fontSize: 14 }}>
                                Active shipments
                            </div>
                            {drawerData.shipments?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {drawerData.shipments.map(s => (
                                        <div key={s.shipment_id} style={{
                                            padding: 10,
                                            border: `1px solid ${T.border}`,
                                            borderRadius: T.radius,
                                            background: T.inputBg,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                        }}>
                                            <div style={{ color: T.textSec, fontSize: 13 }}>
                                                <div style={{ color: T.textPri, fontWeight: 700 }}>
                                                    Shipment #{s.shipment_id}
                                                </div>
                                                <div style={{ marginTop: 2 }}>
                                                    {s.destination_address}
                                                </div>
                                            </div>
                                            <div style={{ color: T.textMuted, fontSize: 12, textAlign: 'right' }}>
                                                <div>{s.status}</div>
                                                <div style={{ marginTop: 2 }}>{s.driver_name || 'Unassigned'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ color: T.textMuted }}>No active shipments.</div>
                            )}
                        </div>
                    ) : (
                        <div style={{ color: T.textMuted }}>
                            Failed to load warehouse details.
                        </div>
                    )}
                </Drawer>
            )}
        </div>
    );
}


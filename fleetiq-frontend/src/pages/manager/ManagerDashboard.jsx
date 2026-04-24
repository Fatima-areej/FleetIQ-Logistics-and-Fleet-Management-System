import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { T } from '../../styles/theme';
import API from '../../api/axios';
import Btn from '../../components/ui/Btn';
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

function KpiCard({ label, value, sub, accent }) {
    return (
        <Card style={{ padding: '1rem 1.25rem' }}>
            <div style={{
                fontSize: 11,
                color: T.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600,
            }}>
                {label}
            </div>
            <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: accent || T.textPri,
                fontFamily: T.fontHead,
                marginTop: 6,
                lineHeight: 1,
            }}>
                {value}
            </div>
            {sub ? (
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>{sub}</div>
            ) : null}
        </Card>
    );
}

function loadBarColor(pct) {
    if (pct >= 85) return T.danger;
    if (pct >= 55) return T.warning;
    return T.success;
}

export default function ManagerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setErr('');
            const res = await API.get('/analytics/manager-dashboard');
            setData(res.data);
        } catch (e) {
            setErr(e.response?.data?.error || 'Could not load dashboard.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const totals = data?.totals || {};
    const warehouses = data?.warehouses || [];
    const statusRows = data?.statusBreakdown || [];
    const delayed = data?.recentDelayed || [];
    const maintOpen = data?.maintenanceOpen ?? 0;
    const byPri = data?.activeByPriority || [];

    const statusTotal = statusRows.reduce((s, r) => s + (Number(r.count) || 0), 0);

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: '1.25rem',
            }}>
                <div>
                    <h1 style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 800,
                        color: T.textPri,
                        fontFamily: T.fontHead,
                    }}>
                        Operations overview
                    </h1>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: T.textMuted, maxWidth: 560 }}>
                        Live metrics for <b style={{ color: T.textSec }}>your assigned warehouses</b> only
                        {user?.name ? <> — {user.name}</> : null}.
                    </p>
                </div>
                <Btn variant="secondary" size="sm" onClick={load}>Refresh</Btn>
            </div>

            {err && (
                <Card style={{ padding: 14, marginBottom: 16, borderColor: `${T.danger}40`, background: T.dangerLight }}>
                    <span style={{ color: T.danger, fontSize: 13 }}>{err}</span>
                </Card>
            )}

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} height={100} />)}
                </div>
            ) : (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 12,
                        marginBottom: '1.25rem',
                    }}>
                        <KpiCard
                            label="Your warehouses"
                            value={totals.warehouse_count ?? 0}
                            sub="Sites you supervise"
                            accent={T.accent}
                        />
                        <KpiCard
                            label="Active shipments"
                            value={totals.active_shipments ?? 0}
                            sub="Originating at your sites"
                            accent={T.info}
                        />
                        <KpiCard
                            label="Delayed now"
                            value={totals.delayed_shipments ?? 0}
                            sub="Past ETA, not delivered"
                            accent={(totals.delayed_shipments || 0) > 0 ? T.danger : T.success}
                        />
                        <KpiCard
                            label="Open maintenance"
                            value={maintOpen}
                            sub="Needs your attention"
                            accent={maintOpen > 0 ? T.warning : T.textPri}
                        />
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: 16,
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <Card style={{ padding: '1.1rem 1.25rem' }}>
                                <div style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: T.textPri,
                                    fontFamily: T.fontHead,
                                    marginBottom: 4,
                                }}>
                                    Warehouse load
                                </div>
                                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>
                                    Capacity usage for each assigned site
                                </div>
                                {warehouses.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>
                                        No warehouses assigned yet. Ask your admin to assign you in Team → Warehouses.
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        {warehouses.map(w => {
                                            const pct = Math.min(100, Math.round(parseFloat(w.load_percentage) || 0));
                                            const c = loadBarColor(pct);
                                            return (
                                                <div key={w.warehouse_id}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: 12,
                                                        marginBottom: 6,
                                                    }}>
                                                        <span style={{ color: T.textPri, fontWeight: 600 }}>
                                                            {w.warehouse_name}
                                                            <span style={{ color: T.textMuted, fontWeight: 500 }}>
                                                                {' '}· {w.city}
                                                            </span>
                                                        </span>
                                                        <span style={{ color: c, fontWeight: 700 }}>{pct}%</span>
                                                    </div>
                                                    <div style={{
                                                        height: 8,
                                                        borderRadius: 999,
                                                        background: T.inputBg,
                                                        overflow: 'hidden',
                                                    }}>
                                                        <div style={{
                                                            width: `${pct}%`,
                                                            height: '100%',
                                                            borderRadius: 999,
                                                            background: `linear-gradient(90deg, ${c}88, ${c})`,
                                                            transition: 'width 0.4s ease',
                                                        }} />
                                                    </div>
                                                    <div style={{
                                                        fontSize: 11,
                                                        color: T.textMuted,
                                                        marginTop: 4,
                                                    }}>
                                                        {w.current_load ?? 0} / {w.capacity_units ?? '—'} units
                                                        {w.total_shipments_handled != null
                                                            ? <> · {w.total_shipments_handled} shipments handled</>
                                                            : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>

                            <Card style={{ padding: '1.1rem 1.25rem' }}>
                                <div style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: T.textPri,
                                    fontFamily: T.fontHead,
                                    marginBottom: 4,
                                }}>
                                    Shipment status mix
                                </div>
                                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
                                    All shipments with origin at your warehouses ({statusTotal} total)
                                </div>
                                {statusTotal === 0 ? (
                                    <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>No shipment history yet for these sites.</p>
                                ) : (
                                    <>
                                        <div style={{
                                            display: 'flex',
                                            height: 12,
                                            borderRadius: 6,
                                            overflow: 'hidden',
                                            marginBottom: 12,
                                        }}>
                                            {statusRows.map(r => {
                                                const meta = T.status[r.status] || { color: T.textMuted, bg: T.inputBg };
                                                const w = `${(Number(r.count) / statusTotal) * 100}%`;
                                                return (
                                                    <div
                                                        key={r.status}
                                                        title={`${r.status}: ${r.count}`}
                                                        style={{
                                                            width: w,
                                                            background: meta.bg,
                                                            borderRight: '1px solid rgba(0,0,0,0.2)',
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {statusRows.map(r => {
                                                const meta = T.status[r.status] || { color: T.textMuted, label: r.status };
                                                return (
                                                    <span
                                                        key={r.status}
                                                        style={{
                                                            fontSize: 11,
                                                            padding: '4px 10px',
                                                            borderRadius: 999,
                                                            background: meta.bg || T.inputBg,
                                                            color: meta.color || T.textSec,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {meta.label || r.status}: {r.count}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </Card>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <Card style={{ padding: '1.1rem 1.25rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 10,
                                }}>
                                    <div>
                                        <div style={{
                                            fontSize: 13,
                                            fontWeight: 800,
                                            color: T.textPri,
                                            fontFamily: T.fontHead,
                                        }}>
                                            Delayed shipments
                                        </div>
                                        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                                            Oldest overdue first
                                        </div>
                                    </div>
                                    <Btn size="sm" variant="secondary" onClick={() => navigate('/manager/shipments')}>
                                        Open shipments
                                    </Btn>
                                </div>
                                {delayed.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: 13, color: T.success }}>No delayed shipments right now.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {delayed.map(d => (
                                            <div
                                                key={d.shipment_id}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: T.radius,
                                                    border: `1px solid ${T.border}`,
                                                    background: T.pageBg,
                                                }}
                                            >
                                                <div style={{ fontSize: 12, fontWeight: 700, color: T.textPri }}>
                                                    #{d.shipment_id}
                                                    <span style={{ color: T.textMuted, fontWeight: 500 }}>
                                                        {' '}· {d.origin_warehouse}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 11, color: T.danger, marginTop: 4 }}>
                                                    {d.hours_overdue != null
                                                        ? `${Number(d.hours_overdue).toFixed(1)} h overdue`
                                                        : 'Overdue'}
                                                </div>
                                                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                                                    {d.driver_name || 'Unassigned'} · {d.priority}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>

                            <Card style={{ padding: '1.1rem 1.25rem' }}>
                                <div style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: T.textPri,
                                    fontFamily: T.fontHead,
                                    marginBottom: 10,
                                }}>
                                    Active by priority
                                </div>
                                {byPri.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>No active shipments at your sites.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {byPri.map(p => {
                                            const pr = T.priority[p.priority] || { color: T.textSec, bg: T.inputBg };
                                            return (
                                                <div
                                                    key={p.priority}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '8px 10px',
                                                        borderRadius: T.radiusSm,
                                                        background: T.pageBg,
                                                    }}
                                                >
                                                    <span style={{
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        textTransform: 'capitalize',
                                                        color: pr.color,
                                                    }}>
                                                        {p.priority}
                                                    </span>
                                                    <span style={{ fontSize: 14, fontWeight: 800, color: T.textPri }}>
                                                        {p.count}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>

                            <Card style={{ padding: '1.1rem 1.25rem' }}>
                                <div style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color: T.textPri,
                                    fontFamily: T.fontHead,
                                    marginBottom: 10,
                                }}>
                                    Today
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: T.accent, fontFamily: T.fontHead }}>
                                    {totals.shipments_today ?? 0}
                                </div>
                                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
                                    New shipments created today (your origins)
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                                    <Btn size="sm" onClick={() => navigate('/manager/requests')}>
                                        Maintenance ({maintOpen})
                                    </Btn>
                                    <Btn size="sm" variant="secondary" onClick={() => navigate('/manager/warehouses')}>
                                        Warehouse detail
                                    </Btn>
                                </div>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

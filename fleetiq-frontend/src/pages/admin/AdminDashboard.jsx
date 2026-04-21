import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    Tooltip, ResponsiveContainer, PieChart, Pie,
    Cell, Legend
} from 'recharts';
import { T } from '../../styles/theme';
import KpiCard from '../../components/ui/KpiCard';
import CustomTooltip from '../../components/charts/CustomTooltip';
import { SkeletonCard } from '../../components/ui/Skeleton';
import API from '../../api/axios';

const PIE_COLORS = [
    T.accent, T.success, T.warning,
    T.danger, '#7C3AED', '#0284C7'
];

function SectionHeader({ title, sub, action }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-end', marginBottom: '1rem' }}>
            <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700,
                             color: T.textPri, fontFamily: T.fontHead }}>
                    {title}
                </h2>
                {sub && <p style={{ margin: '2px 0 0', fontSize: 12,
                                    color: T.textMuted }}>{sub}</p>}
            </div>
            {action}
        </div>
    );
}

function Card({ children, style = {} }) {
    return (
        <div style={{
            background:   T.cardBg,
            border:       `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            padding:      '1.25rem',
            boxShadow:    T.shadow,
            ...style,
        }}>
            {children}
        </div>
    );
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [data,    setData]    = useState(null);
    const [monthly, setMonthly] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [dashRes, monthRes] = await Promise.all([
                    API.get('/analytics/dashboard'),
                    API.get('/analytics/monthly'),
                ]);
                setData(dashRes.data);
                setMonthly(monthRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) return (
        <div>
            <div style={{ display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                          gap: 14, marginBottom: '1.5rem' }}>
                {[...Array(6)].map((_, i) => (
                    <SkeletonCard key={i} height={100} />
                ))}
            </div>
            <div style={{ display: 'grid',
                          gridTemplateColumns: '2fr 1fr',
                          gap: 16 }}>
                <SkeletonCard height={280} />
                <SkeletonCard height={280} />
            </div>
        </div>
    );

    const t = data?.totals || {};

    // fleet utilization %
    const totalVehicles = (data?.fleetStatus || [])
        .reduce((sum, f) => sum + parseInt(f.count), 0);
    const inUse = (data?.fleetStatus || [])
        .find(f => f.status === 'in_use');
    const utilizationPct = totalVehicles > 0
        ? Math.round((parseInt(inUse?.count || 0) / totalVehicles) * 100)
        : 0;

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>

            {/* ── KPI CARDS ── */}
            <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 12px', fontSize: 11,
                            fontWeight: 600, color: T.textMuted,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase' }}>
                    Today's overview
                </p>
                <div style={{
                    display:             'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap:                 14,
                }}>
                    <KpiCard
                        label="Active Shipments"
                        value={t.active_shipments || 0}
                        icon="🚚"
                        accent={T.accent}
                        sub="currently in progress"
                        onClick={() => navigate('/admin/shipments')}
                    />
                    <KpiCard
                        label="Delivered Total"
                        value={t.total_delivered || 0}
                        icon="✅"
                        accent={T.success}
                        sub="all time"
                        onClick={() => navigate('/admin/shipments')}
                    />
                    <KpiCard
                        label="Delayed"
                        value={t.delayed_count || 0}
                        icon="⚠️"
                        accent={T.danger}
                        sub="needs attention"
                        onClick={() => navigate('/admin/shipments')}
                    />
                    <KpiCard
                        label="Today's Shipments"
                        value={t.shipments_today || 0}
                        icon="📅"
                        accent="#7C3AED"
                        sub="created today"
                    />
                    <KpiCard
                        label="Avg Delivery"
                        value={t.avg_delivery_hours || 0}
                        icon="⏱"
                        accent={T.warning}
                        sub="hours per delivery"
                    />
                    <KpiCard
                        label="Fleet Utilization"
                        value={`${utilizationPct}%`}
                        icon="🚛"
                        accent={T.info}
                        sub={`${inUse?.count || 0} of ${totalVehicles} vehicles`}
                        onClick={() => navigate('/admin/fleet')}
                    />
                </div>
            </div>

            {/* ── CHARTS ROW ── */}
            <div style={{
                display:             'grid',
                gridTemplateColumns: '2fr 1fr',
                gap:                 16,
                marginBottom:        '1.5rem',
            }}>
                {/* area chart */}
                <Card>
                    <SectionHeader
                        title="Shipment trends"
                        sub="Delivered vs cancelled over last 6 months"
                    />
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={monthly}
                            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gDeliv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={T.success} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={T.success} stopOpacity={0}    />
                                </linearGradient>
                                <linearGradient id="gCancel" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={T.danger} stopOpacity={0.12} />
                                    <stop offset="95%" stopColor={T.danger} stopOpacity={0}    />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="month"
                                tick={{ fill: T.textMuted, fontSize: 11 }}
                                axisLine={false} tickLine={false} />
                            <YAxis
                                tick={{ fill: T.textMuted, fontSize: 11 }}
                                axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="delivered"
                                stroke={T.success} fill="url(#gDeliv)"
                                strokeWidth={2} name="Delivered" />
                            <Area type="monotone" dataKey="cancelled"
                                stroke={T.danger} fill="url(#gCancel)"
                                strokeWidth={2} name="Cancelled" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>

                {/* status pie */}
                <Card>
                    <SectionHeader
                        title="Status breakdown"
                        sub="All shipments by current status"
                    />
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={data?.statusBreakdown || []}
                                dataKey="count"
                                nameKey="status"
                                cx="50%" cy="50%"
                                innerRadius={52}
                                outerRadius={80}
                                paddingAngle={3}
                            >
                                {(data?.statusBreakdown || []).map((_, i) => (
                                    <Cell key={i}
                                        fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{
                                    fontSize: 11,
                                    color: T.textSec,
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* ── BOTTOM ROW ── */}
            <div style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap:                 16,
            }}>
                {/* top drivers */}
                <Card>
                    <SectionHeader
                        title="Top drivers"
                        sub="By deliveries completed"
                        action={
                            <button onClick={() => navigate('/admin/drivers')}
                                style={{ fontSize: 12, color: T.accent,
                                         background: 'none', border: 'none',
                                         cursor: 'pointer', fontWeight: 500 }}>
                                View all →
                            </button>
                        }
                    />
                    <div>
                        {(data?.topDrivers || []).length === 0 ? (
                            <p style={{ color: T.textMuted, fontSize: 13,
                                        textAlign: 'center', padding: '1rem 0' }}>
                                No data yet
                            </p>
                        ) : (
                            (data?.topDrivers || []).map((d, i) => (
                                <div key={i} style={{
                                    display:       'flex',
                                    alignItems:    'center',
                                    gap:           10,
                                    padding:       '8px 0',
                                    borderBottom:  i < data.topDrivers.length - 1
                                        ? `1px solid ${T.border}` : 'none',
                                }}>
                                    <div style={{
                                        width:          28, height:     28,
                                        borderRadius:   '50%',
                                        background:     T.accentLight,
                                        color:          T.accent,
                                        display:        'flex',
                                        alignItems:     'center',
                                        justifyContent: 'center',
                                        fontSize:       11,
                                        fontWeight:     700,
                                        flexShrink:     0,
                                    }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500,
                                                      color: T.textPri,
                                                      whiteSpace: 'nowrap',
                                                      overflow: 'hidden',
                                                      textOverflow: 'ellipsis' }}>
                                            {d.driver_name}
                                        </div>
                                        <div style={{ fontSize: 11,
                                                      color: T.textMuted }}>
                                            {d.completed_deliveries} deliveries
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize:   12,
                                        fontWeight: 700,
                                        color:      d.rating >= 4.5 ? T.success
                                                  : d.rating >= 3.5 ? T.warning
                                                  : T.danger,
                                    }}>
                                        ★ {d.rating}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* fleet status */}
                <Card>
                    <SectionHeader
                        title="Fleet status"
                        sub="Vehicle availability"
                        action={
                            <button onClick={() => navigate('/admin/fleet')}
                                style={{ fontSize: 12, color: T.accent,
                                         background: 'none', border: 'none',
                                         cursor: 'pointer', fontWeight: 500 }}>
                                Manage →
                            </button>
                        }
                    />
                    <div style={{ marginBottom: '1rem' }}>
                        {(data?.fleetStatus || []).map((f, i) => {
                            const color = f.status === 'available'   ? T.success
                                        : f.status === 'in_use'      ? T.accent
                                        : T.warning;
                            const pct = totalVehicles > 0
                                ? Math.round((parseInt(f.count) / totalVehicles) * 100)
                                : 0;
                            return (
                                <div key={i} style={{ marginBottom: 14 }}>
                                    <div style={{
                                        display:        'flex',
                                        justifyContent: 'space-between',
                                        marginBottom:   5,
                                    }}>
                                        <div style={{ display: 'flex',
                                                      alignItems: 'center',
                                                      gap: 6 }}>
                                            <span style={{
                                                width: 8, height: 8,
                                                borderRadius: '50%',
                                                background: color,
                                                display: 'inline-block',
                                            }} />
                                            <span style={{ fontSize: 12,
                                                           color: T.textSec,
                                                           textTransform: 'capitalize' }}>
                                                {f.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: 12,
                                                       fontWeight: 600,
                                                       color: T.textPri }}>
                                            {f.count} <span style={{ color: T.textMuted,
                                                                      fontWeight: 400 }}>
                                                ({pct}%)
                                            </span>
                                        </span>
                                    </div>
                                    <div style={{
                                        background:   T.pageBg,
                                        borderRadius: T.radiusFull,
                                        height:       6,
                                    }}>
                                        <div style={{
                                            width:        `${pct}%`,
                                            height:       6,
                                            borderRadius: T.radiusFull,
                                            background:   color,
                                            transition:   'width 0.6s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* warehouse bar chart */}
                    <SectionHeader
                        title="Warehouse load"
                        sub="Capacity utilization"
                    />
                    <ResponsiveContainer width="100%" height={120}>
                        <BarChart
                            data={data?.warehouseLoads || []}
                            margin={{ top: 0, right: 0, left: -28, bottom: 0 }}
                        >
                            <XAxis dataKey="warehouse_name"
                                tick={{ fill: T.textMuted, fontSize: 9 }}
                                axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]}
                                tick={{ fill: T.textMuted, fontSize: 10 }}
                                axisLine={false} tickLine={false}
                                tickFormatter={v => `${v}%`} />
                            <Tooltip content={<CustomTooltip />}
                                formatter={(v) => [`${v}%`, 'Load']} />
                            <Bar dataKey="load_percentage"
                                radius={[4, 4, 0, 0]}
                                name="Load %">
                                {(data?.warehouseLoads || []).map((w, i) => (
                                    <Cell key={i}
                                        fill={
                                            parseFloat(w.load_percentage) > 80 ? T.danger
                                          : parseFloat(w.load_percentage) > 50 ? T.warning
                                          : T.success
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* delayed alerts */}
                <Card style={{
                    borderColor: (data?.recentDelayed?.length > 0)
                        ? T.danger + '30' : T.border,
                }}>
                    <SectionHeader
                        title="Delayed shipments"
                        sub={`${data?.recentDelayed?.length || 0} need attention`}
                        action={
                            <button onClick={() => navigate('/admin/shipments')}
                                style={{ fontSize: 12, color: T.accent,
                                         background: 'none', border: 'none',
                                         cursor: 'pointer', fontWeight: 500 }}>
                                View all →
                            </button>
                        }
                    />

                    {(data?.recentDelayed || []).length === 0 ? (
                        <div style={{ textAlign: 'center',
                                      padding: '1.5rem 0' }}>
                            <div style={{ fontSize: 28,
                                          marginBottom: 8 }}>✅</div>
                            <p style={{ color: T.textMuted,
                                        fontSize: 13, margin: 0 }}>
                                No delayed shipments
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex',
                                      flexDirection: 'column',
                                      gap: 8 }}>
                            {(data?.recentDelayed || []).map((s, i) => (
                                <div key={i} style={{
                                    padding:      '10px 12px',
                                    background:   T.dangerLight,
                                    borderRadius: T.radius,
                                    borderLeft:   `3px solid ${T.danger}`,
                                }}>
                                    <div style={{
                                        display:        'flex',
                                        justifyContent: 'space-between',
                                        alignItems:     'center',
                                        marginBottom:   4,
                                    }}>
                                        <span style={{ fontSize: 12,
                                                       fontWeight: 700,
                                                       color: T.textPri }}>
                                            #{s.shipment_id}
                                        </span>
                                        <span style={{ fontSize: 11,
                                                       fontWeight: 600,
                                                       color: T.danger }}>
                                            {s.hours_overdue}h overdue
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11,
                                                  color: T.textSec }}>
                                        {s.driver_name || 'Unassigned'} •{' '}
                                        <span style={{
                                            textTransform: 'capitalize',
                                            fontWeight: 500,
                                            color: s.priority === 'urgent'
                                                ? T.danger : T.warning,
                                        }}>
                                            {s.priority}
                                        </span>
                                    </div>
                                    {s.destination_address && (
                                        <div style={{ fontSize: 11,
                                                      color: T.textMuted,
                                                      marginTop: 2,
                                                      whiteSpace: 'nowrap',
                                                      overflow: 'hidden',
                                                      textOverflow: 'ellipsis' }}>
                                            → {s.destination_address}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
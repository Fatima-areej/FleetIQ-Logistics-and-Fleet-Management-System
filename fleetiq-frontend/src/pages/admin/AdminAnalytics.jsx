import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { T } from '../../styles/theme';
import API from '../../api/axios';
import CustomTooltip from '../../components/charts/CustomTooltip';
import { SkeletonCard } from '../../components/ui/Skeleton';

const PIE_COLORS = [T.accent, T.success, T.warning, T.danger, '#7C3AED', '#0284C7'];

function Card({ children, style = {} }) {
    return (
        <div style={{
            background: T.cardBg, border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg, padding: '1.25rem',
            boxShadow: T.shadow, ...style,
        }}>
            {children}
        </div>
    );
}

function ChartTitle({ title, sub }) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 14, fontWeight: 700,
                          color: T.textPri, fontFamily: T.fontHead }}>
                {title}
            </div>
            {sub && <div style={{ fontSize: 11, color: T.textMuted,
                                  marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

export default function AdminAnalytics() {
    const [monthly,      setMonthly]      = useState([]);
    const [driverData,   setDriverData]   = useState(null);
    const [fleetData,    setFleetData]    = useState(null);
    const [warehouseData,setWarehouseData]= useState([]);
    const [loading,      setLoading]      = useState(true);
    const [activeTab,    setActiveTab]    = useState('operations');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [monthRes, drvRes, fleetRes, whRes] = await Promise.all([
                    API.get('/analytics/monthly'),
                    API.get('/analytics/drivers'),
                    API.get('/analytics/fleet'),
                    API.get('/analytics/warehouses'),
                ]);
                setMonthly(monthRes.data);
                setDriverData(drvRes.data);
                setFleetData(fleetRes.data);
                setWarehouseData(whRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const TABS = [
        { id: 'operations', label: 'Operations'  },
        { id: 'drivers',    label: 'Drivers'      },
        { id: 'fleet',      label: 'Fleet'        },
        { id: 'warehouses', label: 'Warehouses'   },
    ];

    if (loading) return (
        <div style={{ display: 'grid',
                      gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} height={280} />
            ))}
        </div>
    );

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>

            {/* tab bar */}
            <div style={{
                display: 'flex', gap: 4, marginBottom: '1.5rem',
                background: T.cardBg,
                border: `1px solid ${T.border}`,
                borderRadius: T.radius, padding: 4,
                width: 'fit-content',
            }}>
                {TABS.map(tab => (
                    <button key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '7px 18px', fontSize: 13,
                            borderRadius: T.radiusSm, cursor: 'pointer',
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            background: activeTab === tab.id
                                ? T.accent : 'transparent',
                            color: activeTab === tab.id ? '#fff' : T.textSec,
                            border: 'none', transition: 'all 0.15s',
                            fontFamily: T.fontBody,
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── OPERATIONS TAB ── */}
            {activeTab === 'operations' && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'grid',
                                  gridTemplateColumns: '2fr 1fr',
                                  gap: 16, marginBottom: 16 }}>
                        <Card>
                            <ChartTitle
                                title="Monthly shipment volume"
                                sub="Delivered vs cancelled over last 6 months"
                            />
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={monthly}
                                    margin={{ left: -20, right: 4 }}>
                                    <defs>
                                        <linearGradient id="gD" x1="0" y1="0"
                                                        x2="0" y2="1">
                                            <stop offset="5%"
                                                stopColor={T.success}
                                                stopOpacity={0.15} />
                                            <stop offset="95%"
                                                stopColor={T.success}
                                                stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month"
                                        tick={{ fill: T.textMuted, fontSize: 11 }}
                                        axisLine={false} tickLine={false} />
                                    <YAxis
                                        tick={{ fill: T.textMuted, fontSize: 11 }}
                                        axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Area type="monotone" dataKey="delivered"
                                        stroke={T.success} fill="url(#gD)"
                                        strokeWidth={2} name="Delivered" />
                                    <Line type="monotone" dataKey="cancelled"
                                        stroke={T.danger} strokeWidth={2}
                                        dot={false} name="Cancelled" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <ChartTitle
                                title="Delivery success rate"
                                sub="Breakdown by outcome"
                            />
                            {(() => {
                                const total = monthly.reduce(
                                    (s, m) => s + parseInt(m.total || 0), 0
                                );
                                const delivered = monthly.reduce(
                                    (s, m) => s + parseInt(m.delivered || 0), 0
                                );
                                const cancelled = monthly.reduce(
                                    (s, m) => s + parseInt(m.cancelled || 0), 0
                                );
                                const pieData = [
                                    { name: 'Delivered', value: delivered },
                                    { name: 'Cancelled', value: cancelled },
                                    { name: 'Active',
                                      value: Math.max(total - delivered - cancelled, 0) },
                                ];
                                return (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={pieData}
                                                dataKey="value" nameKey="name"
                                                cx="50%" cy="50%"
                                                innerRadius={50} outerRadius={75}
                                                paddingAngle={3}>
                                                {pieData.map((_, i) => (
                                                    <Cell key={i}
                                                        fill={PIE_COLORS[i]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                );
                            })()}
                        </Card>
                    </div>
                </div>
            )}

            {/* ── DRIVERS TAB ── */}
            {activeTab === 'drivers' && driverData && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 16, marginBottom: 16 }}>
                        <Card>
                            <ChartTitle
                                title="Driver performance ranking"
                                sub="By completed deliveries"
                            />
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart
                                    data={driverData.performance?.slice(0, 8)}
                                    layout="vertical"
                                    margin={{ left: 60, right: 20 }}>
                                    <XAxis type="number"
                                        tick={{ fill: T.textMuted, fontSize: 11 }}
                                        axisLine={false} tickLine={false} />
                                    <YAxis type="category"
                                        dataKey="driver_name"
                                        tick={{ fill: T.textSec, fontSize: 11 }}
                                        axisLine={false} tickLine={false}
                                        width={55} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="completed_deliveries"
                                        fill={T.accent} radius={[0, 4, 4, 0]}
                                        name="Deliveries" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <ChartTitle
                                title="Rating distribution"
                                sub="Driver rating scores"
                            />
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart
                                    data={driverData.performance?.slice(0, 8)}
                                    margin={{ left: -10, right: 20 }}>
                                    <XAxis dataKey="driver_name"
                                        tick={{ fill: T.textMuted, fontSize: 9 }}
                                        axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 5]}
                                        tick={{ fill: T.textMuted, fontSize: 11 }}
                                        axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="rating"
                                        radius={[4, 4, 0, 0]}
                                        name="Rating">
                                        {driverData.performance?.slice(0, 8)
                                            .map((d, i) => (
                                            <Cell key={i}
                                                fill={
                                                    parseFloat(d.rating) >= 4.5
                                                        ? T.success
                                                    : parseFloat(d.rating) >= 3.5
                                                        ? T.warning
                                                    : T.danger
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* driver stats table */}
                    <Card>
                        <ChartTitle title="Full driver breakdown" />
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%',
                                            borderCollapse: 'collapse',
                                            fontSize: 12 }}>
                                <thead>
                                    <tr>
                                        {['Driver','Rating','Completed',
                                          'On Time','Delayed','Cancelled',
                                          'Avg Hrs','Status'].map(h => (
                                            <th key={h} style={{
                                                textAlign: 'left',
                                                padding: '8px 12px',
                                                fontSize: 10, fontWeight: 600,
                                                color: T.textMuted,
                                                letterSpacing: '0.06em',
                                                textTransform: 'uppercase',
                                                borderBottom: `1px solid ${T.border}`,
                                                background: T.pageBg,
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {driverData.performance?.map((d, i) => (
                                        <tr key={i}
                                            style={{ transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.pageBg}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '9px 12px',
                                                         borderBottom: `1px solid ${T.border}`,
                                                         fontWeight: 500 }}>
                                                {d.driver_name}
                                            </td>
                                            <td style={{ padding: '9px 12px',
                                                         borderBottom: `1px solid ${T.border}` }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: parseFloat(d.rating) >= 4.5
                                                        ? T.success
                                                        : parseFloat(d.rating) >= 3.5
                                                        ? T.warning : T.danger,
                                                }}>
                                                    ★ {d.rating}
                                                </span>
                                            </td>
                                            {[d.completed_deliveries,
                                              d.on_time_deliveries,
                                              d.delayed_deliveries,
                                              d.cancelled_deliveries,
                                              d.avg_delivery_hours || '—',
                                            ].map((val, j) => (
                                                <td key={j} style={{
                                                    padding: '9px 12px',
                                                    borderBottom: `1px solid ${T.border}`,
                                                    color: j === 2 && val > 0 ? T.danger
                                                         : j === 1 ? T.success
                                                         : T.textSec,
                                                }}>
                                                    {val}
                                                </td>
                                            ))}
                                            <td style={{ padding: '9px 12px',
                                                         borderBottom: `1px solid ${T.border}` }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: T.radiusFull,
                                                    fontSize: 10, fontWeight: 600,
                                                    color: d.availability_status === 'available'
                                                        ? T.success : T.warning,
                                                    background: d.availability_status === 'available'
                                                        ? T.successLight : T.warningLight,
                                                }}>
                                                    {d.availability_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ── FLEET TAB ── */}
            {activeTab === 'fleet' && fleetData && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 16, marginBottom: 16 }}>
                        <Card>
                            <ChartTitle
                                title="Fleet utilization"
                                sub="Total trips per vehicle"
                            />
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={fleetData.utilization?.slice(0, 8)}
                                    margin={{ left: -10, right: 10 }}>
                                    <XAxis dataKey="plate_number"
                                        tick={{ fill: T.textMuted, fontSize: 10 }}
                                        axisLine={false} tickLine={false} />
                                    <YAxis
                                        tick={{ fill: T.textMuted, fontSize: 11 }}
                                        axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="total_trips"
                                        fill={T.accent} radius={[4, 4, 0, 0]}
                                        name="Trips" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <ChartTitle
                                title="Maintenance cost by type"
                                sub="Breakdown by vehicle type"
                            />
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={fleetData.maintenance}
                                    margin={{ left: -10, right: 10 }}>
                                    <XAxis dataKey="vehicle_type"
                                        tick={{ fill: T.textMuted, fontSize: 11 }}
                                        axisLine={false} tickLine={false} />
                                    <YAxis
                                        tick={{ fill: T.textMuted, fontSize: 11 }}
                                        axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="total_cost"
                                        fill={T.warning} radius={[4, 4, 0, 0]}
                                        name="Total Cost (₨)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* fleet table */}
                    <Card>
                        <ChartTitle title="Vehicle details" />
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%',
                                            borderCollapse: 'collapse',
                                            fontSize: 12 }}>
                                <thead>
                                    <tr>
                                        {['Plate','Type','Status',
                                          'Trips','Maint. Cost',
                                          'Services','Last Service'].map(h => (
                                            <th key={h} style={{
                                                textAlign: 'left',
                                                padding: '8px 12px',
                                                fontSize: 10, fontWeight: 600,
                                                color: T.textMuted,
                                                letterSpacing: '0.06em',
                                                textTransform: 'uppercase',
                                                borderBottom: `1px solid ${T.border}`,
                                                background: T.pageBg,
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {fleetData.utilization?.map((v, i) => (
                                        <tr key={i}
                                            style={{ transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.pageBg}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            {[
                                                v.plate_number,
                                                v.vehicle_type,
                                            ].map((val, j) => (
                                                <td key={j} style={{
                                                    padding: '9px 12px',
                                                    borderBottom: `1px solid ${T.border}`,
                                                    fontWeight: j === 0 ? 600 : 400,
                                                    color: T.textPri,
                                                }}>
                                                    {val}
                                                </td>
                                            ))}
                                            <td style={{ padding: '9px 12px',
                                                         borderBottom: `1px solid ${T.border}` }}>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: T.radiusFull,
                                                    fontSize: 10, fontWeight: 600,
                                                    color: v.current_status === 'available'
                                                        ? T.success
                                                        : v.current_status === 'in_use'
                                                        ? T.accent : T.warning,
                                                    background: v.current_status === 'available'
                                                        ? T.successLight
                                                        : v.current_status === 'in_use'
                                                        ? T.accentLight : T.warningLight,
                                                }}>
                                                    {v.current_status}
                                                </span>
                                            </td>
                                            {[
                                                v.total_trips || 0,
                                                `₨${parseFloat(v.total_maintenance_cost || 0).toLocaleString()}`,
                                                v.maintenance_count || 0,
                                                v.last_maintenance_date
                                                    ? new Date(v.last_maintenance_date).toLocaleDateString()
                                                    : '—',
                                            ].map((val, j) => (
                                                <td key={j} style={{
                                                    padding: '9px 12px',
                                                    borderBottom: `1px solid ${T.border}`,
                                                    color: T.textSec,
                                                }}>
                                                    {val}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ── WAREHOUSES TAB ── */}
            {activeTab === 'warehouses' && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 16, marginBottom: 16 }}>
                        <Card>
                            <ChartTitle
                                title="Warehouse load comparison"
                                sub="Current capacity utilization %"
                            />
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={warehouseData}
                                    margin={{ left: -10, right: 10 }}>
                                    <XAxis dataKey="warehouse_name"
                                        tick={{ fill: T.textMuted, fontSize: 9 }}
                                        axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]}
                                        tick={{ fill: T.textMuted, fontSize: 11 }}
                                        tickFormatter={v => `${v}%`}
                                        axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />}
                                        formatter={v => [`${v}%`, 'Load']} />
                                    <Bar dataKey="load_percentage"
                                        radius={[4, 4, 0, 0]} name="Load %">
                                        {warehouseData.map((w, i) => (
                                            <Cell key={i}
                                                fill={
                                                    parseFloat(w.load_percentage) > 80
                                                        ? T.danger
                                                    : parseFloat(w.load_percentage) > 50
                                                        ? T.warning
                                                    : T.success
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card>
                            <ChartTitle
                                title="Throughput comparison"
                                sub="Total shipments handled"
                            />
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={warehouseData}
                                    margin={{ left: -10, right: 10 }}>
                                    <XAxis dataKey="warehouse_name"
                                        tick={{ fill: T.textMuted, fontSize: 9 }}
                                        axisLine={false} tickLine={false} />
                                    <YAxis
                                        tick={{ fill: T.textMuted, fontSize: 11 }}
                                        axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="total_shipments_handled"
                                        fill={T.accent} radius={[4, 4, 0, 0]}
                                        name="Shipments" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* warehouse table */}
                    <Card>
                        <ChartTitle title="Warehouse performance details" />
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%',
                                            borderCollapse: 'collapse',
                                            fontSize: 12 }}>
                                <thead>
                                    <tr>
                                        {['Warehouse','City','Load %',
                                          'Current','Capacity',
                                          'Shipments','Avg Dwell'].map(h => (
                                            <th key={h} style={{
                                                textAlign: 'left',
                                                padding: '8px 12px',
                                                fontSize: 10, fontWeight: 600,
                                                color: T.textMuted,
                                                letterSpacing: '0.06em',
                                                textTransform: 'uppercase',
                                                borderBottom: `1px solid ${T.border}`,
                                                background: T.pageBg,
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {warehouseData.map((w, i) => {
                                        const pct = parseFloat(w.load_percentage || 0);
                                        return (
                                            <tr key={i}
                                                style={{ transition: 'background 0.1s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.pageBg}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '9px 12px',
                                                             borderBottom: `1px solid ${T.border}`,
                                                             fontWeight: 600,
                                                             color: T.textPri }}>
                                                    {w.warehouse_name}
                                                </td>
                                                <td style={{ padding: '9px 12px',
                                                             borderBottom: `1px solid ${T.border}`,
                                                             color: T.textSec }}>
                                                    {w.city}
                                                </td>
                                                <td style={{ padding: '9px 12px',
                                                             borderBottom: `1px solid ${T.border}` }}>
                                                    <div style={{ display: 'flex',
                                                                  alignItems: 'center',
                                                                  gap: 8 }}>
                                                        <div style={{
                                                            flex: 1, height: 6,
                                                            background: T.pageBg,
                                                            borderRadius: T.radiusFull,
                                                            minWidth: 60,
                                                        }}>
                                                            <div style={{
                                                                width: `${Math.min(pct, 100)}%`,
                                                                height: 6,
                                                                borderRadius: T.radiusFull,
                                                                background: pct > 80 ? T.danger
                                                                    : pct > 50 ? T.warning
                                                                    : T.success,
                                                            }} />
                                                        </div>
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            color: pct > 80 ? T.danger
                                                                : pct > 50 ? T.warning
                                                                : T.success,
                                                        }}>
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                </td>
                                                {[
                                                    w.current_load,
                                                    w.capacity_units,
                                                    w.total_shipments_handled || 0,
                                                    `${w.avg_dwell_hours || 0}h`,
                                                ].map((val, j) => (
                                                    <td key={j} style={{
                                                        padding: '9px 12px',
                                                        borderBottom: `1px solid ${T.border}`,
                                                        color: T.textSec,
                                                    }}>
                                                        {val}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
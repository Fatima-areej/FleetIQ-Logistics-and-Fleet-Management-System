import { useEffect, useState, useCallback } from 'react';
import { T } from '../../styles/theme';
import API from '../../api/axios';
import Btn from '../../components/ui/Btn';
import Modal from '../../components/ui/Modal';
import Drawer from '../../components/ui/Drawer';
import FormInput from '../../components/ui/FormInput';
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
            borderRadius: T.radius, color: msg.good ? T.success : T.danger,
            fontSize: 13, fontWeight: 500, boxShadow: T.shadowMd,
            animation: 'slideUp 0.2s ease',
        }}>
            {msg.text}
        </div>
    );
}

function StatPill({ label, value, color }) {
    return (
        <div style={{
            padding: '8px 10px', background: T.pageBg,
            borderRadius: T.radiusSm, textAlign: 'center',
        }}>
            <div style={{ fontSize: 15, fontWeight: 700,
                          color: color || T.textPri }}>{value}</div>
            <div style={{ fontSize: 10, color: T.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em', marginTop: 2 }}>
                {label}
            </div>
        </div>
    );
}

const STATUS_MAP = {
    available:   { color: T.success, bg: T.successLight, label: 'Available'   },
    on_delivery: { color: T.accent,  bg: T.accentLight,  label: 'On Delivery' },
    off_duty:    { color: T.textSec, bg: T.pageBg,       label: 'Off Duty'    },
};

export default function AdminDrivers() {
    const [drivers,     setDrivers]     = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [msg,         setMsg]         = useState(null);
    const [search,      setSearch]      = useState('');
    const [sortBy,      setSortBy]      = useState('rating');
    const [filterStatus,setFilterStatus]= useState('all');

    // drawer
    const [drawer,      setDrawer]      = useState(null);
    const [drawerData,  setDrawerData]  = useState(null);
    const [drawerLoad,  setDrawerLoad]  = useState(false);

    // edit modal
    const [editModal,   setEditModal]   = useState(null);
    const [editForm,    setEditForm]    = useState({
        license_number: '', experience_years: '',
    });

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    const fetchDrivers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await API.get('/drivers/performance');
            setDrivers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    const openDrawer = async (driver) => {
        setDrawer(driver);
        setDrawerLoad(true);
        setDrawerData(null);
        try {
            const res = await API.get(`/drivers/${driver.driver_id}`);
            setDrawerData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setDrawerLoad(false);
        }
    };

    const recalcRating = async (driver_id) => {
        try {
            const res = await API.post(`/drivers/${driver_id}/recalculate-rating`);
            showMsg(`Rating updated to ${res.data.new_rating}`);
            fetchDrivers();
            if (drawer?.driver_id === driver_id) {
                openDrawer(drawer);
            }
        } catch (err) {
            showMsg('Failed to recalculate.', false);
        }
    };

    const openEdit = (driver) => {
        setEditModal(driver.driver_id);
        setEditForm({
            license_number:  driver.license_number  || '',
            experience_years: driver.experience_years || '',
        });
    };

    const submitEdit = async () => {
        try {
            await API.patch(`/drivers/${editModal}`, editForm);
            setEditModal(null);
            showMsg('Driver updated.');
            fetchDrivers();
        } catch (err) {
            showMsg('Failed to update driver.', false);
        }
    };

    // sort + filter
    const filtered = drivers
        .filter(d => {
            if (filterStatus !== 'all' &&
                d.availability_status !== filterStatus) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!d.driver_name?.toLowerCase().includes(q)) return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'rating')      return b.rating - a.rating;
            if (sortBy === 'deliveries')  return (b.completed_deliveries || 0) - (a.completed_deliveries || 0);
            if (sortBy === 'on_time')     return (b.on_time_deliveries || 0) - (a.on_time_deliveries || 0);
            return 0;
        });

    const stats = {
        total:       drivers.length,
        available:   drivers.filter(d => d.availability_status === 'available').length,
        onDelivery:  drivers.filter(d => d.availability_status === 'on_delivery').length,
        avgRating:   drivers.length > 0
            ? (drivers.reduce((s, d) => s + parseFloat(d.rating || 0), 0) / drivers.length).toFixed(2)
            : 0,
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
                    { label: 'Total Drivers',  value: stats.total,      color: T.textPri },
                    { label: 'Available',      value: stats.available,  color: T.success },
                    { label: 'On Delivery',    value: stats.onDelivery, color: T.accent  },
                    { label: 'Avg Rating',     value: `★ ${stats.avgRating}`, color: T.warning },
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
                            placeholder="Search drivers..."
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

                    {/* status filter */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        {['all','available','on_delivery','off_duty'].map(f => (
                            <button key={f}
                                onClick={() => setFilterStatus(f)}
                                style={{
                                    padding: '6px 12px', fontSize: 12,
                                    borderRadius: T.radius, cursor: 'pointer',
                                    fontWeight: filterStatus === f ? 600 : 400,
                                    background: filterStatus === f
                                        ? T.accentLight : 'transparent',
                                    color: filterStatus === f ? T.accent : T.textSec,
                                    border: `1px solid ${filterStatus === f
                                        ? T.accent + '30' : T.border}`,
                                    transition: 'all 0.15s',
                                    fontFamily: T.fontBody,
                                }}>
                                {f === 'all' ? 'All'
                                    : f.replace('_', ' ')
                                       .replace(/\b\w/g, c => c.toUpperCase())}
                            </button>
                        ))}
                    </div>

                    {/* sort */}
                    <select value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        style={{
                            padding: '7px 10px', fontSize: 12,
                            border: `1px solid ${T.border}`,
                            borderRadius: T.radius,
                            background: T.inputBg,
                            color: T.textSec, outline: 'none',
                            cursor: 'pointer', fontFamily: T.fontBody,
                        }}>
                        <option value="rating">Sort: Rating</option>
                        <option value="deliveries">Sort: Deliveries</option>
                        <option value="on_time">Sort: On Time</option>
                    </select>
                </div>
            </Card>

            {/* ── DRIVER GRID ── */}
            {loading ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: 14,
                }}>
                    {[...Array(6)].map((_, i) => (
                        <SkeletonCard key={i} height={220} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>👤</div>
                    <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
                        No drivers found
                    </p>
                </Card>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: 14,
                }}>
                    {filtered.map(d => (
                        <DriverCard
                            key={d.driver_id}
                            driver={d}
                            onView={() => openDrawer(d)}
                            onEdit={() => openEdit(d)}
                            onRecalc={() => recalcRating(d.driver_id)}
                        />
                    ))}
                </div>
            )}

            {/* ── DRIVER DETAIL DRAWER ── */}
            {drawer && (
                <Drawer
                    title={drawer.driver_name}
                    onClose={() => setDrawer(null)}
                >
                    {/* avatar + status */}
                    <div style={{ display: 'flex', alignItems: 'center',
                                  gap: 14, marginBottom: '1.5rem' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${T.accent}, #7C3AED)`,
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 22,
                            fontWeight: 700, color: '#fff',
                            fontFamily: T.fontHead, flexShrink: 0,
                        }}>
                            {drawer.driver_name?.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700,
                                          color: T.textPri,
                                          fontFamily: T.fontHead }}>
                                {drawer.driver_name}
                            </div>
                            <div style={{ marginTop: 4 }}>
                                <span style={{
                                    padding: '3px 10px',
                                    borderRadius: T.radiusFull,
                                    fontSize: 11, fontWeight: 600,
                                    color: STATUS_MAP[drawer.availability_status]?.color || T.textSec,
                                    background: STATUS_MAP[drawer.availability_status]?.bg || T.pageBg,
                                }}>
                                    {STATUS_MAP[drawer.availability_status]?.label
                                        || drawer.availability_status}
                                </span>
                            </div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                            <div style={{ fontSize: 24, fontWeight: 800,
                                          color: parseFloat(drawer.rating) >= 4.5 ? T.success
                                               : parseFloat(drawer.rating) >= 3.5 ? T.warning
                                               : T.danger,
                                          fontFamily: T.fontHead }}>
                                ★ {drawer.rating}
                            </div>
                        </div>
                    </div>

                    {/* performance grid */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8, marginBottom: '1.5rem',
                    }}>
                        <StatPill label="Completed"  value={drawer.completed_deliveries || 0} color={T.textPri} />
                        <StatPill label="On Time"    value={drawer.on_time_deliveries   || 0} color={T.success} />
                        <StatPill label="Delayed"    value={drawer.delayed_deliveries   || 0} color={T.danger}  />
                        <StatPill label="Cancelled"  value={drawer.cancelled_deliveries || 0} color={T.warning} />
                        <StatPill label="Avg Hrs"    value={drawer.avg_delivery_hours   || '—'} />
                        <StatPill label="Status"     value={drawer.availability_status  || '—'} />
                    </div>

                    {/* on-time rate bar */}
                    {(drawer.completed_deliveries || 0) > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex',
                                          justifyContent: 'space-between',
                                          marginBottom: 6 }}>
                                <span style={{ fontSize: 12,
                                               color: T.textSec,
                                               fontWeight: 500 }}>
                                    On-time rate
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700,
                                               color: T.success }}>
                                    {Math.round(
                                        ((drawer.on_time_deliveries || 0) /
                                         (drawer.completed_deliveries || 1)) * 100
                                    )}%
                                </span>
                            </div>
                            <div style={{ background: T.pageBg,
                                          borderRadius: T.radiusFull, height: 8 }}>
                                <div style={{
                                    width: `${Math.round(
                                        ((drawer.on_time_deliveries || 0) /
                                         (drawer.completed_deliveries || 1)) * 100
                                    )}%`,
                                    height: 8, borderRadius: T.radiusFull,
                                    background: T.success, transition: 'width 0.6s ease',
                                }} />
                            </div>
                        </div>
                    )}

                    {/* actions */}
                    <div style={{
                        display: 'flex', gap: 8,
                        paddingBottom: '1.25rem',
                        marginBottom: '1.25rem',
                        borderBottom: `1px solid ${T.border}`,
                    }}>
                        <Btn size="sm" variant="secondary"
                             onClick={() => openEdit(drawer)}>
                            Edit Details
                        </Btn>
                        <Btn size="sm" variant="secondary"
                             onClick={() => recalcRating(drawer.driver_id)}>
                            Recalc Rating
                        </Btn>
                    </div>

                    {/* recent shipments */}
                    <p style={{ margin: '0 0 10px', fontSize: 13,
                                fontWeight: 600, color: T.textPri }}>
                        Recent shipments
                    </p>

                    {drawerLoad ? (
                        <div style={{ display: 'flex',
                                      flexDirection: 'column', gap: 8 }}>
                            {[...Array(3)].map((_, i) => (
                                <SkeletonCard key={i} height={50} />
                            ))}
                        </div>
                    ) : drawerData?.shipments?.length === 0 ? (
                        <p style={{ color: T.textMuted, fontSize: 13 }}>
                            No shipments yet
                        </p>
                    ) : (
                        drawerData?.shipments?.map((s, i) => (
                            <div key={i} style={{
                                padding: '9px 12px',
                                background: T.pageBg,
                                borderRadius: T.radius,
                                marginBottom: 6,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600,
                                                  color: T.textPri }}>
                                        #{s.shipment_id}
                                    </div>
                                    <div style={{ fontSize: 11, color: T.textMuted,
                                                  marginTop: 2 }}>
                                        {new Date(s.created_at).toLocaleDateString()}
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
                                    <span style={{ fontSize: 10,
                                                   color: T.priority[s.priority]?.color
                                                       || T.textMuted,
                                                   fontWeight: 500 }}>
                                        {s.priority}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </Drawer>
            )}

            {/* ── EDIT MODAL ── */}
            {editModal && (
                <Modal title="Edit Driver Details"
                       onClose={() => setEditModal(null)}>
                    <FormInput
                        label="License Number"
                        value={editForm.license_number}
                        onChange={v => setEditForm({...editForm,
                            license_number: v})}
                        placeholder="LHR-2024-12345"
                    />
                    <FormInput
                        label="Experience (years)"
                        value={editForm.experience_years}
                        onChange={v => setEditForm({...editForm,
                            experience_years: v})}
                        placeholder="3" type="number"
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
        </div>
    );
}

// ── DRIVER CARD ──────────────────────────────────────────────
function DriverCard({ driver: d, onView, onEdit, onRecalc }) {
    const [hovered, setHovered] = useState(false);
    const statusInfo = STATUS_MAP[d.availability_status] ||
        { color: T.textMuted, bg: T.pageBg, label: d.availability_status };

    const ratingColor = parseFloat(d.rating) >= 4.5 ? T.success
                      : parseFloat(d.rating) >= 3.5 ? T.warning
                      : T.danger;

    const onTimePct = d.completed_deliveries > 0
        ? Math.round((d.on_time_deliveries / d.completed_deliveries) * 100)
        : 0;

    // gradient avatar color based on first letter
    const avatarColors = [
        ['#4F46E5','#7C3AED'],
        ['#059669','#0284C7'],
        ['#D97706','#DC2626'],
        ['#7C3AED','#EC4899'],
    ];
    const colorPair = avatarColors[
        d.driver_name?.charCodeAt(0) % avatarColors.length
    ] || avatarColors[0];

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background:   T.cardBg,
                border:       `1px solid ${hovered ? T.accent + '30' : T.border}`,
                borderRadius: T.radiusLg,
                padding:      '1.25rem',
                boxShadow:    hovered ? T.shadowMd : T.shadow,
                transition:   'all 0.2s',
                transform:    hovered ? 'translateY(-2px)' : 'none',
            }}
        >
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'flex-start',
                          gap: 12, marginBottom: '1rem' }}>
                <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18, fontWeight: 700,
                    color: '#fff', flexShrink: 0,
                    fontFamily: T.fontHead,
                }}>
                    {d.driver_name?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700,
                                  color: T.textPri, fontFamily: T.fontHead,
                                  whiteSpace: 'nowrap', overflow: 'hidden',
                                  textOverflow: 'ellipsis' }}>
                        {d.driver_name}
                    </div>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        gap: 4, marginTop: 3,
                        padding: '2px 8px',
                        borderRadius: T.radiusFull,
                        fontSize: 10, fontWeight: 600,
                        color: statusInfo.color,
                        background: statusInfo.bg,
                    }}>
                        <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: statusInfo.color,
                        }} />
                        {statusInfo.label}
                    </span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800,
                                  color: ratingColor,
                                  fontFamily: T.fontHead }}>
                        ★ {d.rating}
                    </div>
                </div>
            </div>

            {/* stats row */}
            <div style={{ display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 6, marginBottom: '1rem' }}>
                <StatPill label="Deliveries" value={d.completed_deliveries || 0} />
                <StatPill label="On Time"    value={d.on_time_deliveries   || 0} color={T.success} />
                <StatPill label="Delayed"    value={d.delayed_deliveries   || 0} color={T.danger}  />
            </div>

            {/* on-time bar */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: T.textMuted }}>
                        On-time rate
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600,
                                   color: onTimePct >= 80 ? T.success
                                        : onTimePct >= 60 ? T.warning
                                        : T.danger }}>
                        {onTimePct}%
                    </span>
                </div>
                <div style={{ background: T.pageBg,
                              borderRadius: T.radiusFull, height: 5 }}>
                    <div style={{
                        width: `${onTimePct}%`, height: 5,
                        borderRadius: T.radiusFull,
                        background: onTimePct >= 80 ? T.success
                                  : onTimePct >= 60 ? T.warning
                                  : T.danger,
                        transition: 'width 0.6s ease',
                    }} />
                </div>
            </div>

            {/* avg hours */}
            {d.avg_delivery_hours && (
                <div style={{
                    padding: '6px 10px',
                    background: T.accentLight,
                    borderRadius: T.radiusSm,
                    marginBottom: '1rem',
                    fontSize: 12, color: T.accent,
                    fontWeight: 500,
                }}>
                    ⏱ Avg delivery: {d.avg_delivery_hours} hrs
                </div>
            )}

            {/* actions */}
            <div style={{ display: 'flex', gap: 6 }}>
                <Btn size="sm" variant="secondary"
                     onClick={onView} fullWidth>
                    View Profile
                </Btn>
                <Btn size="sm" variant="secondary" onClick={onEdit}>
                    ✏️
                </Btn>
                <Btn size="sm" variant="secondary"
                     onClick={onRecalc} title="Recalculate rating">
                    ↻
                </Btn>
            </div>
        </div>
    );
}
import { useEffect, useState } from 'react';
import { T } from '../../styles/theme';
import API from '../../api/axios';
import Btn from '../../components/ui/Btn';
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

const EVENT_ICONS = {
    status_change: '📦',
    memo:          '✉️',
    assignment:    '👤',
    default:       '🔔',
};

export default function AdminNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [filterRead,    setFilterRead]    = useState('all');

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await API.get('/notifications');
            setNotifications(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const markRead = async (id) => {
        await API.patch(`/notifications/${id}/read`);
        setNotifications(prev =>
            prev.map(n => n.notification_id === id
                ? { ...n, is_read: true } : n)
        );
    };

    const markAllRead = async () => {
        await API.patch('/notifications/read-all');
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const filtered = notifications.filter(n => {
        if (filterRead === 'unread') return !n.is_read;
        if (filterRead === 'read')   return n.is_read;
        return true;
    });

    const unread = notifications.filter(n => !n.is_read).length;

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>

            {/* header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700,
                                 color: T.textPri, fontFamily: T.fontHead }}>
                        Notifications
                    </h2>
                    <p style={{ margin: '2px 0 0', fontSize: 12,
                                color: T.textMuted }}>
                        {unread > 0
                            ? `${unread} unread notification${unread > 1 ? 's' : ''}`
                            : 'All caught up'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {/* filter */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        {['all','unread','read'].map(f => (
                            <button key={f}
                                onClick={() => setFilterRead(f)}
                                style={{
                                    padding: '6px 12px', fontSize: 12,
                                    borderRadius: T.radius, cursor: 'pointer',
                                    fontWeight: filterRead === f ? 600 : 400,
                                    background: filterRead === f
                                        ? T.accentLight : 'transparent',
                                    color: filterRead === f ? T.accent : T.textSec,
                                    border: `1px solid ${filterRead === f
                                        ? T.accent + '30' : T.border}`,
                                    transition: 'all 0.15s',
                                    fontFamily: T.fontBody,
                                }}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    {unread > 0 && (
                        <Btn variant="secondary" size="sm"
                             onClick={markAllRead}>
                            Mark all read
                        </Btn>
                    )}
                </div>
            </div>

            {/* list */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...Array(5)].map((_, i) => (
                        <SkeletonCard key={i} height={72} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
                    <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
                        {filterRead === 'unread'
                            ? 'No unread notifications'
                            : 'No notifications yet'}
                    </p>
                </Card>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filtered.map((n, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start',
                            gap: 12, padding: '12px 16px',
                            background: n.is_read ? T.cardBg : T.accentLight,
                            border: `1px solid ${n.is_read ? T.border : T.accent + '30'}`,
                            borderRadius: T.radiusLg,
                            transition: 'all 0.15s',
                            borderLeft: !n.is_read
                                ? `3px solid ${T.accent}`
                                : `3px solid transparent`,
                        }}>
                            {/* icon */}
                            <div style={{
                                width: 36, height: 36, borderRadius: T.radius,
                                background: n.is_read ? T.pageBg : T.cardBg,
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 16,
                                flexShrink: 0,
                                border: `1px solid ${T.border}`,
                            }}>
                                {EVENT_ICONS[n.event_type] || EVENT_ICONS.default}
                            </div>

                            {/* content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600,
                                              color: T.textPri, marginBottom: 2 }}>
                                    {n.title}
                                </div>
                                <div style={{ fontSize: 12, color: T.textSec,
                                              marginBottom: 4 }}>
                                    {n.message}
                                </div>
                                <div style={{ fontSize: 11, color: T.textMuted }}>
                                    {new Date(n.created_at).toLocaleString()}
                                </div>
                            </div>

                            {/* unread dot + action */}
                            <div style={{ display: 'flex', alignItems: 'center',
                                          gap: 8, flexShrink: 0 }}>
                                {!n.is_read && (
                                    <>
                                        <span style={{
                                            width: 8, height: 8,
                                            borderRadius: '50%',
                                            background: T.accent,
                                        }} />
                                        <button
                                            onClick={() => markRead(n.notification_id)}
                                            style={{
                                                background: 'none',
                                                border: `1px solid ${T.border}`,
                                                borderRadius: T.radiusSm,
                                                color: T.textSec,
                                                cursor: 'pointer',
                                                fontSize: 11,
                                                padding: '3px 8px',
                                                fontFamily: T.fontBody,
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = T.accentLight;
                                                e.currentTarget.style.color = T.accent;
                                                e.currentTarget.style.borderColor = T.accent;
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'none';
                                                e.currentTarget.style.color = T.textSec;
                                                e.currentTarget.style.borderColor = T.border;
                                            }}>
                                            Mark read
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
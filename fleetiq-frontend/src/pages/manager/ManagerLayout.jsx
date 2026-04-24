import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { T } from '../../styles/theme';
import API from '../../api/axios';

const NAV = [
    { id: 'dashboard',   label: 'Overview',      icon: '◉', path: '/manager/dashboard'   },
    { id: 'shipments',   label: 'Shipments',     icon: '📦', path: '/manager/shipments'   },
    { id: 'warehouses',  label: 'My Warehouses', icon: '🏭', path: '/manager/warehouses'  },
    { id: 'requests',    label: 'Requests',      icon: '🛠', path: '/manager/requests'    },
    { id: 'memos',       label: 'Memos',         icon: '✉️', path: '/manager/memos'       },
];

export default function ManagerLayout({ children }) {
    const { user, logout } = useAuth();
    const navigate         = useNavigate();
    const location         = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [delayed,   setDelayed]   = useState(0);
    const [unreadMemo, setUnreadMemo] = useState(0);
    const [cmdOpen,   setCmdOpen]   = useState(false);
    const [search,    setSearch]    = useState('');
    const searchRef = useRef(null);

    useEffect(() => {
        fetchCounts();
        const interval = setInterval(fetchCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setCmdOpen(v => !v);
            }
            if (e.key === 'Escape') {
                setCmdOpen(false);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    useEffect(() => {
        if (cmdOpen && searchRef.current) searchRef.current.focus();
    }, [cmdOpen]);

    const fetchCounts = async () => {
        try {
            const [delayRes, memoRes] = await Promise.all([
                API.get('/shipments/delayed'),
                API.get('/memos'),
            ]);
            setDelayed(delayRes.data.length || 0);
            setUnreadMemo((memoRes.data || []).filter(m =>
                m.thread_unread === true || m.thread_unread === 1
                || (m.thread_unread == null && !m.is_read)
            ).length);
        } catch {
            // best-effort badge; avoid breaking layout if it fails
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const activeId = NAV.find(n =>
        location.pathname === n.path || location.pathname.startsWith(`${n.path}/`)
    )?.id || 'dashboard';

    const sideW = collapsed ? T.sideWCollapsed : T.sideW;

    const CMD_ACTIONS = [
        { label: 'Go to Overview',     action: () => navigate('/manager/dashboard'),  icon: '◉'  },
        { label: 'Go to Shipments',    action: () => navigate('/manager/shipments'),   icon: '📦' },
        { label: 'Go to My Warehouses',action: () => navigate('/manager/warehouses'),  icon: '🏭' },
        { label: 'Go to Requests',     action: () => navigate('/manager/requests'),   icon: '🛠' },
        { label: 'Go to Memos',        action: () => navigate('/manager/memos'),      icon: '✉️' },
        { label: 'Sign out',           action: handleLogout,                            icon: '→'  },
    ];

    const filteredCmds = search
        ? CMD_ACTIONS.filter(a =>
            a.label.toLowerCase().includes(search.toLowerCase()))
        : CMD_ACTIONS;

    return (
        <div style={{ display: 'flex', minHeight: '100vh',
                      background: T.pageBg, fontFamily: T.fontBody }}>
            <style>{`
                * { box-sizing: border-box; }
                input, select, textarea, button { font-family: '${T.fontBody}', sans-serif; }
            `}</style>

            <aside style={{
                width:          sideW,
                flexShrink:     0,
                background:     T.sidebarBg,
                borderRight:    `1px solid ${T.border}`,
                boxShadow:      T.shadowSidebar,
                display:        'flex',
                flexDirection:  'column',
                position:       'sticky',
                top:            0,
                height:         '100vh',
                overflowY:      'auto',
                overflowX:      'hidden',
                transition:     'width 0.25s ease',
                zIndex:         200,
            }}>
                <div style={{
                    padding:        collapsed ? '1.25rem 0' : '1.25rem 1.25rem',
                    borderBottom:   `1px solid ${T.border}`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    minHeight:      T.topH,
                }}>
                    {!collapsed && (
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 800,
                                          fontFamily: T.fontHead, color: T.textPri,
                                          letterSpacing: '-0.02em' }}>
                                Fleet<span style={{ color: T.accent }}>IQ</span>
                            </div>
                            <div style={{ fontSize: 10, color: T.textMuted,
                                          letterSpacing: '0.1em',
                                          textTransform: 'uppercase' }}>
                                Manager Console
                            </div>
                        </div>
                    )}
                    <button onClick={() => setCollapsed(v => !v)} style={{
                        background:   'transparent',
                        border:       `1px solid ${T.border}`,
                        borderRadius: T.radiusSm,
                        color:        T.textMuted,
                        cursor:       'pointer',
                        width:        28, height: 28,
                        display:      'flex',
                        alignItems:   'center',
                        justifyContent: 'center',
                        fontSize:     12,
                        flexShrink:   0,
                        transition:   'all 0.15s',
                    }}>
                        {collapsed ? '→' : '←'}
                    </button>
                </div>

                {!collapsed && (
                    <div style={{
                        margin:       '12px',
                        padding:      '10px 12px',
                        background:   T.accentLight,
                        borderRadius: T.radius,
                        display:      'flex',
                        alignItems:   'center',
                        gap:          10,
                    }}>
                        <div style={{
                            width:          32, height:     32,
                            borderRadius:   '50%',
                            background:     T.accent,
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            fontSize:       13,
                            fontWeight:     700,
                            color:          '#fff',
                            flexShrink:     0,
                        }}>
                            {user?.name?.charAt(0)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: 13, fontWeight: 600,
                                          color: T.textPri,
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis' }}>
                                {user?.name}
                            </div>
                            <div style={{ fontSize: 11, color: T.accent,
                                          fontWeight: 500 }}>
                                Manager
                            </div>
                        </div>
                    </div>
                )}

                <nav style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {NAV.map(n => {
                        const isActive = n.id === activeId;
                        return (
                            <button key={n.id} onClick={() => navigate(n.path)} style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: collapsed ? '10px 0' : '10px 12px',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                borderRadius: T.radius,
                                border: `1px solid ${isActive ? `${T.accent}55` : 'transparent'}`,
                                background: isActive ? T.accentLight : 'transparent',
                                color: isActive ? T.textPri : T.textSec,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}>
                                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{n.icon}</span>
                                {!collapsed && (
                                    <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 600 }}>
                                        {n.label}
                                    </span>
                                )}
                                {!collapsed && n.id === 'shipments' && delayed > 0 && (
                                    <span style={{
                                        marginLeft: 'auto',
                                        fontSize: 11,
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        background: T.dangerLight,
                                        color: T.danger,
                                        border: `1px solid ${T.danger}40`,
                                    }}>
                                        {delayed}
                                    </span>
                                )}
                                {!collapsed && n.id === 'memos' && unreadMemo > 0 && (
                                    <span style={{
                                        marginLeft: 'auto',
                                        fontSize: 11,
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        background: T.accentLight,
                                        color: T.accent,
                                        border: `1px solid ${T.accent}40`,
                                    }}>
                                        {unreadMemo}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div style={{ marginTop: 'auto', padding: 12 }}>
                    <button onClick={() => setCmdOpen(true)} style={{
                        width: '100%',
                        padding: collapsed ? '10px 0' : '10px 12px',
                        borderRadius: T.radius,
                        border: `1px solid ${T.border}`,
                        background: 'transparent',
                        color: T.textSec,
                        cursor: 'pointer',
                    }}>
                        {collapsed ? '⌘' : 'Cmd (Ctrl+K)'}
                    </button>
                    <button onClick={handleLogout} style={{
                        width: '100%',
                        marginTop: 8,
                        padding: collapsed ? '10px 0' : '10px 12px',
                        borderRadius: T.radius,
                        border: `1px solid ${T.border}`,
                        background: 'transparent',
                        color: T.textSec,
                        cursor: 'pointer',
                    }}>
                        {collapsed ? '→' : 'Sign out'}
                    </button>
                </div>
            </aside>

            <main style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    height: T.topH,
                    borderBottom: `1px solid ${T.border}`,
                    background: T.topBarBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 150,
                }}>
                    <div style={{ color: T.textPri, fontWeight: 700 }}>
                        {activeId === 'dashboard' ? 'Overview'
                            : activeId === 'shipments' ? 'Shipments'
                            : activeId === 'warehouses' ? 'My Warehouses'
                            : activeId === 'requests' ? 'Maintenance requests'
                            : activeId === 'memos' ? 'Memos'
                            : 'FleetIQ'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ color: T.textMuted, fontSize: 12 }}>
                            {user?.email}
                        </div>
                        <button onClick={() => setCmdOpen(true)} style={{
                            border: `1px solid ${T.border}`,
                            background: T.inputBg,
                            color: T.textSec,
                            borderRadius: T.radiusSm,
                            padding: '7px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                        }}>
                            Ctrl+K
                        </button>
                    </div>
                </div>

                <div style={{ padding: '18px 18px 24px' }}>
                    {children}
                </div>
            </main>

            {cmdOpen && (
                <div onClick={() => setCmdOpen(false)} style={{
                    position: 'fixed', inset: 0, background: T.overlay, zIndex: 999,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    paddingTop: 90,
                }}>
                    <div onClick={(e) => e.stopPropagation()} style={{
                        width: 520, maxWidth: '92vw',
                        background: T.cardBg,
                        border: `1px solid ${T.border}`,
                        borderRadius: T.radiusLg,
                        boxShadow: T.shadowXl,
                        overflow: 'hidden',
                    }}>
                        <div style={{ padding: 12, borderBottom: `1px solid ${T.border}` }}>
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Type a command…"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: T.radius,
                                    border: `1px solid ${T.border}`,
                                    background: T.inputBg,
                                    color: T.textPri,
                                    outline: 'none',
                                }}
                            />
                        </div>
                        <div style={{ maxHeight: 340, overflow: 'auto' }}>
                            {filteredCmds.map((a, idx) => (
                                <button key={idx} onClick={() => {
                                    a.action();
                                    setCmdOpen(false);
                                    setSearch('');
                                }} style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '12px 12px',
                                    border: 'none',
                                    borderBottom: `1px solid ${T.border}`,
                                    background: 'transparent',
                                    color: T.textPri,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}>
                                    <span style={{ width: 20, textAlign: 'center' }}>{a.icon}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</span>
                                </button>
                            ))}
                            {filteredCmds.length === 0 && (
                                <div style={{ padding: 14, color: T.textMuted, fontSize: 13 }}>
                                    No matches.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


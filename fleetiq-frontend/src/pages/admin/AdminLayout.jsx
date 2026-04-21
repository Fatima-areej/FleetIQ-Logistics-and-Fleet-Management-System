import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { T } from '../../styles/theme';
import API from '../../api/axios';

const NAV = [
    { id: 'dashboard',     label: 'Dashboard',      icon: '◉',  path: '/admin'              },
    { id: 'shipments',     label: 'Shipments',       icon: '📦', path: '/admin/shipments'    },
    { id: 'fleet',         label: 'Fleet',           icon: '🚚', path: '/admin/fleet'        },
    { id: 'drivers',       label: 'Drivers',         icon: '👤', path: '/admin/drivers'      },
    { id: 'warehouses',    label: 'Warehouses',      icon: '🏭', path: '/admin/warehouses'   },
    { id: 'users',         label: 'Team',            icon: '👥', path: '/admin/users'        },
    { id: 'map',           label: 'Live Map',        icon: '🗺', path: '/admin/map'          },
    { id: 'analytics',     label: 'Analytics',       icon: '📊', path: '/admin/analytics'    },
    { id: 'memos',         label: 'Memos',           icon: '✉️', path: '/admin/memos'        },
    { id: 'notifications', label: 'Notifications',   icon: '🔔', path: '/admin/notifications'},
    { id: 'settings',      label: 'Settings',        icon: '⚙️', path: '/admin/settings'     },
];

export default function AdminLayout({ children }) {
    const { user, logout }    = useAuth();
    const navigate            = useNavigate();
    const location            = useLocation();
    const [collapsed,  setCollapsed]  = useState(false);
    const [unread,     setUnread]     = useState(0);
    const [unreadMemo, setUnreadMemo] = useState(0);
    const [search,     setSearch]     = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [cmdOpen,    setCmdOpen]    = useState(false);
    const [delayed,    setDelayed]    = useState(0);
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
                setSearchOpen(false);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    useEffect(() => {
        if (searchOpen && searchRef.current) {
            searchRef.current.focus();
        }
    }, [searchOpen]);

    const fetchCounts = async () => {
        try {
            const [notifRes, memoRes, delayRes] = await Promise.all([
                API.get('/notifications/unread-count'),
                API.get('/memos'),
                API.get('/shipments/delayed'),
            ]);
            setUnread(notifRes.data.unread || 0);
            setUnreadMemo(memoRes.data.filter(m => !m.is_read).length);
            setDelayed(delayRes.data.length || 0);
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const activeId = NAV.find(n =>
        n.path === location.pathname ||
        (n.path !== '/admin' && location.pathname.startsWith(n.path))
    )?.id || 'dashboard';

    const sideW = collapsed ? T.sideWCollapsed : T.sideW;

    const CMD_ACTIONS = [
        { label: 'Go to Dashboard',    action: () => navigate('/admin'),               icon: '◉'  },
        { label: 'Go to Shipments',    action: () => navigate('/admin/shipments'),      icon: '📦' },
        { label: 'Go to Fleet',        action: () => navigate('/admin/fleet'),          icon: '🚚' },
        { label: 'Go to Drivers',      action: () => navigate('/admin/drivers'),        icon: '👤' },
        { label: 'Go to Warehouses',   action: () => navigate('/admin/warehouses'),     icon: '🏭' },
        { label: 'Go to Live Map',     action: () => navigate('/admin/map'),            icon: '🗺' },
        { label: 'Go to Analytics',    action: () => navigate('/admin/analytics'),      icon: '📊' },
        { label: 'Go to Memos',        action: () => navigate('/admin/memos'),          icon: '✉️' },
        { label: 'Go to Settings',     action: () => navigate('/admin/settings'),       icon: '⚙️' },
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

            {/* ── SIDEBAR ───────────────────────────── */}
            <aside style={{
                width:          sideW,
                flexShrink:     0,
                background:     T.cardBg,
                borderRight:    `1px solid ${T.border}`,
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
                {/* logo */}
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
                                Admin Console
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
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = T.accentLight;
                        e.currentTarget.style.borderColor = T.accent;
                        e.currentTarget.style.color = T.accent;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = T.border;
                        e.currentTarget.style.color = T.textMuted;
                    }}>
                        {collapsed ? '→' : '←'}
                    </button>
                </div>

                {/* user pill */}
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
                                Administrator
                            </div>
                        </div>
                    </div>
                )}

                {/* nav */}
                <nav style={{ flex: 1, padding: '8px',
                              overflowY: 'auto' }}>
                    {NAV.map(item => {
                        const isActive = activeId === item.id;
                        const badge = item.id === 'notifications' ? unread
                                    : item.id === 'memos'         ? unreadMemo
                                    : 0;

                        return (
                            <button key={item.id}
                                onClick={() => navigate(item.path)}
                                title={collapsed ? item.label : ''}
                                style={{
                                    display:        'flex',
                                    alignItems:     'center',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    gap:            10,
                                    width:          '100%',
                                    padding:        collapsed ? '10px' : '9px 12px',
                                    borderRadius:   T.radius,
                                    background:     isActive ? T.accentLight : 'transparent',
                                    border:         isActive
                                        ? `1px solid ${T.accent}25`
                                        : '1px solid transparent',
                                    color:          isActive ? T.accent : T.textSec,
                                    fontSize:       13,
                                    fontWeight:     isActive ? 600 : 400,
                                    cursor:         'pointer',
                                    marginBottom:   2,
                                    textAlign:      'left',
                                    transition:     'all 0.15s',
                                    position:       'relative',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = T.pageBg;
                                        e.currentTarget.style.color = T.textPri;
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = T.textSec;
                                    }
                                }}
                            >
                                <span style={{ fontSize: 16,
                                               flexShrink: 0 }}>
                                    {item.icon}
                                </span>
                                {!collapsed && (
                                    <>
                                        <span style={{ flex: 1 }}>{item.label}</span>
                                        {badge > 0 && (
                                            <span style={{
                                                background:   T.accent,
                                                color:        '#fff',
                                                fontSize:     10,
                                                fontWeight:   700,
                                                padding:      '1px 6px',
                                                borderRadius: T.radiusFull,
                                                minWidth:     18,
                                                textAlign:    'center',
                                            }}>
                                                {badge}
                                            </span>
                                        )}
                                    </>
                                )}
                                {collapsed && badge > 0 && (
                                    <span style={{
                                        position:     'absolute',
                                        top:          6, right:    6,
                                        width:        8, height:   8,
                                        borderRadius: '50%',
                                        background:   T.accent,
                                    }} />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* logout */}
                <div style={{ padding: '8px',
                              borderTop: `1px solid ${T.border}` }}>
                    <button onClick={handleLogout} style={{
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap:            10,
                        width:          '100%',
                        padding:        collapsed ? '10px' : '9px 12px',
                        borderRadius:   T.radius,
                        background:     'transparent',
                        border:         '1px solid transparent',
                        color:          T.textMuted,
                        fontSize:       13,
                        cursor:         'pointer',
                        transition:     'all 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = T.dangerLight;
                        e.currentTarget.style.color = T.danger;
                        e.currentTarget.style.borderColor = T.danger + '30';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = T.textMuted;
                        e.currentTarget.style.borderColor = 'transparent';
                    }}>
                        <span style={{ fontSize: 16 }}>→</span>
                        {!collapsed && <span>Sign out</span>}
                    </button>
                </div>
            </aside>

            {/* ── MAIN ──────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex',
                          flexDirection: 'column',
                          minWidth: 0, overflow: 'hidden' }}>

                {/* topbar */}
                <header style={{
                    height:         T.topH,
                    background:     T.cardBg,
                    borderBottom:   `1px solid ${T.border}`,
                    display:        'flex',
                    alignItems:     'center',
                    padding:        '0 1.5rem',
                    gap:            12,
                    position:       'sticky',
                    top:            0,
                    zIndex:         100,
                    boxShadow:      '0 1px 0 rgba(0,0,0,0.04)',
                }}>
                    {/* page title */}
                    <div style={{ flex: 1 }}>
                        <h1 style={{
                            margin:     0,
                            fontSize:   16,
                            fontWeight: 700,
                            color:      T.textPri,
                            fontFamily: T.fontHead,
                        }}>
                            {NAV.find(n => n.id === activeId)?.label}
                        </h1>
                    </div>

                    {/* delayed alert */}
                    {delayed > 0 && (
                        <button onClick={() => navigate('/admin/shipments')} style={{
                            display:      'flex',
                            alignItems:   'center',
                            gap:          6,
                            padding:      '5px 12px',
                            background:   T.warningLight,
                            border:       `1px solid ${T.warning}40`,
                            borderRadius: T.radiusFull,
                            color:        T.warning,
                            fontSize:     12,
                            fontWeight:   600,
                            cursor:       'pointer',
                            animation:    'pulse 2s infinite',
                        }}>
                            ⚠ {delayed} delayed shipment{delayed > 1 ? 's' : ''}
                        </button>
                    )}

                    {/* search */}
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setSearchOpen(v => !v)} style={{
                            display:      'flex',
                            alignItems:   'center',
                            gap:          6,
                            padding:      '6px 12px',
                            background:   T.inputBg,
                            border:       `1px solid ${T.border}`,
                            borderRadius: T.radius,
                            color:        T.textMuted,
                            fontSize:     12,
                            cursor:       'pointer',
                            minWidth:     160,
                        }}>
                            <span>🔍</span>
                            <span>Search...</span>
                            <span style={{
                                marginLeft:   'auto',
                                background:   T.border,
                                borderRadius: 4,
                                padding:      '1px 5px',
                                fontSize:     10,
                                color:        T.textMuted,
                            }}>⌘K</span>
                        </button>
                    </div>

                    {/* notification bell */}
                    <button onClick={() => navigate('/admin/notifications')} style={{
                        position:     'relative',
                        background:   'transparent',
                        border:       `1px solid ${T.border}`,
                        borderRadius: T.radius,
                        width:        36, height: 36,
                        display:      'flex',
                        alignItems:   'center',
                        justifyContent: 'center',
                        cursor:       'pointer',
                        fontSize:     16,
                        transition:   'all 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = T.accentLight;
                        e.currentTarget.style.borderColor = T.accent;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = T.border;
                    }}>
                        🔔
                        {unread > 0 && (
                            <span style={{
                                position:     'absolute',
                                top:          -4, right:   -4,
                                background:   T.danger,
                                color:        '#fff',
                                fontSize:     9,
                                fontWeight:   700,
                                width:        16, height:  16,
                                borderRadius: '50%',
                                display:      'flex',
                                alignItems:   'center',
                                justifyContent: 'center',
                                border:       `2px solid ${T.cardBg}`,
                            }}>
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </button>

                    {/* date */}
                    <div style={{ fontSize: 12, color: T.textMuted,
                                  whiteSpace: 'nowrap' }}>
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </div>
                </header>

                {/* content */}
                <main style={{
                    flex:      1,
                    overflowY: 'auto',
                    padding:   '1.75rem',
                }}>
                    {children}
                </main>
            </div>

            {/* ── COMMAND PALETTE ───────────────────── */}
            {cmdOpen && (
                <div style={{
                    position:       'fixed',
                    inset:          0,
                    background:     'rgba(15,23,41,0.5)',
                    backdropFilter: 'blur(4px)',
                    display:        'flex',
                    alignItems:     'flex-start',
                    justifyContent: 'center',
                    paddingTop:     '15vh',
                    zIndex:         9999,
                    animation:      'fadeIn 0.15s ease',
                }} onClick={() => setCmdOpen(false)}>
                    <div style={{
                        background:   T.cardBg,
                        borderRadius: T.radiusXl,
                        width:        '100%',
                        maxWidth:     520,
                        boxShadow:    T.shadowXl,
                        overflow:     'hidden',
                        animation:    'slideUp 0.2s ease',
                        border:       `1px solid ${T.border}`,
                    }} onClick={e => e.stopPropagation()}>
                        {/* search input */}
                        <div style={{
                            display:     'flex',
                            alignItems:  'center',
                            gap:         10,
                            padding:     '14px 16px',
                            borderBottom:`1px solid ${T.border}`,
                        }}>
                            <span style={{ fontSize: 16,
                                           color: T.textMuted }}>🔍</span>
                            <input
                                ref={searchRef}
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search or type a command..."
                                style={{
                                    flex:       1,
                                    border:     'none',
                                    outline:    'none',
                                    fontSize:   14,
                                    color:      T.textPri,
                                    background: 'transparent',
                                }}
                            />
                            <kbd style={{
                                background:   T.inputBg,
                                border:       `1px solid ${T.border}`,
                                borderRadius: 4,
                                padding:      '2px 6px',
                                fontSize:     11,
                                color:        T.textMuted,
                            }}>ESC</kbd>
                        </div>

                        {/* results */}
                        <div style={{ maxHeight: 320, overflowY: 'auto',
                                      padding: '6px' }}>
                            {filteredCmds.length === 0 ? (
                                <p style={{ textAlign: 'center',
                                            color: T.textMuted,
                                            padding: '2rem',
                                            fontSize: 13 }}>
                                    No results found
                                </p>
                            ) : (
                                filteredCmds.map((cmd, i) => (
                                    <button key={i}
                                        onClick={() => {
                                            cmd.action();
                                            setCmdOpen(false);
                                            setSearch('');
                                        }}
                                        style={{
                                            display:      'flex',
                                            alignItems:   'center',
                                            gap:          12,
                                            width:        '100%',
                                            padding:      '10px 12px',
                                            borderRadius: T.radius,
                                            background:   'transparent',
                                            border:       'none',
                                            color:        T.textPri,
                                            fontSize:     13,
                                            cursor:       'pointer',
                                            textAlign:    'left',
                                            transition:   'background 0.1s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = T.accentLight}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span style={{
                                            width:          32, height:     32,
                                            background:     T.inputBg,
                                            borderRadius:   T.radiusSm,
                                            display:        'flex',
                                            alignItems:     'center',
                                            justifyContent: 'center',
                                            fontSize:       15,
                                            flexShrink:     0,
                                        }}>
                                            {cmd.icon}
                                        </span>
                                        {cmd.label}
                                    </button>
                                ))
                            )}
                        </div>

                        <div style={{
                            padding:     '8px 16px',
                            borderTop:   `1px solid ${T.border}`,
                            fontSize:    11,
                            color:       T.textMuted,
                            display:     'flex',
                            gap:         16,
                        }}>
                            <span>↑↓ navigate</span>
                            <span>↵ select</span>
                            <span>ESC close</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
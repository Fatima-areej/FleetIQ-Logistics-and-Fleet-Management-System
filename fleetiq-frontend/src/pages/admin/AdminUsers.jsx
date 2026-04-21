import { useEffect, useState, useCallback } from 'react';
import { T } from '../../styles/theme';
import API from '../../api/axios';
import Btn from '../../components/ui/Btn';
import Modal from '../../components/ui/Modal';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';
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

function Th({ children }) {
    return (
        <th style={{
            textAlign: 'left', padding: '10px 14px',
            fontSize: 11, fontWeight: 600, color: T.textMuted,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
            background: T.pageBg, fontFamily: T.fontBody,
        }}>
            {children}
        </th>
    );
}

function Td({ children, style = {} }) {
    return (
        <td style={{
            padding: '11px 14px', fontSize: 13, color: T.textPri,
            borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
            fontFamily: T.fontBody, ...style,
        }}>
            {children}
        </td>
    );
}

const ROLE_STYLE = {
    admin:   { color: '#7C3AED', bg: '#F5F3FF' },
    manager: { color: T.accent,  bg: T.accentLight },
    driver:  { color: T.success, bg: T.successLight },
};

export default function AdminUsers() {
    const [users,       setUsers]       = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [msg,         setMsg]         = useState(null);
    const [filterRole,  setFilterRole]  = useState('all');
    const [filterActive,setFilterActive]= useState('all');
    const [search,      setSearch]      = useState('');
    const [createModal, setCreateModal] = useState(false);
    const [newUser,     setNewUser]     = useState({
        name: '', email: '', password: '',
        role: 'manager', license_number: '', experience_years: '',
    });

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await API.get('/org/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const createUser = async () => {
        try {
            await API.post('/org/users', newUser);
            setCreateModal(false);
            setNewUser({ name: '', email: '', password: '',
                         role: 'manager', license_number: '',
                         experience_years: '' });
            showMsg('User created successfully.');
            fetchUsers();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to create user.', false);
        }
    };

    const toggleActive = async (user_id, is_active) => {
        try {
            const endpoint = is_active
                ? `/org/users/${user_id}/deactivate`
                : `/org/users/${user_id}/reactivate`;
            await API.patch(endpoint);
            showMsg(is_active ? 'User deactivated.' : 'User reactivated.');
            fetchUsers();
        } catch (err) {
            showMsg('Failed.', false);
        }
    };

    const filtered = users.filter(u => {
        if (filterRole !== 'all' && u.role !== filterRole) return false;
        if (filterActive === 'active'   && !u.is_active) return false;
        if (filterActive === 'inactive' && u.is_active)  return false;
        if (search) {
            const q = search.toLowerCase();
            if (!u.name?.toLowerCase().includes(q) &&
                !u.email?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const stats = {
        total:     users.length,
        admins:    users.filter(u => u.role === 'admin').length,
        managers:  users.filter(u => u.role === 'manager').length,
        drivers:   users.filter(u => u.role === 'driver').length,
        inactive:  users.filter(u => !u.is_active).length,
    };

    return (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {msg && <Toast msg={msg} />}

            {/* ── STATS ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 12, marginBottom: '1.5rem',
            }}>
                {[
                    { label: 'Total Users',  value: stats.total,    color: T.textPri  },
                    { label: 'Admins',       value: stats.admins,   color: '#7C3AED'  },
                    { label: 'Managers',     value: stats.managers, color: T.accent   },
                    { label: 'Drivers',      value: stats.drivers,  color: T.success  },
                    { label: 'Inactive',     value: stats.inactive, color: T.textMuted},
                ].map(s => (
                    <Card key={s.label} style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: 11, color: T.textMuted,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.06em', fontWeight: 600 }}>
                            {s.label}
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800,
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
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <span style={{
                            position: 'absolute', left: 10,
                            top: '50%', transform: 'translateY(-50%)',
                            color: T.textMuted, fontSize: 13,
                        }}>🔍</span>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email..."
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

                    {/* role tabs */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        {['all','admin','manager','driver'].map(r => (
                            <button key={r}
                                onClick={() => setFilterRole(r)}
                                style={{
                                    padding: '6px 12px', fontSize: 12,
                                    borderRadius: T.radius, cursor: 'pointer',
                                    fontWeight: filterRole === r ? 600 : 400,
                                    background: filterRole === r
                                        ? T.accentLight : 'transparent',
                                    color: filterRole === r ? T.accent : T.textSec,
                                    border: `1px solid ${filterRole === r
                                        ? T.accent + '30' : T.border}`,
                                    transition: 'all 0.15s',
                                    fontFamily: T.fontBody,
                                }}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* active filter */}
                    <select value={filterActive}
                        onChange={e => setFilterActive(e.target.value)}
                        style={{
                            padding: '7px 10px', fontSize: 12,
                            border: `1px solid ${T.border}`,
                            borderRadius: T.radius, background: T.inputBg,
                            color: T.textSec, outline: 'none',
                            cursor: 'pointer', fontFamily: T.fontBody,
                        }}>
                        <option value="all">All status</option>
                        <option value="active">Active only</option>
                        <option value="inactive">Inactive only</option>
                    </select>

                    <div style={{ marginLeft: 'auto' }}>
                        <Btn onClick={() => setCreateModal(true)} icon="＋">
                            Add User
                        </Btn>
                    </div>
                </div>
            </Card>

            {/* ── TABLE ── */}
            <Card>
                <div style={{
                    padding: '10px 14px',
                    borderBottom: `1px solid ${T.border}`,
                    fontSize: 12, color: T.textMuted,
                }}>
                    Showing {filtered.length} of {users.length} users
                </div>

                {loading ? (
                    <div style={{ padding: '1.5rem' }}>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} style={{ marginBottom: 10 }}>
                                <SkeletonCard height={44} />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
                        <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
                            No users match your filters
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%',
                                        borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <Th>User</Th>
                                    <Th>Role</Th>
                                    <Th>Status</Th>
                                    <Th>Last Login</Th>
                                    <Th>Deliveries</Th>
                                    <Th>Rating</Th>
                                    <Th>Joined</Th>
                                    <Th>Actions</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u, i) => {
                                    const roleStyle = ROLE_STYLE[u.role] ||
                                        { color: T.textMuted, bg: T.pageBg };
                                    return (
                                        <tr key={u.user_id}
                                            style={{ transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.pageBg}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <Td>
                                                <div style={{ display: 'flex',
                                                              alignItems: 'center',
                                                              gap: 10 }}>
                                                    <div style={{
                                                        width: 34, height: 34,
                                                        borderRadius: '50%',
                                                        background: roleStyle.bg,
                                                        color: roleStyle.color,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                    }}>
                                                        {u.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600,
                                                                      fontSize: 13,
                                                                      color: T.textPri }}>
                                                            {u.name}
                                                        </div>
                                                        <div style={{ fontSize: 11,
                                                                      color: T.textMuted }}>
                                                            {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Td>
                                            <Td>
                                                <span style={{
                                                    padding: '3px 10px',
                                                    borderRadius: T.radiusFull,
                                                    fontSize: 11, fontWeight: 600,
                                                    color: roleStyle.color,
                                                    background: roleStyle.bg,
                                                }}>
                                                    {u.role}
                                                </span>
                                            </Td>
                                            <Td>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center', gap: 5,
                                                    padding: '3px 10px',
                                                    borderRadius: T.radiusFull,
                                                    fontSize: 11, fontWeight: 600,
                                                    color: u.is_active ? T.success : T.textMuted,
                                                    background: u.is_active
                                                        ? T.successLight : T.pageBg,
                                                }}>
                                                    <span style={{
                                                        width: 5, height: 5,
                                                        borderRadius: '50%',
                                                        background: u.is_active
                                                            ? T.success : T.textMuted,
                                                    }} />
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </Td>
                                            <Td style={{ color: T.textSec }}>
                                                {u.last_login
                                                    ? new Date(u.last_login)
                                                        .toLocaleDateString()
                                                    : 'Never'}
                                            </Td>
                                            <Td style={{ color: T.textSec }}>
                                                {u.total_deliveries ?? '—'}
                                            </Td>
                                            <Td>
                                                {u.rating ? (
                                                    <span style={{
                                                        fontWeight: 600,
                                                        color: parseFloat(u.rating) >= 4.5
                                                            ? T.success : T.warning,
                                                    }}>
                                                        ★ {u.rating}
                                                    </span>
                                                ) : '—'}
                                            </Td>
                                            <Td style={{ color: T.textSec }}>
                                                {new Date(u.created_at)
                                                    .toLocaleDateString()}
                                            </Td>
                                            <Td>
                                                {u.role !== 'admin' && (
                                                    <Btn
                                                        size="sm"
                                                        variant={u.is_active
                                                            ? 'secondary' : 'primary'}
                                                        color={u.is_active
                                                            ? T.danger : T.success}
                                                        onClick={() => toggleActive(
                                                            u.user_id, u.is_active
                                                        )}>
                                                        {u.is_active
                                                            ? 'Deactivate'
                                                            : 'Reactivate'}
                                                    </Btn>
                                                )}
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* ── CREATE USER MODAL ── */}
            {createModal && (
                <Modal title="Add New User"
                       onClose={() => setCreateModal(false)}>
                    <FormInput
                        label="Full Name" required
                        value={newUser.name}
                        onChange={v => setNewUser({...newUser, name: v})}
                        placeholder="Ahmed Raza"
                    />
                    <FormInput
                        label="Email" required
                        value={newUser.email}
                        onChange={v => setNewUser({...newUser, email: v})}
                        placeholder="user@company.com"
                        type="email"
                    />
                    <FormInput
                        label="Password" required
                        value={newUser.password}
                        onChange={v => setNewUser({...newUser, password: v})}
                        placeholder="••••••••"
                        type="password"
                        hint="Minimum 8 characters"
                    />
                    <FormSelect
                        label="Role" required
                        value={newUser.role}
                        onChange={v => setNewUser({...newUser, role: v})}
                        options={[
                            { value: 'manager', label: 'Manager' },
                            { value: 'driver',  label: 'Driver'  },
                        ]}
                    />
                    {newUser.role === 'driver' && (
                        <>
                            <FormInput
                                label="License Number"
                                value={newUser.license_number}
                                onChange={v => setNewUser({...newUser,
                                    license_number: v})}
                                placeholder="LHR-2024-12345"
                            />
                            <FormInput
                                label="Experience (years)"
                                value={newUser.experience_years}
                                onChange={v => setNewUser({...newUser,
                                    experience_years: v})}
                                placeholder="3"
                                type="number"
                            />
                        </>
                    )}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Btn onClick={createUser} fullWidth>
                            Create User
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setCreateModal(false)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}
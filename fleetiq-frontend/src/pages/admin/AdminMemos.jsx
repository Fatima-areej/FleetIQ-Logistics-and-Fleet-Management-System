import { useEffect, useState } from 'react';
import { T } from '../../styles/theme';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
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

const ROLE_STYLE = {
    admin:   { color: '#7C3AED', bg: '#F5F3FF' },
    manager: { color: T.accent,  bg: T.accentLight },
    driver:  { color: T.success, bg: T.successLight },
};

export default function AdminMemos() {
    const { user } = useAuth();
    const [threads,     setThreads]     = useState([]);
    const [recipients,  setRecipients]  = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [msg,         setMsg]         = useState(null);
    const [thread,      setThread]      = useState(null);
    const [threadLoad,  setThreadLoad]  = useState(false);
    const [replyBody,   setReplyBody]   = useState('');
    const [composeModal,setComposeModal]= useState(false);
    const [newMemo,     setNewMemo]     = useState({
        receiver_id: '', subject: '', body: '',
    });

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    const fetchMemos = async () => {
        try {
            setLoading(true);
            const [threadsRes, recipRes] = await Promise.all([
                API.get('/memos'),
                API.get('/memos/recipients'),
            ]);
            setThreads(threadsRes.data || []);
            setRecipients(recipRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMemos(); }, []);

    const openThread = async (memo_id) => {
        setThreadLoad(true);
        try {
            const res = await API.get(`/memos/${memo_id}`);
            setThread(res.data);
            setReplyBody('');
        } catch (err) {
            console.error(err);
        } finally {
            setThreadLoad(false);
        }
    };

    const sendReply = async () => {
        if (!replyBody.trim()) return;
        try {
            await API.post(`/memos/${thread.memo.memo_id}/reply`,
                { body: replyBody });
            setReplyBody('');
            openThread(thread.memo.memo_id);
            showMsg('Reply sent.');
            fetchMemos();
        } catch (err) {
            showMsg('Failed to send reply.', false);
        }
    };

    const sendMemo = async () => {
        try {
            await API.post('/memos', newMemo);
            setComposeModal(false);
            setNewMemo({ receiver_id: '', subject: '', body: '' });
            showMsg('Memo sent.');
            fetchMemos();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed.', false);
        }
    };

    const unread = threads.filter(m =>
        m.thread_unread === true || m.thread_unread === 1
        || (m.thread_unread == null && !m.is_read)
    ).length;

    return (
        <div style={{ animation: 'fadeIn 0.2s ease',
                      display: 'flex', gap: 16, height: 'calc(100vh - 120px)' }}>
            {msg && <Toast msg={msg} />}

            {/* ── LEFT PANEL ── */}
            <div style={{ width: 340, flexShrink: 0,
                          display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Btn onClick={() => setComposeModal(true)}
                         fullWidth icon="✏️">
                        Compose
                    </Btn>
                </div>

                <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 2,
                }}>
                    Conversations{unread > 0 ? ` · ${unread} unread` : ''}
                </div>

                {/* memo list */}
                <div style={{ flex: 1, overflowY: 'auto',
                              display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <SkeletonCard key={i} height={72} />
                        ))
                    ) : threads.length === 0 ? (
                        <Card style={{ padding: '2rem', textAlign: 'center' }}>
                            <p style={{ color: T.textMuted, fontSize: 13,
                                        margin: 0 }}>
                                No conversations yet
                            </p>
                        </Card>
                    ) : (
                        threads.map((m, i) => {
                            const isActive = thread?.memo?.memo_id === m.memo_id;
                            const cr = m.counterpart_role || (m.sender_id === user?.user_id ? m.receiver_role : m.sender_role);
                            const roleStyle = ROLE_STYLE[cr] || { color: T.textMuted, bg: T.pageBg };
                            const hasUnread = m.thread_unread === true || m.thread_unread === 1
                                || (m.thread_unread == null && !m.is_read);
                            const listDate = m.last_activity_at || m.created_at;

                            return (
                                <div key={i}
                                    onClick={() => openThread(m.memo_id)}
                                    style={{
                                        padding: '12px',
                                        background: isActive ? T.accentLight : T.cardBg,
                                        border: `1px solid ${isActive
                                            ? T.accent + '40' : T.border}`,
                                        borderRadius: T.radius,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        borderLeft: hasUnread
                                            ? `3px solid ${T.accent}`
                                            : `3px solid transparent`,
                                    }}
                                    onMouseEnter={e => {
                                        if (!isActive)
                                            e.currentTarget.style.borderColor = T.accent + '30';
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive)
                                            e.currentTarget.style.borderColor = T.border;
                                    }}>
                                    <div style={{ display: 'flex',
                                                  justifyContent: 'space-between',
                                                  alignItems: 'flex-start',
                                                  marginBottom: 4 }}>
                                        <div style={{ display: 'flex',
                                                      alignItems: 'center', gap: 6 }}>
                                            <span style={{
                                                padding: '1px 7px',
                                                borderRadius: T.radiusFull,
                                                fontSize: 10, fontWeight: 600,
                                                color: roleStyle.color,
                                                background: roleStyle.bg,
                                            }}>
                                                {cr}
                                            </span>
                                            <span style={{ fontSize: 12,
                                                           fontWeight: 500,
                                                           color: T.textPri }}>
                                                {m.counterpart_name || (m.sender_id === user?.user_id ? m.receiver_name : m.sender_name)}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: 10,
                                                       color: T.textMuted,
                                                       whiteSpace: 'nowrap' }}>
                                            {new Date(listDate)
                                                .toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: 12,
                                        fontWeight: hasUnread ? 600 : 400,
                                        color: T.textPri,
                                        marginBottom: 2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {m.subject}
                                    </div>
                                    {hasUnread && (
                                        <span style={{
                                            display: 'inline-block',
                                            width: 6, height: 6,
                                            borderRadius: '50%',
                                            background: T.accent,
                                        }} />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL (thread view) ── */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {!thread ? (
                    <Card style={{
                        height: '100%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 12,
                    }}>
                        <div style={{ fontSize: 40 }}>✉️</div>
                        <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
                            Select a memo to read
                        </p>
                    </Card>
                ) : threadLoad ? (
                    <Card style={{ height: '100%', padding: '1.5rem' }}>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} style={{ marginBottom: 12 }}>
                                <SkeletonCard height={80} />
                            </div>
                        ))}
                    </Card>
                ) : (
                    <Card style={{
                        height: '100%', display: 'flex',
                        flexDirection: 'column', overflow: 'hidden',
                    }}>
                        {/* thread header */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: `1px solid ${T.border}`,
                        }}>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700,
                                         color: T.textPri, fontFamily: T.fontHead }}>
                                {thread.memo.subject}
                            </h3>
                            <div style={{ display: 'flex', gap: 12,
                                          marginTop: 4, fontSize: 12,
                                          color: T.textMuted }}>
                                <span>From: <strong style={{ color: T.textSec }}>
                                    {thread.memo.sender_name}
                                </strong></span>
                                <span>To: <strong style={{ color: T.textSec }}>
                                    {thread.memo.receiver_name}
                                </strong></span>
                                <span>{new Date(thread.memo.created_at)
                                    .toLocaleString()}</span>
                            </div>
                        </div>

                        {/* messages */}
                        <div style={{ flex: 1, overflowY: 'auto',
                                      padding: '1.25rem 1.5rem',
                                      display: 'flex',
                                      flexDirection: 'column', gap: 12 }}>
                            {/* original */}
                            <MemoMessage
                                name={thread.memo.sender_name}
                                role={thread.memo.sender_role}
                                body={thread.memo.body}
                                time={thread.memo.created_at}
                                isOwn={thread.memo.sender_id === user?.user_id}
                            />
                            {/* replies */}
                            {thread.replies?.map((r, i) => (
                                <MemoMessage key={i}
                                    name={r.sender_name}
                                    role={r.sender_role}
                                    body={r.body}
                                    time={r.created_at}
                                    isOwn={r.sender_id === user?.user_id}
                                />
                            ))}
                        </div>

                        {/* reply box */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: `1px solid ${T.border}`,
                        }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <textarea
                                    value={replyBody}
                                    onChange={e => setReplyBody(e.target.value)}
                                    placeholder="Write a reply..."
                                    rows={2}
                                    style={{
                                        flex: 1, padding: '9px 12px',
                                        background: T.inputBg,
                                        border: `1.5px solid ${T.border}`,
                                        borderRadius: T.radius,
                                        color: T.textPri, fontSize: 13,
                                        resize: 'none', outline: 'none',
                                        fontFamily: T.fontBody,
                                    }}
                                    onFocus={e => e.target.style.borderColor = T.accent}
                                    onBlur={e => e.target.style.borderColor = T.border}
                                />
                                <Btn onClick={sendReply}
                                     disabled={!replyBody.trim()}>
                                    Send
                                </Btn>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* ── COMPOSE MODAL ── */}
            {composeModal && (
                <Modal title="New Memo"
                       onClose={() => setComposeModal(false)}>
                    {user?.role === 'driver' && recipients.length === 0 && (
                        <p style={{
                            margin: '0 0 12px',
                            fontSize: 12,
                            color: T.textMuted,
                            lineHeight: 1.5,
                        }}>
                            No managers are available yet. Memos to managers use warehouses from your
                            active shipment — start or accept a shipment, then try again.
                        </p>
                    )}
                    <FormSelect
                        label="To" required
                        value={newMemo.receiver_id}
                        onChange={v => setNewMemo({...newMemo, receiver_id: v})}
                        placeholder="— select recipient —"
                        options={recipients.map(r => ({
                            value: r.user_id,
                            label: `${r.name} (${r.role}) — ${r.email}`,
                        }))}
                    />
                    <FormInput
                        label="Subject" required
                        value={newMemo.subject}
                        onChange={v => setNewMemo({...newMemo, subject: v})}
                        placeholder="Memo subject"
                    />
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: 'block', fontSize: 12, fontWeight: 600,
                            color: T.textSec, marginBottom: 6,
                            letterSpacing: '0.04em', textTransform: 'uppercase',
                        }}>
                            Message <span style={{ color: T.danger }}>*</span>
                        </label>
                        <textarea
                            value={newMemo.body}
                            onChange={e => setNewMemo({...newMemo, body: e.target.value})}
                            placeholder="Write your message..."
                            rows={5}
                            style={{
                                width: '100%', padding: '9px 12px',
                                background: T.inputBg,
                                border: `1.5px solid ${T.border}`,
                                borderRadius: T.radius,
                                color: T.textPri, fontSize: 13,
                                resize: 'vertical', outline: 'none',
                                fontFamily: T.fontBody, boxSizing: 'border-box',
                            }}
                            onFocus={e => e.target.style.borderColor = T.accent}
                            onBlur={e => e.target.style.borderColor = T.border}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <Btn onClick={sendMemo} fullWidth
                             disabled={!newMemo.receiver_id ||
                                       !newMemo.subject ||
                                       !newMemo.body}>
                            Send Memo
                        </Btn>
                        <Btn variant="secondary" fullWidth
                             onClick={() => setComposeModal(false)}>
                            Cancel
                        </Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function MemoMessage({ name, role, body, time, isOwn }) {
    const roleStyle = ROLE_STYLE[role] || { color: T.textMuted, bg: T.pageBg };
    return (
        <div style={{
            display: 'flex', gap: 10,
            flexDirection: isOwn ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: roleStyle.bg, color: roleStyle.color,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, fontWeight: 700,
                flexShrink: 0,
            }}>
                {name?.charAt(0)}
            </div>
            <div style={{ maxWidth: '75%' }}>
                <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    marginBottom: 4,
                    flexDirection: isOwn ? 'row-reverse' : 'row',
                }}>
                    <span style={{ fontSize: 12, fontWeight: 600,
                                   color: T.textPri }}>
                        {name}
                    </span>
                    <span style={{
                        padding: '1px 7px', borderRadius: T.radiusFull,
                        fontSize: 10, fontWeight: 600,
                        color: roleStyle.color, background: roleStyle.bg,
                    }}>
                        {role}
                    </span>
                    <span style={{ fontSize: 10, color: T.textMuted }}>
                        {new Date(time).toLocaleString()}
                    </span>
                </div>
                <div style={{
                    padding: '10px 14px',
                    background: isOwn ? T.accentLight : T.pageBg,
                    border: `1px solid ${isOwn ? T.accent + '30' : T.border}`,
                    borderRadius: isOwn
                        ? `${T.radiusLg} 4px ${T.radiusLg} ${T.radiusLg}`
                        : `4px ${T.radiusLg} ${T.radiusLg} ${T.radiusLg}`,
                    fontSize: 13, color: T.textPri, lineHeight: 1.6,
                }}>
                    {body}
                </div>
            </div>
        </div>
    );
}
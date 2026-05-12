/*
react hooks:
useState: to store changing data inside a component
useEffect: to run code automatically when component loads, or data changes 
useRef: stores a reference to something without re-rendering.

*/

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';         //for navigation between pages
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { T } from '../styles/theme';

//animated network canvas 
function NetworkCanvas() {                          //creates a React component
    const canvasRef = useRef(null);     //reference to the canvas DOM element

    useEffect(() => {           //runs once when component mounts, sets up the canvas animation
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');        //ctx is drawing tool
        let animId;
        let W, H;

        const resize = () => {
            W = canvas.width  = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);  //if browser window resizes, adjust canvas size accordingly

        // nodes
        const COUNT = 38;
        const nodes = Array.from({ length: COUNT }, () => ({
            x:   Math.random() * W,                 //x position
            y:   Math.random() * H,                 //y position
            vx:  (Math.random() - 0.5) * 0.4,       //horizontal velocity
            vy:  (Math.random() - 0.5) * 0.4,       //vertical velocity
            r:   Math.random() * 2.5 + 1.5,         //radius
            pulse: Math.random() * Math.PI * 2,     //glow animation phase 
            pulseSpeed: 0.015 + Math.random() * 0.02,   //glow animation speed
        }));

        // shipment packets traveling along edges
        const packets = Array.from({ length: 8 }, () => ({
            fromIdx: Math.floor(Math.random() * COUNT),     //start node index
            toIdx:   Math.floor(Math.random() * COUNT),     //end node index
            t:       Math.random(),                         //travel progress along the edge
            speed:   0.003 + Math.random() * 0.004,         //speed of the packet
        }));

        const CONNECT_DIST = 160;   //nodes only connect is close enough
        const ACCENT = '79, 70, 229'; // indigo rgb

        const draw = () => {            //main animation loop that runs continously 
            ctx.clearRect(0, 0, W, H);

            // grid lines background
            ctx.strokeStyle = 'rgba(15,23,42,0.06)';
            ctx.lineWidth = 1;
            const GRID = 50;
            for (let x = 0; x < W; x += GRID) {
                ctx.beginPath();
                ctx.moveTo(x, 0); ctx.lineTo(x, H);
                ctx.stroke();
            }
            for (let y = 0; y < H; y += GRID) {
                ctx.beginPath();
                ctx.moveTo(0, y); ctx.lineTo(W, y);
                ctx.stroke();
            }

            // update + draw nodes
            nodes.forEach(n => {
                n.x += n.vx; n.y += n.vy;       //move nodes 
                n.pulse += n.pulseSpeed;
                if (n.x < 0 || n.x > W) n.vx *= -1;     //bounce if edge
                if (n.y < 0 || n.y > H) n.vy *= -1;
            });

            // draw edges
            for (let i = 0; i < COUNT; i++) {
                for (let j = i + 1; j < COUNT; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;             //calculate distance bw nodes and compare with connect_dist
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT_DIST) {
                        const alpha = (1 - dist / CONNECT_DIST) * 0.25;     //closer node brighter line
                        ctx.strokeStyle = `rgba(${ACCENT},${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.stroke();
                    }
                }
            }

            // draw nodes
            nodes.forEach(n => {
                const pulse = Math.sin(n.pulse);
                const glow = 0.5 + pulse * 0.3;

                // outer glow ring
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${ACCENT},${0.06 + pulse * 0.04})`;
                ctx.fill();

                // core dot
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${ACCENT},${glow})`;
                ctx.fill();
            });

            // draw packets traveling along edges
            packets.forEach(p => {
                p.t += p.speed;
                if (p.t >= 1) {
                    p.t = 0;
                    p.fromIdx = p.toIdx;
                    p.toIdx = Math.floor(Math.random() * COUNT);
                }
                const from = nodes[p.fromIdx];
                const to   = nodes[p.toIdx];
                const x = from.x + (to.x - from.x) * p.t;
                const y = from.y + (to.y - from.y) * p.t;

                // trail
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(79,70,229,0.95)';
                ctx.fill();

                // glow
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${ACCENT},0.35)`;
                ctx.fill();
            });

            animId = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas ref={canvasRef} style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
        }} />
    );
}


// stat ticker
function StatTicker() {
    const [stats, setStats] = useState([
        { label: 'Active shipments',  value: '—' },
        { label: 'Fleet vehicles',    value: '—' },
        { label: 'Warehouses online', value: '—' },
        { label: 'Deliveries today',  value: '—' },
    ]);
    const [idx, setIdx] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        fetch('http://localhost:5000/api/analytics/public-stats')
            .then(r => r.json())
            .then(d => setStats([
                { label: 'Active shipments',  value: d.active_shipments.toLocaleString()  },
                { label: 'Fleet vehicles',    value: d.fleet_vehicles.toLocaleString()    },
                { label: 'Warehouses online', value: d.warehouses_online.toLocaleString() },
                { label: 'Deliveries today',  value: d.deliveries_today.toLocaleString()  },
            ]))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setIdx(i => (i + 1) % stats.length);
                setVisible(true);
            }, 300);
        }, 2400);
        return () => clearInterval(interval);
    }, [stats.length]);

    const s = stats[idx];
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
        }}>
            <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#4F46E5',
                boxShadow: '0 0 8px #4F46E5',
                animation: 'pulse 1.5s infinite',
            }} />
            <span style={{
                fontSize: 11, color: T.textMuted,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: T.fontBody,
            }}>
                {s.label}
            </span>
            <span style={{
                fontSize: 13, color: T.textPri,
                fontWeight: 600, fontFamily: T.fontBody,
            }}>
                {s.value}
            </span>
        </div>
    );
}

function signupLabelSx(isFocused) {
    return {
        display: 'block', fontSize: 11, fontWeight: 600,
        color: isFocused ? T.accent : T.textMuted,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 8, transition: 'color 0.2s',
    };
}

function signupInputSx(isFocused) {
    return {
        width: '100%',
        padding: '13px 16px',
        background: T.inputBg,
        border: `1px solid ${isFocused ? T.borderFocus : T.border}`,
        borderRadius: 10,
        color: T.textPri, fontSize: 14,
        outline: 'none', boxSizing: 'border-box',
        fontFamily: T.fontBody,
        transition: 'border-color 0.2s, background 0.2s',
    };
}

// main login component 
export default function Login() {
    const [mode, setMode] = useState('signin'); // 'signin' | 'signup'

    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [focused,  setFocused]  = useState(null);
    const [entered,  setEntered]  = useState(false);

    const [orgName, setOrgName] = useState('');
    const [industry, setIndustry] = useState('');
    const [phone, setPhone] = useState('');
    const [adminName, setAdminName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [authorized, setAuthorized] = useState(false);

    const { login }  = useAuth();
    const navigate   = useNavigate();

    useEffect(() => {
        // stagger entrance
        setTimeout(() => setEntered(true), 80);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await API.post('/auth/login', { email, password });
            login(res.data.user, res.data.token);
            const role = res.data.user.role;
            if (role === 'admin')   navigate('/admin');
            if (role === 'manager') navigate('/manager');
            if (role === 'driver')  navigate('/driver');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await API.post('/auth/register-organization', {
                organization_name: orgName,
                industry: industry || undefined,
                phone: phone || undefined,
                admin_name: adminName,
                email: signupEmail,
                password: signupPassword,
                confirm_password: confirmPassword,
                authorized,
            });
            login(res.data.user, res.data.token);
            navigate('/admin');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const switchToSignin = () => {
        setMode('signin');
        setError('');
        setOrgName('');
        setIndustry('');
        setPhone('');
        setAdminName('');
        setSignupEmail('');
        setSignupPassword('');
        setConfirmPassword('');
        setAuthorized(false);
    };

    const switchToSignup = () => {
        setMode('signup');
        setError('');
        setEmail('');
        setPassword('');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: T.pageBg,
            backgroundImage: T.pageBgGradient,
            backgroundAttachment: 'fixed',
            fontFamily: T.fontBody,
            padding: 'clamp(16px, 3vw, 28px)',
            boxSizing: 'border-box',
        }}>
            <style>{`
                @keyframes pulse {
                    0%,100% { opacity:1; transform:scale(1);   }
                    50%      { opacity:.5; transform:scale(1.4); }
                }
                @keyframes slideRight {
                    from { opacity:0; transform:translateX(-24px); }
                    to   { opacity:1; transform:translateX(0);     }
                }
                @keyframes slideLeft {
                    from { opacity:0; transform:translateX(24px);  }
                    to   { opacity:1; transform:translateX(0);     }
                }
                @keyframes fadeUp {
                    from { opacity:0; transform:translateY(16px); }
                    to   { opacity:1; transform:translateY(0);    }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes scanline {
                    0%   { transform:translateY(-100%); }
                    100% { transform:translateY(100vh); }
                }
                .login-shell { display: flex; gap: clamp(20px, 3vw, 36px); align-items: stretch;
                    max-width: 1120px; margin: 0 auto; min-height: calc(100vh - 56px); }
                .login-input::placeholder { color: ${T.textMuted}; }
                .login-input::-webkit-input-placeholder { color: ${T.textMuted}; }
                @media (max-width: 900px) {
                    .login-shell { flex-direction: column; }
                    .login-left { min-height: 280px; }
                    .login-right { width: 100% !important; max-width: 100% !important; }
                }
            `}</style>

            <div className="login-shell">
            {/* ── LEFT — network visualization ── */}
            <div className="login-left" style={{
                flex: 1, position: 'relative',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '2.25rem 2.5rem',
                opacity: entered ? 1 : 0,
                transition: 'opacity 0.8s ease 0.1s',
                borderRadius: T.radiusXl,
                border: `1px solid ${T.border}`,
                background: `linear-gradient(145deg, ${T.cardBg} 0%, ${T.accentSoft} 55%, ${T.inputBg} 100%)`,
                boxShadow: T.shadowLg,
            }}>
                <NetworkCanvas />

                {/* subtle mesh */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(79,70,229,0.08), transparent 55%)',
                    pointerEvents: 'none', zIndex: 1,
                }} />

                {/* right edge fade into form panel */}
                <div style={{
                    position: 'absolute', top: 0, right: 0,
                    width: 100, height: '100%',
                    background: `linear-gradient(to right, transparent, ${T.pageBg})`,
                    pointerEvents: 'none', zIndex: 2,
                    opacity: 0.85,
                }} />

                {/* logo top left */}
                <div style={{ position: 'relative', zIndex: 3 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        animation: entered ? 'slideRight 0.6s ease 0.2s both' : 'none',
                    }}>
                        <div style={{
                            width: 40, height: 40,
                            background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentMuted} 100%)`,
                            borderRadius: T.radiusSm,
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 18,
                            boxShadow: T.shadowMd,
                            color: T.textInverse,
                        }}>
                            ⬡
                        </div>
                        <span style={{
                            fontFamily: T.fontHead,
                            fontSize: 22, fontWeight: 800,
                            color: T.textPri,
                            letterSpacing: '0.06em',
                        }}>
                            FLEETIQ
                        </span>
                    </div>
                </div>

                {/* hero text center */}
                <div style={{
                    position: 'relative', zIndex: 3,
                    animation: entered ? 'slideRight 0.7s ease 0.35s both' : 'none',
                }}>
                    <div style={{
                        fontFamily: T.fontHead,
                        fontSize: 'clamp(40px, 5vw, 64px)',
                        fontWeight: 800,
                        lineHeight: 0.95,
                        color: T.textPri,
                        marginBottom: '1.25rem',
                        letterSpacing: '-0.02em',
                    }}>
                        Fleet and<br />
                        <span style={{
                            background: `linear-gradient(120deg, ${T.accent} 0%, ${T.accentMuted} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>logistics</span><br />
                        intelligence
                    </div>
                    <p style={{
                        fontSize: 14, color: T.textSec,
                        maxWidth: 360, lineHeight: 1.65, margin: 0,
                    }}>
                        Real-time fleet tracking, shipment management,
                        and geo-spatial analytics for modern logistics operations.
                    </p>
                </div>

                {/* stats ticker bottom */}
                <div style={{ position: 'relative', zIndex: 3 }}>
                    <div style={{
                        animation: entered ? 'slideRight 0.6s ease 0.5s both' : 'none',
                    }}>
                        <div style={{
                            fontSize: 10, color: T.textMuted,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase', marginBottom: 10,
                            fontWeight: 600,
                        }}>
                            Live network
                        </div>
                        <StatTicker />
                    </div>
                </div>
            </div>

            {/* ── RIGHT — login / sign-up ── */}
            <div className="login-right" style={{
                width: 'min(440px, 100%)',
                flexShrink: 0,
                background: T.cardBg,
                border: `1px solid ${T.border}`,
                borderRadius: T.radiusXl,
                boxShadow: T.shadowXl,
                display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-start',
                padding: '2rem 2.25rem',
                position: 'relative',
                opacity: entered ? 1 : 0,
                transform: entered ? 'translateX(0)' : 'translateX(12px)',
                transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
            }}>
                {/* top accent line */}
                <div style={{
                    position: 'absolute', top: 0, left: 24, right: 24,
                    height: 3,
                    borderRadius: '0 0 6px 6px',
                    background: `linear-gradient(90deg, transparent 0%, ${T.accent} 35%, ${T.accentMuted} 65%, transparent 100%)`,
                    opacity: 0.9,
                }} />

                {/* flex wrapper: auto margins center signin content; collapses for signup */}
                <div style={{ margin: 'auto 0', width: '100%' }}>

                {/* Sign in / Create org toggle */}
                <div style={{
                    display: 'flex',
                    gap: 6,
                    padding: 5,
                    marginBottom: '1.75rem',
                    background: T.inputBg,
                    borderRadius: T.radius,
                    border: `1px solid ${T.border}`,
                    animation: entered ? 'fadeUp 0.6s ease 0.35s both' : 'none',
                }}>
                    <button
                        type="button"
                        onClick={() => { switchToSignin(); }}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: T.radiusSm,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: T.fontBody,
                            background: mode === 'signin' ? T.accent : 'transparent',
                            color: mode === 'signin' ? T.textInverse : T.textSec,
                            boxShadow: mode === 'signin' ? T.shadowMd : 'none',
                            transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                        }}
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        onClick={() => { switchToSignup(); }}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: T.radiusSm,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: T.fontBody,
                            background: mode === 'signup' ? T.accent : 'transparent',
                            color: mode === 'signup' ? T.textInverse : T.textSec,
                            boxShadow: mode === 'signup' ? T.shadowMd : 'none',
                            transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                        }}
                    >
                        New organization
                    </button>
                </div>

                {/* form header */}
                <div style={{
                    marginBottom: mode === 'signin' ? '2rem' : '1.5rem',
                    animation: entered ? 'fadeUp 0.6s ease 0.4s both' : 'none',
                }}>
                    <div style={{
                        fontSize: 11, color: T.accent,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        fontWeight: 600, marginBottom: 10,
                    }}>
                        {mode === 'signin' ? 'Secure access' : 'Company onboarding'}
                    </div>
                    <h2 style={{
                        margin: 0, fontSize: 26, fontWeight: 800,
                        color: T.textPri, fontFamily: T.fontHead,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1,
                    }}>
                        {mode === 'signin' ? 'Sign in to FleetIQ' : 'Create your workspace'}
                    </h2>
                    <p style={{
                        margin: '8px 0 0', fontSize: 13,
                        color: T.textSec,
                        lineHeight: 1.5,
                    }}>
                        {mode === 'signin'
                            ? 'Enter your credentials to access your organization.'
                            : 'Register your company once. You become the admin and can invite managers and drivers from the dashboard.'}
                    </p>
                </div>

                {/* sign-in form */}
                {mode === 'signin' && (
                <form onSubmit={handleSubmit} style={{
                    animation: entered ? 'fadeUp 0.6s ease 0.5s both' : 'none',
                }}>
                    {/* email field */}
                    <div style={{ marginBottom: 18 }}>
                        <label style={{
                            display: 'block', fontSize: 11, fontWeight: 600,
                            color: focused === 'email' ? T.accent : T.textMuted,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            marginBottom: 8,
                            transition: 'color 0.2s',
                        }}>
                            Email address
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="login-input"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused(null)}
                                placeholder="you@company.com"
                                required
                                style={{
                                    width: '100%',
                                    padding: '13px 16px 13px 44px',
                                    background: T.inputBg,
                                    border: `1px solid ${focused === 'email'
                                        ? T.borderFocus
                                        : T.border}`,
                                    borderRadius: 10,
                                    color: T.textPri, fontSize: 14,
                                    outline: 'none', boxSizing: 'border-box',
                                    fontFamily: T.fontBody,
                                    transition: 'border-color 0.2s, background 0.2s',
                                }}
                            />
                            <span style={{
                                position: 'absolute', left: 14,
                                top: '50%', transform: 'translateY(-50%)',
                                fontSize: 16,
                                opacity: focused === 'email' ? 1 : 0.3,
                                transition: 'opacity 0.2s',
                            }}>
                                ✉
                            </span>
                        </div>
                    </div>

                    {/* password field */}
                    <div style={{ marginBottom: 28 }}>
                        <label style={{
                            display: 'block', fontSize: 11, fontWeight: 600,
                            color: focused === 'password' ? T.accent : T.textMuted,
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            marginBottom: 8,
                            transition: 'color 0.2s',
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="login-input"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onFocus={() => setFocused('password')}
                                onBlur={() => setFocused(null)}
                                placeholder="••••••••••"
                                required
                                style={{
                                    width: '100%',
                                    padding: '13px 16px 13px 44px',
                                    background: T.inputBg,
                                    border: `1px solid ${focused === 'password'
                                        ? T.borderFocus
                                        : T.border}`,
                                    borderRadius: 10,
                                    color: T.textPri, fontSize: 14,
                                    outline: 'none', boxSizing: 'border-box',
                                    fontFamily: T.fontBody,
                                    transition: 'border-color 0.2s, background 0.2s',
                                }}
                            />
                            <span style={{
                                position: 'absolute', left: 14,
                                top: '50%', transform: 'translateY(-50%)',
                                fontSize: 16,
                                opacity: focused === 'password' ? 1 : 0.3,
                                transition: 'opacity 0.2s',
                            }}>
                                🔑
                            </span>
                        </div>
                    </div>

                    {/* error */}
                    {error && (
                        <div style={{
                            marginBottom: 16, padding: '10px 14px',
                            background: T.dangerLight,
                            border: `1px solid rgba(220, 38, 38, 0.25)`,
                            borderRadius: T.radiusSm, fontSize: 13,
                            color: T.danger,
                            animation: 'fadeUp 0.2s ease',
                        }}>
                            ⚠ {error}
                        </div>
                    )}

                    {/* submit */}
                    <button type="submit" disabled={loading} style={{
                        width: '100%',
                        padding: '14px',
                        background: loading
                            ? T.accentLight
                            : T.accent,
                        border: 'none',
                        borderRadius: T.radiusSm,
                        color: T.textInverse, fontSize: 14,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: T.fontBody,
                        letterSpacing: '0.04em',
                        boxShadow: loading ? 'none' : T.shadowMd,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                        if (!loading)
                            e.currentTarget.style.background = T.accentHover;
                    }}
                    onMouseLeave={e => {
                        if (!loading)
                            e.currentTarget.style.background = T.accent;
                    }}
                    onMouseDown={e => {
                        if (!loading)
                            e.currentTarget.style.transform = 'scale(0.98)';
                    }}
                    onMouseUp={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                    }}>
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center',
                                           justifyContent: 'center', gap: 10 }}>
                                <span style={{
                                    width: 16, height: 16,
                                    border: '2px solid rgba(255,255,255,0.35)',
                                    borderTop: '2px solid #fff',
                                    borderRadius: '50%',
                                    display: 'inline-block',
                                    animation: 'spin 0.7s linear infinite',
                                }} />
                                Authenticating...
                            </span>
                        ) : (
                            'ACCESS PLATFORM →'
                        )}
                    </button>
                </form>
                )}

                {/* sign-up: new organization + admin */}
                {mode === 'signup' && (
                <form onSubmit={handleSignup} style={{
                    animation: entered ? 'fadeUp 0.6s ease 0.5s both' : 'none',
                }}>
                    <div style={{ marginBottom: 14 }}>
                        <label style={signupLabelSx(focused === 'org')}>Organization name</label>
                        <input
                            className="login-input"
                            value={orgName}
                            onChange={e => setOrgName(e.target.value)}
                            onFocus={() => setFocused('org')}
                            onBlur={() => setFocused(null)}
                            placeholder="e.g. Acme Logistics Ltd"
                            required
                            minLength={2}
                            style={signupInputSx(focused === 'org')}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                        <div>
                            <label style={signupLabelSx(focused === 'ind')}>Industry (optional)</label>
                            <input
                                className="login-input"
                                value={industry}
                                onChange={e => setIndustry(e.target.value)}
                                onFocus={() => setFocused('ind')}
                                onBlur={() => setFocused(null)}
                                placeholder="Freight, retail…"
                                style={signupInputSx(focused === 'ind')}
                            />
                        </div>
                        <div>
                            <label style={signupLabelSx(focused === 'ph')}>Phone (optional)</label>
                            <input
                                className="login-input"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                onFocus={() => setFocused('ph')}
                                onBlur={() => setFocused(null)}
                                placeholder="+1 …"
                                style={signupInputSx(focused === 'ph')}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                        <label style={signupLabelSx(focused === 'adm')}>Your full name</label>
                        <input
                            className="login-input"
                            value={adminName}
                            onChange={e => setAdminName(e.target.value)}
                            onFocus={() => setFocused('adm')}
                            onBlur={() => setFocused(null)}
                            placeholder="Jane Doe"
                            required
                            style={signupInputSx(focused === 'adm')}
                        />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                        <label style={signupLabelSx(focused === 'sem')}>Work email</label>
                        <input
                            className="login-input"
                            type="email"
                            value={signupEmail}
                            onChange={e => setSignupEmail(e.target.value)}
                            onFocus={() => setFocused('sem')}
                            onBlur={() => setFocused(null)}
                            placeholder="you@company.com"
                            required
                            style={signupInputSx(focused === 'sem')}
                        />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                        <label style={signupLabelSx(focused === 'spw')}>Password (min. 8 characters)</label>
                        <input
                            className="login-input"
                            type="password"
                            value={signupPassword}
                            onChange={e => setSignupPassword(e.target.value)}
                            onFocus={() => setFocused('spw')}
                            onBlur={() => setFocused(null)}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            style={signupInputSx(focused === 'spw')}
                        />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={signupLabelSx(focused === 'cpw')}>Confirm password</label>
                        <input
                            className="login-input"
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            onFocus={() => setFocused('cpw')}
                            onBlur={() => setFocused(null)}
                            placeholder="••••••••"
                            required
                            style={signupInputSx(focused === 'cpw')}
                        />
                    </div>
                    {error && (
                        <div style={{
                            marginBottom: 16, padding: '10px 14px',
                            background: T.dangerLight,
                            border: '1px solid rgba(220, 38, 38, 0.25)',
                            borderRadius: T.radiusSm, fontSize: 13,
                            color: T.danger,
                        }}>
                            ⚠ {error}
                        </div>
                    )}
                    <label style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        marginBottom: 18, cursor: 'pointer',
                        fontSize: 12, color: T.textSec,
                        lineHeight: 1.45,
                    }}>
                        <input
                            type="checkbox"
                            checked={authorized}
                            onChange={e => setAuthorized(e.target.checked)}
                            style={{ marginTop: 3, width: 16, height: 16, accentColor: T.accent }}
                        />
                        <span>I confirm I am authorized to create this organization account and accept FleetIQ storing this data to provide the service.</span>
                    </label>
                    <button type="submit" disabled={loading || !authorized} style={{
                        width: '100%',
                        padding: '14px',
                        background: loading || !authorized
                            ? T.accentLight
                            : T.accent,
                        border: 'none',
                        borderRadius: T.radiusSm,
                        color: T.textInverse, fontSize: 14,
                        fontWeight: 700,
                        cursor: loading || !authorized ? 'not-allowed' : 'pointer',
                        fontFamily: T.fontBody,
                        letterSpacing: '0.04em',
                        boxShadow: loading || !authorized ? 'none' : T.shadowMd,
                    }}>
                        {loading ? 'Creating workspace…' : 'CREATE ORGANIZATION & SIGN IN →'}
                    </button>
                </form>
                )}

                {/* test accounts */}
                {mode === 'signin' && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1.25rem',
                    background: T.inputBg,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radiusSm,
                    animation: entered ? 'fadeUp 0.6s ease 0.6s both' : 'none',
                }}>
                    <div style={{
                        fontSize: 10, color: T.textMuted,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        fontWeight: 600, marginBottom: 12,
                    }}>
                        Demo credentials
                    </div>
                    {[
                        { role: 'Admin',   email: 'ahmed@swiftmove.com',  color: T.accent },
                        { role: 'Manager', email: 'sara@swiftmove.com',   color: T.info },
                        { role: 'Driver',  email: 'usman@swiftmove.com',  color: T.success },
                    ].map(a => (
                        <button key={a.role}
                            onClick={() => { setEmail(a.email); setPassword('password123'); }}
                            style={{
                                display: 'flex', alignItems: 'center',
                                gap: 10, width: '100%',
                                padding: '7px 10px',
                                background: 'transparent',
                                border: 'none', borderRadius: 6,
                                cursor: 'pointer', marginBottom: 4,
                                transition: 'background 0.15s',
                                textAlign: 'left',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.accentSoft; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span style={{
                                width: 52, fontSize: 10, fontWeight: 700,
                                color: a.color, letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                fontFamily: T.fontBody,
                            }}>
                                {a.role}
                            </span>
                            <span style={{
                                fontSize: 12, color: T.textSec,
                                fontFamily: T.fontBody,
                            }}>
                                {a.email}
                            </span>
                            <span style={{
                                marginLeft: 'auto', fontSize: 10,
                                color: T.textMuted,
                                fontFamily: T.fontBody,
                            }}>
                                click to fill →
                            </span>
                        </button>
                    ))}
                </div>
                )}

                </div>{/* end auto-margin centering wrapper */}

            </div>
            </div>
        </div>
    );
}
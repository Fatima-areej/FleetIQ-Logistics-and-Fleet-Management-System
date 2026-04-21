import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

// inject fonts
const link1 = document.createElement('link');
link1.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap';
link1.rel = 'stylesheet';
document.head.appendChild(link1);

// ── animated network canvas ──────────────────────────────────
function NetworkCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let W, H;

        const resize = () => {
            W = canvas.width  = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // nodes
        const COUNT = 38;
        const nodes = Array.from({ length: COUNT }, () => ({
            x:   Math.random() * W,
            y:   Math.random() * H,
            vx:  (Math.random() - 0.5) * 0.4,
            vy:  (Math.random() - 0.5) * 0.4,
            r:   Math.random() * 2.5 + 1.5,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.015 + Math.random() * 0.02,
        }));

        // shipment packets traveling along edges
        const packets = Array.from({ length: 8 }, () => ({
            fromIdx: Math.floor(Math.random() * COUNT),
            toIdx:   Math.floor(Math.random() * COUNT),
            t:       Math.random(),
            speed:   0.003 + Math.random() * 0.004,
        }));

        const CONNECT_DIST = 160;
        const ACCENT = '79, 70, 229'; // indigo rgb

        const draw = () => {
            ctx.clearRect(0, 0, W, H);

            // grid lines background
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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
                n.x += n.vx; n.y += n.vy;
                n.pulse += n.pulseSpeed;
                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;
            });

            // draw edges
            for (let i = 0; i < COUNT; i++) {
                for (let j = i + 1; j < COUNT; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT_DIST) {
                        const alpha = (1 - dist / CONNECT_DIST) * 0.25;
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
                ctx.fillStyle = `rgba(255,255,255,0.9)`;
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

// ── stat ticker ──────────────────────────────────────────────
function StatTicker() {
    const stats = [
        { label: 'Active shipments',   value: '2,847'  },
        { label: 'Fleet vehicles',     value: '143'    },
        { label: 'Warehouses online',  value: '28'     },
        { label: 'Deliveries today',   value: '391'    },
    ];
    const [idx, setIdx] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible(false);
            setTimeout(() => {
                setIdx(i => (i + 1) % stats.length);
                setVisible(true);
            }, 300);
        }, 2400);
        return () => clearInterval(interval);
    }, []);

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
                fontSize: 11, color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: 'DM Sans',
            }}>
                {s.label}
            </span>
            <span style={{
                fontSize: 13, color: 'rgba(255,255,255,0.85)',
                fontWeight: 600, fontFamily: 'DM Sans',
            }}>
                {s.value}
            </span>
        </div>
    );
}

// ── main login component ─────────────────────────────────────
export default function Login() {
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [focused,  setFocused]  = useState(null);
    const [entered,  setEntered]  = useState(false);
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

    return (
        <div style={{
            display: 'flex', minHeight: '100vh',
            background: '#060810',
            fontFamily: 'DM Sans, sans-serif',
            overflow: 'hidden',
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
                @keyframes scanline {
                    0%   { transform:translateY(-100%); }
                    100% { transform:translateY(100vh); }
                }
                .login-input::placeholder { color: rgba(255,255,255,0.2); }
                .login-input::-webkit-input-placeholder { color: rgba(255,255,255,0.2); }
            `}</style>

            {/* ── LEFT — network visualization ── */}
            <div style={{
                flex: 1, position: 'relative',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '2.5rem',
                opacity: entered ? 1 : 0,
                transition: 'opacity 0.8s ease 0.1s',
            }}>
                <NetworkCanvas />

                {/* scanline effect */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.03) 50%)',
                    backgroundSize: '100% 4px',
                    pointerEvents: 'none', zIndex: 1,
                }} />

                {/* vignette */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(6,8,16,0.7) 100%)',
                    pointerEvents: 'none', zIndex: 1,
                }} />

                {/* right edge fade into form */}
                <div style={{
                    position: 'absolute', top: 0, right: 0,
                    width: 120, height: '100%',
                    background: 'linear-gradient(to right, transparent, #060810)',
                    pointerEvents: 'none', zIndex: 2,
                }} />

                {/* logo top left */}
                <div style={{ position: 'relative', zIndex: 3 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        animation: entered ? 'slideRight 0.6s ease 0.2s both' : 'none',
                    }}>
                        <div style={{
                            width: 36, height: 36,
                            background: '#4F46E5',
                            borderRadius: 8,
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 18,
                        }}>
                            ⬡
                        </div>
                        <span style={{
                            fontFamily: 'Bebas Neue, sans-serif',
                            fontSize: 22, color: '#fff',
                            letterSpacing: '0.12em',
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
                        fontFamily: 'Bebas Neue, sans-serif',
                        fontSize: 'clamp(52px, 6vw, 80px)',
                        lineHeight: 0.92,
                        color: '#fff',
                        marginBottom: '1.5rem',
                        letterSpacing: '0.04em',
                    }}>
                        SMART<br />
                        <span style={{ color: '#4F46E5' }}>LOGISTICS</span><br />
                        INTELLIGENCE
                    </div>
                    <p style={{
                        fontSize: 13, color: 'rgba(255,255,255,0.4)',
                        maxWidth: 340, lineHeight: 1.7, margin: 0,
                        letterSpacing: '0.02em',
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
                            fontSize: 10, color: 'rgba(255,255,255,0.25)',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase', marginBottom: 10,
                        }}>
                            Live network
                        </div>
                        <StatTicker />
                    </div>
                </div>
            </div>

            {/* ── RIGHT — login form ── */}
            <div style={{
                width: 480, flexShrink: 0,
                background: '#0c0f1d',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', padding: '3rem 3.5rem',
                position: 'relative',
                opacity: entered ? 1 : 0,
                transform: entered ? 'translateX(0)' : 'translateX(20px)',
                transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
            }}>
                {/* top accent line */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 2,
                    background: 'linear-gradient(to right, transparent, #4F46E5, transparent)',
                }} />

                {/* form header */}
                <div style={{
                    marginBottom: '2.5rem',
                    animation: entered ? 'fadeUp 0.6s ease 0.4s both' : 'none',
                }}>
                    <div style={{
                        fontSize: 11, color: '#4F46E5',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        fontWeight: 600, marginBottom: 10,
                    }}>
                        Secure Access Portal
                    </div>
                    <h2 style={{
                        margin: 0, fontSize: 28, fontWeight: 700,
                        color: '#fff', fontFamily: 'Bebas Neue, sans-serif',
                        letterSpacing: '0.06em',
                    }}>
                        SIGN IN TO FLEETIQ
                    </h2>
                    <p style={{
                        margin: '8px 0 0', fontSize: 13,
                        color: 'rgba(255,255,255,0.35)',
                    }}>
                        Enter your credentials to access the platform
                    </p>
                </div>

                {/* form */}
                <form onSubmit={handleSubmit} style={{
                    animation: entered ? 'fadeUp 0.6s ease 0.5s both' : 'none',
                }}>
                    {/* email field */}
                    <div style={{ marginBottom: 18 }}>
                        <label style={{
                            display: 'block', fontSize: 11, fontWeight: 600,
                            color: focused === 'email'
                                ? '#4F46E5' : 'rgba(255,255,255,0.4)',
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
                                    background: 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${focused === 'email'
                                        ? '#4F46E5'
                                        : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: 10,
                                    color: '#fff', fontSize: 14,
                                    outline: 'none', boxSizing: 'border-box',
                                    fontFamily: 'DM Sans, sans-serif',
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
                            color: focused === 'password'
                                ? '#4F46E5' : 'rgba(255,255,255,0.4)',
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
                                    background: 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${focused === 'password'
                                        ? '#4F46E5'
                                        : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: 10,
                                    color: '#fff', fontSize: 14,
                                    outline: 'none', boxSizing: 'border-box',
                                    fontFamily: 'DM Sans, sans-serif',
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
                            background: 'rgba(220,38,38,0.1)',
                            border: '1px solid rgba(220,38,38,0.3)',
                            borderRadius: 8, fontSize: 13,
                            color: '#f87171',
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
                            ? 'rgba(79,70,229,0.5)'
                            : '#4F46E5',
                        border: 'none',
                        borderRadius: 10,
                        color: '#fff', fontSize: 14,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        letterSpacing: '0.06em',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'background 0.2s, transform 0.1s',
                    }}
                    onMouseEnter={e => {
                        if (!loading)
                            e.currentTarget.style.background = '#4338CA';
                    }}
                    onMouseLeave={e => {
                        if (!loading)
                            e.currentTarget.style.background = '#4F46E5';
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
                                    border: '2px solid rgba(255,255,255,0.3)',
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

                {/* test accounts */}
                <div style={{
                    marginTop: '2rem',
                    padding: '1.25rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    animation: entered ? 'fadeUp 0.6s ease 0.6s both' : 'none',
                }}>
                    <div style={{
                        fontSize: 10, color: 'rgba(255,255,255,0.25)',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        fontWeight: 600, marginBottom: 12,
                    }}>
                        Demo credentials
                    </div>
                    {[
                        { role: 'Admin',   email: 'ahmed@swiftmove.com',  color: '#a78bfa' },
                        { role: 'Manager', email: 'sara@swiftmove.com',   color: '#60a5fa' },
                        { role: 'Driver',  email: 'usman@swiftmove.com',  color: '#34d399' },
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
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <span style={{
                                width: 52, fontSize: 10, fontWeight: 700,
                                color: a.color, letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                fontFamily: 'DM Sans, sans-serif',
                            }}>
                                {a.role}
                            </span>
                            <span style={{
                                fontSize: 12, color: 'rgba(255,255,255,0.45)',
                                fontFamily: 'DM Sans, sans-serif',
                            }}>
                                {a.email}
                            </span>
                            <span style={{
                                marginLeft: 'auto', fontSize: 10,
                                color: 'rgba(255,255,255,0.2)',
                                fontFamily: 'DM Sans, sans-serif',
                            }}>
                                click to fill →
                            </span>
                        </button>
                    ))}
                </div>

                {/* bottom corner label */}
                <div style={{
                    position: 'absolute', bottom: '1.5rem', right: '1.5rem',
                    fontSize: 10, color: 'rgba(255,255,255,0.12)',
                    letterSpacing: '0.08em',
                    fontFamily: 'DM Sans, sans-serif',
                }}>
                    FLEETIQ v1.0 · ADBMS PROJECT
                </div>
            </div>
        </div>
    );
}
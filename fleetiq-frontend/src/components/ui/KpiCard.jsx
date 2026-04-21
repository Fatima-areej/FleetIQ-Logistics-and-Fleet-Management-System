import { useEffect, useState } from 'react';
import { T } from '../../styles/theme';

function useCounter(target, duration = 1000) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (target === undefined || target === null) return;
        const n = parseFloat(target);
        if (isNaN(n)) { setVal(target); return; }
        let start = 0;
        const step = n / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= n) {
                setVal(target);
                clearInterval(timer);
            } else {
                setVal(Number.isInteger(n) ? Math.floor(start) : parseFloat(start.toFixed(1)));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return val;
}

export default function KpiCard({
    label, value, sub, icon,
    accent = T.accent, trend, onClick
}) {
    const [hovered, setHovered] = useState(false);
    const count = useCounter(value);

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background:   T.cardBg,
                border:       `1px solid ${hovered ? accent + '40' : T.border}`,
                borderRadius: T.radiusLg,
                padding:      '1.25rem 1.5rem',
                cursor:       onClick ? 'pointer' : 'default',
                transition:   'all 0.2s',
                boxShadow:    hovered ? T.shadowMd : T.shadow,
                transform:    hovered ? 'translateY(-2px)' : 'none',
                position:     'relative',
                overflow:     'hidden',
            }}
        >
            {/* accent strip */}
            <div style={{
                position:   'absolute',
                top:        0, left:    0,
                width:      '100%', height: 3,
                background: accent,
                borderRadius: `${T.radiusLg} ${T.radiusLg} 0 0`,
                opacity:    hovered ? 1 : 0,
                transition: 'opacity 0.2s',
            }} />

            <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'flex-start',
                marginBottom:   10,
            }}>
                <span style={{ fontSize: 11, fontWeight: 600,
                               color: T.textMuted, letterSpacing: '0.05em',
                               textTransform: 'uppercase',
                               fontFamily: T.fontBody }}>
                    {label}
                </span>
                {icon && (
                    <span style={{
                        fontSize:     16,
                        width:        32, height:     32,
                        display:      'flex',
                        alignItems:   'center',
                        justifyContent: 'center',
                        background:   accent + '15',
                        borderRadius: T.radius,
                    }}>
                        {icon}
                    </span>
                )}
            </div>

            <div style={{
                fontSize:   28,
                fontWeight: 800,
                color:      T.textPri,
                fontFamily: T.fontHead,
                lineHeight: 1,
            }}>
                {count}
            </div>

            {sub && (
                <p style={{ margin: '6px 0 0', fontSize: 12,
                            color: T.textMuted }}>{sub}</p>
            )}

            {trend !== undefined && (
                <div style={{
                    display:     'inline-flex',
                    alignItems:  'center',
                    gap:         4,
                    marginTop:   8,
                    fontSize:    12,
                    fontWeight:  600,
                    color:       trend >= 0 ? T.success : T.danger,
                    background:  trend >= 0 ? T.successLight : T.dangerLight,
                    padding:     '2px 8px',
                    borderRadius: T.radiusFull,
                }}>
                    {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </div>
            )}
        </div>
    );
}
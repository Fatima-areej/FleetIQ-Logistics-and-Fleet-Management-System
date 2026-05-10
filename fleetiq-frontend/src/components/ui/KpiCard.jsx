import { useEffect, useState, useRef } from 'react';
import { T } from '../../styles/theme';

function useCounter(target, duration = 1400) {
    const [val, setVal] = useState(0);
    const frameRef = useRef(null);

    useEffect(() => {
        if (target === undefined || target === null) return;
        const n = parseFloat(target);
        if (isNaN(n)) { setVal(target); return; }

        const startTime = performance.now();
        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo for a snappy but smooth finish
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const current = eased * n;
            if (progress < 1) {
                setVal(Number.isInteger(n) ? Math.floor(current) : parseFloat(current.toFixed(1)));
                frameRef.current = requestAnimationFrame(animate);
            } else {
                setVal(target);
            }
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration]);

    return val;
}

export default function KpiCard({
    label, value, sub, icon,
    accent = T.accent, trend, onClick, index = 0
}) {
    const [hovered,  setHovered]  = useState(false);
    const [shimmer,  setShimmer]  = useState(false);
    const count = useCounter(value);

    const handleEnter = () => {
        setHovered(true);
        setShimmer(false);
        // tiny delay so React flushes the `none` state before re-triggering
        requestAnimationFrame(() => setShimmer(true));
    };
    const handleLeave = () => {
        setHovered(false);
        setShimmer(false);
    };

    return (
        <div
            onClick={onClick}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            style={{
                background:   `linear-gradient(145deg, #ffffff 0%, ${accent}0C 100%)`,
                border:       `1px solid ${hovered ? accent + '50' : T.border}`,
                borderRadius: T.radiusLg,
                padding:      '1.25rem 1.5rem',
                cursor:       onClick ? 'pointer' : 'default',
                transition:   'border-color 0.3s, box-shadow 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1)',
                boxShadow:    hovered
                    ? `0 24px 48px ${accent}1E, 0 8px 20px ${accent}14, 0 0 0 1px ${accent}28`
                    : T.shadow,
                transform: hovered
                    ? 'perspective(900px) rotateX(-2.5deg) rotateY(4deg) translateY(-6px) scale(1.02)'
                    : 'perspective(900px) rotateX(0) rotateY(0) translateY(0) scale(1)',
                position:     'relative',
                overflow:     'hidden',
                animation:    `slideUp 0.55s cubic-bezier(0.16,1,0.3,1) ${index * 0.08}s both`,
                willChange:   'transform, box-shadow',
            }}
        >
            {/* animated top border — grows to full width on hover */}
            <div style={{
                position:   'absolute',
                top: 0, left: 0,
                width:      hovered ? '100%' : '35%',
                height:     3,
                background: `linear-gradient(90deg, ${accent} 0%, ${accent}55 100%)`,
                borderRadius: `${T.radiusLg} ${T.radiusLg} 0 0`,
                transition: 'width 0.45s cubic-bezier(0.16,1,0.3,1)',
            }} />

            {/* shimmer sweep */}
            <div style={{
                position:     'absolute',
                top:          '-50%', left: 0,
                width:        '35%', height: '200%',
                background:   'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                animation:    shimmer ? 'shimmerSweep 0.65s ease-out forwards' : 'none',
                pointerEvents:'none',
                zIndex:       1,
            }} />

            {/* content */}
            <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'flex-start',
                    marginBottom:   12,
                }}>
                    <span style={{
                        fontSize:      10,
                        fontWeight:    700,
                        color:         hovered ? accent : T.textMuted,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontFamily:    T.fontBody,
                        transition:    'color 0.25s',
                    }}>
                        {label}
                    </span>

                    {icon && (
                        <span style={{
                            fontSize:       18,
                            width:          36, height: 36,
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                            background:     hovered ? accent + '28' : accent + '14',
                            borderRadius:   T.radius,
                            transform:      hovered
                                ? 'scale(1.18) rotate(-10deg)'
                                : 'scale(1) rotate(0deg)',
                            transition:     'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                            boxShadow:      hovered ? `0 4px 14px ${accent}35` : 'none',
                        }}>
                            {icon}
                        </span>
                    )}
                </div>

                <div style={{
                    fontSize:      32,
                    fontWeight:    800,
                    color:         hovered ? accent : T.textPri,
                    fontFamily:    T.fontHead,
                    lineHeight:    1,
                    letterSpacing: '-0.02em',
                    transition:    'color 0.25s',
                }}>
                    {count}
                </div>

                {sub && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: T.textMuted }}>
                        {sub}
                    </p>
                )}

                {trend !== undefined && (
                    <div style={{
                        display:      'inline-flex',
                        alignItems:   'center',
                        gap:          4,
                        marginTop:    10,
                        fontSize:     12,
                        fontWeight:   600,
                        color:        trend >= 0 ? T.success : T.danger,
                        background:   trend >= 0 ? T.successLight : T.dangerLight,
                        padding:      '3px 10px',
                        borderRadius: T.radiusFull,
                    }}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </div>
                )}
            </div>
        </div>
    );
}

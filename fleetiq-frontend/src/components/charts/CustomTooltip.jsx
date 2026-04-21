import { T } from '../../styles/theme';

export default function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background:   T.cardBg,
            border:       `1px solid ${T.border}`,
            borderRadius: T.radius,
            padding:      '10px 14px',
            fontSize:     12,
            color:        T.textPri,
            fontFamily:   T.fontBody,
            boxShadow:    T.shadowMd,
        }}>
            {label && (
                <p style={{ margin: '0 0 8px', color: T.textSec,
                            fontWeight: 600, fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em' }}>
                    {label}
                </p>
            )}
            {payload.map((p, i) => (
                <p key={i} style={{ margin: '3px 0',
                                    display: 'flex',
                                    alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8,
                                   borderRadius: '50%',
                                   background: p.color,
                                   display: 'inline-block' }} />
                    <span style={{ color: T.textSec }}>{p.name}:</span>
                    <strong style={{ color: T.textPri }}>{p.value}</strong>
                </p>
            ))}
        </div>
    );
}
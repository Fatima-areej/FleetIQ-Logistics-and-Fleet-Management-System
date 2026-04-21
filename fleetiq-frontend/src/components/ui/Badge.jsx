import { T } from '../../styles/theme';

export default function Badge({ type, val, map, dot }) {
    const resolved = map
        ? (map[val] || { color: T.textMuted, bg: T.inputBg, label: val })
        : { color: T.textMuted, bg: T.inputBg, label: val };

    return (
        <span style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            dot ? 5 : 0,
            padding:        '3px 10px',
            borderRadius:   T.radiusFull,
            fontSize:       11,
            fontWeight:     600,
            color:          resolved.color,
            background:     resolved.bg,
            letterSpacing:  '0.02em',
            whiteSpace:     'nowrap',
            fontFamily:     T.fontBody,
        }}>
            {dot && (
                <span style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: resolved.color,
                    flexShrink: 0,
                }} />
            )}
            {resolved.label || val?.replace(/_/g, ' ')}
        </span>
    );
}
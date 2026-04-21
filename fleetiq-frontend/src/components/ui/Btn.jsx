import { useState } from 'react';
import { T } from '../../styles/theme';

export default function Btn({
    children, onClick, variant = 'primary',
    size = 'md', color, disabled, fullWidth, icon, type = 'button'
}) {
    const [hovered, setHovered] = useState(false);

    const sizes = {
        sm: { padding: '5px 12px',  fontSize: 12 },
        md: { padding: '8px 18px',  fontSize: 13 },
        lg: { padding: '11px 24px', fontSize: 14 },
    };

    const variants = {
        primary: {
            background: hovered ? T.accentHover : (color || T.accent),
            color:      '#fff',
            border:     'none',
        },
        secondary: {
            background: hovered ? T.accentLight : T.cardBg,
            color:      color || T.accent,
            border:     `1px solid ${T.border}`,
        },
        ghost: {
            background: hovered ? T.inputBg : 'transparent',
            color:      color || T.textSec,
            border:     'none',
        },
        danger: {
            background: hovered ? '#B91C1C' : T.danger,
            color:      '#fff',
            border:     'none',
        },
    };

    const v = variants[variant];
    const s = sizes[size];

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                ...v, ...s,
                borderRadius:  T.radiusSm,
                fontWeight:    600,
                cursor:        disabled ? 'not-allowed' : 'pointer',
                opacity:       disabled ? 0.5 : 1,
                display:       'inline-flex',
                alignItems:    'center',
                gap:           6,
                width:         fullWidth ? '100%' : 'auto',
                justifyContent: fullWidth ? 'center' : 'flex-start',
                transition:    'background 0.15s, transform 0.1s',
                transform:     hovered && !disabled ? 'translateY(-1px)' : 'none',
                fontFamily:    T.fontBody,
                whiteSpace:    'nowrap',
                boxShadow:     variant === 'primary' && !disabled ? T.shadow : 'none',
            }}
        >
            {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
            {children}
        </button>
    );
}
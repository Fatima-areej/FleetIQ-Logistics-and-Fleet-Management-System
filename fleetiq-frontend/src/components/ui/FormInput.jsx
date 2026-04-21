import { useState } from 'react';
import { T } from '../../styles/theme';

export default function FormInput({
    label, value, onChange, type = 'text',
    placeholder, required, hint, error
}) {
    const [focused, setFocused] = useState(false);

    return (
        <div style={{ marginBottom: 16 }}>
            {label && (
                <label style={{
                    display:       'block',
                    fontSize:      12,
                    fontWeight:    600,
                    color:         T.textSec,
                    marginBottom:  6,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontFamily:    T.fontBody,
                }}>
                    {label}
                    {required && <span style={{ color: T.danger, marginLeft: 3 }}>*</span>}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                    width:        '100%',
                    padding:      '9px 12px',
                    background:   T.inputBg,
                    border:       `1.5px solid ${error ? T.danger : focused ? T.accent : T.border}`,
                    borderRadius: T.radius,
                    color:        T.textPri,
                    fontSize:     13,
                    outline:      'none',
                    boxSizing:    'border-box',
                    fontFamily:   T.fontBody,
                    transition:   'border-color 0.15s',
                }}
            />
            {hint && !error && (
                <p style={{ margin: '4px 0 0', fontSize: 11,
                            color: T.textMuted }}>{hint}</p>
            )}
            {error && (
                <p style={{ margin: '4px 0 0', fontSize: 11,
                            color: T.danger }}>{error}</p>
            )}
        </div>
    );
}
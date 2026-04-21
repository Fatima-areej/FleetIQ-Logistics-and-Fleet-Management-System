import { T } from '../../styles/theme';

export default function FormSelect({
    label, value, onChange, options,
    placeholder, required
}) {
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
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    width:        '100%',
                    padding:      '9px 12px',
                    background:   T.inputBg,
                    border:       `1.5px solid ${T.border}`,
                    borderRadius: T.radius,
                    color:        value ? T.textPri : T.textMuted,
                    fontSize:     13,
                    outline:      'none',
                    boxSizing:    'border-box',
                    fontFamily:   T.fontBody,
                    cursor:       'pointer',
                    appearance:   'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239BADBA' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat:   'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight:        36,
                }}
            >
                <option value="">{placeholder || '— select —'}</option>
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}
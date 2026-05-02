import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { T } from '../../styles/theme';
import API from '../../api/axios';
import Btn from '../../components/ui/Btn';
import FormInput from '../../components/ui/FormInput';
import FormSelect from '../../components/ui/FormSelect';

function Card({ children, style = {} }) {
    return (
        <div style={{
            background: T.cardBg, border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg, padding: '1.5rem',
            boxShadow: T.shadow, ...style,
        }}>
            {children}
        </div>
    );
}

function SectionTitle({ title, sub }) {
    return (
        <div style={{ marginBottom: '1.25rem',
                      paddingBottom: '1rem',
                      borderBottom: `1px solid ${T.border}` }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700,
                         color: T.textPri, fontFamily: T.fontHead }}>
                {title}
            </h3>
            {sub && <p style={{ margin: '3px 0 0', fontSize: 12,
                                color: T.textMuted }}>{sub}</p>}
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

export default function AdminSettings() {
    const { user } = useAuth();
    const [org,    setOrg]    = useState(null);
    const [loading,setLoading]= useState(true);
    const [msg,    setMsg]    = useState(null);
    const [orgForm,setOrgForm]= useState({
        name: '', industry: '', contact_email: '', phone: '',
    });

    const showMsg = (text, good = true) => {
        setMsg({ text, good });
        setTimeout(() => setMsg(null), 3000);
    };

    useEffect(() => {
        API.get('/org')
            .then(r => {
                setOrg(r.data);
                setOrgForm({
                    name:          r.data.name          || '',
                    industry:      r.data.industry       || '',
                    contact_email: r.data.contact_email  || '',
                    phone:         r.data.phone          || '',
                });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const saveOrg = async () => {
        try {
            await API.patch('/org', orgForm);
            showMsg('Organization updated successfully.');
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed.', false);
        }
    };

    if (loading) return (
        <div style={{ color: T.textMuted, fontSize: 13 }}>
            Loading settings...
        </div>
    );

    return (
        <div style={{ animation: 'fadeIn 0.2s ease',
                      maxWidth: 720 }}>
            {msg && <Toast msg={msg} />}

            {/* ── ORG PROFILE ── */}
            <Card style={{ marginBottom: '1.5rem' }}>
                <SectionTitle
                    title="Organization profile"
                    sub="Update your company information"
                />
                <div style={{ display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 12 }}>
                    <FormInput
                        label="Organization name"
                        value={orgForm.name}
                        onChange={v => setOrgForm({...orgForm, name: v})}
                        placeholder="SwiftMove Logistics"
                    />
                    <FormSelect
                        label="Industry"
                        value={orgForm.industry}
                        onChange={v => setOrgForm({...orgForm, industry: v})}
                        options={[
                            { value: 'Freight & Delivery',   label: 'Freight & Delivery'   },
                            { value: 'E-commerce Logistics', label: 'E-commerce Logistics' },
                            { value: 'Last Mile Delivery',   label: 'Last Mile Delivery'   },
                            { value: 'Cold Chain',           label: 'Cold Chain'           },
                            { value: 'International Freight',label: 'International Freight'},
                            { value: 'Other',                label: 'Other'                },
                        ]}
                    />
                    <FormInput
                        label="Contact email"
                        value={orgForm.contact_email}
                        onChange={v => setOrgForm({...orgForm, contact_email: v})}
                        placeholder="admin@company.com"
                        type="email"
                    />
                    <FormInput
                        label="Phone"
                        value={orgForm.phone}
                        onChange={v => setOrgForm({...orgForm, phone: v})}
                        placeholder="+92-51-1234567"
                    />
                </div>
                <div style={{ marginTop: 16 }}>
                    <Btn onClick={saveOrg}>Save Changes</Btn>
                </div>
            </Card>

            {/* ── ACCOUNT INFO ── */}
            <Card style={{ marginBottom: '1.5rem' }}>
                <SectionTitle
                    title="Account information"
                    sub="Your admin account details"
                />
                <div style={{ display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 12 }}>
                    {[
                        ['Name',         user?.name],
                        ['Email',        user?.email],
                        ['Role',         'Administrator'],
                        ['Organization', org?.name],
                    ].map(([label, val]) => (
                        <div key={label} style={{
                            padding: '10px 14px',
                            background: T.pageBg,
                            borderRadius: T.radius,
                        }}>
                            <div style={{ fontSize: 10, color: T.textMuted,
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.06em',
                                          fontWeight: 600, marginBottom: 4 }}>
                                {label}
                            </div>
                            <div style={{ fontSize: 13, color: T.textPri,
                                          fontWeight: 500 }}>
                                {val}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* ── DATABASE CONCEPTS ── */}
            <Card>
                <SectionTitle
                    title="System features"
                    sub="Advanced database concepts implemented in FleetIQ"
                />
                <div style={{ display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 10 }}>
                    {[
                        { icon: '⚡', label: 'Triggers',
                          desc: '4 auto-firing DB triggers for status logging, notifications, vehicle sync, warehouse load' },
                        { icon: '🔧', label: 'Stored Procedures',
                          desc: '5 procedures — assign shipment, complete delivery, transfer warehouse, nearest warehouse, rate calculation' },
                        { icon: '👁', label: 'Views',
                          desc: '6 analytical views — active shipments, driver performance, fleet utilization, warehouse throughput, delayed shipments, driver-manager assignments' },
                        { icon: '🗺', label: 'Geo-Spatial',
                          desc: 'PostGIS geography columns with GIST indexes — nearest warehouse query, vehicle/shipment mapping' },
                        { icon: '🔒', label: 'Row Level Security',
                          desc: 'PostgreSQL RLS policies per role — drivers see only their own shipments' },
                        { icon: '📊', label: 'Indexes',
                          desc: '20+ B-tree indexes on FK and filter columns, GIST indexes on geography columns' },
                    ].map(f => (
                        <div key={f.label} style={{
                            padding: '12px',
                            background: T.pageBg,
                            borderRadius: T.radius,
                            display: 'flex', gap: 10,
                        }}>
                            <span style={{ fontSize: 20, flexShrink: 0 }}>
                                {f.icon}
                            </span>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600,
                                              color: T.textPri, marginBottom: 3 }}>
                                    {f.label}
                                </div>
                                <div style={{ fontSize: 11, color: T.textMuted,
                                              lineHeight: 1.5 }}>
                                    {f.desc}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageSquare, Send, Loader2 } from 'lucide-react';
import api from '../../shared/api/axios';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './css/UserNotificationSettings.css';

const EVENT_LABELS = {
    booking_confirmed: { title: 'Bron tasdiqlandi', hint: 'Klinika bronni tasdiqlaganda' },
    booking_cancelled: { title: 'Bron bekor qilindi', hint: 'Bron bekor qilingan paytda' },
    booking_reminder_24h: { title: '24 soat oldin eslatma', hint: 'Qabuldan bir kun oldin' },
    booking_reminder_1h: { title: '1 soat oldin eslatma', hint: 'Qabulga 1 soat qolganda' },
    payment_received: { title: "To'lov qabul qilindi", hint: "Naqd yoki onlayn to'lov tasdig'i" },
    queue_called: { title: 'Navbat keldi', hint: 'Kassa kabinetga chaqirganda' },
};

const CHANNELS = [
    { key: 'inapp', label: 'Saytda', icon: Bell, hint: 'Notif qo\'ng\'iroq' },
    { key: 'sms', label: 'SMS', icon: MessageSquare, hint: 'Telefoningizga' },
    { key: 'telegram', label: 'Telegram', icon: Send, hint: 'Bot orqali' },
];

const PATIENT_EVENTS = Object.keys(EVENT_LABELS);

export default function UserNotificationSettings() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['user', 'notification-preferences'],
        queryFn: async () => {
            const res = await api.get('/user/notification-preferences');
            return res.data.data;
        },
    });

    const mutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.put('/user/notification-preferences', payload);
            return res.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', 'notification-preferences'] });
        },
    });

    const channels = useMemo(() => data?.channels || {}, [data]);
    const smsConsent = data?.smsConsent ?? true;
    const tgConsent = data?.tgConsent ?? false;

    function toggleChannel(eventKey, channelKey) {
        const current = channels[eventKey] || [];
        const next = current.includes(channelKey)
            ? current.filter(c => c !== channelKey)
            : [...current, channelKey];
        mutation.mutate({ channels: { ...channels, [eventKey]: next } });
    }

    function toggleConsent(key, value) {
        mutation.mutate({ [key]: value });
    }

    if (isLoading) return <BanisaLoader message="Sozlamalar yuklanmoqda..." />;

    return (
        <div className="ns-page">
            <TopBar />
            <Navigation />

            <div className="ns-wrap">
                <div className="ns-header">
                    <h1>Bildirishnoma sozlamalari</h1>
                    <p>Har bir voqea uchun kanallarni tanlang. SMS Eskiz orqali yuboriladi, Telegram tez orada ulanadi.</p>
                </div>

                <div className="ns-consent-block">
                    <ConsentRow
                        icon={MessageSquare}
                        title="SMS bildirishnomalarni qabul qilaman"
                        hint="Eskiz orqali, kuniga 5 ta cheklov bilan"
                        checked={smsConsent}
                        onChange={(v) => toggleConsent('smsConsent', v)}
                    />
                    <ConsentRow
                        icon={Send}
                        title="Telegram orqali bildirishnomalar"
                        hint="Botni bog'lagandan keyin ishlaydi"
                        checked={tgConsent}
                        onChange={(v) => toggleConsent('tgConsent', v)}
                    />
                </div>

                <div className="ns-table">
                    <div className="ns-table-head">
                        <div className="ns-event-head">Voqea</div>
                        {CHANNELS.map(c => {
                            const Icon = c.icon;
                            return (
                                <div key={c.key} className="ns-channel-head">
                                    <Icon size={16} />
                                    <span>{c.label}</span>
                                </div>
                            );
                        })}
                    </div>

                    {PATIENT_EVENTS.map(ev => {
                        const meta = EVENT_LABELS[ev];
                        const selected = channels[ev] || [];
                        return (
                            <div key={ev} className="ns-row">
                                <div className="ns-event">
                                    <div className="ns-event-title">{meta.title}</div>
                                    <div className="ns-event-hint">{meta.hint}</div>
                                </div>
                                {CHANNELS.map(c => {
                                    const on = selected.includes(c.key);
                                    const disabled =
                                        (c.key === 'sms' && !smsConsent) ||
                                        (c.key === 'telegram' && !tgConsent);
                                    return (
                                        <div key={c.key} className="ns-cell">
                                            <button
                                                type="button"
                                                className={`ns-toggle ${on ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
                                                onClick={() => !disabled && toggleChannel(ev, c.key)}
                                                disabled={disabled}
                                                aria-label={`${meta.title} — ${c.label}`}
                                            >
                                                <span className="ns-toggle-knob" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {mutation.isPending && (
                    <div className="ns-saving"><Loader2 size={14} className="spin" /> Saqlanmoqda...</div>
                )}
                {mutation.isError && (
                    <div className="ns-error">Saqlashda xato. Qaytadan urinib ko'ring.</div>
                )}
            </div>

            <Footer />
        </div>
    );
}

function ConsentRow({ icon: Icon, title, hint, checked, onChange }) {
    return (
        <label className="ns-consent">
            <div className="ns-consent-icon"><Icon size={18} /></div>
            <div className="ns-consent-text">
                <div className="ns-consent-title">{title}</div>
                <div className="ns-consent-hint">{hint}</div>
            </div>
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
            />
        </label>
    );
}

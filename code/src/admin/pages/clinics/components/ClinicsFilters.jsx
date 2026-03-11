import React from 'react';
import { Search, RefreshCw, List, LayoutGrid } from 'lucide-react';

const UZBEKISTAN_REGIONS = [
    'Toshkent shahri', 'Toshkent viloyati', 'Samarqand', 'Buxoro',
    "Andijon", "Farg'ona", 'Namangan', 'Qashqadaryo', 'Surxondaryo',
    'Xorazm', 'Navoiy', 'Jizzax', 'Sirdaryo', "Qoraqalpog'iston",
];

const CLINIC_TYPES = [
    { value: 'GENERAL',        label: '🏥 Umumiy klinika' },
    { value: 'SPECIALIZED',    label: '🔬 Ixtisoslashgan' },
    { value: 'DIAGNOSTIC',     label: '📊 Diagnostika markazi' },
    { value: 'DENTAL',         label: '🦷 Stomatologiya' },
    { value: 'MATERNITY',      label: "👶 Tug'ruqxona" },
    { value: 'REHABILITATION', label: '♿ Reabilitatsiya' },
    { value: 'PHARMACY',       label: '💊 Dorixona' },
    { value: 'OTHER',          label: '🏛️ Boshqa' },
];

const WORKFLOW_STATUSES = [
    { value: 'all',       label: 'Barcha statuslar' },
    { value: 'PENDING',   label: '🟡 Yangi' },
    { value: 'IN_REVIEW', label: "🔵 Ko'rib chiqilmoqda" },
    { value: 'APPROVED',  label: '🟢 Tasdiqlangan' },
    { value: 'REJECTED',  label: '🔴 Rad etilgan' },
];

const APPROVED_STATUSES = [
    { value: 'all',       label: 'Barcha statuslar' },
    { value: 'APPROVED',  label: '🟢 Faol' },
    { value: 'SUSPENDED', label: "⏸ To'xtatilgan" },
    { value: 'DELETED',   label: "🗑️ O'chirilgan" },
    { value: 'BLOCKED',   label: '🚫 Bloklangan' },
];

const ClinicsFilters = ({
    search,
    onSearchChange,
    status,
    onStatusChange,
    region,
    onRegionChange,
    type,
    onTypeChange,
    viewMode,
    onViewModeChange,
    onRefresh,
    enableWorkflow = false,
}) => {
    const statusOptions = enableWorkflow ? WORKFLOW_STATUSES : APPROVED_STATUSES;

    return (
        <div className="catalog-toolbar">
            <div className="search-wrapper">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="Klinika nomi, telefon yoki viloyat..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className="filter-group">
                <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
                    {statusOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <select value={region} onChange={(e) => onRegionChange(e.target.value)}>
                    <option value="all">Barcha viloyatlar</option>
                    {UZBEKISTAN_REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <select value={type} onChange={(e) => onTypeChange(e.target.value)}>
                    <option value="all">Barcha turlar</option>
                    {CLINIC_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
                <button className="btn-icon" title="Yangilash" onClick={onRefresh}>
                    <RefreshCw size={18} />
                </button>
                <div className="view-toggle">
                    <button
                        className={viewMode === 'table' ? 'active' : ''}
                        onClick={() => onViewModeChange('table')}
                        title="Jadval ko'rinish"
                    >
                        <List size={20} />
                    </button>
                    <button
                        className={viewMode === 'cards' ? 'active' : ''}
                        onClick={() => onViewModeChange('cards')}
                        title="Kartochkalar"
                    >
                        <LayoutGrid size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClinicsFilters;

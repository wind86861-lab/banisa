import { useState } from 'react';
import { Search, Filter, Download, Building2, MoreVertical, Edit, Trash2, Ban, CheckCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ClinicAdmins.css';

export default function ClinicAdmins() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Mock data - ONLY CLINIC_ADMIN and PENDING_CLINIC users
    const clinicAdmins = [
        { 
            id: '2', 
            firstName: 'Jane', 
            lastName: 'Smith', 
            email: 'jane@clinic.uz', 
            phone: '+998907654321', 
            role: 'CLINIC_ADMIN', 
            isActive: true, 
            createdAt: '2024-02-20',
            clinicName: 'MedLife Clinic',
            clinicId: '83dc5c5a-2254-4d77-b540-c2272e8fb7eb'
        },
        { 
            id: '6', 
            firstName: 'David', 
            lastName: 'Miller', 
            email: 'david@healthcenter.uz', 
            phone: '+998905557890', 
            role: 'CLINIC_ADMIN', 
            isActive: true, 
            createdAt: '2024-03-15',
            clinicName: 'Health Center Plus',
            clinicId: 'abc123-clinic-id'
        },
        { 
            id: '7', 
            firstName: 'Sarah', 
            lastName: 'Wilson', 
            email: 'sarah@newclinic.uz', 
            phone: '+998905558901', 
            role: 'PENDING_CLINIC', 
            isActive: false, 
            createdAt: '2024-04-01',
            clinicName: 'New Medical Center',
            clinicId: 'pending-clinic-123'
        },
    ];

    const filteredAdmins = clinicAdmins.filter(admin => {
        const matchesSearch = 
            admin.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.phone.includes(searchTerm) ||
            admin.clinicName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'ALL' || 
            (statusFilter === 'ACTIVE' && admin.isActive && admin.role === 'CLINIC_ADMIN') ||
            (statusFilter === 'INACTIVE' && !admin.isActive) ||
            (statusFilter === 'PENDING' && admin.role === 'PENDING_CLINIC');

        return matchesSearch && matchesStatus;
    });

    const getRoleBadge = (role) => {
        const badges = {
            CLINIC_ADMIN: { label: 'Active Admin', color: '#2563eb' },
            PENDING_CLINIC: { label: 'Pending Approval', color: '#f59e0b' },
        };
        const badge = badges[role] || { label: role, color: '#6b7280' };
        return <span className="role-badge" style={{ backgroundColor: badge.color }}>{badge.label}</span>;
    };

    const handleViewClinic = (clinicId) => {
        navigate(`/admin/clinics/${clinicId}`);
    };

    return (
        <div className="clinic-admins-page">
            <div className="admins-header">
                <div className="header-left">
                    <h1>Clinic Administrators</h1>
                    <p className="subtitle">Manage clinic admin accounts - completely separate from patient users</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Download size={18} />
                        Export
                    </button>
                </div>
            </div>

            <div className="admins-filters">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, email, phone, or clinic name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active Admins</option>
                        <option value="PENDING">Pending Approval</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="admins-stats">
                <div className="stat-card">
                    <div className="stat-label">Total Clinic Admins</div>
                    <div className="stat-value">{clinicAdmins.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Active Admins</div>
                    <div className="stat-value">{clinicAdmins.filter(a => a.role === 'CLINIC_ADMIN' && a.isActive).length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Pending Approval</div>
                    <div className="stat-value">{clinicAdmins.filter(a => a.role === 'PENDING_CLINIC').length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Inactive</div>
                    <div className="stat-value">{clinicAdmins.filter(a => !a.isActive).length}</div>
                </div>
            </div>

            <div className="admins-table-container">
                <table className="admins-table">
                    <thead>
                        <tr>
                            <th>Admin</th>
                            <th>Contact</th>
                            <th>Clinic</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAdmins.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="empty-state">
                                    <div className="empty-icon">🏥</div>
                                    <h3>No clinic admins found</h3>
                                    <p>Try adjusting your search or filters</p>
                                </td>
                            </tr>
                        ) : (
                            filteredAdmins.map(admin => (
                                <tr key={admin.id}>
                                    <td>
                                        <div className="admin-info">
                                            <div className="admin-avatar">
                                                {admin.firstName[0]}{admin.lastName[0]}
                                            </div>
                                            <div>
                                                <div className="admin-name">{admin.firstName} {admin.lastName}</div>
                                                <div className="admin-id">ID: {admin.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="contact-info">
                                            <div>{admin.email}</div>
                                            <div className="phone">{admin.phone}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="clinic-info">
                                            <Building2 size={16} className="clinic-icon" />
                                            <span>{admin.clinicName}</span>
                                        </div>
                                    </td>
                                    <td>{getRoleBadge(admin.role)}</td>
                                    <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-icon" 
                                                title="View Clinic"
                                                onClick={() => handleViewClinic(admin.clinicId)}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button className="btn-icon" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon" title={admin.isActive ? 'Deactivate' : 'Activate'}>
                                                {admin.isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
                                            </button>
                                            <button className="btn-icon" title="More">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="info-banner">
                <div className="info-icon">ℹ️</div>
                <div className="info-content">
                    <strong>Clinic Admins vs Patient Users:</strong>
                    <p>Clinic administrators are completely separate from patient users. They have their own authentication system, login portal, and permissions. Patient users are managed in the "Users" section.</p>
                </div>
            </div>
        </div>
    );
}

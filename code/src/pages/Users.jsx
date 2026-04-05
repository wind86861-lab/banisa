import { useState } from 'react';
import { Search, Filter, Download, UserPlus, MoreVertical, Edit, Trash2, Ban, CheckCircle } from 'lucide-react';
import './Users.css';

export default function Users() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Mock data - ONLY PATIENT users (clinic admins are managed separately)
    const allUsers = [
        { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+998901234567', role: 'PATIENT', isActive: true, createdAt: '2024-01-15' },
        { id: '3', firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com', phone: '+998909876543', role: 'PATIENT', isActive: false, createdAt: '2024-03-10' },
        { id: '4', firstName: 'Alice', lastName: 'Williams', email: 'alice@example.com', phone: '+998905551234', role: 'PATIENT', isActive: true, createdAt: '2024-01-20' },
        { id: '5', firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', phone: '+998905559876', role: 'PATIENT', isActive: true, createdAt: '2024-02-10' },
    ];

    // Filter to ONLY show PATIENT role users
    const users = allUsers.filter(u => u.role === 'PATIENT');

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone.includes(searchTerm);

        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && user.isActive) ||
            (statusFilter === 'INACTIVE' && !user.isActive);

        return matchesSearch && matchesStatus;
    });

    const getRoleBadge = (role) => {
        const badges = {
            SUPER_ADMIN: { label: 'Super Admin', color: '#dc2626' },
            CLINIC_ADMIN: { label: 'Clinic Admin', color: '#2563eb' },
            PENDING_CLINIC: { label: 'Pending Clinic', color: '#f59e0b' },
            PATIENT: { label: 'Patient', color: '#10b981' },
        };
        const badge = badges[role] || { label: role, color: '#6b7280' };
        return <span className="role-badge" style={{ backgroundColor: badge.color }}>{badge.label}</span>;
    };

    return (
        <div className="users-page">
            <div className="users-header">
                <div className="header-left">
                    <h1>Patient Users</h1>
                    <p className="subtitle">Manage patient accounts and registrations</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Download size={18} />
                        Export
                    </button>
                    <button className="btn-primary">
                        <UserPlus size={18} />
                        Add User
                    </button>
                </div>
            </div>

            <div className="users-filters">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="users-stats">
                <div className="stat-card">
                    <div className="stat-label">Total Patients</div>
                    <div className="stat-value">{users.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Active Patients</div>
                    <div className="stat-value">{users.filter(u => u.isActive).length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Inactive Patients</div>
                    <div className="stat-value">{users.filter(u => !u.isActive).length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">New This Month</div>
                    <div className="stat-value">{users.filter(u => new Date(u.createdAt).getMonth() === new Date().getMonth()).length}</div>
                </div>
            </div>

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Contact</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="empty-state">
                                    <div className="empty-icon">👥</div>
                                    <h3>No users found</h3>
                                    <p>Try adjusting your search or filters</p>
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                {user.firstName[0]}{user.lastName[0]}
                                            </div>
                                            <div>
                                                <div className="user-name">{user.firstName} {user.lastName}</div>
                                                <div className="user-id">ID: {user.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="contact-info">
                                            <div>{user.email}</div>
                                            <div className="phone">{user.phone}</div>
                                        </div>
                                    </td>
                                    <td>{getRoleBadge(user.role)}</td>
                                    <td>
                                        <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon" title={user.isActive ? 'Deactivate' : 'Activate'}>
                                                {user.isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
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
        </div>
    );
}

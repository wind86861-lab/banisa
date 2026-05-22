import React from 'react';

// Top-level boundary so an unhandled render error doesn't blank the whole SPA.
// Scoped boundaries inside heavy routes can give friendlier UX later.
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info?.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false });
        window.location.assign('/');
    };

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div style={{
                minHeight: '60vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                fontFamily: 'system-ui, sans-serif',
            }}>
                <h1 style={{ fontSize: 22, marginBottom: 8 }}>Nimadir xato ketdi</h1>
                <p style={{ color: '#666', marginBottom: 16, maxWidth: 480 }}>
                    Sahifani yangilashga harakat qiling. Muammo davom etsa, biroz vaqtdan keyin qayta urinib ko'ring.
                </p>
                <button
                    onClick={this.handleReload}
                    style={{
                        padding: '10px 20px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 15,
                    }}
                >
                    Bosh sahifaga qaytish
                </button>
            </div>
        );
    }
}

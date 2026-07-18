export default function SkeletonLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      background: 'linear-gradient(135deg, #1B6B4F 0%, #0d3a2b 100%)',
      color: '#F4F5F0',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .splash-logo {
          animation: pulse 2s infinite ease-in-out;
          width: 80px;
          height: 80px;
          border-radius: 20px;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
          margin-bottom: 24px;
        }
        .splash-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(244, 245, 240, 0.2);
          border-top: 3px solid #F4F5F0;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-top: 32px;
        }
      `}</style>
      <img src="/icon-192.png" alt="My Wallet Logo" className="splash-logo" />
      <h1 style={{
        fontSize: '28px',
        fontWeight: 'bold',
        margin: '0 0 8px 0',
        letterSpacing: '-0.5px'
      }}>My Wallet</h1>
      <p style={{
        fontSize: '14px',
        opacity: 0.8,
        margin: 0,
        fontWeight: 500
      }}>Cargando tus finanzas...</p>
      <div className="splash-spinner"></div>
    </div>
  );
}

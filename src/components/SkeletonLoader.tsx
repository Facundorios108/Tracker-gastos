import './SkeletonLoader.css';

export default function SkeletonLoader() {
  return (
    <div className="skeleton-wrapper">
      {/* ── Header ── */}
      <header className="skeleton-header">
        <div className="skeleton-circle" style={{ width: '48px', height: '48px', borderRadius: '14px' }}></div>
        <div className="skeleton-text-group">
          <div className="skeleton-line" style={{ width: '80px', height: '14px' }}></div>
          <div className="skeleton-line" style={{ width: '120px', height: '18px', marginTop: '6px' }}></div>
        </div>
      </header>

      {/* ── Balance Card ── */}
      <div className="skeleton-card">
        <div className="skeleton-line" style={{ width: '150px', height: '36px', marginBottom: '24px' }}></div>
        <div className="skeleton-card-row">
          <div className="skeleton-card-item">
            <div className="skeleton-circle" style={{ width: '32px', height: '32px' }}></div>
            <div className="skeleton-text-group">
              <div className="skeleton-line" style={{ width: '60px', height: '12px' }}></div>
              <div className="skeleton-line" style={{ width: '80px', height: '16px', marginTop: '4px' }}></div>
            </div>
          </div>
          <div className="skeleton-card-item">
            <div className="skeleton-circle" style={{ width: '32px', height: '32px' }}></div>
            <div className="skeleton-text-group">
              <div className="skeleton-line" style={{ width: '60px', height: '12px' }}></div>
              <div className="skeleton-line" style={{ width: '80px', height: '16px', marginTop: '4px' }}></div>
            </div>
          </div>
        </div>
        <div className="skeleton-line" style={{ width: '100%', height: '8px', borderRadius: '4px', marginTop: '24px' }}></div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="skeleton-tabs">
        <div className="skeleton-tab"></div>
        <div className="skeleton-tab"></div>
        <div className="skeleton-tab"></div>
      </div>

      {/* ── Transaction List ── */}
      <div className="skeleton-list">
        <div className="skeleton-line" style={{ width: '100px', height: '16px', marginBottom: '16px' }}></div>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="skeleton-list-item">
            <div className="skeleton-circle" style={{ width: '40px', height: '40px' }}></div>
            <div className="skeleton-text-group" style={{ flex: 1 }}>
              <div className="skeleton-line" style={{ width: '40%', height: '14px' }}></div>
              <div className="skeleton-line" style={{ width: '25%', height: '11px', marginTop: '6px' }}></div>
            </div>
            <div className="skeleton-line" style={{ width: '60px', height: '16px' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** #61: shown instantly while a page loads. */
export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-label="Loading" style={{ paddingTop: 24, paddingBottom: 56 }}>
      <div className="sk" style={{ width: 220, height: 14, marginBottom: 24 }} />
      <div className="profile">
        <div className="side-nav">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="sk" style={{ height: 14, margin: "10px 0", width: `${70 - i * 6}%` }} />
          ))}
        </div>
        <div>
          <div style={{ display: "flex", gap: 20 }}>
            <div className="sk" style={{ width: 128, height: 128, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              <div className="sk" style={{ height: 28, width: "55%" }} />
              <div className="sk" style={{ height: 14, width: "35%", marginTop: 12 }} />
              <div className="sk" style={{ height: 14, width: "80%", marginTop: 20 }} />
              <div className="sk" style={{ height: 14, width: "70%", marginTop: 8 }} />
            </div>
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="sk" style={{ height: 14, marginTop: 14, width: `${95 - i * 7}%` }} />
          ))}
        </div>
        <div className="profile__aside">
          <div className="sk" style={{ height: 260, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}

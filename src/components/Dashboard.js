import { useState, useEffect } from "react";

const CATEGORY_ICONS = { vehicle: "🚗", weapon: "🔫", ammunition: "💥", equipment: "🛡️" };
const COLORS = { vehicle: "#1a6fdb", weapon: "#c0392b", ammunition: "#d68910", equipment: "#117a65" };

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", borderTop: `3px solid ${color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#1a1a2e" }}>{typeof value === "number" ? value.toLocaleString() : value}</p>
        </div>
        <span style={{ fontSize: 28 }}>{icon}</span>
      </div>
    </div>
  );
}

export default function Dashboard({ api, user }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then(setData).catch(console.error);
  }, []);

  if (!data) return <p style={{ color: "#888", padding: 40, textAlign: "center" }}>Loading dashboard...</p>;

  const { stats, assetsByBase, assetsByCategory } = data;
  const maxBase = Math.max(...assetsByBase.map(b => b.total), 1);
  const maxCat = Math.max(...assetsByCategory.map(c => c.total), 1);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>Mission Control</h2>
        <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Real-time asset overview across all bases</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <StatCard label="Total Assets" value={stats.totalAssets} icon="📦" color="#2c3e50" />
        <StatCard label="Vehicles" value={stats.vehicles} icon="🚗" color={COLORS.vehicle} />
        <StatCard label="Weapons" value={stats.weapons} icon="🔫" color={COLORS.weapon} />
        <StatCard label="Ammunition" value={stats.ammunition} icon="💥" color={COLORS.ammunition} />
        <StatCard label="Pending Transfers" value={stats.pendingTransfers} icon="🔄" color="#8e44ad" />
        <StatCard label="Purchases (30d)" value={stats.recentPurchases} icon="🛒" color="#27ae60" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assets by Base</h3>
          {assetsByBase.map(b => (
            <div key={b.base} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{b.base}</span>
                <span style={{ fontSize: 13, color: "#666" }}>{b.total.toLocaleString()}</span>
              </div>
              <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: "#2c3e50", width: `${(b.total / maxBase) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assets by Category</h3>
          {assetsByCategory.map(c => (
            <div key={c.category} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{CATEGORY_ICONS[c.category]} {c.category}</span>
                <span style={{ fontSize: 13, color: "#666" }}>{c.total.toLocaleString()}</span>
              </div>
              <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: COLORS[c.category] || "#888", width: `${(c.total / maxCat) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
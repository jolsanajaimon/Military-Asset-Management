import { useState, useEffect } from "react";

const CATEGORY_ICONS = { vehicle: "🚗", weapon: "🔫", ammunition: "💥", equipment: "🛡️" };
const COLORS = { vehicle: "#1a6fdb", weapon: "#c0392b", ammunition: "#d68910", equipment: "#117a65" };

export default function Purchases({ api, user }) {
  const [purchases, setPurchases] = useState([]);
  const [assets, setAssets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_id: "", quantity: "", base: user.base || "", notes: "" });
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([api.get("/purchases"), api.get("/assets")]).then(([p, a]) => { setPurchases(p); setAssets(a); });
  };

  useEffect(load, []);

  const canAdd = ["admin", "logistics_officer"].includes(user.role);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/purchases", { ...form, quantity: parseInt(form.quantity) });
      setShowForm(false);
      setForm({ asset_id: "", quantity: "", base: user.base || "", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const badge = (category) => (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: COLORS[category] + "18", color: COLORS[category] }}>
      {CATEGORY_ICONS[category]} {category}
    </span>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>Purchases</h2>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Record asset acquisitions</p>
        </div>
        {canAdd && <button onClick={() => setShowForm(!showForm)} style={{ padding: "10px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{showForm ? "Cancel" : "+ New Purchase"}</button>}
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Record Purchase</h3>
          {error && <div style={{ background: "#fdf0f0", color: "#c0392b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Asset</label>
                <select style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })} required>
                  <option value="">Select asset...</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} — {a.base}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Quantity</label>
                <input type="number" style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} min="1" required />
              </div>
              {user.role === "admin" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Base</label>
                  <input style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.base} onChange={e => setForm({ ...form, base: e.target.value })} required />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Notes</label>
                <input style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
              </div>
            </div>
            <button type="submit" style={{ marginTop: 16, padding: "10px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Record Purchase</button>
          </form>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
              {["Asset", "Category", "Base", "Qty", "By", "Date"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #eee" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {purchases.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "13px 16px", fontSize: 13 }}><strong>{p.asset_name}</strong></td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{badge(p.category)}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{p.base}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: "#27ae60" }}>+{p.quantity.toLocaleString()}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{p.purchased_by_name}</td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "#888" }}>{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {purchases.length === 0 && <p style={{ textAlign: "center", padding: 32, color: "#888" }}>No purchases recorded</p>}
      </div>
    </div>
  );
}
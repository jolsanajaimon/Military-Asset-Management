import { useState, useEffect } from "react";

export default function Transfers({ api, user }) {
  const [transfers, setTransfers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_id: "", quantity: "", from_base: user.base || "", to_base: "", notes: "" });
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([api.get("/transfers"), api.get("/assets")]).then(([t, a]) => { setTransfers(t); setAssets(a); });
  };

  useEffect(load, []);

  const canAdd = ["admin", "base_commander"].includes(user.role);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/transfers", { ...form, quantity: parseInt(form.quantity) });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const statusColor = { approved: "#27ae60", pending: "#f39c12", rejected: "#c0392b" };

  const input = (label, key, type = "text", extra = {}) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{label}</label>
      <input type={type} style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}
        value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} {...extra} />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>Transfers</h2>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Manage asset movement between bases</p>
        </div>
        {canAdd && <button onClick={() => setShowForm(!showForm)} style={{ padding: "10px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{showForm ? "Cancel" : "+ New Transfer"}</button>}
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Initiate Transfer</h3>
          {error && <div style={{ background: "#fdf0f0", color: "#c0392b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <form onSubmit={submit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Asset</label>
                <select style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })} required>
                  <option value="">Select asset...</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} — {a.base} ({a.quantity})</option>)}
                </select>
              </div>
              {input("Quantity", "quantity", "number", { min: "1", required: true })}
              {input("From Base", "from_base", "text", { required: true })}
              {input("To Base", "to_base", "text", { placeholder: "Destination base", required: true })}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Notes</label>
                <input style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Transfer reason" />
              </div>
            </div>
            <button type="submit" style={{ marginTop: 16, padding: "10px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Initiate Transfer</button>
          </form>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
              {["Asset", "From", "To", "Qty", "Status", "By", "Date"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #eee" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "13px 16px", fontSize: 13 }}><strong>{t.asset_name}</strong></td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{t.from_base}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{t.to_base}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700 }}>{t.quantity.toLocaleString()}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusColor[t.status] + "22", color: statusColor[t.status] }}>{t.status}</span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{t.transferred_by_name}</td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "#888" }}>{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfers.length === 0 && <p style={{ textAlign: "center", padding: 32, color: "#888" }}>No transfers recorded</p>}
      </div>
    </div>
  );
}
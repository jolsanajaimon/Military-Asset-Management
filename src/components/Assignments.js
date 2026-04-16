import { useState, useEffect } from "react";

export default function Assignments({ api, user }) {
  const [assignments, setAssignments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_id: "", quantity: "", base: user.base || "", assigned_to: "", type: "assignment", notes: "" });
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([api.get("/assignments"), api.get("/assets")]).then(([a, ast]) => { setAssignments(a); setAssets(ast); });
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/assignments", { ...form, quantity: parseInt(form.quantity) });
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>Assignments & Expenditures</h2>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Track asset deployment and consumption</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "10px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{showForm ? "Cancel" : "+ New Entry"}</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>New Assignment / Expenditure</h3>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Type</label>
                <select style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="assignment">Assignment</option>
                  <option value="expenditure">Expenditure</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Quantity</label>
                <input type="number" style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} min="1" required />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Assigned To</label>
                <input style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Unit / Personnel" required />
              </div>
              {user.role === "admin" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Base</label>
                  <input style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.base} onChange={e => setForm({ ...form, base: e.target.value })} required />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Notes</label>
                <input style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" />
              </div>
            </div>
            <button type="submit" style={{ marginTop: 16, padding: "10px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Submit</button>
          </form>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
              {["Asset", "Type", "Assigned To", "Base", "Qty", "By", "Date"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #eee" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "13px 16px", fontSize: 13 }}><strong>{a.asset_name}</strong></td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: a.type === "assignment" ? "#1a6fdb18" : "#c0392b18", color: a.type === "assignment" ? "#1a6fdb" : "#c0392b" }}>
                    {a.type === "assignment" ? "📋 Assignment" : "💥 Expenditure"}
                  </span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{a.assigned_to}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{a.base}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: "#c0392b" }}>−{a.quantity.toLocaleString()}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{a.assigned_by_name}</td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "#888" }}>{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {assignments.length === 0 && <p style={{ textAlign: "center", padding: 32, color: "#888" }}>No records found</p>}
      </div>
    </div>
  );
}
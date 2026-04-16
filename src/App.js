import { useState, useCallback, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Purchases from "./components/Purchases";
import Transfers from "./components/Transfers";
import Assignments from "./components/Assignments";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const ROLE_LABELS = {
  admin: "Administrator",
  base_commander: "Base Commander",
  logistics_officer: "Logistics Officer",
};

function useApi(token) {
  const call = useCallback(async (method, path, body) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }, [token]);
  return { get: (p) => call("GET", p), post: (p, b) => call("POST", p, b) };
}

function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin(data.token, data.user);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const creds = [
    { username: "admin", password: "admin123", role: "Administrator" },
    { username: "commander_alpha", password: "pass123", role: "Base Commander (Alpha)" },
    { username: "commander_bravo", password: "pass123", role: "Base Commander (Bravo)" },
    { username: "logistics1", password: "pass123", role: "Logistics Officer" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 440, boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#1a1a2e" }}>KristalBall</h1>
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: 13 }}>Military Asset Management System</p>
        </div>
        {error && (
          <div style={{ background: "#fdf0f0", color: "#c0392b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}
        <form onSubmit={submit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Username</label>
            <input
              style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="Enter username"
              required
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Password</label>
            <input
              type="password"
              style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            style={{ width: "100%", padding: "11px 20px", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
        <div style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 16 }}>
          <p style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em" }}>TEST CREDENTIALS</p>
          {creds.map(c => (
            <div
              key={c.username}
              onClick={() => setForm({ username: c.username, password: c.password })}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, border: "1px solid #eee" }}
            >
              <span style={{ fontSize: 12, color: "#555" }}>{c.role}</span>
              <code style={{ fontSize: 11, background: "#f5f5f5", padding: "2px 8px", borderRadius: 4, color: "#333" }}>{c.username}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetsPage({ api }) {
  const [assets, setAssets] = useState([]);
  const [filters, setFilters] = useState({ base: "", category: "" });
  const COLORS = { vehicle: "#1a6fdb", weapon: "#c0392b", ammunition: "#d68910", equipment: "#117a65" };
  const ICONS = { vehicle: "🚗", weapon: "🔫", ammunition: "💥", equipment: "🛡️" };

  useEffect(() => {
    const q = new URLSearchParams();
    if (filters.base) q.set("base", filters.base);
    if (filters.category) q.set("category", filters.category);
    api.get(`/assets?${q}`).then(setAssets).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const bases = [...new Set(assets.map(a => a.base))];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>Asset Inventory</h2>
        <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Track all military assets across bases</p>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select
          style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}
          value={filters.base}
          onChange={e => setFilters({ ...filters, base: e.target.value })}
        >
          <option value="">All Bases</option>
          {bases.map(b => <option key={b}>{b}</option>)}
        </select>
        <select
          style={{ padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }}
          value={filters.category}
          onChange={e => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          {Object.keys(ICONS).map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
              {["Asset Name", "Category", "Base", "Quantity"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: h === "Quantity" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #eee" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "13px 16px", fontSize: 13 }}><strong>{a.name}</strong></td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: COLORS[a.category] + "18", color: COLORS[a.category] }}>
                    {ICONS[a.category]} {a.category}
                  </span>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{a.base}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, textAlign: "right", fontWeight: 700, color: a.quantity < 10 ? "#c0392b" : "#27ae60" }}>
                  {a.quantity.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assets.length === 0 && <p style={{ textAlign: "center", padding: 32, color: "#888" }}>No assets found</p>}
      </div>
    </div>
  );
}

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "assets", label: "Assets", icon: "🗄️" },
  { key: "purchases", label: "Purchases", icon: "🛒" },
  { key: "transfers", label: "Transfers", icon: "🔄" },
  { key: "assignments", label: "Assignments", icon: "📋" },
];

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("kb_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kb_user")); } catch { return null; }
  });
  const [page, setPage] = useState("dashboard");
  const api = useApi(token);

  const login = (t, u) => {
    setToken(t); setUser(u);
    localStorage.setItem("kb_token", t);
    localStorage.setItem("kb_user", JSON.stringify(u));
  };

  const logout = () => {
    setToken(null); setUser(null);
    localStorage.removeItem("kb_token");
    localStorage.removeItem("kb_user");
  };

  if (!token || !user) return <LoginPage onLogin={login} />;

  const pages = {
    dashboard: Dashboard,
    assets: AssetsPage,
    purchases: Purchases,
    transfers: Transfers,
    assignments: Assignments,
  };
  const PageComponent = pages[page];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f5f7", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <aside style={{ width: 220, background: "#1a1a2e", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "24px 20px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #2d2d44" }}>
          <span style={{ fontSize: 24 }}>⚔️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: "0.05em" }}>KristalBall</div>
            <div style={{ fontSize: 10, color: "#7f8c8d", letterSpacing: "0.08em" }}>ASSET MGMT</div>
          </div>
        </div>
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {NAV.map(n => (
            <button
              key={n.key}
              onClick={() => setPage(n.key)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 20px", border: "none", background: page === n.key ? "#0f3460" : "none", color: page === n.key ? "#fff" : "#95a5a6", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", borderRight: page === n.key ? "3px solid #e94560" : "none" }}
            >
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: "1px solid #2d2d44", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#e94560", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {user.username[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#ecf0f1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
            <div style={{ fontSize: 10, color: "#7f8c8d" }}>{ROLE_LABELS[user.role]}</div>
          </div>
          <button onClick={logout} style={{ background: "none", border: "none", color: "#7f8c8d", cursor: "pointer", fontSize: 16 }} title="Sign out">⏻</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        <PageComponent api={api} user={user} />
      </main>
    </div>
  );
}
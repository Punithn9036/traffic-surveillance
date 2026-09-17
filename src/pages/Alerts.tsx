import { useState, useEffect } from "react";
import Badge from "../components/Badge";
import { useApp } from "../context/AppContext";
import { acknowledgeAllAlerts } from "../services/api";
import type { Alert } from "../services/api";

function AlertDetailDrawer({ alert, onClose, onAcknowledge }: {
  alert: Alert;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
      />

      {/* Drawer */}
      <div
        className="drawer-enter"
        style={{
          position: "relative",
          width: 420,
          height: "100%",
          background: "#111827",
          borderLeft: "1px solid #1e2d45",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #1e2d45",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", fontFamily: "JetBrains Mono, monospace" }}>
                {alert.id}
              </span>
              <Badge severity={alert.severity} />
              <Badge severity={alert.acknowledged ? "resolved" : "active"} />
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{alert.type}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #1e2d45",
              color: "#64748b",
              borderRadius: 6,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Evidence Images */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2d45" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}>
            Evidence
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {["Vehicle", "Plate", "Camera Frame"].map((label) => (
              <div key={label}>
                <div
                  style={{
                    height: 80,
                    background: "#0d1420",
                    border: "1px solid #1e2d45",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#475569",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  [{label}]
                </div>
                <div style={{ fontSize: 9, color: "#475569", textAlign: "center", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert details */}
        <div style={{ padding: "16px 20px", flex: 1 }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>
            Alert Details
          </div>

          {[
            ["Alert ID", alert.id],
            ["Type", alert.type],
            ["Plate Number", alert.plate || "—"],
            ["Camera", alert.camera],
            ["Location", alert.location || "—"],
            ["Timestamp", alert.timestamp],
            ["Subject", alert.subject],
          ].map(([key, val]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "9px 0",
                borderBottom: "1px solid #1a2438",
              }}
            >
              <span style={{ fontSize: 12, color: "#64748b" }}>{key}</span>
              <span
                style={{
                  fontSize: 12,
                  color: "#f1f5f9",
                  fontFamily: key === "Plate Number" || key === "Alert ID" || key === "Camera" ? "JetBrains Mono, monospace" : "Inter, sans-serif",
                  fontWeight: key === "Plate Number" ? 600 : 400,
                }}
              >
                {val}
              </span>
            </div>
          ))}

          {/* Message (if any) */}
          {alert.message && (
             <div style={{ marginTop: 12 }}>
               <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Message</div>
               <div style={{ fontSize: 12, color: "#f1f5f9" }}>{alert.message}</div>
             </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid #1e2d45",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {!alert.acknowledged && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid #2563eb",
                background: "rgba(37,99,235,0.18)",
                color: "#60a5fa",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Acknowledge
            </button>
          )}
          <button
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #06b6d4",
              background: "rgba(6,182,212,0.12)",
              color: "#22d3ee",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Investigate
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Alerts() {
  const { alerts, alertsLoading, dismissAlert, refreshAlerts } = useApp();
  const [selected, setSelected] = useState<Alert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const counts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  const filtered = alerts.filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterStatus === "acknowledged" && !a.acknowledged) return false;
    if (filterStatus === "active" && a.acknowledged) return false;
    return true;
  });

  const handleAcknowledgeAll = async () => {
    await acknowledgeAllAlerts();
    refreshAlerts();
  };

  if (alertsLoading) {
    return (
      <div style={{ padding: "24px", color: "#94a3b8" }}>Loading alerts...</div>
    );
  }

  return (
    <div style={{ padding: "24px", overflowY: "auto", height: "100%", background: "#0b0f1a" }}>
      {/* Live status bar */}
      <div
        style={{
          background: "#141c2e",
          border: "1px solid #1e2d45",
          borderRadius: 8,
          padding: "10px 16px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 8px #10b981",
            }}
            className="live-blink"
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.06em" }}>
            LIVE
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#64748b" }}>WebSocket connected • Showing live alerts</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={handleAcknowledgeAll}
            style={{
              padding: "4px 10px",
              borderRadius: 5,
              border: "1px solid #1e2d45",
              background: "transparent",
              color: "#94a3b8",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Acknowledge All
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Critical", count: counts.critical, color: "#ef4444", glow: "rgba(239,68,68,0.2)" },
          { label: "Warning", count: counts.warning, color: "#f59e0b", glow: "rgba(245,158,11,0.2)" },
          { label: "Info", count: counts.info, color: "#3b82f6", glow: "rgba(59,130,246,0.2)" },
        ].map((k) => (
          <div
            key={k.label}
            onClick={() => setFilterSeverity(filterSeverity === k.label.toLowerCase() ? "all" : k.label.toLowerCase())}
            style={{
              flex: 1,
              background: "#141c2e",
              border: `1px solid ${filterSeverity === k.label.toLowerCase() ? k.color : "#1e2d45"}`,
              borderRadius: 10,
              padding: "16px 18px",
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: filterSeverity === k.label.toLowerCase() ? `0 0 16px ${k.glow}` : "none",
            }}
          >
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "JetBrains Mono, monospace", marginBottom: 6 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.count}</div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div
        style={{
          background: "#141c2e",
          border: "1px solid #1e2d45",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 14,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>Filter:</span>
        {[
          { label: "All", value: "all", type: "severity" },
          { label: "Critical", value: "critical", type: "severity" },
          { label: "Warning", value: "warning", type: "severity" },
          { label: "Info", value: "info", type: "severity" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterSeverity(f.value)}
            style={{
              padding: "4px 10px",
              borderRadius: 5,
              border: "1px solid",
              borderColor: filterSeverity === f.value ? "#2563eb" : "#1e2d45",
              background: filterSeverity === f.value ? "rgba(37,99,235,0.15)" : "transparent",
              color: filterSeverity === f.value ? "#60a5fa" : "#64748b",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: filterSeverity === f.value ? 600 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
        <div style={{ width: 1, height: 18, background: "#1e2d45" }} />
        {(["all", "active", "acknowledged"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "4px 10px",
              borderRadius: 5,
              border: "1px solid",
              borderColor: filterStatus === s ? "#2563eb" : "#1e2d45",
              background: filterStatus === s ? "rgba(37,99,235,0.15)" : "transparent",
              color: filterStatus === s ? "#60a5fa" : "#64748b",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: filterStatus === s ? 600 : 400,
              textTransform: "capitalize",
            }}
          >
            {s === "all" ? "All Status" : s}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748b", fontFamily: "JetBrains Mono, monospace" }}>
          {filtered.length} alerts
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#141c2e",
          border: "1px solid #1e2d45",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0f1829" }}>
              {["Alert ID", "Type", "Severity", "Subject", "Plate", "Camera", "Location", "Timestamp", "Status", "Action"].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "11px 14px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    fontFamily: "JetBrains Mono, monospace",
                    borderBottom: "1px solid #1e2d45",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((alert, i) => (
              <tr
                key={alert.id}
                onClick={() => setSelected(alert)}
                style={{
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  borderLeft: alert.severity === "critical" ? "2px solid #ef4444" : alert.severity === "warning" ? "2px solid #f59e0b" : "2px solid transparent",
                  opacity: alert.acknowledged ? 0.6 : 1,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(37,99,235,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; }}
              >
                <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "#60a5fa", whiteSpace: "nowrap" }}>
                  {alert.id}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#f1f5f9", whiteSpace: "nowrap" }}>{alert.type}</td>
                <td style={{ padding: "10px 14px" }}><Badge severity={alert.severity} /></td>
                <td style={{ padding: "10px 14px", fontSize: 11, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}>{alert.subject}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#f1f5f9", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{alert.plate || "—"}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#22d3ee", fontFamily: "JetBrains Mono, monospace" }}>{alert.camera}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>{alert.location || "—"}</td>
                <td style={{ padding: "10px 14px", fontSize: 11, color: "#64748b", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>{alert.timestamp.slice(11)}</td>
                <td style={{ padding: "10px 14px" }}><Badge severity={alert.acknowledged ? "resolved" : "active"} /></td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(alert); }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 5,
                        border: "1px solid #1e2d45",
                        background: "transparent",
                        color: "#94a3b8",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      View →
                      View Details
                    </button>
                    {!alert.acknowledged && (
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 5,
                          border: "1px solid #1e2d45",
                          background: "transparent",
                          color: "#34d399",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Ack.
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alert Drawer */}
      {selected && (
        <AlertDetailDrawer
          alert={selected}
          onClose={() => setSelected(null)}
          onAcknowledge={(id) => dismissAlert(id)}
        />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

interface EmailItem {
  id: string;
  to: string;
  subject: string;
  date: string;
}

export default function DevMailboxPage() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dev/mailbox");
      const data = await res.json();
      const list: EmailItem[] = data.emails || [];
      setEmails(list);
      setSelected((prev) => prev ?? list[0]?.id ?? null);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [auto, load]);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Inter, Arial, sans-serif" }}>
      <aside style={{ width: 340, borderRight: "1px solid #e4e8eb", display: "flex", flexDirection: "column", background: "#f7f9fa" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #e4e8eb", background: "#232f3e", color: "#fff" }}>
          <strong>📬 Buzón de desarrollo</strong>
          <div style={{ fontSize: 12, color: "#c9ced3", marginTop: 4 }}>
            Correos enviados en local (demo)
          </div>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Auto-actualizar
          </label>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {emails.length === 0 ? (
            <p style={{ padding: 18, color: "#6a6f73", fontSize: 14 }}>
              Aún no hay correos. Realiza una compra y aparecerán aquí.
            </p>
          ) : (
            emails.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 18px",
                  border: "none",
                  borderBottom: "1px solid #eef1f3",
                  background: selected === e.id ? "#fffbeb" : "transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1d1f" }}>{e.subject}</div>
                <div style={{ fontSize: 12, color: "#6a6f73", marginTop: 2 }}>Para: {e.to}</div>
                <div style={{ fontSize: 11, color: "#9aa0a6", marginTop: 2 }}>
                  {new Date(e.date).toLocaleString("es")}
                </div>
              </button>
            ))
          )}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid #e4e8eb" }}>
          <button onClick={load} style={{ width: "100%", padding: 8, cursor: "pointer", borderRadius: 6, border: "1px solid #d1d7dc", background: "#fff" }}>
            Actualizar
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, background: "#fff" }}>
        {selected ? (
          <iframe
            key={selected}
            src={`/api/dev/mailbox/${selected}`}
            title="email"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <div style={{ padding: 40, color: "#6a6f73" }}>Selecciona un correo para verlo.</div>
        )}
      </main>
    </div>
  );
}

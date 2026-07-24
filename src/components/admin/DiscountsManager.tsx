"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Code {
  id: number;
  code: string;
  percent: number;
  campaign: string | null;
  used: boolean;
  usedByEmail: string | null;
  active: boolean;
  expired: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export function DiscountsManager() {
  const router = useRouter();
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string[]>([]);

  // form
  const [percent, setPercent] = useState(20);
  const [quantity, setQuantity] = useState(5);
  const [campaign, setCampaign] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [prefix, setPrefix] = useState("ECL");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/discounts");
    if (res.status === 401) return router.push("/admin/login");
    setCodes((await res.json()).codes || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(m: string, isErr = false) {
    if (isErr) setError(m);
    else setMsg(m);
    setTimeout(() => { setMsg(null); setError(null); }, 5000);
  }

  async function generate() {
    setBusy(true);
    setGenerated([]);
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent, quantity, campaign, expiresInDays: expiresInDays || undefined, prefix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setGenerated(data.codes);
      flash(`${data.count} código(s) generado(s)`);
      load();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error", true);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: Code) {
    await fetch("/api/admin/discounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    load();
  }

  async function remove(c: Code) {
    if (!confirm(`¿Eliminar el código ${c.code}?`)) return;
    await fetch(`/api/admin/discounts?id=${c.id}`, { method: "DELETE" });
    load();
  }

  function status(c: Code): { label: string; cls: string } {
    if (c.used) return { label: "USADO", cls: "status-cancelled" };
    if (!c.active) return { label: "INACTIVO", cls: "status-failed" };
    if (c.expired) return { label: "EXPIRADO", cls: "status-failed" };
    return { label: "DISPONIBLE", cls: "status-active" };
  }

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <h1>
          <Link href="/admin" className="admin-back"><i className="fas fa-arrow-left"></i></Link>{" "}
          Códigos de descuento
        </h1>
      </div>

      {msg && <div className="admin-alert success">{msg}</div>}
      {error && <div className="admin-alert error">{error}</div>}

      <section className="admin-section">
        <h2>Generar códigos</h2>
        <div className="editor-row">
          <div className="editor-field">
            <label>% de descuento</label>
            <input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
          </div>
          <div className="editor-field">
            <label>Cantidad</label>
            <input type="number" min={1} max={200} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div className="editor-field">
            <label>Prefijo</label>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <div className="editor-field">
            <label>Campaña (opcional)</label>
            <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Black Friday" />
          </div>
          <div className="editor-field">
            <label>Expira en (días, opcional)</label>
            <input type="number" min={1} value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value) || "")} />
          </div>
        </div>
        <button className="btn-primary btn-sm" onClick={generate} disabled={busy}>
          {busy ? "Generando..." : "Generar códigos"}
        </button>

        {generated.length > 0 && (
          <div className="generated-codes">
            <p className="admin-muted">Códigos generados (cópialos para enviar a tus clientes):</p>
            <textarea readOnly rows={Math.min(generated.length, 8)} value={generated.join("\n")} className="editor-textarea" />
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Todos los códigos</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : codes.length === 0 ? (
          <p className="admin-muted">No hay códigos. Genera el primero arriba.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Código</th><th>%</th><th>Campaña</th><th>Estado</th><th>Usado por</th><th></th></tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const s = status(c);
                  return (
                    <tr key={c.id}>
                      <td><strong style={{ fontFamily: "monospace" }}>{c.code}</strong></td>
                      <td>{c.percent}%</td>
                      <td>{c.campaign || "—"}</td>
                      <td><span className={`status-pill ${s.cls}`}>{s.label}</span></td>
                      <td className="admin-slug">{c.usedByEmail || "—"}</td>
                      <td>
                        <div className="row-actions">
                          {!c.used && (
                            <button className="link-btn" onClick={() => toggle(c)}>
                              {c.active ? "Desactivar" : "Activar"}
                            </button>
                          )}
                          <button className="link-btn" onClick={() => remove(c)} style={{ color: "#b91c1c" }}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

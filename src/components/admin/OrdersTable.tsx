"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  email: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: { title: string; price: number }[];
}

interface Stats {
  revenue: number;
  paidCount: number;
  counts: Record<string, number>;
}

export function OrdersTable() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ revenue: 0, paidCount: 0, counts: {} });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await res.json();
    setOrders(data.orders || []);
    setStats(data.stats || { revenue: 0, paidCount: 0, counts: {} });
    setLoading(false);
  }, [status, router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <h1>
          <Link href="/admin" className="admin-back">
            <i className="fas fa-arrow-left"></i>
          </Link>{" "}
          Ventas
        </h1>
      </div>

      <div className="admin-stats">
        <div className="stat-box ok">
          <span className="stat-box-num">${stats.revenue.toLocaleString("en-US")}</span>
          <span className="stat-box-label">Ingresos (pagadas)</span>
        </div>
        <div className="stat-box">
          <span className="stat-box-num">{stats.paidCount}</span>
          <span className="stat-box-label">Órdenes pagadas</span>
        </div>
        <div className="stat-box warn">
          <span className="stat-box-num">{stats.counts["REFUNDED"] || 0}</span>
          <span className="stat-box-label">Reembolsadas</span>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <div className="enroll-filters">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todas</option>
              <option value="PAID">Pagadas</option>
              <option value="PENDING">Pendientes</option>
              <option value="FAILED">Fallidas</option>
              <option value="REFUNDED">Reembolsadas</option>
            </select>
            <button className="btn-outline btn-sm" onClick={load}>Filtrar</button>
          </div>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : orders.length === 0 ? (
          <p className="admin-muted">No hay órdenes.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Cliente</th>
                  <th>Cursos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="admin-slug">#{o.id.slice(0, 8)}</td>
                    <td>{o.email}</td>
                    <td>
                      {o.items.map((it, i) => (
                        <div key={i} style={{ fontSize: "0.85rem" }}>{it.title}</div>
                      ))}
                    </td>
                    <td><strong>${o.total}</strong></td>
                    <td>
                      <span className={`order-status status-${o.status.toLowerCase()}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString("es")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

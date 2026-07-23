"use client";

import { useState } from "react";

// Iconos Font Awesome relevantes para los cursos (aduanas, logística, FDA, etc.)
const ICONS: { icon: string; label: string }[] = [
  { icon: "fa-graduation-cap", label: "graduación educación" },
  { icon: "fa-ship", label: "barco marítimo naviera" },
  { icon: "fa-anchor", label: "ancla puerto" },
  { icon: "fa-box", label: "caja paquete" },
  { icon: "fa-boxes-packing", label: "cajas empaque fba" },
  { icon: "fa-truck", label: "camion transporte" },
  { icon: "fa-truck-fast", label: "camion rapido envio logistica" },
  { icon: "fa-plane", label: "avion aereo" },
  { icon: "fa-plane-departure", label: "avion despegue export" },
  { icon: "fa-warehouse", label: "almacen bodega deposito" },
  { icon: "fa-dolly", label: "carretilla carga" },
  { icon: "fa-flask", label: "laboratorio fda quimica" },
  { icon: "fa-prescription-bottle-medical", label: "medicamento fda" },
  { icon: "fa-pills", label: "pastillas suplementos" },
  { icon: "fa-vial", label: "muestra prueba" },
  { icon: "fa-seedling", label: "planta usda agricola" },
  { icon: "fa-leaf", label: "hoja organico usda" },
  { icon: "fa-wheat-awn", label: "trigo agricola grano" },
  { icon: "fa-cow", label: "ganado animal usda" },
  { icon: "fa-fish", label: "pescado alimento" },
  { icon: "fa-utensils", label: "alimentos comida" },
  { icon: "fa-money-bill-transfer", label: "pagos fintech transferencia" },
  { icon: "fa-coins", label: "monedas finanzas" },
  { icon: "fa-sack-dollar", label: "dinero ingresos" },
  { icon: "fa-credit-card", label: "tarjeta pago" },
  { icon: "fa-file-invoice-dollar", label: "factura contabilidad" },
  { icon: "fa-calculator", label: "calculadora contable impuestos" },
  { icon: "fa-chart-line", label: "grafico crecimiento ventas" },
  { icon: "fa-file-contract", label: "contrato tratado tlc" },
  { icon: "fa-file-signature", label: "firma documento" },
  { icon: "fa-scale-balanced", label: "balanza legal cumplimiento" },
  { icon: "fa-gavel", label: "martillo legal aduana" },
  { icon: "fa-landmark", label: "aduana gobierno institucion" },
  { icon: "fa-building-columns", label: "banco institucion" },
  { icon: "fa-globe", label: "mundo global" },
  { icon: "fa-earth-americas", label: "america continente" },
  { icon: "fa-passport", label: "pasaporte importacion" },
  { icon: "fa-stamp", label: "sello aduana" },
  { icon: "fa-clipboard-check", label: "checklist cumplimiento" },
  { icon: "fa-shield-halved", label: "escudo proteccion cbp" },
  { icon: "fa-certificate", label: "certificado diploma" },
  { icon: "fa-award", label: "premio reconocimiento" },
  { icon: "fa-store", label: "tienda amazon seller" },
  { icon: "fa-cart-shopping", label: "carrito ecommerce" },
  { icon: "fa-tags", label: "etiquetas precio" },
  { icon: "fa-barcode", label: "codigo barras producto" },
  { icon: "fa-people-group", label: "equipo comunidad" },
  { icon: "fa-handshake", label: "acuerdo alianza" },
  { icon: "fa-briefcase", label: "negocio empresa" },
  { icon: "fa-book", label: "libro curso" },
  { icon: "fa-chalkboard-user", label: "profesor clase taller" },
  { icon: "fa-video", label: "video leccion" },
  { icon: "fa-bullhorn", label: "marketing anuncio" },
  { icon: "fa-palette", label: "branding diseño marca" },
  { icon: "fa-trademark", label: "marca registrada" },
];

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = q
    ? ICONS.filter(
        (i) =>
          i.icon.includes(q.toLowerCase()) ||
          i.label.includes(q.toLowerCase())
      )
    : ICONS;

  return (
    <div className="icon-picker">
      <button
        type="button"
        className="icon-picker-current"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="icon-preview">
          <i className={`fas ${value || "fa-graduation-cap"}`}></i>
        </span>
        <span className="icon-picker-label">{value || "Seleccionar icono"}</span>
        <i className={`fas fa-chevron-${open ? "up" : "down"}`}></i>
      </button>

      {open && (
        <div className="icon-picker-panel">
          <input
            type="text"
            className="icon-picker-search"
            placeholder="Buscar icono (ej. aduana, fda, envío)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <div className="icon-grid">
            {filtered.map((i) => (
              <button
                type="button"
                key={i.icon}
                className={`icon-cell ${value === i.icon ? "selected" : ""}`}
                title={i.icon.replace("fa-", "")}
                onClick={() => {
                  onChange(i.icon);
                  setOpen(false);
                  setQ("");
                }}
              >
                <i className={`fas ${i.icon}`}></i>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="admin-muted" style={{ gridColumn: "1/-1" }}>
                Sin resultados.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

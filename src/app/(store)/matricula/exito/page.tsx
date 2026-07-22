"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    clearCart();
    if (!sessionId) {
      setStatus("error");
      return;
    }
    fetch(`/api/checkout/session?id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "paid") {
          setStatus("ok");
          setEmail(data.customerEmail);
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div
      className="container"
      style={{ padding: "80px 24px", textAlign: "center", maxWidth: 600 }}
    >
      {status === "loading" && (
        <>
          <i
            className="fas fa-spinner fa-spin"
            style={{ fontSize: "3rem", color: "var(--amazon-orange)" }}
          ></i>
          <h1 style={{ marginTop: 24 }}>Confirmando tu matrícula...</h1>
        </>
      )}

      {status === "ok" && (
        <>
          <i
            className="fas fa-circle-check"
            style={{ fontSize: "4rem", color: "#16a34a" }}
          ></i>
          <h1 style={{ marginTop: 24, marginBottom: 12 }}>
            ¡Matrícula Confirmada!
          </h1>
          <p style={{ color: "var(--gray-500)", marginBottom: 8 }}>
            Gracias por tu compra. Tu acceso a los cursos ha sido activado.
          </p>
          {email && (
            <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>
              Enviamos los detalles de acceso a <strong>{email}</strong>.
              Recibirás las credenciales de la plataforma Evolmind.
            </p>
          )}
          <Link href="/" className="btn-primary btn-lg">
            Volver al inicio
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <i
            className="fas fa-circle-exclamation"
            style={{ fontSize: "4rem", color: "#dc2626" }}
          ></i>
          <h1 style={{ marginTop: 24, marginBottom: 12 }}>
            No pudimos confirmar tu pago
          </h1>
          <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>
            Si el cargo se realizó, contáctanos y lo resolveremos.
          </p>
          <Link href="/#cursos" className="btn-primary btn-lg">
            Volver a los cursos
          </Link>
        </>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: "center" }}>Cargando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

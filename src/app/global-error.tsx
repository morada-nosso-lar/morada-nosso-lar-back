"use client";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="pt">
      <body>
        <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center" }}>
          <h2>Ocorreu um erro inesperado no sistema.</h2>
          {error?.digest && <p style={{ color: "#666" }}>Código do Erro: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              padding: "10px 20px",
              marginTop: "20px",
              backgroundColor: "#007BFF",
              color: "#FFF",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
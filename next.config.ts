import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "pg", "reflect-metadata", "@neondatabase/serverless", "ws"],
  
  async headers() {
    return [
      {
        // Aplica as regras a todas as rotas dentro de /api
        source: "/api/:path*",
        headers: [
          // Permite que os cookies de autenticação sejam enviados/recebidos
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // Permite explicitamente a origem do teu front-end Vite
          // Como deve ficar
          { key: "Access-Control-Allow-Origin", value: process.env.FRONTEND_URL || "http://localhost:5173" },
          // Permite os métodos necessários para o CRUD
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          // Permite os cabeçalhos que o Axios costuma enviar (incluindo o Token)
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
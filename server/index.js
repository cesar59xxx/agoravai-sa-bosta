import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import dotenv from "dotenv"
import { supabase } from "./config/supabase.js"

dotenv.config()

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
})

// Middlewares de segurança
app.use(helmet())
app.use(compression())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Muitas requisições deste IP, tente novamente mais tarde",
})
app.use("/api/", limiter)

// Body parser
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Health check
app.get("/health", async (req, res) => {
  try {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "supabase",
    })
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    })
  }
})

app.get("/api/health", async (req, res) => {
  try {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "supabase",
    })
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    })
  }
})

app.get("/", (req, res) => {
  res.json({
    message: "WhatsApp CRM Backend API",
    version: "1.0.0",
    status: "running",
  })
})

// Iniciar servidor
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 Servidor rodando na porta ${PORT}
📱 WhatsApp CRM SaaS iniciado
🌍 Ambiente: ${process.env.NODE_ENV || "development"}
💾 Database: Supabase
  `)
})

// Tratamento de erros não capturados
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err)
})

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err)
})

export { io, supabase }

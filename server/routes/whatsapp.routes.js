import express from "express"
import { asyncHandler } from "../middleware/error.middleware.js"
import { authenticate, checkPermission } from "../middleware/auth.middleware.js"
import * as whatsappController from "../controllers/whatsapp.controller.js"

const router = express.Router()

// Todas as rotas requerem autenticação
router.use(authenticate)

// Listar sessões do tenant
router.get("/sessions", asyncHandler(whatsappController.getSessions))

// Criar nova sessão
router.post("/sessions", checkPermission("manage_whatsapp"), asyncHandler(whatsappController.createSession))

// Obter detalhes de uma sessão
router.get("/sessions/:sessionId", asyncHandler(whatsappController.getSession))

// Inicializar/Conectar sessão
router.post(
  "/sessions/:sessionId/connect",
  checkPermission("manage_whatsapp"),
  asyncHandler(whatsappController.connectSession),
)

// Desconectar sessão
router.post(
  "/sessions/:sessionId/disconnect",
  checkPermission("manage_whatsapp"),
  asyncHandler(whatsappController.disconnectSession),
)

// Deletar sessão
router.delete(
  "/sessions/:sessionId",
  checkPermission("manage_whatsapp"),
  asyncHandler(whatsappController.deleteSession),
)

// Enviar mensagem
router.post("/send", asyncHandler(whatsappController.sendMessage))

// Obter QR Code atual
router.get("/sessions/:sessionId/qr", asyncHandler(whatsappController.getQRCode))

export default router

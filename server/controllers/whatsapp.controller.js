import { WhatsAppSession } from "../models/whatsapp-session.model.js"
import { Contact } from "../models/contact.model.js"
import { Message } from "../models/message.model.js"
import { whatsappManager } from "../services/whatsapp-manager.service.js"
import { v4 as uuidv4 } from "uuid"

/**
 * Listar sessões do tenant
 */
export const getSessions = async (req, res) => {
  const sessions = await WhatsAppSession.find({
    tenantId: req.tenant._id,
  }).sort({ createdAt: -1 })

  // Adicionar status de conexão em tempo real
  const sessionsWithStatus = sessions.map((session) => {
    const isActive = whatsappManager.isSessionActive(session.sessionId)
    return {
      ...session.toObject(),
      isConnected: isActive,
    }
  })

  res.json({ sessions: sessionsWithStatus })
}

/**
 * Criar nova sessão
 */
export const createSession = async (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ error: "Nome da sessão é obrigatório" })
  }

  // Verificar limite de sessões
  const canAdd = await req.tenant.canAddWhatsAppSession()
  if (!canAdd) {
    return res.status(403).json({
      error: `Limite de sessões WhatsApp atingido. Plano ${req.tenant.plan} permite ${req.tenant.planLimits.maxWhatsAppSessions} sessão(ões).`,
    })
  }

  // Criar sessão
  const sessionId = `session_${req.tenant._id}_${uuidv4()}`

  const session = await WhatsAppSession.create({
    tenantId: req.tenant._id,
    sessionId,
    name,
    status: "disconnected",
  })

  res.status(201).json({
    message: "Sessão criada com sucesso",
    session,
  })
}

/**
 * Obter detalhes da sessão
 */
export const getSession = async (req, res) => {
  const { sessionId } = req.params

  const session = await WhatsAppSession.findOne({
    sessionId,
    tenantId: req.tenant._id,
  })

  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada" })
  }

  const isActive = whatsappManager.isSessionActive(sessionId)

  res.json({
    session: {
      ...session.toObject(),
      isConnected: isActive,
    },
  })
}

/**
 * Conectar sessão (gerar QR Code)
 */
export const connectSession = async (req, res) => {
  const { sessionId } = req.params

  const session = await WhatsAppSession.findOne({
    sessionId,
    tenantId: req.tenant._id,
  })

  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada" })
  }

  // Verificar se já está conectada
  if (whatsappManager.isSessionActive(sessionId)) {
    return res.status(400).json({
      error: "Sessão já está conectada",
    })
  }

  // Inicializar sessão (assíncrono)
  whatsappManager.initializeSession(sessionId, req.tenant._id).catch((error) => {
    console.error("Erro ao inicializar sessão:", error)
  })

  res.json({
    message: "Sessão sendo inicializada. QR Code será gerado em instantes.",
    sessionId,
  })
}

/**
 * Desconectar sessão
 */
export const disconnectSession = async (req, res) => {
  const { sessionId } = req.params

  const session = await WhatsAppSession.findOne({
    sessionId,
    tenantId: req.tenant._id,
  })

  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada" })
  }

  await whatsappManager.disconnectSession(sessionId)

  res.json({
    message: "Sessão desconectada com sucesso",
  })
}

/**
 * Deletar sessão
 */
export const deleteSession = async (req, res) => {
  const { sessionId } = req.params

  const session = await WhatsAppSession.findOne({
    sessionId,
    tenantId: req.tenant._id,
  })

  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada" })
  }

  // Desconectar se estiver ativa
  if (whatsappManager.isSessionActive(sessionId)) {
    await whatsappManager.disconnectSession(sessionId)
  }

  // Deletar do banco
  await session.deleteOne()

  res.json({
    message: "Sessão deletada com sucesso",
  })
}

/**
 * Enviar mensagem
 */
export const sendMessage = async (req, res) => {
  const { sessionId, contactId, content, type = "text" } = req.body

  if (!sessionId || !contactId || !content) {
    return res.status(400).json({
      error: "sessionId, contactId e content são obrigatórios",
    })
  }

  // Verificar se sessão está ativa
  if (!whatsappManager.isSessionActive(sessionId)) {
    return res.status(400).json({
      error: "Sessão WhatsApp não está conectada",
    })
  }

  // Buscar contato
  const contact = await Contact.findOne({
    _id: contactId,
    tenantId: req.tenant._id,
  })

  if (!contact) {
    return res.status(404).json({ error: "Contato não encontrado" })
  }

  try {
    // Enviar via WhatsApp
    const sentMessage = await whatsappManager.sendMessage(sessionId, contact.whatsappId, content, type)

    // Salvar no banco
    const message = await Message.create({
      tenantId: req.tenant._id,
      contactId: contact._id,
      sessionId,
      whatsappMessageId: sentMessage.id._serialized,
      direction: "outbound",
      type,
      content,
      status: "sent",
      sentBy: req.user._id,
      timestamp: new Date(),
    })

    // Atualizar contato
    await Contact.findByIdAndUpdate(contact._id, {
      lastInteraction: new Date(),
      $inc: { totalMessages: 1 },
    })

    res.json({
      message: "Mensagem enviada com sucesso",
      data: message,
    })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    res.status(500).json({
      error: "Erro ao enviar mensagem",
      details: error.message,
    })
  }
}

/**
 * Obter QR Code atual
 */
export const getQRCode = async (req, res) => {
  const { sessionId } = req.params

  const session = await WhatsAppSession.findOne({
    sessionId,
    tenantId: req.tenant._id,
  })

  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada" })
  }

  if (!session.qrCode || new Date() > session.qrCodeExpiry) {
    return res.status(404).json({
      error: "QR Code não disponível ou expirado",
    })
  }

  res.json({
    qrCode: session.qrCode,
    expiresAt: session.qrCodeExpiry,
  })
}

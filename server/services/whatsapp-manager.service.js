import pkg from "whatsapp-web.js"
const { Client, LocalAuth, MessageMedia } = pkg
import qrcode from "qrcode"
import { WhatsAppSession } from "../models/whatsapp-session.model.js"
import { Contact } from "../models/contact.model.js"
import { Message } from "../models/message.model.js"
import { messageQueue } from "../queues/message.queue.js"
import fs from "fs"

/**
 * WhatsAppManager - Gerenciador de múltiplas sessões WhatsApp
 * Cada sessão representa uma conexão WhatsApp Web independente
 */
class WhatsAppManager {
  constructor() {
    // Map para armazenar clientes ativos: sessionId -> Client
    this.clients = new Map()

    // Map para armazenar estados de inicialização
    this.initializing = new Map()
  }

  /**
   * Inicializar uma nova sessão WhatsApp
   */
  async initializeSession(sessionId, tenantId) {
    // Verificar se já está inicializando ou ativo
    if (this.initializing.get(sessionId) || this.clients.has(sessionId)) {
      console.log(`[${sessionId}] Sessão já está ativa ou inicializando`)
      return
    }

    this.initializing.set(sessionId, true)

    try {
      console.log(`[${sessionId}] Inicializando sessão WhatsApp...`)

      // Buscar configuração da sessão
      const session = await WhatsAppSession.findOne({ sessionId })
      if (!session) {
        throw new Error("Sessão não encontrada no banco de dados")
      }

      // Criar diretório de sessões se não existir
      const sessionsPath = process.env.SESSIONS_PATH || "./sessions"
      if (!fs.existsSync(sessionsPath)) {
        fs.mkdirSync(sessionsPath, { recursive: true })
      }

      // Configurar estratégia de autenticação
      const authStrategy = new LocalAuth({
        clientId: sessionId,
        dataPath: sessionsPath,
      })

      // Criar cliente WhatsApp
      const client = new Client({
        authStrategy,
        puppeteer: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
          ],
        },
        webVersionCache: {
          type: "remote",
          remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
        },
      })

      // ========== EVENT HANDLERS ==========

      // QR Code gerado
      client.on("qr", async (qr) => {
        console.log(`[${sessionId}] QR Code gerado`)

        try {
          // Converter QR para base64
          const qrCodeDataUrl = await qrcode.toDataURL(qr)

          // Atualizar no banco
          await WhatsAppSession.findOneAndUpdate(
            { sessionId },
            {
              status: "qr",
              qrCode: qrCodeDataUrl,
              qrCodeExpiry: new Date(Date.now() + 60000), // 60 segundos
            },
          )

          // Emitir via Socket.IO
          this.emitToTenant(tenantId, "whatsapp:qr", {
            sessionId,
            qrCode: qrCodeDataUrl,
          })
        } catch (error) {
          console.error(`[${sessionId}] Erro ao processar QR:`, error)
        }
      })

      // Autenticando
      client.on("authenticated", async () => {
        console.log(`[${sessionId}] Autenticado com sucesso`)

        await WhatsAppSession.findOneAndUpdate(
          { sessionId },
          {
            status: "authenticated",
            qrCode: null,
            reconnectAttempts: 0,
          },
        )

        this.emitToTenant(tenantId, "whatsapp:authenticated", { sessionId })
      })

      // Falha na autenticação
      client.on("auth_failure", async (error) => {
        console.error(`[${sessionId}] Falha na autenticação:`, error)

        await WhatsAppSession.findOneAndUpdate(
          { sessionId },
          {
            status: "error",
            qrCode: null,
          },
        )

        this.emitToTenant(tenantId, "whatsapp:auth_failure", {
          sessionId,
          error: error.message,
        })
      })

      // Cliente pronto
      client.on("ready", async () => {
        console.log(`[${sessionId}] Cliente pronto!`)

        // Obter informações do WhatsApp
        const info = client.info

        await WhatsAppSession.findOneAndUpdate(
          { sessionId },
          {
            status: "ready",
            phoneNumber: info.wid.user,
            lastConnected: new Date(),
            metadata: {
              pushname: info.pushname,
              platform: info.platform,
              wid: info.wid._serialized,
            },
          },
        )

        this.emitToTenant(tenantId, "whatsapp:ready", {
          sessionId,
          phoneNumber: info.wid.user,
        })
      })

      // Desconectado
      client.on("disconnected", async (reason) => {
        console.log(`[${sessionId}] Desconectado:`, reason)

        await WhatsAppSession.findOneAndUpdate(
          { sessionId },
          {
            status: "disconnected",
            lastDisconnected: new Date(),
          },
        )

        // Remover cliente do Map
        this.clients.delete(sessionId)
        this.initializing.delete(sessionId)

        this.emitToTenant(tenantId, "whatsapp:disconnected", {
          sessionId,
          reason,
        })

        // Tentar reconectar após 5 segundos
        setTimeout(() => {
          this.reconnectSession(sessionId, tenantId)
        }, 5000)
      })

      // Nova mensagem recebida
      client.on("message", async (msg) => {
        try {
          await this.handleIncomingMessage(msg, sessionId, tenantId)
        } catch (error) {
          console.error(`[${sessionId}] Erro ao processar mensagem:`, error)
        }
      })

      // Mudança de estado da mensagem
      client.on("message_ack", async (msg, ack) => {
        try {
          await this.handleMessageAck(msg, ack, sessionId)
        } catch (error) {
          console.error(`[${sessionId}] Erro ao processar ACK:`, error)
        }
      })

      // Inicializar cliente
      await client.initialize()

      // Armazenar cliente no Map
      this.clients.set(sessionId, client)

      console.log(`[${sessionId}] Cliente armazenado no Map`)
    } catch (error) {
      console.error(`[${sessionId}] Erro ao inicializar:`, error)

      await WhatsAppSession.findOneAndUpdate({ sessionId }, { status: "error" })

      this.initializing.delete(sessionId)

      throw error
    }
  }

  /**
   * Processar mensagem recebida
   */
  async handleIncomingMessage(msg, sessionId, tenantId) {
    console.log(`[${sessionId}] Mensagem recebida de ${msg.from}`)

    // Obter ou criar contato
    const contact = await this.getOrCreateContact(msg, sessionId, tenantId)

    // Determinar tipo da mensagem
    let messageType = "text"
    let content = { text: msg.body }

    if (msg.hasMedia) {
      const media = await msg.downloadMedia()
      messageType = media.mimetype.startsWith("image")
        ? "image"
        : media.mimetype.startsWith("video")
          ? "video"
          : media.mimetype.startsWith("audio")
            ? "audio"
            : "document"

      content = {
        text: msg.body,
        mediaUrl: `data:${media.mimetype};base64,${media.data}`,
        mimeType: media.mimetype,
        caption: msg.caption || msg.body,
        filename: media.filename,
      }
    }

    // Criar mensagem no banco
    const message = await Message.create({
      tenantId,
      contactId: contact._id,
      sessionId,
      whatsappMessageId: msg.id._serialized,
      direction: "inbound",
      type: messageType,
      content,
      status: "delivered",
      timestamp: new Date(msg.timestamp * 1000),
    })

    // Atualizar última interação do contato
    await Contact.findByIdAndUpdate(contact._id, {
      lastInteraction: new Date(),
      $inc: { totalMessages: 1 },
    })

    // Emitir mensagem via Socket.IO
    this.emitToTenant(tenantId, "message:new", {
      message: message.toObject(),
      contact: contact.toObject(),
    })

    // Adicionar à fila para processamento de chatbot
    await messageQueue.add("process-message", {
      messageId: message._id,
      tenantId,
      contactId: contact._id,
      sessionId,
    })
  }

  /**
   * Obter ou criar contato
   */
  async getOrCreateContact(msg, sessionId, tenantId) {
    const whatsappId = msg.from
    const phoneNumber = whatsappId.split("@")[0]

    let contact = await Contact.findOne({ tenantId, whatsappId })

    if (!contact) {
      // Buscar informações do contato
      const client = this.clients.get(sessionId)
      const whatsappContact = await client.getContactById(whatsappId)

      contact = await Contact.create({
        tenantId,
        whatsappId,
        name: whatsappContact.pushname || whatsappContact.name || phoneNumber,
        phoneNumber,
        avatar: await whatsappContact.getProfilePicUrl().catch(() => null),
      })

      console.log(`[${sessionId}] Novo contato criado: ${contact.name}`)
    }

    return contact
  }

  /**
   * Processar ACK (confirmação de entrega/leitura)
   */
  async handleMessageAck(msg, ack, sessionId) {
    const statusMap = {
      0: "pending",
      1: "sent",
      2: "delivered",
      3: "read",
      "-1": "failed",
    }

    const status = statusMap[ack] || "pending"

    await Message.findOneAndUpdate({ whatsappMessageId: msg.id._serialized }, { status })
  }

  /**
   * Enviar mensagem
   */
  async sendMessage(sessionId, to, content, type = "text") {
    const client = this.clients.get(sessionId)

    if (!client) {
      throw new Error("Sessão WhatsApp não está ativa")
    }

    let sentMessage

    try {
      if (type === "text") {
        sentMessage = await client.sendMessage(to, content.text)
      } else if (type === "image" || type === "video" || type === "document") {
        const media = new MessageMedia(content.mimeType, content.mediaData, content.filename)
        sentMessage = await client.sendMessage(to, media, {
          caption: content.caption,
        })
      }

      return sentMessage
    } catch (error) {
      console.error(`[${sessionId}] Erro ao enviar mensagem:`, error)
      throw error
    }
  }

  /**
   * Tentar reconectar sessão
   */
  async reconnectSession(sessionId, tenantId) {
    const session = await WhatsAppSession.findOne({ sessionId })

    if (!session || !session.isActive) {
      return
    }

    if (session.reconnectAttempts >= session.maxReconnectAttempts) {
      console.log(`[${sessionId}] Máximo de tentativas de reconexão atingido`)
      await WhatsAppSession.findOneAndUpdate({ sessionId }, { status: "error" })
      return
    }

    console.log(`[${sessionId}] Tentando reconectar... (tentativa ${session.reconnectAttempts + 1})`)

    await WhatsAppSession.findOneAndUpdate({ sessionId }, { reconnectAttempts: session.reconnectAttempts + 1 })

    await this.initializeSession(sessionId, tenantId)
  }

  /**
   * Desconectar sessão
   */
  async disconnectSession(sessionId) {
    const client = this.clients.get(sessionId)

    if (client) {
      await client.destroy()
      this.clients.delete(sessionId)
    }

    this.initializing.delete(sessionId)

    await WhatsAppSession.findOneAndUpdate(
      { sessionId },
      {
        status: "disconnected",
        lastDisconnected: new Date(),
      },
    )
  }

  /**
   * Obter cliente ativo
   */
  getClient(sessionId) {
    return this.clients.get(sessionId)
  }

  /**
   * Verificar se sessão está ativa
   */
  isSessionActive(sessionId) {
    return this.clients.has(sessionId)
  }

  /**
   * Emitir evento para tenant via Socket.IO
   */
  emitToTenant(tenantId, event, data) {
    // Será implementado no módulo Socket.IO
    if (global.io) {
      global.io.to(`tenant:${tenantId}`).emit(event, data)
    }
  }
}

// Singleton
export const whatsappManager = new WhatsAppManager()

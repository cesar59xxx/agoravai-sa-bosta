import { io, type Socket } from "socket.io-client"

// API Client
class APIClient {
  private baseURL: string
  private token: string | null = null

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

    // Carregar token do localStorage
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("accessToken")
    }
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem("accessToken", token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      // Token expirado, tentar refresh
      const refreshed = await this.refreshToken()
      if (refreshed) {
        // Retry request com novo token
        return this.request(endpoint, options)
      } else {
        // Logout
        this.clearToken()
        window.location.href = "/login"
        throw new Error("Session expired")
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || "Request failed")
    }

    return response.json()
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refreshToken")
    if (!refreshToken) return false

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        this.setToken(data.tokens.accessToken)
        localStorage.setItem("refreshToken", data.tokens.refreshToken)
        return true
      }
    } catch (error) {
      console.error("Failed to refresh token:", error)
    }

    return false
  }

  // Auth
  async register(data: any) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async login(data: any) {
    const result = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    })

    this.setToken(result.tokens.accessToken)
    localStorage.setItem("refreshToken", result.tokens.refreshToken)

    return result
  }

  async logout() {
    await this.request("/api/auth/logout", { method: "POST" })
    this.clearToken()
  }

  async getCurrentUser() {
    return this.request("/api/auth/me")
  }

  // Contacts
  async getContacts(params?: any) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/api/contacts${query ? `?${query}` : ""}`)
  }

  async getContact(contactId: string) {
    return this.request(`/api/contacts/${contactId}`)
  }

  async updateContact(contactId: string, data: any) {
    return this.request(`/api/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  // WhatsApp
  async getSessions() {
    return this.request("/api/whatsapp/sessions")
  }

  async createSession(data: any) {
    return this.request("/api/whatsapp/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async connectSession(sessionId: string) {
    return this.request(`/api/whatsapp/sessions/${sessionId}/connect`, {
      method: "POST",
    })
  }

  async sendMessage(data: any) {
    return this.request("/api/whatsapp/send", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Generic
  async get(endpoint: string) {
    return this.request(endpoint)
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }
}

export const apiClient = new APIClient()

// Socket.IO Client
class SocketClient {
  private socket: Socket | null = null

  connect(token: string) {
    if (this.socket?.connected) return this.socket

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      auth: { token },
      transports: ["websocket"],
    })

    this.socket.on("connect", () => {
      console.log("[Socket] Connected")
    })

    this.socket.on("disconnect", () => {
      console.log("[Socket] Disconnected")
    })

    return this.socket
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  getSocket() {
    return this.socket
  }
}

export const socketClient = new SocketClient()

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Bookmark, Clock, User, Wallet, Plus, MoreVertical, RefreshCw, MessageSquare, Zap, AlertCircle, Upload, FileText, Edit2, ChevronLeft, ChevronRight, BarChart2, Download, Pin, X, Pencil, Check } from 'lucide-react'
import { sendMessageStream, uploadDocument, type ChatHistoryMessage, createChatSession, getChatSessions, getChatMessages, deleteChatSession, getProfile, updateProfile as updateUserProfile, updateChatSessionTitle } from '@/lib/api'
import { MarkdownMessage } from '@/components/markdown-message'
import { UserMenu } from '@/components/user-menu'
import { useAuth } from '@/components/auth-provider'
import { Logo } from '@/components/logo'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  sources?: string[]
}

interface RecentQuery {
  id: string
  title: string
  timestamp: string
  category: 'tax' | 'pension' | 'investment' | 'general'
}

type ChartType = 'bar' | 'line' | 'pie'
type ChartMode = 'response' | 'sources'

interface ChartDatum {
  label: string
  value: number
}

interface ChartInference {
  data: ChartDatum[]
  type: ChartType
  unit: string
}

interface ChartSnapshot {
  id: string
  title: string
  data: ChartDatum[]
  type: ChartType
  unit: string
}

const suggestedQueries = [
  { text: 'How can I save tax on ₹15 lakh income?', category: 'tax' as const },
  { text: 'What\'s the best pension plan for me?', category: 'pension' as const },
  { text: 'Safe investment options for ₹5 lakh', category: 'investment' as const },
  { text: 'How to file income tax return online?', category: 'tax' as const },
  { text: 'Schemes for senior citizens 60+', category: 'pension' as const },
  { text: 'ELSS vs PPF vs FD comparison', category: 'investment' as const }
]

export default function ChatPage() {
  const router = useRouter()
  const { user } = useAuth()

  const buildWelcomeMessage = (): Message => ({
    id: '1',
    type: 'ai',
    content: 'नमस्ते! 👋 Welcome to Arth-Mitra. I\'m here to help you understand Indian taxes, government schemes, and financial planning.\n\nTell me about your situation and I\'ll provide personalized guidance.',
    timestamp: new Date(),
    sources: []
  })

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [lastUploadedFile, setLastUploadedFile] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputFieldRef = useRef<HTMLInputElement>(null)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [chartData, setChartData] = useState<ChartDatum[]>([])
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [chartUnit, setChartUnit] = useState('')
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartSnapshots, setChartSnapshots] = useState<ChartSnapshot[]>([])
  const [activeChartId, setActiveChartId] = useState<string | null>(null)
  const [chartMode, setChartMode] = useState<ChartMode>('response')

  // Initialize profile from localStorage
  const [profile, setProfile] = useState({
    age: 0,
    gender: '',
    income: '',
    employmentStatus: '',
    taxRegime: '',
    homeownerStatus: '',
    children: '',
    childrenAges: '',
    parentsAge: '',
    investmentCapacity: '',
    riskAppetite: '',
    financialGoals: [] as string[],
    existingInvestments: [] as string[]
  })

  // User and session state for database integration
  const [userId, setUserId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<any[]>([])

  const [showNewChat, setShowNewChat] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)

  // Sidebar collapse states
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)

  // Profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editedProfile, setEditedProfile] = useState(profile)
  const initializationDone = useRef(false)

  // Session title editing
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionTitle, setEditingSessionTitle] = useState('')

  // Single initialization on mount - handles ALL navigation logic
  useEffect(() => {
    if (initializationDone.current) return
    initializationDone.current = true

    const initializeChat = async () => {
      // Get userId from localStorage
      const storedUserId = localStorage.getItem('userId')
      if (!storedUserId) {
        // No user ID - redirect to login
        router.push('/login')
        return
      }
      setUserId(storedUserId)

      try {
        // Fetch profile from database
        const userProfile = await getProfile(storedUserId)

        // Check if profile is complete (all required fields filled)
        const isComplete = userProfile.income && userProfile.taxRegime && userProfile.age

        if (!isComplete) {
          // Profile incomplete - redirect to profile-setup
          router.push('/profile-setup')
          return
        }

        // Map database profile to local profile format
        const profileData = {
          age: userProfile.age || 0,
          gender: userProfile.gender || '',
          income: userProfile.income || '',
          employmentStatus: userProfile.employmentStatus || '',
          taxRegime: userProfile.taxRegime || '',
          homeownerStatus: userProfile.homeownerStatus || '',
          children: userProfile.children || '',
          childrenAges: userProfile.childrenAges || '',
          parentsAge: userProfile.parentsAge || '',
          investmentCapacity: userProfile.investmentCapacity || '',
          riskAppetite: userProfile.riskAppetite || '',
          financialGoals: userProfile.financialGoals || [],
          existingInvestments: userProfile.existingInvestments || []
        }

        // Load the complete profile
        setProfile(profileData)
        setEditedProfile(profileData)

        // Also save to localStorage for backward compatibility
        localStorage.setItem('userProfile', JSON.stringify({ ...profileData, isProfileComplete: true }))
      } catch (error) {
        console.error('Failed to load profile:', error)
        // Fallback to localStorage if API fails
        const savedProfile = localStorage.getItem('userProfile')
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile)
          if (parsed.isProfileComplete) {
            setProfile(parsed)
            setEditedProfile(parsed)
          } else {
            router.push('/profile-setup')
            return
          }
        } else {
          router.push('/profile-setup')
          return
        }
      }

      // Create or load chat session
      try {
        // Check if there's an active session in localStorage (user-specific)
        const storedSessionId = localStorage.getItem(`currentSessionId_${storedUserId}`)
        if (storedSessionId) {
          setSessionId(storedSessionId)
          // Load messages for this session from API
          try {
            const apiMessages = await getChatMessages(storedSessionId)
            if (apiMessages && apiMessages.length > 0) {
              const convertedMessages: Message[] = apiMessages.map(msg => ({
                id: msg.id,
                type: msg.role === 'user' ? 'user' : 'ai',
                content: msg.content,
                timestamp: new Date(msg.createdAt),
                sources: msg.sources || []
              }))
              setMessages(convertedMessages)
            } else {
              // Fallback to user-specific localStorage
              const savedHistory = localStorage.getItem(`chatHistory_${storedUserId}`)
              if (savedHistory) {
                const parsed = JSON.parse(savedHistory) as Array<Omit<Message, 'timestamp'> & { timestamp: string }>
                setMessages(parsed.map(item => ({
                  ...item,
                  timestamp: new Date(item.timestamp)
                })))
              } else {
                setMessages([buildWelcomeMessage()])
              }
            }
          } catch {
            setMessages([buildWelcomeMessage()])
          }
        } else {
          // Create a new session
          const newSession = await createChatSession(storedUserId, 'New Chat')
          setSessionId(newSession.id)
          localStorage.setItem(`currentSessionId_${storedUserId}`, newSession.id)
          setMessages([buildWelcomeMessage()])
        }

        // Load all chat sessions for the user
        loadChatSessions(storedUserId)
      } catch (error) {
        console.error('Failed to initialize session:', error)
        setMessages([buildWelcomeMessage()])
      }
    }

    initializeChat()
  }, [])

  // Persist chat history (user-specific)
  useEffect(() => {
    if (messages.length === 0 || !userId) return

    const serializable = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }))
    localStorage.setItem(`chatHistory_${userId}`, JSON.stringify(serializable))
  }, [messages, userId])

  const parseNumericValue = (raw: string): number | null => {
    const cleaned = raw
      .replace(/[,₹$]/g, '')
      .replace(/%/g, '')
      .trim()

    const value = Number.parseFloat(cleaned)
    return Number.isFinite(value) ? value : null
  }

  const inferChartData = (content: string): ChartInference => {
    const rows: ChartDatum[] = []
    const used = new Set<string>()

    const addRow = (label: string, value: number | null) => {
      const key = label.trim()
      if (!key || value === null || !Number.isFinite(value)) return
      if (used.has(key)) return
      used.add(key)
      rows.push({ label: key, value })
    }

    const lines = content.split('\n')

    for (const line of lines) {
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').map(cell => cell.trim()).filter(Boolean)
        if (cells.length >= 2 && !cells[1].includes('---')) {
          addRow(cells[0], parseNumericValue(cells[1]))
        }
      }
    }

    const colonRegex = /([A-Za-z][^:\n]{1,40})\s*:\s*([₹$]?\d[\d,]*\.?\d*%?)/g
    let colonMatch: RegExpExecArray | null
    while ((colonMatch = colonRegex.exec(content)) !== null) {
      addRow(colonMatch[1], parseNumericValue(colonMatch[2]))
    }

    const bulletRegex = /[-*]\s*\*\*?([^*]+)\*\*?:?\s*([₹$]?\d[\d,]*\.?\d*%?)/g
    let bulletMatch: RegExpExecArray | null
    while ((bulletMatch = bulletRegex.exec(content)) !== null) {
      addRow(bulletMatch[1], parseNumericValue(bulletMatch[2]))
    }

    const dateHint = rows.some(item => /\b(\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(item.label))
    const sum = rows.reduce((acc, item) => acc + item.value, 0)
    const isPercentLike = rows.length > 1 && rows.length <= 6 && sum >= 95 && sum <= 105

    if (!dateHint) {
      rows.sort((a, b) => b.value - a.value)
    }

    let unit = ''
    if (/₹|\binr\b/i.test(content)) unit = '₹'
    if (/\b(lpa|lakh|lakhs|lac|crore|cr)\b/i.test(content)) unit = '₹'
    if (/%/.test(content)) unit = '%'

    if (dateHint) {
      return { data: rows, type: 'line', unit }
    }

    if (isPercentLike) {
      return { data: rows, type: 'pie', unit: unit || '%' }
    }

    return { data: rows, type: 'bar', unit }
  }

  const getChartTitle = (content: string, timestamp: Date) => {
    const firstLine = content.split('\n').find(line => line.trim()) || ''
    const cleaned = firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()
    if (cleaned) return cleaned.slice(0, 48)
    return `Response ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
  }

  const formatChartValue = (value: number, unit: string) => {
    const formatted = value.toLocaleString('en-IN')
    if (!unit) return formatted
    return unit === '%' ? `${formatted}%` : `${unit}${formatted}`
  }

  const getLegendLabel = () => {
    if (chartMode === 'sources') return 'Source frequency'
    if (chartUnit === '%') return 'Savings (%)'
    if (chartUnit === '₹') return 'Savings (₹)'
    return 'Savings'
  }

  const getActiveSnapshot = () => chartSnapshots.find(snapshot => snapshot.id === activeChartId) || null

  const handleExportChart = () => {
    const container = chartContainerRef.current
    if (!container) return

    const svg = container.querySelector('svg')
    if (!svg) return

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()

    img.onload = () => {
      const scale = window.devicePixelRatio || 1
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.scale(scale, scale)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, img.width, img.height)
      ctx.drawImage(img, 0, 0)

      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `arth-mitra-chart-${Date.now()}.png`
      link.click()
      URL.revokeObjectURL(url)
    }

    img.src = url
  }

  const shortenLabel = (label: string) => {
    const trimmed = label.trim()
    return trimmed.length > 14 ? `${trimmed.slice(0, 14)}...` : trimmed
  }

  const buildSourceChartData = (items: Message[]) => {
    const counts = new Map<string, number>()
    items
      .filter(msg => msg.type === 'ai' && msg.sources && msg.sources.length > 0)
      .forEach(msg => {
        msg.sources!.forEach(source => {
          counts.set(source, (counts.get(source) || 0) + 1)
        })
      })

    const data = Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    setChartData(data)
    setChartUnit('')
    setChartType('bar')
  }

  useEffect(() => {
    if (chartMode === 'sources') return
    if (isLoading) return
    const lastAiMessage = [...messages].reverse().find(msg => msg.type === 'ai' && msg.content.trim())
    if (!lastAiMessage) return

    const inferred = inferChartData(lastAiMessage.content)
    if (inferred.data.length === 0) return

    const snapshot: ChartSnapshot = {
      id: lastAiMessage.id,
      title: getChartTitle(lastAiMessage.content, lastAiMessage.timestamp),
      data: inferred.data,
      type: inferred.type,
      unit: inferred.unit,
    }

    setChartSnapshots(prev => {
      const exists = prev.some(item => item.id === snapshot.id)
      if (exists) return prev
      return [snapshot, ...prev].slice(0, 6)
    })
    setActiveChartId(snapshot.id)
    setChartData(inferred.data)
    setChartType(inferred.type)
    setChartUnit(inferred.unit)
  }, [messages, isLoading, chartMode])

  useEffect(() => {
    if (chartMode !== 'sources') return
    buildSourceChartData(messages)
  }, [messages, chartMode])

  useEffect(() => {
    if (chartMode === 'sources') return
    if (!activeChartId) return
    const snapshot = chartSnapshots.find(item => item.id === activeChartId)
    if (!snapshot) return
    setChartData(snapshot.data)
    setChartType(snapshot.type)
    setChartUnit(snapshot.unit)
  }, [activeChartId, chartSnapshots, chartMode])

  const recentQueries: RecentQuery[] = [
    { id: '1', title: 'Tax saving with ₹10 lakh income', timestamp: '13/02/2026', category: 'tax' },
    { id: '2', title: 'Best pension scheme comparison', timestamp: '12/02/2026', category: 'pension' },
    { id: '3', title: 'Investment portfolio allocation', timestamp: '11/02/2026', category: 'investment' }
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    // Check if this is the first user message (for session title auto-update)
    const isFirstUserMessage = messages.filter(m => m.type === 'user').length === 0

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    const history: ChatHistoryMessage[] = messages
      .filter(msg => {
        if (msg.type === 'user') return true
        if (msg.content.startsWith('📄 Uploading')) return false
        if (msg.content.startsWith('✅ ')) return false
        if (msg.content.startsWith('❌ Failed to upload')) return false
        return true
      })
      .map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      sources: []
    }

    setMessages(prev => [...prev, userMessage, aiMessage])
    const userInput = input
    setInput('')
    setIsLoading(true)
    setStreamingMessageId(aiMessageId)
    setShowSuggestions(false)

    // Clear last uploaded file after first question
    if (lastUploadedFile) {
      setLastUploadedFile('')
    }

    try {
      await sendMessageStream(
        userInput,
        profile,
        history,
        (token) => {
          setMessages(prev => prev.map(msg =>
            msg.id === aiMessageId
              ? { ...msg, content: msg.content + token }
              : msg
          ))
        },
        (sources) => {
          setMessages(prev => prev.map(msg =>
            msg.id === aiMessageId
              ? { ...msg, sources }
              : msg
          ))
        },
        userId || undefined,
        sessionId || undefined
      )
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, content: 'Sorry, I encountered an error connecting to the server. Please make sure the backend is running and try again.' }
          : msg
      ))
    } finally {
      setIsLoading(false)
      setStreamingMessageId(null)
      // Reload sessions if this was the first message (title auto-updated by backend)
      if (isFirstUserMessage && userId) {
        loadChatSessions(userId)
      }
    }
  }

  const toggleBookmark = (messageId: string) => {
    setBookmarks(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    )
  }

  const handleSuggestedQuery = (query: string) => {
    setInput(query)
    setTimeout(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      document.querySelector('input')?.dispatchEvent(event)
    }, 0)
  }

  const handleClearChat = () => {
    if (userId) {
      localStorage.removeItem(`chatHistory_${userId}`)
    }
    setMessages([buildWelcomeMessage()])
    setShowSuggestions(true)
    setLastUploadedFile('')
    setStreamingMessageId(null)
    setIsLoading(false)
  }

  const handleNewChat = async () => {
    try {
      if (!userId) {
        console.error('User ID not found')
        return
      }

      // Create a new session
      const newSession = await createChatSession(userId, 'New Chat')
      setSessionId(newSession.id)
      localStorage.setItem(`currentSessionId_${userId}`, newSession.id)

      // Clear chat history and show welcome message
      setMessages([buildWelcomeMessage()])
      setShowSuggestions(true)
      setLastUploadedFile('')
      setStreamingMessageId(null)
      setIsLoading(false)

      // Reload chat sessions to show the new one
      loadChatSessions(userId)
    } catch (error) {
      console.error('Failed to create new chat:', error)
      alert('Failed to create new chat. Please try again.')
    }
  }

  const loadChatSessions = async (userId: string) => {
    try {
      const sessions = await getChatSessions(userId)
      setChatSessions(sessions)
    } catch (error) {
      console.error('Failed to load chat sessions:', error)
    }
  }

  const handleLoadSession = async (sessionId: string, sessionTitle: string) => {
    try {
      // Set the active session
      setSessionId(sessionId)
      if (userId) {
        localStorage.setItem(`currentSessionId_${userId}`, sessionId)
      }

      // Load messages for this session
      const apiMessages = await getChatMessages(sessionId)

      if (apiMessages && apiMessages.length > 0) {
        // Convert API messages to local format
        const convertedMessages: Message[] = apiMessages.map(msg => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          sources: msg.sources || []
        }))
        setMessages(convertedMessages)
      } else {
        setMessages([buildWelcomeMessage()])
      }

      setShowSuggestions(false)
      setStreamingMessageId(null)
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load session:', error)
      alert('Failed to load chat session. Please try again.')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this chat?')) return

      // Delete from backend
      await deleteChatSession(sessionId)

      // Remove from local state
      setChatSessions(prev => prev.filter(s => s.id !== sessionId))

      // If it's the current session, create a new one
      if (sessionId === sessionId) {
        handleNewChat()
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
      alert('Failed to delete chat. Please try again.')
    }
  }

  const handleUpdateSessionTitle = async (targetSessionId: string, newTitle: string) => {
    try {
      if (!newTitle.trim()) {
        setEditingSessionId(null)
        return
      }

      // Update in backend
      await updateChatSessionTitle(targetSessionId, newTitle.trim())

      // Update local state
      setChatSessions(prev => prev.map(s =>
        s.id === targetSessionId ? { ...s, title: newTitle.trim() } : s
      ))

      setEditingSessionId(null)
      setEditingSessionTitle('')
    } catch (error) {
      console.error('Failed to update session title:', error)
      alert('Failed to rename chat. Please try again.')
    }
  }

  const handleSaveProfile = async () => {
    try {
      if (!userId) {
        console.error('User ID not found')
        return
      }

      // Save to database
      await updateUserProfile(userId, editedProfile)

      // Update local state
      setProfile(editedProfile)
      setIsEditingProfile(false)

      // Save profile updates to localStorage for backward compatibility
      localStorage.setItem('userProfile', JSON.stringify({ ...editedProfile, isProfileComplete: true }))
    } catch (error) {
      console.error('Failed to save profile:', error)
      alert('Failed to save profile. Please try again.')
    }
  }

  const handleRemovePinnedChart = (id: string) => {
    setChartSnapshots(prev => prev.filter(item => item.id !== id))
    if (activeChartId === id) {
      const remaining = chartSnapshots.filter(item => item.id !== id)
      setActiveChartId(remaining[0]?.id || null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setLastUploadedFile(file.name)

    // Add system message about upload
    const uploadingMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `📄 Uploading and indexing: **${file.name}**...`,
      timestamp: new Date(),
      sources: []
    }
    setMessages(prev => [...prev, uploadingMessage])

    try {
      const response = await uploadDocument(file)

      // Update the message with success
      setMessages(prev => prev.map(msg =>
        msg.id === uploadingMessage.id
          ? { ...msg, content: `✅ ${response.message}\n\nYou can now ask questions about the uploaded document.` }
          : msg
      ))

      // Auto-focus input field after successful upload
      setTimeout(() => {
        if (inputFieldRef.current) {
          inputFieldRef.current.focus()
        }
      }, 500)
    } catch (error) {
      console.error('Upload error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === uploadingMessage.id
          ? { ...msg, content: `❌ Failed to upload ${file.name}. Please try again.` }
          : msg
      ))
      setLastUploadedFile('')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Toggle Left Sidebar Button */}
      <button
        onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-border/40 rounded-r-lg p-2 shadow-lg hover:bg-slate-50 transition-all"
        style={{ marginLeft: isLeftSidebarOpen ? '18rem' : '0' }}
      >
        {isLeftSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Left Sidebar - Profile & History */}
      {isLeftSidebarOpen && (
        <div className="w-72 border-r border-border bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden shadow-sm transition-all duration-300">
          <div className="p-4 border-b border-border/40">
            <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity mb-4">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium text-foreground">Back Home</span>
            </Link>

            <Button className="w-full mb-4 gap-2" onClick={handleNewChat}>
              <Plus className="w-4 h-4" />
              New Chat
            </Button>

            <Button
              variant="outline"
              className="w-full mb-4 gap-2"
              onClick={handleClearChat}
            >
              <RefreshCw className="w-4 h-4" />
              Clear Chat
            </Button>

            <Card className="p-4 bg-white border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Your Profile</span>
                </div>
                <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-primary/10"
                      onClick={() => setEditedProfile(profile)}
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Update your profile for personalized financial advice. <span className="text-red-500">*</span> = Required
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      {/* COMPULSORY FIELDS */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <span className="text-red-500">*</span> Basic Information
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="age"><span className="text-red-500">*</span> Age</Label>
                            <Input
                              id="age"
                              type="number"
                              required
                              value={editedProfile.age}
                              onChange={(e) => setEditedProfile({ ...editedProfile, age: parseInt(e.target.value) || 0 })}
                            />
                          </div>

                          <div className="grid gap-2" >
                            <Label htmlFor="gender"><span className='text-red-500' >*</span> Gender</Label>
                            <Select
                              value={editedProfile.gender}
                              onValueChange={(value) => setEditedProfile({ ...editedProfile, gender: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="income"><span className="text-red-500">*</span> Annual Income</Label>
                            <Input
                              id="income"
                              required
                              value={editedProfile.income}
                              onChange={(e) => setEditedProfile({ ...editedProfile, income: e.target.value })}
                              placeholder="e.g., ₹15 LPA"
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="employmentStatus"><span className="text-red-500">*</span> Employment Status</Label>
                          <Select
                            value={editedProfile.employmentStatus}
                            onValueChange={(value) => setEditedProfile({ ...editedProfile, employmentStatus: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Salaried - Government">Salaried - Government</SelectItem>
                              <SelectItem value="Salaried - Private">Salaried - Private</SelectItem>
                              <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                              <SelectItem value="Business Owner">Business Owner</SelectItem>
                              <SelectItem value="Retired">Retired</SelectItem>
                              <SelectItem value="Unemployed">Unemployed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="taxRegime"><span className="text-red-500">*</span> Tax Regime</Label>
                          <Select
                            value={editedProfile.taxRegime}
                            onValueChange={(value) => setEditedProfile({ ...editedProfile, taxRegime: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Old Regime">Old Regime (with deductions)</SelectItem>
                              <SelectItem value="New Regime">New Regime (lower rates)</SelectItem>
                              <SelectItem value="Not Sure">Not Sure / Need Help</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="homeownerStatus"><span className="text-red-500">*</span> Housing Status</Label>
                          <Select
                            value={editedProfile.homeownerStatus}
                            onValueChange={(value) => setEditedProfile({ ...editedProfile, homeownerStatus: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Own - With Loan">Own House (with home loan)</SelectItem>
                              <SelectItem value="Own - No Loan">Own House (fully paid)</SelectItem>
                              <SelectItem value="Rented">Rented Accommodation</SelectItem>
                              <SelectItem value="Living with Family">Living with Family</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* OPTIONAL FIELDS */}
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-semibold text-foreground">Optional Information (for better recommendations)</h3>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="children">Number of Children</Label>
                            <Input
                              id="children"
                              type="number"
                              value={editedProfile.children}
                              onChange={(e) => setEditedProfile({ ...editedProfile, children: e.target.value })}
                              placeholder="0"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="childrenAges">Children Ages</Label>
                            <Input
                              id="childrenAges"
                              value={editedProfile.childrenAges}
                              onChange={(e) => setEditedProfile({ ...editedProfile, childrenAges: e.target.value })}
                              placeholder="e.g., 5, 8"
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="parentsAge">Parents Age</Label>
                          <Input
                            id="parentsAge"
                            value={editedProfile.parentsAge}
                            onChange={(e) => setEditedProfile({ ...editedProfile, parentsAge: e.target.value })}
                            placeholder="e.g., Father 65, Mother 60"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="investmentCapacity">Annual Investment Capacity</Label>
                          <Select
                            value={editedProfile.investmentCapacity}
                            onValueChange={(value) => setEditedProfile({ ...editedProfile, investmentCapacity: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="₹0-50k">₹0 - ₹50,000</SelectItem>
                              <SelectItem value="₹50k-1L">₹50,000 - ₹1 Lakh</SelectItem>
                              <SelectItem value="₹1L-2.5L">₹1 Lakh - ₹2.5 Lakhs</SelectItem>
                              <SelectItem value="₹2.5L-5L">₹2.5 Lakhs - ₹5 Lakhs</SelectItem>
                              <SelectItem value="₹5L+">₹5 Lakhs+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="riskAppetite">Risk Appetite</Label>
                          <Select
                            value={editedProfile.riskAppetite}
                            onValueChange={(value) => setEditedProfile({ ...editedProfile, riskAppetite: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select risk level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Conservative">Conservative (Fixed returns only)</SelectItem>
                              <SelectItem value="Moderate">Moderate (Balanced approach)</SelectItem>
                              <SelectItem value="Aggressive">Aggressive (Market-linked returns)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setIsEditingProfile(false)} variant="outline">Cancel</Button>
                      <Button onClick={handleSaveProfile}>Save Profile</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">Age:</span> {profile.age} {profile.age >= 60 && '👴'}</p>
                <p><span className="font-medium text-foreground">Gender:</span> {profile.gender}</p>
                <p><span className="font-medium text-foreground">Income:</span> {profile.income}</p>
                <p><span className="font-medium text-foreground">Status:</span> {profile.employmentStatus}</p>
                <p><span className="font-medium text-foreground">Tax:</span> {profile.taxRegime}</p>
                <p><span className="font-medium text-foreground">Home:</span> {profile.homeownerStatus}</p>
                {profile.children && <p><span className="font-medium text-foreground">Children:</span> {profile.children}</p>}
              </div>
            </Card>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Chat History</h3>
              <div className="space-y-2">
                {chatSessions && chatSessions.length > 0 ? (
                  chatSessions.map((session: any) => (
                    <div
                      key={session.id}
                      onClick={() => editingSessionId !== session.id && handleLoadSession(session.id, session.title)}
                      className={`w-full text-left p-3 rounded-lg text-xs transition-colors border group cursor-pointer ${sessionId === session.id
                        ? 'border-primary/40 bg-primary/5 text-foreground'
                        : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground border-transparent hover:border-border/40'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {editingSessionId === session.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editingSessionTitle}
                                onChange={(e) => setEditingSessionTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateSessionTitle(session.id, editingSessionTitle)
                                  } else if (e.key === 'Escape') {
                                    setEditingSessionId(null)
                                  }
                                }}
                                className="h-6 text-xs px-2"
                                autoFocus
                              />
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => handleUpdateSessionTitle(session.id, editingSessionTitle)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    handleUpdateSessionTitle(session.id, editingSessionTitle)
                                  }
                                }}
                                className="p-1 rounded hover:bg-green-500/20 text-green-600 cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3 h-3" />
                              </div>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setEditingSessionId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    setEditingSessionId(null)
                                  }
                                }}
                                className="p-1 rounded hover:bg-red-500/20 text-red-500 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="line-clamp-2 break-words">{session.title || 'New Chat'}</p>
                              <p className="text-xs opacity-50 mt-1">
                                {new Date(session.createdAt).toLocaleDateString('en-IN')}
                              </p>
                            </>
                          )}
                        </div>
                        {editingSessionId !== session.id && (
                          <div className="flex items-center gap-1">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSessionId(session.id)
                                setEditingSessionTitle(session.title || 'New Chat')
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation()
                                  setEditingSessionId(session.id)
                                  setEditingSessionTitle(session.title || 'New Chat')
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Rename chat"
                            >
                              <Pencil className="w-3 h-3" />
                            </div>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSession(session.id)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation()
                                  handleDeleteSession(session.id)
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-red-500 cursor-pointer"
                              title="Delete chat"
                            >
                              <X className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground/60 py-2">No chat history yet</p>
                )}
              </div>
            </div>

            {chartSnapshots.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Pinned Charts</h3>
                <div className="space-y-2">
                  {chartSnapshots.map(snapshot => (
                    <button
                      key={snapshot.id}
                      onClick={() => {
                        setChartMode('response')
                        setActiveChartId(snapshot.id)
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors border ${activeChartId === snapshot.id
                        ? 'border-primary/40 bg-primary/5 text-foreground'
                        : 'border-transparent text-muted-foreground hover:bg-primary/5'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pin className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{snapshot.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground uppercase">{snapshot.type}</span>
                          <div
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              handleRemovePinnedChart(snapshot.id)
                            }}
                            className="p-1 rounded hover:bg-muted cursor-pointer"
                            title="Remove pinned chart"
                            role="button"
                            tabIndex={0}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Categories</h3>
              <div className="space-y-2">
                {[
                  { label: 'Income Tax', icon: '📊' },
                  { label: 'Investments', icon: '💰' },
                  { label: 'Pensions', icon: '👴' },
                  { label: 'Govt Schemes', icon: '🏛️' }
                ].map((cat, i) => (
                  <button key={i} className="w-full text-left p-2 rounded-lg text-xs text-muted-foreground hover:bg-primary/5 transition-colors">
                    <span className="mr-2">{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>


        </div>
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={75} minSize={50} className="min-w-[320px]">
          {/* Main Chat Area */}
          <div className="flex h-full flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-border/40 bg-white p-4 md:p-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <Link href="/" className="lg:hidden">
                  <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <Logo size="md" showText={false} href="/" />
                <div>
                  <h1 className="text-base font-bold text-foreground">Arth-Mitra Chat</h1>
                  <p className="text-xs text-muted-foreground">AI Financial Assistant</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{profile.income}</p>
                  <p className="text-xs text-muted-foreground">Age {profile.age}</p>
                </div>
                <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <UserMenu />
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {messages.length === 1 && showSuggestions && (
                <div className="space-y-4 max-w-3xl">
                  <div className="text-center py-6">
                    <div className="text-3xl mb-3">💡</div>
                    <h2 className="text-xl font-bold text-foreground mb-2">What would you like to know?</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">Ask me anything about Indian taxes, investment schemes, or financial planning.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {suggestedQueries.map((query, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestedQuery(query.text)}
                        className="text-left p-4 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">
                            {query.category === 'tax' && '📊'}
                            {query.category === 'pension' && '👴'}
                            {query.category === 'investment' && '💰'}
                          </span>
                          <p className="text-sm text-foreground group-hover:text-primary font-medium transition-colors">{query.text}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex animate-in fade-in-50 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                  >
                    {message.type === 'ai' && (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <span className="text-white font-bold text-sm">AM</span>
                      </div>
                    )}

                    <div>
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-sm ${message.type === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-muted text-foreground rounded-bl-none border border-border/40'
                          }`}
                      >
                        {message.type === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        ) : (
                          <MarkdownMessage content={message.content} />
                        )}
                        <p className={`text-xs mt-2 ${message.type === 'user'
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                          }`} suppressHydrationWarning>
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </p>
                      </div>

                      {message.type === 'ai' && message.sources && message.sources.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2 ml-3">
                          <span>📚 Sources:</span>
                          {message.sources.map((source, i) => (
                            <span key={i} className="text-primary font-medium">
                              {source}{i < message.sources!.length - 1 ? ',' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.type === 'ai' && (
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => toggleBookmark(message.id)}
                          className="flex-shrink-0 p-2 hover:bg-muted rounded-lg transition-colors"
                          title={bookmarks.includes(message.id) ? 'Remove bookmark' : 'Save bookmark'}
                        >
                          <Bookmark
                            className={`w-4 h-4 ${bookmarks.includes(message.id)
                              ? 'fill-accent text-accent'
                              : 'text-muted-foreground'
                              }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && !streamingMessageId && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">AM</span>
                    </div>
                    <div className="bg-muted rounded-2xl px-5 py-4 border border-border/40">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border/40 bg-white p-4 md:p-6 shadow-lg">
              <div className="max-w-4xl mx-auto flex gap-3">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.csv,.txt,.md"
                  className="hidden"
                />
                {/* Upload button */}
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  title="Upload PDF, CSV, or TXT file"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Input
                  ref={inputFieldRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={lastUploadedFile ? `Ask about ${lastUploadedFile}...` : "Ask about taxes, schemes, investments..."}
                  className="flex-1 text-base px-4 py-2 rounded-full border-border/40 focus:ring-2 focus:ring-primary/20"
                  disabled={isLoading || isUploading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || isUploading || !input.trim()}
                  size="lg"
                  className="rounded-full gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden md:inline">Send</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                💡 This is informational guidance based on public government data. Consult a professional for financial advice.
              </p>
            </div>
          </div>
        </ResizablePanel>

        {/* Toggle Right Sidebar Button */}
        <button
          onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-border/40 rounded-l-lg p-2 shadow-lg hover:bg-slate-50 transition-all"
        >
          {isRightSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {isRightSidebarOpen && (
          <>
            <ResizableHandle withHandle />
            {/* Right Sidebar - Bookmarks & Analytics */}
            <ResizablePanel defaultSize={25} minSize={18} maxSize={40} className="min-w-[240px]">
              <div className="h-full border-l border-border/40 bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border/40 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-primary" />
                    Saved Responses
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Document Analytics Chart */}
                  <Card className="p-4 bg-white border border-border/40 overflow-x-hidden shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <BarChart2 className="w-3 h-3 text-primary" />
                        Response Insights
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleExportChart}
                        title="Export chart as PNG"
                        className="h-8 w-8"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    {chartData.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-6">
                        Ask a question with numbers to generate a chart.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid gap-2">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{getLegendLabel()}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={chartMode} onValueChange={(value) => setChartMode(value as ChartMode)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="response">Response</SelectItem>
                                <SelectItem value="sources">Sources</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={chartType}
                              onValueChange={(value) => {
                                const nextType = value as ChartType
                                setChartType(nextType)
                                if (activeChartId) {
                                  setChartSnapshots(prev => prev.map(item =>
                                    item.id === activeChartId ? { ...item, type: nextType } : item
                                  ))
                                }
                              }}
                              disabled={chartMode === 'sources'}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bar">Bar</SelectItem>
                                <SelectItem value="line">Line</SelectItem>
                                <SelectItem value="pie">Pie</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {chartSnapshots.length > 0 && (
                            <Select
                              value={activeChartId || chartSnapshots[0]?.id}
                              onValueChange={(value) => setActiveChartId(value)}
                              disabled={chartMode === 'sources'}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Pinned charts" />
                              </SelectTrigger>
                              <SelectContent>
                                {chartSnapshots.map(snapshot => (
                                  <SelectItem key={snapshot.id} value={snapshot.id}>
                                    {snapshot.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div ref={chartContainerRef} className="h-60 rounded-lg bg-gradient-to-b from-slate-50 to-white p-2">
                          <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'line' ? (
                              <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={shortenLabel} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatChartValue(value as number, chartUnit)} />
                                <Tooltip
                                  formatter={(value: number) => formatChartValue(value, chartUnit)}
                                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                                />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Line type="monotone" dataKey="value" name={getLegendLabel()} stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                              </LineChart>
                            ) : chartType === 'pie' ? (
                              <PieChart>
                                <Tooltip
                                  formatter={(value: number) => formatChartValue(value, chartUnit)}
                                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                                />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={40} outerRadius={70} paddingAngle={4}>
                                  {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"][index % 6]} />
                                  ))}
                                </Pie>
                              </PieChart>
                            ) : (
                              <BarChart data={chartData} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
                                <defs>
                                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.7} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={shortenLabel} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatChartValue(value as number, chartUnit)} />
                                <Tooltip
                                  formatter={(value: number) => formatChartValue(value, chartUnit)}
                                  contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                                />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Bar dataKey="value" name={getLegendLabel()} fill="url(#chartGradient)" radius={[6, 6, 0, 0]} barSize={24}>
                                  {chartData.map((entry, index) => (
                                    <Cell key={`bar-cell-${index}`} fill={["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"][index % 6]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>

                        <div className="border border-border/40 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-2 bg-slate-50 text-[11px] font-semibold text-muted-foreground px-3 py-2">
                            <span>Label</span>
                            <span className="text-right">Value</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto">
                            {chartData.map((item, index) => (
                              <div key={`${item.label}-${index}`} className="grid grid-cols-2 px-3 py-2 text-xs border-t border-border/30">
                                <span className="text-foreground truncate" title={item.label}>{item.label}</span>
                                <span className="text-right text-foreground">
                                  {formatChartValue(item.value, chartUnit)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Auto-generated from the latest response
                    </p>
                  </Card>

                  {/* Saved Bookmarks */}
                  {bookmarks.length === 0 ? (
                    <div className="text-center py-8">
                      <Bookmark className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Bookmark AI responses to save them here for quick reference
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-foreground">Bookmarked Responses</h3>
                      {messages
                        .filter(m => bookmarks.includes(m.id))
                        .map(message => (
                          <Card key={message.id} className="p-3 bg-white border border-border/40 hover:shadow-md transition-shadow cursor-pointer">
                            <p className="line-clamp-4 text-xs text-muted-foreground leading-relaxed">
                              {message.content}
                            </p>
                          </Card>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}

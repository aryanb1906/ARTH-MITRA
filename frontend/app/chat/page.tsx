'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Bookmark, Clock, User, Wallet, Plus, MoreVertical, RefreshCw, MessageSquare, Zap, AlertCircle, Upload, FileText } from 'lucide-react'
import { sendMessage as sendChatMessage, uploadDocument } from '@/lib/api'
import { MarkdownMessage } from '@/components/markdown-message'

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

const suggestedQueries = [
  { text: 'How can I save tax on ₹15 lakh income?', category: 'tax' as const },
  { text: 'What\'s the best pension plan for me?', category: 'pension' as const },
  { text: 'Safe investment options for ₹5 lakh', category: 'investment' as const },
  { text: 'How to file income tax return online?', category: 'tax' as const },
  { text: 'Schemes for senior citizens 60+', category: 'pension' as const },
  { text: 'ELSS vs PPF vs FD comparison', category: 'investment' as const }
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'नमस्ते! 👋 Welcome to Arth-Mitra. I\'m here to help you understand Indian taxes, government schemes, and financial planning.\n\nTell me about your situation and I\'ll provide personalized guidance.',
      timestamp: new Date(),
      sources: []
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [profile] = useState({
    age: 32,
    income: '₹15 LPA',
    category: 'Salaried Professional'
  })
  const [showNewChat, setShowNewChat] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)

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

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = input
    setInput('')
    setIsLoading(true)
    setShowSuggestions(false)

    try {
      // Call real API
      const response = await sendChatMessage(userInput)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        timestamp: new Date(),
        sources: response.sources
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error connecting to the server. Please make sure the backend is running and try again.',
        timestamp: new Date(),
        sources: []
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

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
    } catch (error) {
      console.error('Upload error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === uploadingMessage.id
          ? { ...msg, content: `❌ Failed to upload ${file.name}. Please try again.` }
          : msg
      ))
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
      {/* Left Sidebar - Profile & History */}
      <div className="w-72 border-r border-border bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden hidden lg:flex shadow-sm">
        <div className="p-4 border-b border-border/40">
          <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium text-foreground">Back Home</span>
          </Link>

          <Button className="w-full mb-4 gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>

          <Card className="p-4 bg-white border border-border/40">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Your Profile</span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">Age:</span> {profile.age}</p>
              <p><span className="font-medium text-foreground">Income:</span> {profile.income}</p>
              <p><span className="font-medium text-foreground">Category:</span> {profile.category}</p>
            </div>
          </Card>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Recent Queries</h3>
            <div className="space-y-2">
              {recentQueries.map((query) => (
                <button
                  key={query.id}
                  className="w-full text-left p-3 rounded-lg text-xs text-muted-foreground hover:bg-primary/5 hover:text-foreground transition-colors border border-transparent hover:border-border/40 group"
                >
                  <div className="flex items-start gap-2">
                    <Clock className="w-3 h-3 flex-shrink-0 mt-0.5 group-hover:text-primary" />
                    <div className="flex-1">
                      <p className="line-clamp-2">{query.title}</p>
                      <p className="text-xs opacity-50 mt-1">{query.timestamp}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

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

        <div className="p-4 border-t border-border/40 space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <AlertCircle className="w-4 h-4" />
            Help & Support
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <MoreVertical className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/40 bg-white p-4 md:p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/" className="lg:hidden">
              <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">AM</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">Arth-Mitra Chat</h1>
                <p className="text-xs text-muted-foreground">AI Financial Assistant</p>
              </div>
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
                      }`}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
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

          {isLoading && (
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Ask about taxes, schemes, investments..."
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

      {/* Right Sidebar - Bookmarks (Hidden on small screens) */}
      <div className="w-72 border-l border-border/40 bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden hidden xl:flex shadow-sm">
        <div className="p-4 border-b border-border/40">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary" />
            Saved Responses
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {bookmarks.length === 0 ? (
            <div className="text-center py-8">
              <Bookmark className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Bookmark AI responses to save them here for quick reference
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
    </div>
  )
}

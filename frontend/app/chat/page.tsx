'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Bookmark, Clock, User, Wallet, Plus, MoreVertical, RefreshCw, MessageSquare, Zap, AlertCircle } from 'lucide-react'

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
  timestamp: Date
  category: 'tax' | 'pension' | 'investment' | 'general'
}

const mockResponses: { [key: string]: { response: string; sources: string[] } } = {
  'tax': { 
    response: 'Based on government guidelines for income tax optimization:\n\n✓ File your ITR within the deadline (July 31st)\n✓ Use Section 80C for investments up to ₹1.5 lakh (PPF, ELSS, NSC, Life Insurance)\n✓ Claim Section 80D for medical insurance (up to ₹50,000)\n✓ If you earn ₹15 lakh, use Section 80E for education loan interest\n✓ Consider HRA exemption if applicable - get rental agreement\n✓ Keep receipts for 7 years for compliance\n\nTax savings potential: ₹2-3 lakhs per year with proper planning',
    sources: ['Income Tax Act 1961', 'Section 80C Guidelines', 'Tax Year 2024-25']
  },
  'pension': { 
    response: 'Popular pension schemes for retirement planning:\n\n1. National Pension System (NPS)\n   • Tax deduction up to ₹2 lakh under Section 80CCD\n   • Market-linked returns\n   • Flexible withdrawal\n\n2. Atal Pension Yojana (APY)\n   • Government guaranteed minimum pension\n   • Entry age: 18-40, Pension from 60\n   • Contribution varies with desired pension\n\n3. Senior Citizen Savings Scheme\n   • 8.2% annual interest (currently)\n   • 5-year maturity, renewable\n   • ₹15 lakh maximum\n\n4. Pradhan Mantri Vaya Vandana Yojana\n   • 7.4% guaranteed return\n   • 10-year tenure\n   • Monthly/quarterly/annual payout options',
    sources: ['PFRDA Guidelines', 'Ministry of Finance Scheme Details']
  },
  'investment': { 
    response: 'Safe investment options for wealth building:\n\n1. National Savings Certificate (NSC)\n   • Government-backed security\n   • 7.7% current return\n   • 5-year maturity\n\n2. ELSS (Equity-Linked Savings Scheme)\n   • ₹1.5 lakh Section 80C deduction\n   • 3-year lock-in\n   • Potential for long-term growth\n\n3. Public Provident Fund (PPF)\n   • 7.1% guaranteed return\n   • 15-year maturity with extension\n   • Tax-free growth and withdrawal\n\n4. Sukanya Samriddhi Yojana (SSY)\n   • For girls\n   • 7.6% guaranteed return\n   • 21-year maturity\n\n5. Fixed Deposits\n   • 6-7% return depending on bank\n   • Insured up to ₹5 lakh by DICGC\n   • Flexible tenure',
    sources: ['Ministry of Finance', 'RBI Guidelines', 'Insurance Regulatory Authority']
  },
  'default': { 
    response: 'Hello! I\'m Arth-Mitra, your AI financial guide. I can help you understand:\n\n📊 Income Tax\n• Tax calculations and planning\n• Deductions (Section 80C, 80D, 80E, etc.)\n• ITR filing process\n• Tax saving strategies\n\n💰 Investment Schemes\n• Government securities (NSC, SSY, PPF)\n• Pension products (NPS, APY, SCSS)\n• Mutual funds and stocks\n• Risk-return analysis\n\n👴 Retirement Planning\n• Pension schemes\n• Senior citizen benefits\n• Investment growth calculations\n\n🏛️ Government Benefits\n• Social security schemes\n• Subsidies and grants\n• Eligibility criteria\n\nWhat would you like to know today?',
    sources: ['Public Government Data']
  }
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [profile] = useState({
    age: 32,
    income: '₹15 LPA',
    category: 'Salaried Professional'
  })
  const [showNewChat, setShowNewChat] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const recentQueries: RecentQuery[] = [
    { id: '1', title: 'Tax saving with ₹10 lakh income', timestamp: new Date(Date.now() - 86400000), category: 'tax' },
    { id: '2', title: 'Best pension scheme comparison', timestamp: new Date(Date.now() - 172800000), category: 'pension' },
    { id: '3', title: 'Investment portfolio allocation', timestamp: new Date(Date.now() - 259200000), category: 'investment' }
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
    setInput('')
    setIsLoading(true)
    setShowSuggestions(false)

    // Simulate API call with better delay
    setTimeout(() => {
      const lowerInput = input.toLowerCase()
      let response = mockResponses['default']

      if (lowerInput.includes('tax') || lowerInput.includes('income') || lowerInput.includes('saving') || lowerInput.includes('deduction')) {
        response = mockResponses['tax']
      } else if (lowerInput.includes('pension') || lowerInput.includes('retirement') || lowerInput.includes('senior') || lowerInput.includes('apy')) {
        response = mockResponses['pension']
      } else if (lowerInput.includes('invest') || lowerInput.includes('scheme') || lowerInput.includes('nps') || lowerInput.includes('ppf') || lowerInput.includes('mutual')) {
        response = mockResponses['investment']
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        timestamp: new Date(),
        sources: response.sources
      }

      setMessages(prev => [...prev, aiMessage])
      setIsLoading(false)
    }, 1200)
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
                      <p className="text-xs opacity-50 mt-1">{query.timestamp.toLocaleDateString()}</p>
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
                className={`max-w-2xl flex gap-3 ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {message.type === 'ai' && (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white font-bold text-sm">AM</span>
                  </div>
                )}
                
                <div>
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted text-foreground rounded-bl-none border border-border/40'
                    }`}
                  >
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      message.type === 'user'
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
                        className={`w-4 h-4 ${
                          bookmarks.includes(message.id)
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
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
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

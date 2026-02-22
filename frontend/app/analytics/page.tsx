'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, MessageSquare, Upload, Zap, Clock, Activity } from 'lucide-react'
import { getAnalyticsSummary, getQueryDistribution } from '@/lib/api'
import { UserMenu } from '@/components/user-menu'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'

interface AnalyticsSummary {
    totalQueries: number
    totalUploads: number
    activeUsers: number
    totalTaxSaved: number
    avgResponseTime: number
    cacheHitRate: number
    topEvents: { type: string; count: number }[]
    period?: string
}

export default function AnalyticsPage() {
    const router = useRouter()
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
    const [queryData, setQueryData] = useState<{ date: string; count: number }[]>([])
    const [days, setDays] = useState(30)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                // Check if user is logged in
                const userId = localStorage.getItem('userId')
                if (!userId) {
                    router.push('/login')
                    return
                }

                setIsLoading(true)

                // Load analytics data
                const summaryData = await getAnalyticsSummary(days)
                setSummary(summaryData)

                const distributionData = await getQueryDistribution(days)
                setQueryData(distributionData)
            } catch (error) {
                console.error('Failed to load analytics:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadAnalytics()
    }, [days, router])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <Activity className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        )
    }

    const summaryCards = [
        {
            title: 'Total Queries',
            value: `${summary?.totalQueries || 0}`,
            subtitle: summary?.period || `Last ${days} days`,
            insight: `${summary?.totalQueries || 0} questions were asked in this time window.`,
            icon: <MessageSquare className="w-5 h-5 text-primary" />
        },
        {
            title: 'Documents Uploaded',
            value: `${summary?.totalUploads || 0}`,
            subtitle: summary?.period || `Last ${days} days`,
            insight: `${summary?.totalUploads || 0} files were added for analysis.`,
            icon: <Upload className="w-5 h-5 text-blue-600" />
        },
        {
            title: 'Avg Response Time',
            value: summary?.avgResponseTime ? `${summary.avgResponseTime.toFixed(2)}s` : 'N/A',
            subtitle: 'Average across all queries',
            insight: summary?.avgResponseTime
                ? `Typical reply time is ${summary.avgResponseTime.toFixed(2)} seconds.`
                : 'No response timing data available yet.',
            icon: <Clock className="w-5 h-5 text-green-600" />
        },
        {
            title: 'Cache Hit Rate',
            value: summary?.cacheHitRate ? `${(summary.cacheHitRate * 100).toFixed(1)}%` : '0%',
            subtitle: 'Faster responses from cache',
            insight: summary?.cacheHitRate
                ? `${(summary.cacheHitRate * 100).toFixed(1)}% of requests were served from cache.`
                : 'Cache has not served any requests yet.',
            icon: <Zap className="w-5 h-5 text-yellow-600" />
        }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/chat">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
                                <p className="text-sm text-muted-foreground">
                                    View your chat statistics and insights
                                </p>
                            </div>
                        </div>
                        <UserMenu />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Time Period Filter */}
                <div className="mb-6 flex gap-2">
                    <Button
                        variant={days === 7 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDays(7)}
                    >
                        Last 7 Days
                    </Button>
                    <Button
                        variant={days === 30 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDays(30)}
                    >
                        Last 30 Days
                    </Button>
                    <Button
                        variant={days === 90 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDays(90)}
                    >
                        Last 90 Days
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {summaryCards.map((card) => (
                        <Card key={card.title} className="p-6 relative group overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
                                {card.icon}
                            </div>
                            <p className="text-3xl font-bold text-foreground">{card.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                            <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md bg-slate-900/95 px-3 py-2 text-[11px] leading-snug text-white opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                                {card.insight}
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Query Distribution Chart */}
                <Card className="p-6 mb-8">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Query Distribution Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={queryData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                fontSize={12}
                                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            />
                            <YAxis fontSize={12} />
                            <Tooltip
                                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Queries"
                                dot={{ fill: '#3b82f6' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
                {/* Top Events */}
                {summary?.topEvents && summary.topEvents.length > 0 && (
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            Top Events
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={summary.topEvents}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="type" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#10b981" name="Count" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                )}

                {/* Empty State */}
                {!summary?.totalQueries && (
                    <Card className="p-12 text-center">
                        <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No data yet</h3>
                        <p className="text-muted-foreground mb-6">
                            Start chatting to see your analytics data here
                        </p>
                        <Link href="/chat">
                            <Button>
                                Go to Chat
                            </Button>
                        </Link>
                    </Card>
                )}
            </div>
        </div>
    )
}

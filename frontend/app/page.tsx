'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, FileText, Zap, Users, Globe, Shield, BookOpen, Database, Cpu, Github, Mail, Phone, CheckCircle2, TrendingUp, BarChart3, Lightbulb, Award } from 'lucide-react'
import { useEffect, useState } from "react"

export default function Page() {
  {/* backend test */ }

  const [msg, setMsg] = useState("")

  useEffect(() => {
    fetch("http://localhost:8000/ping")
      .then(res => res.json())
      .then(data => setMsg(data.status))
      .catch(() => setMsg("Backend not connected"))
  }, [])
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">AM</span>
            </div>
            <div>
              <span className="font-bold text-lg text-foreground block">Arth-Mitra</span>
              <span className="text-xs text-muted-foreground">Financial Guide</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-foreground hover:text-primary transition-colors">How It Works</a>
            <a href="#features" className="text-sm text-foreground hover:text-primary transition-colors">Features</a>
            <a href="#testimonials" className="text-sm text-foreground hover:text-primary transition-colors">Use Cases</a>
            <Link href="/chat">
              <Button>Get Started</Button>
            </Link>
          </div>
          <div className="md:hidden">
            <Link href="/chat">
              <Button>Try Now</Button>
            </Link>
          </div>
        </div>
      </nav>

      {msg && (
        <p className="mt-2 text-sm text-primary font-medium">
          {msg}
        </p>
      )}

      {/* Hero Section */}
      <section className="relative px-4 md:px-6 py-12 md:py-24 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-sm text-primary font-semibold">AI-Powered Financial Guidance</p>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-pretty leading-tight">
            Navigate Indian <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Finance with Ease</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto text-pretty leading-relaxed">
            Understand complex tax laws, government schemes, and investment options in simple language. Get personalized financial guidance powered by advanced AI and official government data.
          </p>

          <div className="flex flex-col md:flex-row gap-3 justify-center mb-8">
            <Link href="/chat">
              <Button className="w-full md:w-auto">
                Try Arth-Mitra
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button className="w-full md:w-auto bg-gray-500 border border-border hover:bg-gray-600">
              Watch Demo Video
              {/*Remember to add a demo link*/}
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 max-w-2xl mx-auto">
            {[
              { value: '50K+', label: 'Financial Queries Answered' },
              { value: '₹10Cr+', label: 'Tax Saved For Users' },
              { value: '98%', label: 'Accuracy Rate' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl md:text-2xl font-bold text-primary mb-1">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Detailed */}
      <section id="how-it-works" className="px-4 md:px-6 py-12 bg-gradient-to-b from-blue-50/50 to-white border-y border-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm mb-3">
              <Cpu className="w-4 h-4 text-primary" />
              <p className="text-xs text-primary font-semibold">RAG Architecture</p>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">How Arth-Mitra Works</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Our advanced Retrieval-Augmented Generation system combines real government data with cutting-edge AI
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4 md:gap-2 mb-8">
            {[
              {
                icon: Database,
                title: 'Official Documents',
                desc: 'Collect & index government data',
                details: 'ITR forms, tax circulars, scheme guidelines'
              },
              {
                icon: Cpu,
                title: 'AI Processing',
                desc: 'Convert to vector embeddings',
                details: 'Semantic understanding via LLMs'
              },
              {
                icon: Users,
                title: 'Your Question',
                desc: 'Ask in your own words',
                details: 'Natural language processing'
              },
              {
                icon: FileText,
                title: 'Smart Retrieval',
                desc: 'Find relevant government rules',
                details: 'Context-aware matching'
              },
              {
                icon: Zap,
                title: 'Plain Answer',
                desc: 'Get explained in simple terms',
                details: 'Personalized to your situation'
              }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 border border-primary/20">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-sm md:text-base mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground text-center mb-2">{step.desc}</p>
                <p className="text-xs text-muted-foreground/60 text-center italic">{step.details}</p>
                {i < 4 && <div className="hidden md:block absolute right-0 top-8 text-border/40 text-2xl">→</div>}
              </div>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="grid md:grid-cols-3 gap-6 bg-white rounded-2xl p-8 border border-border/40">
            {[
              { icon: Shield, title: 'Bank-Grade Security', desc: 'End-to-end encryption & HTTPS' },
              { icon: CheckCircle2, title: 'Government Data', desc: 'Only official sources & guidelines' },
              { icon: Award, title: 'Expert Verified', desc: 'Reviewed by tax & finance professionals' }
            ].map((indicator, i) => (
              <div key={i} className="flex gap-4">
                <indicator.icon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{indicator.title}</h4>
                  <p className="text-sm text-muted-foreground">{indicator.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features - Enhanced */}
      <section id="features" className="px-4 md:px-6 py-12 max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-3 backdrop-blur-sm">
            <Lightbulb className="w-4 h-4 text-primary" />
            <p className="text-xs text-primary font-semibold">Powerful Features</p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Everything You Need</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">Comprehensive tools for financial clarity and peace of mind</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: BookOpen,
              title: 'Plain Language Explanations',
              desc: 'Complex tax laws, schemes, and regulations explained in simple, everyday language you understand',
              color: 'from-primary/20 to-primary/5'
            },
            {
              icon: TrendingUp,
              title: 'Personalized Recommendations',
              desc: 'AI learns your income, age, and goals to suggest strategies tailored to your unique situation',
              color: 'from-accent/20 to-accent/5'
            },
            {
              icon: FileText,
              title: 'Step-by-Step Tax Filing',
              desc: 'Complete guidance on filing income tax returns with forms, schedules, and investment verification',
              color: 'from-blue-400/20 to-blue-400/5'
            },
            {
              icon: Globe,
              title: 'Multilingual Support',
              desc: 'Communicate in Hindi, English, Tamil, Telugu, Kannada, and Marathi for complete accessibility',
              color: 'from-green-400/20 to-green-400/5'
            },
            {
              icon: Shield,
              title: 'Secure & Private',
              desc: 'Your financial data is encrypted, never stored, and compliant with RBI guidelines',
              color: 'from-red-400/20 to-red-400/5'
            },
            {
              icon: Database,
              title: 'Real-Time Updates',
              desc: 'Latest tax law changes, scheme updates, and government policy changes reflected instantly',
              color: 'from-purple-400/20 to-purple-400/5'
            }
          ].map((feature, i) => (
            <Card key={i} className="p-8 hover:shadow-xl transition-all duration-300 border border-border/40 group cursor-pointer">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Real Use Cases / Chat Examples */}
      <section id="testimonials" className="px-4 md:px-6 py-12 bg-gradient-to-b from-blue-50/50 to-white border-t border-b border-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-3 backdrop-blur-sm">
              <BarChart3 className="w-4 h-4 text-primary" />
              <p className="text-xs text-primary font-semibold">Real Examples</p>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">See Arth-Mitra In Action</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">Real scenarios where users got clarity and saved money</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Example 1 - Tax Saving */}
            <Card className="p-8 bg-white border border-border/40 overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-4">
                  <span className="text-xs font-semibold text-primary">Salaried Professional</span>
                </div>
                <p className="text-lg font-semibold text-foreground">How much tax can I save?</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                  <p className="text-sm font-medium text-foreground mb-2">Your Question:</p>
                  <p className="text-sm text-muted-foreground">I earn ₹15 lakh per year. What are all the tax deductions I can claim?</p>
                </div>

                <div className="bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg p-4 border border-accent/20">
                  <p className="text-sm font-medium text-foreground mb-2">Arth-Mitra's Answer:</p>
                  <div className="space-y-2 text-sm text-foreground">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <span><strong>Section 80C:</strong> Up to ₹1.5L (PPF, ELSS, LIC, investments)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <span><strong>Section 80D:</strong> Health insurance up to ₹50K (₹1L for senior parents)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <span><strong>Section 80E:</strong> Education loan interest (no limit)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                      <span><strong>Section 80G:</strong> Charity donations up to 50% of income</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Potential Tax Saving: Up to ₹2-3L per year!
                  </p>
                </div>
              </div>
            </Card>

            {/* Example 2 - Pension Planning */}
            <Card className="p-8 bg-white border border-border/40 overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 mb-4">
                  <span className="text-xs font-semibold text-accent">Senior Citizen Planning</span>
                </div>
                <p className="text-lg font-semibold text-foreground">Best schemes for retirement?</p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: 'Atal Pension Yojana',
                    rate: 'Government Guaranteed',
                    desc: '₹1000-5000/month pension'
                  },
                  {
                    name: 'Senior Citizen Savings Scheme',
                    rate: '8.2% p.a.',
                    desc: 'Quarterly interest, ₹15L limit'
                  },
                  {
                    name: 'PM Vaya Vandana Yojana',
                    rate: '7.4% p.a.',
                    desc: 'Guaranteed 10 years, pension from 62'
                  },
                  {
                    name: 'National Pension System',
                    rate: 'Market Returns',
                    desc: 'Tax benefits + flexibility'
                  }
                ].map((scheme, i) => (
                  <Card key={i} className="p-3 bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-100 hover:shadow-md transition-shadow">
                    <p className="font-semibold text-sm text-foreground">{scheme.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">{scheme.desc}</p>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">{scheme.rate}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="px-4 md:px-6 py-12 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl max-w-7xl mx-auto mb-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Take Control?</h2>
          <p className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of Indians who now understand their finances better and save thousands in taxes every year.
          </p>
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <Link href="/chat">
              <Button>
                Try Arth-Mitra
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button className="bg-white border border-border">
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 md:px-6 py-12 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {[
            { q: 'Is Arth-Mitra advice legally binding?', a: 'No. Arth-Mitra provides informational guidance based on public government data. Always consult with a qualified tax professional or financial advisor before making important decisions.' },
            { q: 'How accurate is the information?', a: 'We use only official government sources and maintain 98% accuracy. Our AI is regularly updated with latest tax laws and scheme changes. However, always verify specific details for your situation.' },
            { q: 'Is my data secure?', a: 'Yes. We use bank-grade encryption (HTTPS/TLS), never store personal data permanently, and comply with all RBI guidelines. Your financial information is completely private.' },
            { q: 'Can I use this for GST/business taxes?', a: 'Currently, Arth-Mitra focuses on personal income tax and investment schemes. We\'re working on business tax features for the future.' },
            { q: 'What if I have complex financial situations?', a: 'For complex cases, our Professional and Premium plans include access to expert consultations with experienced tax professionals.' }
          ].map((faq, i) => (
            <Card key={i} className="p-6 border border-border/40 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AM</span>
                </div>
                <span className="font-bold text-foreground">Arth-Mitra</span>
              </div>
              <p className="text-sm text-muted-foreground">Making Indian finance simple for everyone.</p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4 text-sm">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">How It Works</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4 text-sm">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Press</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4 text-sm">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Disclaimer</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4 text-sm">Connect</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"><Mail className="w-4 h-4" /> Email</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Twitter</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Arth-Mitra. All rights reserved. Made with care for Indians.</p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Status</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sitemap</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">RSS</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

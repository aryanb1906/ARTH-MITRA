import Link from 'next/link'
import { ArrowRight, ShieldCheck, FileText, Lock, AlertTriangle, Github, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AuthButtons, MobileAuthButtons } from '@/components/user-menu'
import { Logo } from '@/components/logo'

export default function LegalPage() {
  const lastUpdated = 'April 18, 2026'

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-white via-blue-50/30 to-emerald-50/20">
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <nav className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-border/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Logo size="md" showText={true} href="/" />
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#how-it-works" className="text-sm text-foreground hover:text-primary transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">How It Works</Link>
            <Link href="/#features" className="text-sm text-foreground hover:text-primary transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">Features</Link>
            <Link href="/tax-calculator" className="text-sm text-foreground hover:text-primary transition-all duration-200 hover:-translate-y-0.5 active:scale-95 font-medium bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary/20">Tax Calculator</Link>
            <Link href="/goal-planner" className="text-sm text-foreground hover:text-primary transition-all duration-200 hover:-translate-y-0.5 active:scale-95 font-medium bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary/20">Goal Planner</Link>
            <AuthButtons />
          </div>
          <div className="md:hidden">
            <MobileAuthButtons />
          </div>
        </div>
      </nav>

      <section className="px-4 md:px-6 py-10 md:py-12 max-w-7xl mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <p className="text-sm text-primary font-semibold">Legal and Compliance</p>
          </div>

          <Card className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm shadow-sm p-6 md:p-8 mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Arth-Mitra Legal Center</h1>
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              This page brings together our Terms of Service, Privacy Policy, Disclaimer, and Security commitments.
              It explains how Arth-Mitra should be used, how we handle data, and how we protect users.
            </p>
            <div className="mt-5">
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
                Back to Home
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/40 bg-white/90 backdrop-blur-sm shadow-sm p-6 md:p-8 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Navigation</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <a href="#terms" className="rounded-lg border border-border/40 px-4 py-3 text-sm hover:bg-primary/5 transition-colors">Terms of Service</a>
              <a href="#privacy" className="rounded-lg border border-border/40 px-4 py-3 text-sm hover:bg-primary/5 transition-colors">Privacy Policy</a>
              <a href="#disclaimer" className="rounded-lg border border-border/40 px-4 py-3 text-sm hover:bg-primary/5 transition-colors">Disclaimer</a>
              <a href="#security" className="rounded-lg border border-border/40 px-4 py-3 text-sm hover:bg-primary/5 transition-colors">Security</a>
            </div>
          </Card>

          <div className="space-y-6">
            <Card id="terms" className="rounded-2xl border border-border/40 bg-white p-6 md:p-8 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Terms of Service</h2>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>By using Arth-Mitra, you agree to use the platform only for lawful personal or business financial research and planning support.</p>
                <p>Arth-Mitra provides informational guidance and workflow tools. You are responsible for all final financial, tax, and compliance decisions.</p>
                <p>You must not misuse the service, attempt unauthorized access, upload malicious files, or interfere with availability for other users.</p>
                <p>We may update features, limits, and these terms over time. Continued use after updates means you accept the revised terms.</p>
              </div>
            </Card>

            <Card id="privacy" className="rounded-2xl border border-border/40 bg-white p-6 md:p-8 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Privacy Policy</h2>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>We collect account details, profile inputs, chat messages, uploaded documents, and technical logs needed to provide the service.</p>
                <p>Your data is used for personalization, session continuity, analytics, and quality improvements. We do not sell personal data.</p>
                <p>Access to data is restricted to authorized systems and personnel on a need-to-know basis. Retention depends on operational and legal requirements.</p>
                <p>You may request account deletion through app settings where available. Some records may be retained if required by law or security obligations.</p>
              </div>
            </Card>

            <Card id="disclaimer" className="rounded-2xl border border-border/40 bg-white p-6 md:p-8 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Disclaimer</h2>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>Arth-Mitra is not a law firm, tax agency, or licensed investment advisor. Content is educational and informational only.</p>
                <p>Model outputs can be incomplete or outdated. Always verify tax slabs, scheme rules, and filing requirements with official government sources.</p>
                <p>Do not rely solely on automated outputs for high-impact financial decisions. Consult a qualified tax professional or financial advisor when needed.</p>
                <p>We are not liable for losses resulting from actions taken solely on platform-generated content without independent verification.</p>
              </div>
            </Card>

            <Card id="security" className="rounded-2xl border border-border/40 bg-white p-6 md:p-8 shadow-sm scroll-mt-24">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Security</h2>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>We apply layered security controls including authentication checks, access controls, input validation, and operational monitoring.</p>
                <p>Uploaded files and user content are processed through controlled backend services. Sensitive operations are logged for auditing and abuse detection.</p>
                <p>Security is an ongoing process. We continuously improve safeguards based on risk reviews, bug fixes, and infrastructure updates.</p>
                <p>If you discover a potential vulnerability, please report it responsibly through the project contact channels so we can investigate quickly.</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Logo size="md" showText={false} href="/" />
              </div>
              <p className="text-sm text-muted-foreground">Making Indian finance simple for everyone.</p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4 text-sm">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">How It Works</Link></li>
                <li><Link href="/#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Features</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4 text-sm">Company</h4>
              <ul className="space-y-2">
                <li><a href="https://github.com/aryanb1906/ARTH-MITRA?tab=readme-ov-file#-arth-mitra---ai-powered-financial-assistant-for-india" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
                <li><a href="https://www.linkedin.com/in/aryan-bhargava/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4 text-sm">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#disclaimer" className="text-sm text-muted-foreground hover:text-primary transition-colors">Disclaimer</a></li>
                <li><a href="#security" className="text-sm text-muted-foreground hover:text-primary transition-colors">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4 text-sm">Connect</h4>
              <ul className="space-y-2">
                <li><a href="https://github.com/aryanb1906/ARTH-MITRA" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</a></li>
                <li><a href="mailto:arthmitraservices@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"><Mail className="w-4 h-4" /> Email</a></li>
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

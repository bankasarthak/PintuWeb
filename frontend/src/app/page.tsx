import Link from 'next/link'
import {
  MessageSquare,
  Camera,
  Film,
  BookOpen,
  Sparkles,
  ArrowRight,
  Shield,
  Star,
  Check,
  ChevronRight,
} from 'lucide-react'

const features = [
  {
    icon: MessageSquare,
    title: 'Real Conversations',
    description:
      'Chat with your AI companion like a real person. Deep memories, emotional responses, and a personality uniquely hers.',
    gradient: 'from-purple-600/20 to-purple-900/10',
    border: 'border-purple-600/30',
  },
  {
    icon: Camera,
    title: 'Generate Photos',
    description:
      'Create stunning, photorealistic images of your companion in any scene you can imagine.',
    gradient: 'from-pink-600/20 to-pink-900/10',
    border: 'border-pink-600/30',
  },
  {
    icon: Film,
    title: 'Cinematic Videos',
    description:
      'Bring your companion to life with short, high-quality video clips that feel incredibly real.',
    gradient: 'from-blue-600/20 to-blue-900/10',
    border: 'border-blue-600/30',
  },
  {
    icon: BookOpen,
    title: 'Tell Stories',
    description:
      'Co-write romantic, erotic, or adventure stories with your companion. Every story is yours to keep.',
    gradient: 'from-amber-600/20 to-amber-900/10',
    border: 'border-amber-600/30',
  },
]

const scenes = [
  { label: 'Intimate', emoji: '🌹', blur: true },
  { label: 'Lingerie', emoji: '✨', blur: true },
  { label: 'Outdoor', emoji: '🌅', blur: false },
  { label: 'Fantasy', emoji: '🌙', blur: false },
  { label: 'Aftermath', emoji: '💜', blur: true },
  { label: 'Bondage', emoji: '🔗', blur: true },
  { label: 'Swimwear', emoji: '🏖️', blur: false },
  { label: 'Cosplay', emoji: '🎭', blur: false },
]

const pricing = [
  {
    name: 'Free',
    credits: 10,
    price: '₹0',
    period: 'forever',
    features: ['10 free credits', '1 AI companion', 'Basic chat', 'Standard quality'],
    cta: 'Get started free',
    highlight: false,
  },
  {
    name: 'Basic',
    credits: 100,
    price: '₹199',
    period: 'per purchase',
    features: ['100 credits', '3 AI companions', 'Unlimited chat', 'HD quality photos', 'Video generation'],
    cta: 'Buy Basic',
    highlight: true,
  },
  {
    name: 'Pro',
    credits: 300,
    price: '₹499',
    period: 'per purchase',
    features: ['300 credits', 'Unlimited companions', 'Priority generation', '4K quality', 'All scenes unlocked', 'Custom prompts'],
    cta: 'Buy Pro',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Pintu</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-[#1e1e2e] transition-all"
              aria-label="Log in to your account"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg shadow-purple-900/30"
              aria-label="Create a free account"
            >
              Try for free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-pink-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-600/30 bg-purple-600/10 text-purple-300 text-xs font-medium mb-6">
              <Shield className="h-3 w-3" />
              18+ Adult AI Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Your AI Companion.{' '}
              <span className="text-gradient">Real conversations.</span>{' '}
              Explicit photos.{' '}
              <span className="text-gradient">Cinematic videos.</span>
            </h1>

            <p className="text-lg text-[#94a3b8] mb-8 max-w-xl leading-relaxed">
              Design your perfect AI companion. Chat naturally, generate stunning photos, create videos, and explore your fantasies — all in one place.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600 transition-all shadow-xl shadow-purple-900/40 glow-purple"
                aria-label="Create your free AI companion"
              >
                Create free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-medium border border-[#1e1e2e] text-[#94a3b8] hover:bg-[#1e1e2e] hover:text-white transition-all"
                aria-label="See platform features"
              >
                See examples
              </Link>
            </div>

            <div className="flex items-center gap-6 mt-8">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 border-2 border-[#0a0a0f] flex items-center justify-center text-xs font-bold"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-xs text-[#94a3b8] mt-0.5">Loved by 50,000+ users</p>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden border border-[#1e1e2e] bg-[#13131a] aspect-video shadow-2xl glow-purple">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-900/40">
                    <Film className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-[#94a3b8] text-sm">Demo preview</p>
                  <p className="text-xs text-[#4a4a6a] mt-1">AI-generated content</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#13131a] to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Luna</p>
                  <p className="text-xs text-[#94a3b8]">Your AI companion</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-900/40 border border-green-700/50">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-300">Online</span>
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -left-8 top-1/4 hidden lg:block">
              <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a]/90 backdrop-blur p-3 shadow-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-full bg-purple-600/40" />
                  <div className="h-2 w-16 bg-[#1e1e2e] rounded" />
                </div>
                <div className="h-2 w-24 bg-[#1e1e2e] rounded mb-1" />
                <div className="h-2 w-20 bg-[#1e1e2e] rounded" />
              </div>
            </div>
            <div className="absolute -right-8 bottom-1/4 hidden lg:block">
              <div className="rounded-xl border border-purple-600/30 bg-purple-900/20 backdrop-blur p-3 shadow-xl">
                <p className="text-xs text-purple-300 font-medium">Photo generated!</p>
                <p className="text-xs text-[#94a3b8]">1 credit used</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need in{' '}
              <span className="text-gradient">one platform</span>
            </h2>
            <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto">
              Build a deep connection with your AI companion. Chat, create, and explore without limits.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, description, gradient, border }) => (
              <div
                key={title}
                className={`rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-6 transition-all duration-300 hover:scale-[1.02]`}
              >
                <div className="h-12 w-12 rounded-xl bg-[#0a0a0f]/50 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-[#94a3b8] text-sm leading-relaxed">{description}</p>
                <div className="flex items-center gap-1.5 mt-4 text-sm font-medium text-purple-400">
                  Learn more <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scene Preview */}
      <section className="py-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Explore scenes</h2>
              <p className="text-[#94a3b8]">Hundreds of scenarios to explore with your companion</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-700/50 bg-red-900/20 text-red-300 text-xs font-medium flex-shrink-0">
              <Shield className="h-3 w-3" />
              18+ content
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {scenes.map(({ label, emoji, blur }) => (
              <div
                key={label}
                className="flex-shrink-0 w-40 h-52 rounded-2xl border border-[#1e1e2e] bg-[#13131a] relative overflow-hidden group cursor-pointer transition-all duration-300 hover:border-purple-600/50"
              >
                <div className={`absolute inset-0 flex items-center justify-center ${blur ? 'blur-sm group-hover:blur-none' : ''} transition-all duration-500`}>
                  <span className="text-6xl">{emoji}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#13131a] to-transparent">
                  <p className="text-sm font-medium text-white">{label}</p>
                  {blur && (
                    <p className="text-xs text-[#94a3b8]">Hover to preview</p>
                  )}
                </div>
                {blur && (
                  <div className="absolute inset-x-0 top-0 p-2">
                    <span className="text-[10px] text-red-300 bg-red-900/40 border border-red-700/50 rounded-full px-1.5 py-0.5">18+</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, <span className="text-gradient">transparent</span> pricing
            </h2>
            <p className="text-[#94a3b8] text-lg">
              Buy credits as you go. No subscription required.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricing.map(({ name, credits, price, period, features, cta, highlight }) => (
              <div
                key={name}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:scale-[1.02] ${
                  highlight
                    ? 'border-purple-600/60 bg-gradient-to-b from-purple-900/20 to-[#13131a] glow-purple'
                    : 'border-[#1e1e2e] bg-[#13131a]'
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-900/30">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{price}</span>
                    <span className="text-sm text-[#94a3b8]">/ {period}</span>
                  </div>
                  <p className="text-sm text-purple-400 mt-1">{credits} credits included</p>
                </div>

                <ul className="flex flex-col gap-2.5 flex-1 mb-6">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[#94a3b8]">
                      <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    highlight
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-900/30'
                      : 'border border-[#1e1e2e] text-[#94a3b8] hover:bg-[#1e1e2e] hover:text-white'
                  }`}
                  aria-label={`${cta} - ${name} plan`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Pintu</span>
            </Link>

            <div className="flex items-center gap-6 text-sm text-[#94a3b8]">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Support</Link>
              <Link href="#" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-[#1e1e2e] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#94a3b8]">
              © 2024 Pintu. All rights reserved. 18+ adult platform.
            </p>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1e1e2e] text-xs text-[#94a3b8]">
              <Shield className="h-3 w-3" />
              Adults only (18+)
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

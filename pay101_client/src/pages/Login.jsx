import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, User, Eye, EyeOff, TrendingUp, Wallet, CreditCard, Clock } from 'lucide-react'
import { toast } from 'sonner'
import clientAPI from '@/api/client_api'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Login() {
  usePageTitle('Merchant Login - Pay101');
  const navigate = useNavigate()
  const location = useLocation()
  const [credentials, setCredentials] = useState({ 
    merchantId: '', 
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Get the redirect path from location state or default to '/'
  const from = location.state?.from?.pathname || '/'

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (clientAPI.isAuthenticated()) {
      navigate(from, { replace: true })
    }
  }, [navigate, from])

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!credentials.merchantId || !credentials.password) {
      toast.error('Please fill all fields')
      return
    }

    setLoading(true)
    try {
      const response = await clientAPI.login(
        credentials.merchantId, 
        credentials.password
      )
      
      if (response.success) {
        toast.success(`Welcome back!`)
        // Redirect to the page they tried to visit or dashboard
        navigate(from, { replace: true })
      }
    } catch (error) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      
      {/* Glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>

      {/* Left Side - Information */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center p-8">
        <div className="max-w-lg">
          {/* Logo with white background container */}
          <div className="mb-8 inline-block bg-white px-6 py-3 rounded-2xl shadow-lg">
            <img src="/pay101.png" alt="Pay101" className="h-12" />
          </div>

          {/* Main Heading */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
              Grow Your Business
            </h1>
            <p className="text-xl text-emerald-200">
              Accept payments seamlessly and scale effortlessly
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl backdrop-blur-sm">
                <TrendingUp className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Instant Settlements</h3>
                <p className="text-emerald-200 text-sm">Receive payments directly to your bank account within 24 hours</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal-500/20 rounded-xl backdrop-blur-sm">
                <CreditCard className="h-6 w-6 text-teal-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Accept All Payment Methods</h3>
                <p className="text-emerald-200 text-sm">UPI, Credit/Debit Cards, Net Banking, Wallets & more</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl backdrop-blur-sm">
                <Wallet className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Simple Dashboard</h3>
                <p className="text-emerald-200 text-sm">Track all transactions, settlements and reports in one place</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl backdrop-blur-sm">
                <Clock className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Dedicated Support</h3>
                <p className="text-emerald-200 text-sm">Get help anytime with our 24/7 merchant support team</p>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-emerald-200 text-sm mb-4">Trusted by businesses across World</p>
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <span className="text-white text-sm font-medium">TOP Certified</span>
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <span className="text-white text-sm font-medium">SSL Secured</span>
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <span className="text-white text-sm font-medium">100% Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 relative z-10">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
          <CardContent className="p-8">
            {/* Mobile Logo - Only show on mobile */}
            <div className="flex justify-center mb-6 lg:hidden">
              <img src="/pay101.png" alt="Pay101" className="h-10" />
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Merchant Portal</h1>
              <p className="text-sm text-gray-500">Sign in to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Merchant ID */}
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Merchant ID"
                    value={credentials.merchantId}
                    onChange={(e) => setCredentials({ ...credentials, merchantId: e.target.value })}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" 
                    disabled={loading}
                  />
                  <span className="text-gray-600">Remember</span>
                </label>
                <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  Forgot?
                </a>
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-gray-500">
                New merchant? <a href="#" className="text-emerald-600 hover:underline font-medium">Contact Sales</a>
              </p>
              <p className="text-xs text-gray-500">
                Need help? <a href="#" className="text-emerald-600 hover:underline font-medium">Support</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom */}
      <div className="absolute bottom-4 left-0 right-0 text-center z-10">
        <p className="text-xs text-white/60">© 2026 Pay101. Trusted by 10,000+ merchants</p>
      </div>
    </div>
  )
}

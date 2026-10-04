import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, Mail, Eye, EyeOff, Shield, BarChart3, Users, Zap } from 'lucide-react'
import { toast } from 'sonner'
import adminAPI from '@/api/admin_api'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function Login() {
  usePageTitle('Admin Login - Pay101');
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState({ 
    adminId: '', 
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!credentials.adminId || !credentials.password) {
      toast.error('Please fill all fields')
      return
    }

    setLoading(true)
    try {
      const response = await adminAPI.login(
        credentials.adminId,
        credentials.password
      )

      if (response.success) {
        toast.success('Welcome back!')
        navigate('/')
      }
    } catch (error) {
      toast.error(error.message || 'Login failed')
      setCredentials({ ...credentials, password: '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      
      {/* Glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>

      {/* Left Side - Information */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center p-8">
        <div className="max-w-lg">
          {/* Logo with white background container */}
          <div className="mb-6 inline-block bg-white px-5 py-2.5 rounded-xl shadow-lg">
            <img src="/pay101.png" alt="Pay101" className="h-10" />
          </div>

          {/* Main Heading */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
              Admin Control Center
            </h1>
            <p className="text-lg text-blue-200">
              Manage your payment gateway with powerful tools
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-sm">
                <BarChart3 className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-0.5">Real-Time Analytics</h3>
                <p className="text-blue-200 text-sm">Monitor transactions and performance metrics</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-sm">
                <Users className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-0.5">Merchant Management</h3>
                <p className="text-blue-200 text-sm">Complete control over merchant accounts</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg backdrop-blur-sm">
                <Shield className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-0.5">Bank-Grade Security</h3>
                <p className="text-blue-200 text-sm">AES-256 encryption with fraud protection</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg backdrop-blur-sm">
                <Zap className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-0.5">Instant Settlements</h3>
                <p className="text-blue-200 text-sm">Process payouts with lightning speed</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
            <div>
              <div className="text-2xl font-bold text-white">99.9%</div>
              <div className="text-blue-300 text-xs">Uptime</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">10K+</div>
              <div className="text-blue-300 text-xs">Merchants</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">₹500Cr+</div>
              <div className="text-blue-300 text-xs">Processed</div>
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
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Portal</h1>
              <p className="text-sm text-gray-500">Sign in to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Admin ID */}
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Admin ID"
                    value={credentials.adminId}
                    onChange={(e) => setCredentials({ ...credentials, adminId: e.target.value })}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                    className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    disabled={loading}
                  />
                  <span className="text-gray-600">Remember</span>
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Forgot?
                </a>
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
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
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Need help? <a href="#" className="text-blue-600 hover:underline font-medium">Contact Support</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom */}
      <div className="absolute bottom-4 left-0 right-0 text-center z-10">
        <p className="text-xs text-white/60">© 2026 Pay101. Secure Payment Gateway</p>
      </div>
    </div>
  )
}

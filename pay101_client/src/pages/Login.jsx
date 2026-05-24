import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, User, ArrowRight, TrendingUp, Shield, Wallet } from 'lucide-react'
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
        toast.success(`Welcome back, ${response.merchantName}!`)
        // Redirect to the page they tried to visit or dashboard
        navigate(from, { replace: true })
      }
    } catch (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-emerald-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding & Features */}
          <div className="hidden lg:flex flex-col space-y-8">
            {/* Logo & Title */}
            <div className="space-y-4">
              <img src="/pay101.png" alt="Pay101" className="h-16 w-auto" />
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                Grow Your<br />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Business with Pay101
                </span>
              </h1>
              <p className="text-xl text-gray-600">
                Accept payments, manage settlements, and scale effortlessly
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Fast Settlements</h3>
                  <p className="text-sm text-gray-600">Get your money in 24 hours with instant payouts</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all">
                <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Multiple Payment Methods</h3>
                  <p className="text-sm text-gray-600">UPI, Cards, Net Banking & more payment options</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all">
                <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Secure & Compliant</h3>
                  <p className="text-sm text-gray-600">PCI-DSS certified with advanced fraud protection</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
            <CardContent className="p-8 md:p-12">
              {/* Mobile Logo */}
              <div className="flex justify-center mb-8 lg:hidden">
                <img src="/pay101.png" alt="Pay101" className="h-12" />
              </div>

              {/* Form Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Merchant Login</h2>
                <p className="text-gray-600">Access your merchant dashboard</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {/* Merchant ID Field */}
                <div className="space-y-2">
                  <Label htmlFor="merchantId" className="text-gray-700 font-semibold">Merchant ID</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <Input
                      id="merchantId"
                      type="text"
                      placeholder="Enter your merchant ID"
                      value={credentials.merchantId}
                      onChange={(e) => setCredentials({ ...credentials, merchantId: e.target.value })}
                      className="pl-12 h-14 bg-gray-50 border-2 border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-base transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-semibold">Password</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      className="pl-12 h-14 bg-gray-50 border-2 border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-base transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0" 
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                  </label>
                  <a href="#" className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                    Forgot password?
                  </a>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 group"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing In...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In to Dashboard
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-8 text-center space-y-3">
                <p className="text-sm text-gray-600">
                  New to Pay101?{' '}
                  <a href="#" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                    Contact Sales
                  </a>
                </p>
                <p className="text-sm text-gray-600">
                  Need help?{' '}
                  <a href="#" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                    Support Center
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Text */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>© 2026 Pay101. All rights reserved. | Trusted by 10,000+ merchants</p>
        </div>
      </div>
    </div>
  )
}

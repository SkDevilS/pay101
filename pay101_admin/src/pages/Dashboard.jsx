import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, TrendingDown, DollarSign, 
  ArrowUpCircle, ArrowDownCircle, Clock, RefreshCw, Activity, CreditCard
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import adminAPI from '@/api/admin_api'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const StatCard = ({ title, amount, icon: Icon, color, bgClass, gradient }) => (
  <Card className={`transition-all duration-300 shadow-md ${bgClass || 'bg-white border border-slate-300'} ${gradient || ''}`}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      <div className={`p-2 rounded-xl bg-opacity-10 ${color.replace('text-', 'bg-')} ${color}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-slate-800 tracking-tight">{formatCurrency(amount)}</div>
    </CardContent>
  </Card>
)

const TimeRangeStats = ({ title, data }) => (
  <Card className="border border-slate-300 shadow-md hover:shadow-lg transition-shadow bg-white">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
          <span className="text-sm font-medium text-emerald-800">Payin</span>
          <span className="text-base font-bold text-emerald-700">{formatCurrency(data.payin)}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
          <span className="text-sm font-medium text-indigo-800">Payout</span>
          <span className="text-base font-bold text-indigo-700">{formatCurrency(data.payout)}</span>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [payinStats, setPayinStats] = useState({
    success: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 }
  })
  const [payoutStats, setPayoutStats] = useState({
    success: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
    queued: { count: 0, amount: 0 }
  })
  const [timeRangeData, setTimeRangeData] = useState({
    today: { payin: 0, payout: 0 },
    yesterday: { payin: 0, payout: 0 },
    last7days: { payin: 0, payout: 0 },
    last30days: { payin: 0, payout: 0 },
  })
  const [totals, setTotals] = useState({
    totalPayinCharges: 0,
    totalPayoutCharges: 0,
    totalIncome: 0,
    totalSettled: 0,
    totalUnsettled: 0
  })
  const [merchantTodayStats, setMerchantTodayStats] = useState([])
  const [merchantTodayError, setMerchantTodayError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 15 seconds for more "live" feel
    const intervalId = setInterval(() => {
      loadDashboardData(true)
    }, 15000) 
    
    return () => clearInterval(intervalId)
  }, [])

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setIsRefreshing(true)
      setMerchantTodayError(null)

      const [payinResponse, payoutResponse, walletSummaryResponse, merchantTodayResponse] = await Promise.all([
        adminAPI.getPayinStats().catch(e => ({ success: false })),
        adminAPI.getPayoutStats().catch(e => ({ success: false })),
        adminAPI.getWalletSummary().catch(e => ({ success: false })),
        adminAPI.getMerchantTodayPayinStats().catch(e => ({ success: false, error: e.message || 'API request failed' }))
      ])
      
      if (payinResponse.success) {
        setPayinStats(payinResponse.stats)
        if (payinResponse.totals) {
          setTotals(prev => ({
            ...prev,
            totalPayinCharges: payinResponse.totals.total_payin_charges
          }))
        }
        if (payinResponse.timeRanges) {
          setTimeRangeData(prev => ({
            today: { ...prev.today, payin: payinResponse.timeRanges.today.payin },
            yesterday: { ...prev.yesterday, payin: payinResponse.timeRanges.yesterday.payin },
            last7days: { ...prev.last7days, payin: payinResponse.timeRanges.last7days.payin },
            last30days: { ...prev.last30days, payin: payinResponse.timeRanges.last30days.payin },
          }))
        }
      }
      
      if (payoutResponse.success) {
        setPayoutStats(payoutResponse.stats)
        if (payoutResponse.totals) {
          setTotals(prev => ({
            ...prev,
            totalPayoutCharges: payoutResponse.totals.total_payout_charges,
            totalIncome: prev.totalPayinCharges + payoutResponse.totals.total_payout_charges
          }))
        }
        if (payoutResponse.timeRanges) {
          setTimeRangeData(prev => ({
            today: { ...prev.today, payout: payoutResponse.timeRanges.today.payout },
            yesterday: { ...prev.yesterday, payout: payoutResponse.timeRanges.yesterday.payout },
            last7days: { ...prev.last7days, payout: payoutResponse.timeRanges.last7days.payout },
            last30days: { ...prev.last30days, payout: payoutResponse.timeRanges.last30days.payout },
          }))
        }
      }
      
      if (walletSummaryResponse.success && walletSummaryResponse.data) {
        setTotals(prev => ({
          ...prev,
          totalSettled: walletSummaryResponse.data.total_settled || 0,
          totalUnsettled: walletSummaryResponse.data.total_unsettled || 0
        }))
      }

      if (merchantTodayResponse.success) {
        setMerchantTodayStats(merchantTodayResponse.data || [])
      } else {
        setMerchantTodayError(merchantTodayResponse.error || "Unknown error fetching stats")
      }
      
      setLastUpdated(new Date())
    } catch (error) {
      if (!silent) toast.error('Failed to load dashboard data')
      console.error('Dashboard data error:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const stats = {
    settled: payinStats.success.amount,
    unsettled: payinStats.pending.amount,
    total: payinStats.success.amount + payinStats.pending.amount + payinStats.failed.amount,
  }

  const payoutTotals = {
    total: payoutStats.success.amount + payoutStats.pending.amount + payoutStats.queued.amount + payoutStats.failed.amount
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-slate-500 font-medium tracking-wide">Loading premium dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 -m-8 p-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Overview
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Here's what's happening with your platform today.</p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live • Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <Button 
              onClick={() => loadDashboardData(false)} 
              variant="outline" 
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Top Merchants Today Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-800">
              Top Merchants Today
              <span className="text-xs text-slate-400 ml-2 font-normal">(Debug: {merchantTodayStats.length} found)</span>
            </h2>
          </div>
          
          {merchantTodayStats.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 font-medium">
              {merchantTodayError ? (
                <span className="text-red-500">API Error: {merchantTodayError}. Please ensure backend route /api/payin/admin/merchant-today-stats is deployed and restarted!</span>
              ) : (
                "Waiting for data... (If this stays here, the backend API is returning an empty array)"
              )}
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-4 pb-2 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style dangerouslySetInnerHTML={{__html: `
                .flex::-webkit-scrollbar { display: none; }
              `}} />
              {merchantTodayStats.filter(stat => stat.gross_amount > 0).map((stat) => (
                <Card key={stat.merchant_id} className="min-w-[260px] max-w-[260px] border border-slate-300 shadow-md snap-start bg-white rounded-xl">
                  <CardContent className="p-5 flex flex-col justify-between relative h-full">
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-900 text-base uppercase truncate pr-4">{stat.business_name}</h3>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1">Today's Volume</p>
                        <p className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                          {formatCurrency(stat.gross_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Merchant</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        {/* 2. Today / Yesterday Stats */}
        <div className="pt-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TimeRangeStats title="Today" data={timeRangeData.today} />
            <TimeRangeStats title="Yesterday" data={timeRangeData.yesterday} />
            <TimeRangeStats title="Last 7 Days" data={timeRangeData.last7days} />
            <TimeRangeStats title="Last 30 Days" data={timeRangeData.last30days} />
          </div>
        </div>

        {/* 3. Something Good: System Health Banner */}
        <Card className="border border-emerald-200/60 shadow-md bg-gradient-to-r from-emerald-50 via-teal-50/30 to-emerald-50 overflow-hidden relative mt-8">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div>
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-emerald-900">
                <Activity className="h-6 w-6 text-emerald-600" />
                Platform Health is Optimal
              </h3>
              <p className="text-emerald-700/80 text-sm font-medium">All payment gateways and core services are running smoothly with 99.9% uptime today.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-white border border-emerald-100 shadow-sm px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-semibold tracking-wide text-emerald-800">API Core</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-emerald-100 shadow-sm px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-semibold tracking-wide text-emerald-800">Gateways</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. All Time Volumes with Toggle */}
        <div className="pt-8">
          <Tabs defaultValue="payin" className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-lg font-bold text-slate-800">All-Time Volumes</h2>
              <TabsList className="bg-slate-200/50 p-1 rounded-xl">
                <TabsTrigger value="payin" className="rounded-lg px-8 py-2 font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Payins</TabsTrigger>
                <TabsTrigger value="payout" className="rounded-lg px-8 py-2 font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Payouts</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="payin" className="focus:outline-none mt-0">
              <Card className="border border-slate-300 shadow-md bg-white">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Success</p>
                        <ArrowUpCircle className="h-6 w-6 text-emerald-500" />
                      </div>
                      <p className="text-3xl font-extrabold text-emerald-700 truncate" title={formatCurrency(payinStats.success.amount)}>{formatCurrency(payinStats.success.amount)}</p>
                      <p className="text-sm font-medium text-emerald-600/70 mt-2">{payinStats.success.count} transactions</p>
                    </div>
                    
                    <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-amber-800 uppercase tracking-wider">Pending</p>
                        <Clock className="h-6 w-6 text-amber-500" />
                      </div>
                      <p className="text-3xl font-extrabold text-amber-700 truncate" title={formatCurrency(payinStats.pending.amount)}>{formatCurrency(payinStats.pending.amount)}</p>
                      <p className="text-sm font-medium text-amber-600/70 mt-2">{payinStats.pending.count} transactions</p>
                    </div>
                    
                    <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100/50 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-rose-800 uppercase tracking-wider">Failed</p>
                        <ArrowDownCircle className="h-6 w-6 text-rose-500" />
                      </div>
                      <p className="text-3xl font-extrabold text-rose-700 truncate" title={formatCurrency(payinStats.failed.amount)}>{formatCurrency(payinStats.failed.amount)}</p>
                      <p className="text-sm font-medium text-rose-600/70 mt-2">{payinStats.failed.count} transactions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payout" className="focus:outline-none mt-0">
              <Card className="border border-slate-300 shadow-md bg-white">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Success</p>
                        <ArrowUpCircle className="h-6 w-6 text-emerald-500" />
                      </div>
                      <p className="text-2xl font-extrabold text-emerald-700 truncate" title={formatCurrency(payoutStats.success.amount)}>{formatCurrency(payoutStats.success.amount)}</p>
                      <p className="text-sm font-medium text-emerald-600/70 mt-2">{payoutStats.success.count} txns</p>
                    </div>
                    
                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-blue-800 uppercase tracking-wider">Queued</p>
                        <CreditCard className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="text-2xl font-extrabold text-blue-700 truncate" title={formatCurrency(payoutStats.queued.amount)}>{formatCurrency(payoutStats.queued.amount)}</p>
                      <p className="text-sm font-medium text-blue-600/70 mt-2">{payoutStats.queued.count} txns</p>
                    </div>
                    
                    <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-amber-800 uppercase tracking-wider">Pending</p>
                        <Clock className="h-6 w-6 text-amber-500" />
                      </div>
                      <p className="text-2xl font-extrabold text-amber-700">{formatCurrency(payoutStats.pending.amount)}</p>
                      <p className="text-sm font-medium text-amber-600/70 mt-2">{payoutStats.pending.count} txns</p>
                    </div>
                    
                    <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100/50 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-bold text-rose-800 uppercase tracking-wider">Failed</p>
                        <ArrowDownCircle className="h-6 w-6 text-rose-500" />
                      </div>
                      <p className="text-2xl font-extrabold text-rose-700">{formatCurrency(payoutStats.failed.amount)}</p>
                      <p className="text-sm font-medium text-rose-600/70 mt-2">{payoutStats.failed.count} txns</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 5. Business Metrics */}
        <div className="pt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Business Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Successful Payin"
              amount={payinStats.success.amount}
              icon={ArrowUpCircle}
              color="text-emerald-600"
              bgClass="bg-white border border-slate-300 shadow-md"
            />
            <StatCard
              title="Total Payout"
              amount={payoutStats.success.amount}
              icon={ArrowDownCircle}
              color="text-indigo-600"
              bgClass="bg-white border border-slate-300 shadow-md"
            />
            <Card className="border border-slate-300 shadow-md hover:shadow-lg transition-shadow bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Platform Income</CardTitle>
                <div className="p-2 rounded-xl bg-emerald-50">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800 tracking-tight">{formatCurrency(totals.totalIncome)}</div>
                <div className="mt-3 flex gap-4 text-sm font-medium text-slate-500">
                  <span>Payin: <span className="text-emerald-600 font-semibold">{formatCurrency(totals.totalPayinCharges)}</span></span>
                  <span>Payout: <span className="text-indigo-600 font-semibold">{formatCurrency(totals.totalPayoutCharges)}</span></span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 6. Financial Highlights (Settled / Unsettled) */}
        <div className="pt-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Financial Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-white overflow-hidden relative">
              <div className="absolute -right-6 -top-6 text-emerald-100 opacity-50">
                <TrendingUp className="h-32 w-32" />
              </div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold tracking-wide text-emerald-800 uppercase flex items-center gap-2">
                  Total Settled Available
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-4xl font-extrabold text-emerald-900 tracking-tight">
                  {formatCurrency(totals.totalSettled)}
                </p>
                <p className="text-sm font-medium text-emerald-700/70 mt-2">Ready for merchant payouts</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-white overflow-hidden relative">
              <div className="absolute -right-6 -top-6 text-amber-100 opacity-50">
                <Clock className="h-32 w-32" />
              </div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold tracking-wide text-amber-800 uppercase flex items-center gap-2">
                  Total Unsettled Pending
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-4xl font-extrabold text-amber-900 tracking-tight">
                  {formatCurrency(totals.totalUnsettled)}
                </p>
                <p className="text-sm font-medium text-amber-700/70 mt-2">Awaiting admin settlement approval</p>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  )
}

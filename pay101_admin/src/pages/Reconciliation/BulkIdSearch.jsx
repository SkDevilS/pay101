import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import adminAPI from '../../api/admin_api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Search, AlertTriangle, CheckCircle, XCircle, Loader2, ListChecks } from 'lucide-react';

const formatPGPartnerName = (pgPartner) => {
  if (!pgPartner) return '-';
  const nameMap = {
    'Paytouch2': 'PT2',
    'Paytouch3_Trendora': 'PT3',
    'PAYTOUCH2': 'PT2',
    'PAYTOUCH3_TRENDORA': 'PT3'
  };
  return nameMap[pgPartner] || pgPartner;
};

export default function BulkIdSearch() {
  const [inputText, setInputText] = useState('');
  const [transactionType, setTransactionType] = useState('payin');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTxns, setSelectedTxns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [failedReason, setFailedReason] = useState('');

  const handleSearch = async () => {
    const rawIds = inputText.split(/[\n, ]+/).map(id => id.trim()).filter(id => id.length > 0);
    
    if (rawIds.length === 0) {
      toast.error('Please enter at least one transaction ID or order ID');
      return;
    }
    
    if (rawIds.length > 500) {
      toast.error('Please do not search more than 500 IDs at a time');
      return;
    }

    try {
      setLoading(true);
      setSearchResults([]);
      setSelectedTxns([]);

      const response = await adminAPI.searchTransactionsByBulkIds(rawIds, transactionType);

      if (response.success) {
        setSearchResults(response.results || []);
        if (response.results.length === 0) {
          toast.info('No transactions found matching the provided IDs');
        } else {
          toast.success(`Found ${response.results.length} transaction(s)`);
        }
      } else {
        toast.error(response.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTxns(searchResults.map(t => t.txn_id));
    } else {
      setSelectedTxns([]);
    }
  };

  const handleSelectRow = (txnId, checked) => {
    if (checked) {
      setSelectedTxns(prev => [...prev, txnId]);
    } else {
      setSelectedTxns(prev => prev.filter(id => id !== txnId));
    }
  };

  const handleBulkUpdate = async (status) => {
    if (selectedTxns.length === 0) {
      toast.error('Please select at least one transaction');
      return;
    }

    if (status === 'FAILED' && !failedReason.trim()) {
      toast.error('Reason is required when marking as FAILED');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to update ${selectedTxns.length} transaction(s) to ${status}?\n\n` +
      `This will process each transaction sequentially and cannot be undone.`
    );

    if (!confirmed) return;

    setProcessing(true);
    setProgress({ current: 0, total: selectedTxns.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedTxns.length; i++) {
      const txnId = selectedTxns[i];
      try {
        const response = await adminAPI.updateTransactionStatus(
          txnId, 
          transactionType, 
          status, 
          status === 'FAILED' ? failedReason : ''
        );
        
        if (response.success) {
          successCount++;
          // Update the UI immediately for this row
          setSearchResults(prev => prev.map(t => 
            t.txn_id === txnId ? { ...t, status: status } : t
          ));
        } else {
          failCount++;
          console.error(`Failed to update ${txnId}:`, response.message);
        }
      } catch (error) {
        failCount++;
        console.error(`Error updating ${txnId}:`, error);
      }
      
      setProgress({ current: i + 1, total: selectedTxns.length });
    }

    setProcessing(false);
    setSelectedTxns([]);
    
    if (failCount === 0) {
      toast.success(`Successfully updated all ${successCount} transaction(s)`);
    } else {
      toast.warning(`Updated ${successCount} successfully, but ${failCount} failed. Check console for details.`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-indigo-500" />
            Bulk Paste IDs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="flex gap-4">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setTransactionType('payin')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    transactionType === 'payin' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Payins
                </button>
                <button
                  onClick={() => setTransactionType('payout')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    transactionType === 'payout' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Payouts
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">
                Paste Order IDs or Transaction IDs (comma, space, or newline separated)
              </label>
              <textarea 
                className="w-full min-h-[150px] p-3 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. 10293021, 20392019, 3940293..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleSearch} disabled={loading || !inputText.trim()}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" /> Search Transactions</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <Card>
          <CardHeader className="bg-slate-50 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="text-lg">Search Results ({searchResults.length})</CardTitle>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-4 w-full md:w-auto">
              <Input 
                placeholder="Reason (Required for Failed)"
                value={failedReason}
                onChange={(e) => setFailedReason(e.target.value)}
                className="w-[250px]"
                disabled={processing}
              />
              <Button 
                variant="outline" 
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => handleBulkUpdate('SUCCESS')}
                disabled={processing || selectedTxns.length === 0}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Mark Success ({selectedTxns.length})
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleBulkUpdate('FAILED')}
                disabled={processing || selectedTxns.length === 0}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Mark Failed ({selectedTxns.length})
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {processing && (
              <div className="p-4 bg-indigo-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                  <span className="font-medium text-indigo-900">
                    Processing updates... ({progress.current} of {progress.total})
                  </span>
                </div>
                <div className="w-1/2 bg-indigo-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto w-full pb-4 max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                  <TableRow className="whitespace-nowrap">
                    <TableHead className="w-[50px] text-center">
                      <Checkbox 
                        checked={selectedTxns.length === searchResults.length && searchResults.length > 0}
                        onCheckedChange={handleSelectAll}
                        disabled={processing}
                      />
                    </TableHead>
                    <TableHead>Txn ID / Order ID</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((txn) => (
                    <TableRow 
                      key={txn.txn_id} 
                      className={`whitespace-nowrap ${
                        txn.status === 'SUCCESS' ? 'bg-emerald-50/30' : 
                        txn.status === 'FAILED' ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={selectedTxns.includes(txn.txn_id)}
                          onCheckedChange={(checked) => handleSelectRow(txn.txn_id, checked)}
                          disabled={processing}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900 text-xs">{txn.txn_id}</div>
                        <div className="text-slate-500 text-xs">{txn.order_id || txn.reference_id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{txn.merchant_name}</div>
                        <div className="text-xs text-slate-500">{txn.merchant_id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">₹{parseFloat(txn.amount).toFixed(2)}</div>
                        <div className="text-xs text-slate-500">Net: ₹{parseFloat(txn.net_amount || 0).toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          txn.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                          txn.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }>
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{formatPGPartnerName(txn.pg_partner)}</div>
                        {txn.utr && <div className="text-xs text-slate-500 break-all w-[150px]">UTR: {txn.utr}</div>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                        {new Date(txn.created_at).toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

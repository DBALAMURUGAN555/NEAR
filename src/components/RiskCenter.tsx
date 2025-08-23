import React, { useState } from 'react';
import { assessRisk } from '@/services/risk';

export default function RiskCenter() {
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; factors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const amountSats = BigInt(Math.max(0, Number(amount)));
      const r = await assessRisk(accountId, amountSats);
      setResult(r);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quantitative Risk Assessment</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Account ID</label>
            <input value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount (sats)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2" type="number" min="0" />
          </div>
          <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg">
            {loading ? 'Assessing...' : 'Assess Risk'}
          </button>
        </form>

        {error && <div className="mt-4 p-3 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}
        {result && (
          <div className="mt-6 p-4 rounded-lg border bg-gray-50">
            <div className="text-gray-900 font-medium">Score: {result.score}</div>
            <div className="text-gray-700 mt-2">
              Factors:
              <ul className="list-disc ml-6">
                {result.factors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



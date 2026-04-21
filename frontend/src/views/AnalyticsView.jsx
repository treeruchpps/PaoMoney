import { useState, useEffect } from 'react';
import Icon from '../components/common/Icon';
import DonutChart from '../components/charts/DonutChart';
import BarChart from '../components/charts/BarChart';
import { transactions as txApi } from '../services/api';
import { fmt } from '../constants/data';

const MONTH_LABELS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// Soft palette for donut chart when no category color available
const PALETTE = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ef4444','#ec4899','#8b5cf6','#f97316'];

export default function AnalyticsView({ accounts }) {
  const today     = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [txList, setTxList]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [barData, setBarData]   = useState([]);

  // ─── Fetch this month's transactions ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        // This month
        const [y, m] = thisMonth.split('-');
        const dateFrom = `${y}-${m}-01`;
        const lastDay  = new Date(parseInt(y), parseInt(m), 0).getDate();
        const dateTo   = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
        const res = await txApi.list({ date_from: dateFrom, date_to: dateTo, limit: 500 });
        if (!cancelled) setTxList(res?.data || []);

        // Last 6 months for bar chart
        const bars = [];
        for (let i = 5; i >= 0; i--) {
          const d  = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const yy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const from = `${yy}-${mm}-01`;
          const last  = new Date(yy, d.getMonth() + 1, 0).getDate();
          const to    = `${yy}-${mm}-${String(last).padStart(2, '0')}`;
          const r     = await txApi.list({ date_from: from, date_to: to, limit: 500 });
          const data  = r?.data || [];
          const inc   = data.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const exp   = data.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          bars.push({ month: MONTH_LABELS[d.getMonth()], income: inc, expense: exp });
        }
        if (!cancelled) setBarData(bars);
      } catch {
        if (!cancelled) { setTxList([]); setBarData([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  // ─── Computed values ────────────────────────────────────────────────
  const totalAssets = accounts.filter((a) => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const totalLiab   = accounts.filter((a) => a.type === 'liability').reduce((s, a) => s + a.balance, 0);
  const netWorth    = totalAssets - totalLiab;

  const income  = txList.filter((t) => t.type === 'income').reduce((s, t)  => s + t.amount, 0);
  const expense = txList.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Group expenses by category name (we only have category_id, use it as label fallback)
  const expBycat = {};
  txList.filter((t) => t.type === 'expense').forEach((t) => {
    const key = t.category_id || 'other';
    expBycat[key] = (expBycat[key] || 0) + t.amount;
  });
  const donutData = Object.entries(expBycat)
    .map(([id, value], i) => ({ label: id.slice(0, 8), value, color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value);

  const top5 = [...txList.filter((t) => t.type === 'expense')]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const prevMonthExpense = barData.length >= 2 ? barData[barData.length - 2]?.expense || 0 : 0;
  const momChange = prevMonthExpense > 0
    ? ((expense - prevMonthExpense) / prevMonthExpense * 100).toFixed(1)
    : '0.0';

  return (
    <div className="p-6 space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'มูลค่าสุทธิ',    value: netWorth,    color: '#6366f1', bg: '#eef2ff', large: true },
          { label: 'สินทรัพย์รวม',   value: totalAssets, color: '#10b981', bg: '#f0fdf4' },
          { label: 'หนี้สินรวม',     value: totalLiab,   color: '#ef4444', bg: '#fff1f2' },
          { label: 'รายได้เดือนนี้', value: income,      color: '#10b981', bg: '#f0fdf4' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 card-hover" style={{ background: s.bg }}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`font-bold ${s.large ? 'text-2xl' : 'text-xl'}`} style={{ color: s.color }}>฿{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">กำลังโหลดข้อมูล...</div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4">
            {/* Donut */}
            <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">รายจ่ายตามหมวด</h3>
              {donutData.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">ไม่มีรายจ่ายเดือนนี้</div>
              ) : (
                <div className="flex items-start gap-4">
                  <DonutChart data={donutData} size={160} />
                  <div className="flex-1 space-y-2 mt-2">
                    {donutData.slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-xs text-slate-600">{d.label}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-700">฿{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bar chart */}
            <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">รายรับ vs รายจ่าย</h3>
                <div className="flex gap-3 text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-slate-500">รายรับ</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-400" /><span className="text-slate-500">รายจ่าย</span></div>
                </div>
              </div>
              <BarChart data={barData} />
              {expense > 0 && (
                <div className="mt-3 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${parseFloat(momChange) < 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <Icon name={parseFloat(momChange) < 0 ? 'TrendingDown' : 'TrendingUp'} size={14}
                      color={parseFloat(momChange) < 0 ? '#10b981' : '#ef4444'} />
                  </div>
                  <p className="text-xs text-slate-600">
                    รายจ่ายเดือนนี้{' '}
                    <span className={`font-bold ${parseFloat(momChange) < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {parseFloat(momChange) < 0 ? 'ลดลง' : 'เพิ่มขึ้น'} {Math.abs(momChange)}%
                    </span>{' '}
                    จากเดือนก่อน
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top 5 */}
          {top5.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Top 5 รายจ่ายสูงสุด</h3>
              <div className="space-y-3">
                {top5.map((tx, i) => {
                  const pct = (tx.amount / top5[0].amount) * 100;
                  return (
                    <div key={tx.id} className="flex items-center gap-3">
                      <div className="w-6 text-center text-xs font-bold text-slate-400">#{i + 1}</div>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50">
                        <Icon name="Tag" size={16} color="#6366f1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-medium text-slate-700">{tx.note || '—'}</p>
                          <p className="text-xs font-bold text-slate-800 ml-2">฿{fmt(tx.amount)}</p>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#6366f1' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

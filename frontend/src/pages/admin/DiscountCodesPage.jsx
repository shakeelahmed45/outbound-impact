import { useState, useEffect } from 'react';
import { Plus, Tag, Users, Calendar, DollarSign, Trash2, Loader2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

const DiscountCodesPage = () => {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [discountCodes, setDiscountCodes] = useState([]);
  const [discountForm, setDiscountForm] = useState({
    code: '', discountType: 'percentage', discountValue: '', validFrom: '', validUntil: '', maxUses: '',
    applicablePlans: ['small', 'medium', 'enterprise'], resellerName: '', commissionType: 'percentage', commissionValue: ''
  });

  useEffect(() => { fetchCodes(); }, []);

  const fetchCodes = async () => {
    try {
      const res = await api.get('/admin/discount-codes');
      setDiscountCodes(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error('Failed to fetch discount codes:', e); setDiscountCodes([]); }
    finally { setLoading(false); }
  };

  const handleChange = (field, value) => setDiscountForm(p => ({ ...p, [field]: value }));
  const handlePlanToggle = (plan) => setDiscountForm(p => ({ ...p, applicablePlans: p.applicablePlans.includes(plan) ? p.applicablePlans.filter(pp => pp !== plan) : [...p.applicablePlans, plan] }));

  const handleCreate = async () => {
    if (!discountForm.code || !discountForm.discountValue) { alert('Please fill in Code and Discount Value'); return; }
    setCreating(true);
    try {
      const res = await api.post('/admin/discount-codes', discountForm);
      if (res.data.id) {
        setDiscountCodes(p => [res.data, ...p]);
        setDiscountForm({ code: '', discountType: 'percentage', discountValue: '', validFrom: '', validUntil: '', maxUses: '', applicablePlans: ['small', 'medium', 'enterprise'], resellerName: '', commissionType: 'percentage', commissionValue: '' });
        alert('Discount code created in Stripe!');
      } else {
        alert(res.data.message || 'Failed to create code');
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create discount code. Check Stripe configuration.');
    } finally { setCreating(false); }
  };

  const handleDelete = async (id, code) => {
    if (!confirm(`Delete discount code "${code}"?`)) return;
    try {
      await api.delete(`/admin/discount-codes/${id}`);
      setDiscountCodes(p => p.filter(d => d.id !== id));
      alert('Discount code deactivated in Stripe!');
    } catch (e) { alert('Failed to delete. Check console.'); console.error(e); }
  };

  const fmtDiscount = (d) => d.discountType === 'percentage' ? `${d.discountValue}% off` : `$${d.discountValue} off`;
  const fmtPlans = (plans) => !plans?.length ? 'All Plans' : plans.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Codes are created as real Stripe Promotion Codes. When a customer enters the code during checkout, Stripe automatically applies the discount. Customers can enter the code on the Plans page.
          </p>
        </div>

        {/* Create Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Create Discount Code</h3>
              <p className="text-sm text-slate-600 mt-1">Creates a real Stripe coupon + promotion code</p>
            </div>
            <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50">
              {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {creating ? 'Creating...' : 'Create in Stripe'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Code *</label>
              <input type="text" placeholder="e.g., WELCOME20" value={discountForm.code} onChange={(e) => handleChange('code', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Discount Type</label>
              <select value={discountForm.discountType} onChange={(e) => handleChange('discountType', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="percentage">Percentage Off</option>
                <option value="fixed_amount">Fixed Amount Off</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Value *</label>
              <div className="flex gap-2">
                <input type="number" placeholder="15" value={discountForm.discountValue} onChange={(e) => handleChange('discountValue', e.target.value)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <span className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700">{discountForm.discountType === 'percentage' ? '%' : '$'}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Valid Until</label>
              <input type="date" value={discountForm.validUntil} onChange={(e) => handleChange('validUntil', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Max Uses</label>
              <input type="number" placeholder="Unlimited" value={discountForm.maxUses} onChange={(e) => handleChange('maxUses', e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Applies To</label>
              <div className="flex flex-wrap gap-3">
                {[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'enterprise', label: 'Enterprise' }].map(plan => (
                  <label key={plan.value} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={discountForm.applicablePlans.includes(plan.value)} onChange={() => handlePlanToggle(plan.value)} className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-slate-700">{plan.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-full border-t border-slate-200 pt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Reseller Commission (Optional — stored in Stripe metadata)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" placeholder="Reseller name" value={discountForm.resellerName} onChange={(e) => handleChange('resellerName', e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <select value={discountForm.commissionType} onChange={(e) => handleChange('commissionType', e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="percentage">% Commission</option>
                  <option value="fixed_amount">$ Fixed Commission</option>
                </select>
                <input type="number" placeholder="Commission value" value={discountForm.commissionValue} onChange={(e) => handleChange('commissionValue', e.target.value)} className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Codes from Stripe */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Stripe Discount Codes ({discountCodes.length})</h3>
          {discountCodes.length === 0 ? (
            <div className="text-center py-12">
              <Tag size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">No discount codes in Stripe</p>
              <p className="text-sm text-slate-400 mt-1">Create your first code above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {discountCodes.map((d) => (
                <div key={d.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <code className="px-3 py-1 bg-purple-100 text-purple-700 rounded font-mono font-bold text-sm">{d.code}</code>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{d.status}</span>
                      <span className="text-sm font-semibold text-slate-700">{fmtDiscount(d)}</span>
                      {d.resellerName && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Reseller: {d.resellerName}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      {d.applicablePlans?.length > 0 && <span className="flex items-center gap-1"><Tag size={14} />{fmtPlans(d.applicablePlans)}</span>}
                      <span className="flex items-center gap-1"><Users size={14} />{d.currentUses || 0}/{d.maxUses || '∞'} used</span>
                      {d.validUntil && <span className="flex items-center gap-1"><Calendar size={14} />Expires {new Date(d.validUntil).toLocaleDateString()}</span>}
                      {d.commissionValue > 0 && <span className="flex items-center gap-1 text-green-600 font-medium"><DollarSign size={14} />{d.commissionType === 'percentage' ? `${d.commissionValue}%` : `$${d.commissionValue}`} commission</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(d.id, d.code)} className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default DiscountCodesPage;

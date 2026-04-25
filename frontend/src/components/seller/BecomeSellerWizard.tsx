'use client';

import { useState } from 'react';
import { Store, Upload, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Step = 1 | 2 | 3;

interface FormState {
  name: string;
  description: string;
  logo: File | null;
  banner: File | null;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
}

const initialState: FormState = {
  name: '',
  description: '',
  logo: null,
  banner: null,
  phone: '',
  address: '',
  latitude: '',
  longitude: '',
};

export default function BecomeSellerWizard() {
  const { addToast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const canAdvanceStep1 = form.name.trim().length > 0;

  const handleFile = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (url: string | null) => void,
  ) => {
    setFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setFieldErrors({});

    const data = new FormData();
    data.append('name', form.name);
    if (form.description) data.append('description', form.description);
    if (form.logo) data.append('logo', form.logo);
    if (form.banner) data.append('banner', form.banner);
    if (form.phone) data.append('phone', form.phone);
    if (form.address) data.append('address', form.address);
    if (form.latitude) data.append('latitude', form.latitude);
    if (form.longitude) data.append('longitude', form.longitude);

    try {
      await api.post('/api/user/become-seller', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      addToast({
        type: 'success',
        title: 'Your shop is live!',
        message: 'Redirecting to your business dashboard…',
      });

      // Full page load so every component's useAuth re-fetches the user+roles.
      window.location.href = '/business/dashboard';
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } };
      };
      const status = axiosErr.response?.status;
      const body = axiosErr.response?.data;

      if (status === 422 && body?.errors) {
        setFieldErrors(body.errors);
        // If the name error came back, jump to step 1
        if (body.errors.name) setStep(1);
      }

      addToast({
        type: 'error',
        title: 'Could not create your shop',
        message: body?.message ?? 'Please review your details and try again.',
      });
      setSubmitting(false);
    }
  };

  const input =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-10">
        {([1, 2, 3] as Step[]).map((n, idx) => (
          <div key={n} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step >= n
                  ? 'bg-gradient-to-br from-sari-500 to-sari-600 text-white shadow-md shadow-sari-500/30'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step > n ? <Check className="w-5 h-5" /> : n}
            </div>
            {idx < 2 && (
              <div
                className={`w-16 h-[2px] mx-2 transition-all ${
                  step > n ? 'bg-sari-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-sari-50 flex items-center justify-center">
                <Store className="w-5 h-5 text-sari-500" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">Store basics</h2>
                <p className="text-sm text-gray-500">Tell us what your shop is called.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Store name <span className="text-sari-600">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Corner Sari-Sari Store"
                className={input}
                maxLength={255}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-600 mt-1.5">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What makes your shop special?"
                rows={4}
                maxLength={2000}
                className={input}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-sari-50 flex items-center justify-center">
                <Upload className="w-5 h-5 text-sari-500" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">Branding</h2>
                <p className="text-sm text-gray-500">Add a logo and banner (both optional).</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Logo <span className="text-gray-400 font-normal">(square image works best)</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  handleFile(e.target.files?.[0] ?? null, (f) => setForm((p) => ({ ...p, logo: f })), setLogoPreview)
                }
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sari-50 file:text-sari-700 file:font-medium hover:file:bg-sari-100"
              />
              {logoPreview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoPreview} alt="Logo preview" className="mt-3 w-24 h-24 rounded-xl object-cover" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Banner <span className="text-gray-400 font-normal">(wide image works best)</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  handleFile(e.target.files?.[0] ?? null, (f) => setForm((p) => ({ ...p, banner: f })), setBannerPreview)
                }
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sari-50 file:text-sari-700 file:font-medium hover:file:bg-sari-100"
              />
              {bannerPreview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={bannerPreview} alt="Banner preview" className="mt-3 w-full h-32 rounded-xl object-cover" />
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-sari-50 flex items-center justify-center">
                <Store className="w-5 h-5 text-sari-500" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">Contact & location</h2>
                <p className="text-sm text-gray-500">How can buyers reach you? (all optional)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9+]*"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value.replace(/[^0-9+]/g, '') }))
                }
                placeholder="09171234567"
                className={input}
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street, city, province"
                rows={3}
                maxLength={500}
                className={input}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                  placeholder="14.5995"
                  className={input}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                  placeholder="120.9842"
                  className={input}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
          disabled={step === 1 || submitting}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(3, s + 1) as Step)}
            disabled={(step === 1 && !canAdvanceStep1) || submitting}
            className="flex items-center gap-1.5 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg transition-all text-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating your shop…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create my shop
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

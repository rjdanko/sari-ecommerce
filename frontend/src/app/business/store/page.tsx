'use client';

import { useState, useEffect } from 'react';
import { Store, Upload, Save, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface StoreData {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function BusinessStorePage() {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await api.get('/api/business/store');
        const s = res.data;
        setStore(s);
        setName(s.name || '');
        setDescription(s.description || '');
        setAddress(s.address || '');
        setPhone(s.phone || '');
        setLatitude(s.latitude?.toString() || '');
        setLongitude(s.longitude?.toString() || '');
        setLogoPreview(s.logo_url);
        setBannerPreview(s.banner_url);
      } catch {
        // No store yet
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, []);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
    previewSetter: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0] || null;
    setter(file);
    if (file) {
      previewSetter(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('address', address);
    formData.append('phone', phone);
    if (latitude) formData.append('latitude', latitude);
    if (longitude) formData.append('longitude', longitude);
    if (logo) formData.append('logo', logo);
    if (banner) formData.append('banner', banner);

    try {
      if (store) {
        // Update — Laravel needs _method for PUT with FormData
        formData.append('_method', 'PUT');
        const res = await api.post('/api/business/store', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setStore(res.data);
        setSuccess('Store updated successfully.');
      } else {
        const res = await api.post('/api/business/store', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setStore(res.data);
        setSuccess('Store created successfully!');
      }
      setLogo(null);
      setBanner(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save store.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sari-500" />
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-8">
        <h1 className="font-display text-2xl tracking-tight text-gray-900">
          {store ? 'Store Settings' : 'Create Your Store'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {store
            ? 'Update your store information and branding.'
            : 'Set up your store to start selling on SARI.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Store Name */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={255}
                placeholder="My Awesome Store"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Tell customers about your store..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={500}
                  placeholder="Store address"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9+]*"
                  value={phone}
                  onChange={(e) => {
                    const numericOnly = e.target.value.replace(/[^0-9+]/g, '');
                    setPhone(numericOnly);
                  }}
                  maxLength={20}
                  placeholder="09123456789"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Latitude <span className="text-gray-400 font-normal">(for delivery fee)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 14.5995"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Longitude <span className="text-gray-400 font-normal">(for delivery fee)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. 120.9842"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Branding</h2>
          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Logo</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-gray-200" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-50 border border-dashed border-gray-200">
                    <Store className="h-6 w-6 text-gray-300" />
                  </div>
                )}
                <label className="cursor-pointer rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFileChange(e, setLogo, setLogoPreview)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Banner */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Banner</label>
              {bannerPreview ? (
                <div className="relative mb-3">
                  <img src={bannerPreview} alt="Banner" className="h-32 w-full rounded-xl object-cover border border-gray-200" />
                </div>
              ) : (
                <div className="mb-3 flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-400">No banner uploaded</p>
                </div>
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                Upload Banner
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileChange(e, setBanner, setBannerPreview)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Store URL */}
        {store && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Your Store URL</h2>
            <p className="text-sm text-gray-500">
              Your public storefront is available at:{' '}
              <a href={`/store/${store.slug}`} className="font-medium text-sari-600 hover:underline">
                /store/{store.slug}
              </a>
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sari-500 to-sari-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {store ? 'Update Store' : 'Create Store'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

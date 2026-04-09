'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Phone, MapPin, Pencil } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, updateProfile } = useAuth();
  const router = useRouter();

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [saving, setSaving] = useState(false);

  const [personalForm, setPersonalForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  const [addressForm, setAddressForm] = useState({
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setPersonalForm({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || '',
      });
      setAddressForm({
        label: (user.default_address as Record<string, string> & typeof user.default_address)?.label || 'Home',
        line1: user.default_address?.line1 || '',
        line2: user.default_address?.line2 || '',
        city: user.default_address?.city || '',
        state: user.default_address?.state || '',
        postal_code: user.default_address?.postal_code || '',
      });
    }
  }, [user]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white flex items-center justify-center">
          <p className="text-gray-500 text-lg">Loading...</p>
        </main>
      </>
    );
  }

  if (!user) return null;

  const roleName = user.roles?.[0]?.name || 'user';
  const roleLabel =
    roleName === 'admin'
      ? 'Administrator'
      : roleName === 'business'
        ? 'Business Owner'
        : 'Customer';

  const handleSavePersonal = async () => {
    setSaving(true);
    try {
      await updateProfile({
        first_name: personalForm.first_name,
        last_name: personalForm.last_name,
        phone: personalForm.phone,
      });
      setEditingPersonal(false);
    } catch {
      // error handled silently
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    setSaving(true);
    try {
      await updateProfile({
        default_address: {
          label: addressForm.label,
          line1: addressForm.line1,
          line2: addressForm.line2 || undefined,
          city: addressForm.city,
          state: addressForm.state,
          postal_code: addressForm.postal_code,
        },
      });
      setEditingAddress(false);
    } catch {
      // error handled silently
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200';

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Page Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-sari-50 via-white to-sari-50 border-b border-gray-100">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle, #92400E 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              My Profile
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Manage your personal information and saved addresses.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Left Column — Profile Card */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-sari-50 flex items-center justify-center mb-4">
                  <User className="w-10 h-10 text-sari-500" strokeWidth={1.5} />
                </div>
                <h2 className="font-display text-xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                <span className="mt-3 bg-sari-50 text-sari-700 rounded-full px-3 py-1 text-xs font-medium">
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Right Column — Info Cards */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information Card */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-lg font-semibold text-gray-900">
                    Personal Information
                  </h3>
                  {!editingPersonal && (
                    <button
                      onClick={() => setEditingPersonal(true)}
                      className="flex items-center gap-1.5 text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                </div>

                {editingPersonal ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={personalForm.first_name}
                          onChange={(e) =>
                            setPersonalForm((prev) => ({ ...prev, first_name: e.target.value }))
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={personalForm.last_name}
                          onChange={(e) =>
                            setPersonalForm((prev) => ({ ...prev, last_name: e.target.value }))
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9+]*"
                        value={personalForm.phone}
                        onChange={(e) => {
                          const numericOnly = e.target.value.replace(/[^0-9+]/g, '');
                          setPersonalForm((prev) => ({ ...prev, phone: numericOnly }));
                        }}
                        placeholder="09123456789"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleSavePersonal}
                        disabled={saving}
                        className="bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200 text-sm disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPersonal(false);
                          setPersonalForm({
                            first_name: user.first_name,
                            last_name: user.last_name,
                            phone: user.phone || '',
                          });
                        }}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors px-4 py-2.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sari-50 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-sari-500" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="text-sm text-gray-900">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sari-50 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-sari-500" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="text-sm text-gray-900">
                          {user.phone || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Saved Addresses Card */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-lg font-semibold text-gray-900">
                    Saved Addresses
                  </h3>
                  {!editingAddress && user.default_address && (
                    <button
                      onClick={() => setEditingAddress(true)}
                      className="flex items-center gap-1.5 text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                </div>

                {editingAddress ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Label
                      </label>
                      <input
                        type="text"
                        value={addressForm.label}
                        onChange={(e) =>
                          setAddressForm((prev) => ({ ...prev, label: e.target.value }))
                        }
                        placeholder="Home, Office, etc."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        value={addressForm.line1}
                        onChange={(e) =>
                          setAddressForm((prev) => ({ ...prev, line1: e.target.value }))
                        }
                        placeholder="House/Unit No., Street, Barangay"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Address Line 2{' '}
                        <span className="text-gray-300 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={addressForm.line2}
                        onChange={(e) =>
                          setAddressForm((prev) => ({ ...prev, line2: e.target.value }))
                        }
                        placeholder="Building, Floor, Landmark"
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          City
                        </label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) =>
                            setAddressForm((prev) => ({ ...prev, city: e.target.value }))
                          }
                          placeholder="Quezon City"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          State / Province
                        </label>
                        <input
                          type="text"
                          value={addressForm.state}
                          onChange={(e) =>
                            setAddressForm((prev) => ({ ...prev, state: e.target.value }))
                          }
                          placeholder="Metro Manila"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={addressForm.postal_code}
                          onChange={(e) =>
                            setAddressForm((prev) => ({ ...prev, postal_code: e.target.value }))
                          }
                          placeholder="1100"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleSaveAddress}
                        disabled={saving}
                        className="bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200 text-sm disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingAddress(false);
                          setAddressForm({
                            label: (user.default_address as Record<string, string> & typeof user.default_address)?.label || 'Home',
                            line1: user.default_address?.line1 || '',
                            line2: user.default_address?.line2 || '',
                            city: user.default_address?.city || '',
                            state: user.default_address?.state || '',
                            postal_code: user.default_address?.postal_code || '',
                          });
                        }}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors px-4 py-2.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : user.default_address ? (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sari-50 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-sari-500" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {(user.default_address as Record<string, string> & typeof user.default_address)?.label || 'Default Address'}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {user.default_address.line1}
                        {user.default_address.line2 && `, ${user.default_address.line2}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {user.default_address.city}, {user.default_address.state}{' '}
                        {user.default_address.postal_code}
                      </p>
                      {user.default_address.country && (
                        <p className="text-sm text-gray-600">{user.default_address.country}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                      <MapPin className="w-5 h-5 text-gray-300" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-gray-400 mb-4">No address saved</p>
                    <button
                      onClick={() => setEditingAddress(true)}
                      className="bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200 text-sm"
                    >
                      Add Address
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

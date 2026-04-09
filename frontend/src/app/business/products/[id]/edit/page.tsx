'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Loader2,
  GripVertical,
  Tag,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface OptionCategory {
  id: string;
  name: string;
  values: string[];
}

interface ImagePreview {
  file?: File;
  url: string;
  id?: number;
  isExisting?: boolean;
}

interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
}

interface ProductVariant {
  id: number;
  name: string;
  options: Record<string, string>;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');

  // Pricing & stock
  const [basePrice, setBasePrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [sku, setSku] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [status, setStatus] = useState('active');

  // Images
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Option categories
  const [optionCategories, setOptionCategories] = useState<OptionCategory[]>([]);
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});

  // Fetch product and categories in parallel
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, catRes] = await Promise.all([
          api.get(`/api/business/products/${productId}`),
          api.get('/api/categories'),
        ]);

        const p = productRes.data.data ?? productRes.data;
        setCategories(catRes.data.data ?? catRes.data ?? []);

        // Populate fields
        setName(p.name ?? '');
        setDescription(p.description ?? '');
        setShortDescription(p.short_description ?? '');
        setCategoryId(String(p.category?.id ?? ''));
        setBrand(p.brand ?? '');
        setBasePrice(String(p.base_price ?? ''));
        setCompareAtPrice(p.compare_at_price ? String(p.compare_at_price) : '');
        setSku(p.sku ?? '');
        setStockQuantity(String(p.stock_quantity ?? ''));
        setStatus(p.status ?? 'active');

        // Populate existing images
        if (p.images && Array.isArray(p.images)) {
          setImages(
            p.images.map((img: ProductImage) => ({
              id: img.id,
              url: img.url,
              isExisting: true,
            })),
          );
        }

        // Reconstruct option categories from variants
        if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
          const optMap = new Map<string, Set<string>>();
          for (const variant of p.variants as ProductVariant[]) {
            if (variant.options && typeof variant.options === 'object') {
              for (const [key, value] of Object.entries(variant.options)) {
                if (!optMap.has(key)) optMap.set(key, new Set());
                optMap.get(key)!.add(value);
              }
            }
          }
          const cats: OptionCategory[] = [];
          const inputs: Record<string, string> = {};
          for (const [key, values] of optMap.entries()) {
            const id = crypto.randomUUID();
            cats.push({ id, name: key.charAt(0).toUpperCase() + key.slice(1), values: Array.from(values) });
            inputs[id] = '';
          }
          setOptionCategories(cats);
          setNewValueInputs(inputs);
        }
      } catch {
        setError('Failed to load product. Please go back and try again.');
      } finally {
        setLoadingProduct(false);
      }
    };

    fetchData();
  }, [productId]);

  // Image handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: ImagePreview[] = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const img = prev[index];
      if (img.isExisting && img.id) {
        setDeleteImageIds((ids) => [...ids, img.id!]);
      } else if (img.file) {
        URL.revokeObjectURL(img.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Option category handlers
  const addOptionCategory = () => {
    const id = crypto.randomUUID();
    setOptionCategories((prev) => [...prev, { id, name: '', values: [] }]);
    setNewValueInputs((prev) => ({ ...prev, [id]: '' }));
  };

  const removeOptionCategory = (id: string) => {
    setOptionCategories((prev) => prev.filter((c) => c.id !== id));
    setNewValueInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateOptionCategoryName = (id: string, newName: string) => {
    setOptionCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c)),
    );
  };

  const addValueToCategory = (id: string) => {
    const value = (newValueInputs[id] || '').trim();
    if (!value) return;
    setOptionCategories((prev) =>
      prev.map((c) =>
        c.id === id && !c.values.includes(value)
          ? { ...c, values: [...c.values, value] }
          : c,
      ),
    );
    setNewValueInputs((prev) => ({ ...prev, [id]: '' }));
  };

  const removeValueFromCategory = (categoryId: string, value: string) => {
    setOptionCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, values: c.values.filter((v) => v !== value) }
          : c,
      ),
    );
  };

  const handleValueKeyDown = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValueToCategory(categoryId);
    }
  };

  const variantCount = optionCategories
    .filter((c) => c.name && c.values.length > 0)
    .reduce((acc, c) => acc * c.values.length, optionCategories.some((c) => c.values.length > 0) ? 1 : 0);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('short_description', shortDescription);
    formData.append('category_id', categoryId);
    formData.append('brand', brand);
    formData.append('base_price', basePrice);
    if (compareAtPrice) formData.append('compare_at_price', compareAtPrice);
    formData.append('sku', sku);
    formData.append('stock_quantity', stockQuantity);
    formData.append('status', status);

    // New images only
    const newImages = images.filter((img) => !img.isExisting && img.file);
    newImages.forEach((img) => {
      formData.append('images[]', img.file!);
    });

    // Images to delete
    deleteImageIds.forEach((id) => {
      formData.append('delete_images[]', String(id));
    });

    // Option categories
    const validOptions = optionCategories.filter((c) => c.name && c.values.length > 0);
    validOptions.forEach((cat, i) => {
      formData.append(`option_categories[${i}][name]`, cat.name);
      cat.values.forEach((val, j) => {
        formData.append(`option_categories[${i}][values][${j}]`, val);
      });
    });

    // Laravel doesn't support PUT with multipart/form-data natively,
    // so we use POST with _method override.
    formData.append('_method', 'PUT');

    try {
      await api.post(`/api/business/products/${productId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.push('/business/products');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update product.';
      const errors = err.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors).flat()[0];
        setError(String(firstError));
      } else {
        setError(msg);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-sari-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/business/products"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl tracking-tight text-gray-900">Edit Product</h1>
          <p className="mt-0.5 text-sm text-gray-500">Update your product details.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={255}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={10000}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Short Description</label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  maxLength={500}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    maxLength={255}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Product Images</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {images.map((img, i) => (
                <div key={img.id ?? `new-${i}`} className="group relative aspect-square">
                  <img
                    src={img.url}
                    alt={`Product ${i + 1}`}
                    className={cn(
                      'h-full w-full rounded-xl object-cover border-2 transition-colors',
                      i === 0 ? 'border-sari-400' : 'border-gray-100',
                    )}
                  />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded-md bg-sari-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      PRIMARY
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-sari-300 hover:text-sari-500 hover:bg-sari-50/50"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Add Image</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <p className="mt-3 text-xs text-gray-400">
              Upload up to 10 images. First image will be the primary image. JPG, PNG, or WebP (max 5MB each).
            </p>
          </div>

          {/* Option Categories */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Option Categories</h2>
                <p className="mt-0.5 text-xs text-gray-400">Modify options to regenerate variants on save.</p>
              </div>
              <button
                type="button"
                onClick={addOptionCategory}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Option
              </button>
            </div>

            {optionCategories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-8 text-center">
                <Tag className="mx-auto h-6 w-6 text-gray-300" />
                <p className="mt-2 text-sm text-gray-400">No options added.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {optionCategories.map((cat) => (
                  <div key={cat.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-gray-300" />
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => updateOptionCategoryName(cat.id, e.target.value)}
                        placeholder="Option name (e.g., Size, Color)"
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeOptionCategory(cat.id)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="ml-7">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {cat.values.map((val) => (
                          <span
                            key={val}
                            className="inline-flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700"
                          >
                            {val}
                            <button
                              type="button"
                              onClick={() => removeValueFromCategory(cat.id, val)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newValueInputs[cat.id] || ''}
                          onChange={(e) =>
                            setNewValueInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                          }
                          onKeyDown={(e) => handleValueKeyDown(e, cat.id)}
                          placeholder="Type a value and press Enter"
                          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100"
                        />
                        <button
                          type="button"
                          onClick={() => addValueToCategory(cat.id)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {variantCount > 0 && (
                  <div className="rounded-xl border border-sari-200 bg-sari-50/50 px-4 py-3">
                    <p className="text-xs font-medium text-sari-700">
                      This will generate <span className="font-bold">{variantCount}</span> variant{variantCount !== 1 ? 's' : ''} from your option combinations.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Status</h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Pricing & Stock */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Pricing & Stock</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Base Price (PHP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Compare-at Price</label>
                <input
                  type="number"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  required
                  min="0"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sari-500 to-sari-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Loader2, Trash2, LogIn } from 'lucide-react';
import StarRating from './StarRating';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface UserReview {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface ReviewFormProps {
  productId: number;
  canReview: boolean;
  userReview: UserReview | null;
  isLoggedIn: boolean;
  onReviewSubmitted: () => void;
}

export default function ReviewForm({
  productId,
  canReview,
  userReview,
  isLoggedIn,
  onReviewSubmitted,
}: ReviewFormProps) {
  const { addToast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      addToast({ type: 'error', title: 'Please select a rating' });
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/api/products/${productId}/reviews`, {
        rating,
        comment: comment.trim() || null,
      });
      addToast({ type: 'success', title: 'Review submitted!' });
      setRating(0);
      setComment('');
      onReviewSubmitted();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit review.';
      addToast({ type: 'error', title: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/products/${productId}/reviews`);
      addToast({ type: 'info', title: 'Review deleted' });
      onReviewSubmitted();
    } catch {
      addToast({ type: 'error', title: 'Failed to delete review.' });
    } finally {
      setDeleting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm text-gray-500">
        <LogIn className="w-4 h-4 text-gray-400 shrink-0" />
        <span>Sign in to leave a review.</span>
      </div>
    );
  }

  if (userReview) {
    return (
      <div className="rounded-xl bg-sari-50/50 border border-sari-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium text-gray-900">Your Review</p>
            <StarRating rating={userReview.rating} size="sm" />
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-white hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            Delete
          </button>
        </div>
        {userReview.comment && (
          <p className="text-sm text-gray-600 mt-2">{userReview.comment}</p>
        )}
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-4 text-sm text-gray-500">
        Purchase and receive this product to leave a review.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-900 mb-3">Write a Review</p>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1.5">Your rating</p>
        <StarRating rating={rating} size="lg" interactive onChange={setRating} />
      </div>

      <div className="mb-4">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Share your thoughts (optional)"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Review'
        )}
      </button>
    </form>
  );
}

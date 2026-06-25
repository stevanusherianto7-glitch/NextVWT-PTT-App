import React, { useState } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { toast } from 'sonner';

export const FeedbackModal: React.FC = () => {
  const { showFeedbackModal, setShowFeedbackModal, setLastFeedbackTime } = usePTTStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showFeedbackModal) return null;

  const handleClose = () => {
    setShowFeedbackModal(false);
    // Kita set lastFeedbackTime agar tidak muncul lagi hari ini meskipun di-skip
    setLastFeedbackTime(Date.now());
  };

  const handleSubmit = async (isPositive: boolean) => {
    setIsSubmitting(true);
    try {
      // TODO: Kirim data analitik ke PostHog atau Supabase di sini
      // eslint-disable-next-line no-console
      console.log('Feedback submitted:', isPositive ? 'Thumbs Up' : 'Thumbs Down');

      // Simulasi delay jaringan
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast.success(
        isPositive
          ? 'Terima kasih! Senang Anda menyukainya.'
          : 'Terima kasih atas masukannya. Kami akan terus memperbaiki kualitas audio.'
      );

      setLastFeedbackTime(Date.now());
      setShowFeedbackModal(false);
    } catch (error) {
      console.error('Gagal mengirim feedback:', error);
      toast.error('Gagal mengirim penilaian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 font-sans">
      <div className="max-w-xs w-full bg-[#1e2026] border border-white/10 rounded-3xl p-6 shadow-2xl relative text-center">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🎧</span>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Kualitas Audio</h2>
        <p className="text-sm text-gray-400 mb-6">
          Bagaimana kualitas komunikasi Anda barusan? Penilaian Anda membantu kami menjadi lebih
          baik.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="flex-1 flex flex-col items-center justify-center gap-2 py-4 bg-[#2a2d36] hover:bg-[#343844] rounded-2xl border border-white/5 transition-all active:scale-95 group disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
              <ThumbsUp className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-xs font-semibold text-gray-300">Bagus</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex-1 flex flex-col items-center justify-center gap-2 py-4 bg-[#2a2d36] hover:bg-[#343844] rounded-2xl border border-white/5 transition-all active:scale-95 group disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
              <ThumbsDown className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-xs font-semibold text-gray-300">Buruk</span>
          </button>
        </div>
      </div>
    </div>
  );
};

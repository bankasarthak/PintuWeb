'use client'

import { useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, Download } from 'lucide-react'
import { useJobStatus } from '@/hooks/useGenerate'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface JobProgressProps {
  jobId: string | null
  onClose: () => void
  onComplete?: (outputPath: string) => void
}

export function JobProgress({ jobId, onClose, onComplete }: JobProgressProps) {
  const { data: job } = useJobStatus(jobId)

  useEffect(() => {
    if (job?.status === 'completed' && job.output_path && onComplete) {
      onComplete(job.output_path)
    }
  }, [job?.status, job?.output_path, onComplete])

  const statusMessages: Record<string, string> = {
    queued: 'Your request is in queue...',
    processing: 'AI is generating your content...',
    completed: 'Generation complete!',
    failed: 'Generation failed. Please try again.',
  }

  return (
    <Modal
      open={Boolean(jobId)}
      onClose={job?.status === 'completed' || job?.status === 'failed' ? onClose : () => {}}
      size="sm"
      className="text-center"
    >
      <div className="py-4">
        {(!job || job.status === 'queued' || job.status === 'processing') && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-[#1e1e2e]" />
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin" />
              <div className="absolute inset-3 rounded-full bg-purple-600/20 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Generating...</h3>
              <p className="text-sm text-[#94a3b8] mt-1">
                {statusMessages[job?.status ?? 'queued']}
              </p>
              {job?.status === 'processing' && (
                <p className="text-xs text-[#4a4a6a] mt-2">This usually takes 15-30 seconds</p>
              )}
            </div>
          </div>
        )}

        {job?.status === 'completed' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Done!</h3>
              <p className="text-sm text-[#94a3b8] mt-1">Your content has been generated</p>
            </div>
            {job.output_path && (
              <div className="flex gap-3 w-full">
                <a
                  href={job.output_path}
                  download
                  className="flex-1"
                  aria-label="Download generated content"
                >
                  <Button variant="outline" size="sm" className="w-full" leftIcon={<Download className="h-3.5 w-3.5" />}>
                    Download
                  </Button>
                </a>
                <Button size="sm" className="flex-1" onClick={onClose}>
                  View in Gallery
                </Button>
              </div>
            )}
          </div>
        )}

        {job?.status === 'failed' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-red-900/30 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Generation failed</h3>
              <p className="text-sm text-[#94a3b8] mt-1">Something went wrong. Your credits were not charged.</p>
            </div>
            <Button variant="outline" onClick={onClose} className="w-full">
              Try again
            </Button>
          </div>
        )}

        {/* Credit info */}
        {job && (
          <p className={cn('text-xs mt-4', job.status === 'completed' ? 'text-[#94a3b8]' : 'text-[#4a4a6a]')}>
            {job.credits_charged > 0 ? `${job.credits_charged} credits used` : 'No credits charged'}
          </p>
        )}
      </div>
    </Modal>
  )
}

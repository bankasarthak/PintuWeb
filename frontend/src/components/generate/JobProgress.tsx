'use client'

import { useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, Download } from 'lucide-react'
import { useJobStatus } from '@/hooks/useGenerate'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface JobProgressProps {
  jobId: string | null
  onClose: () => void
  onComplete?: (outputUrl: string) => void
}

export function JobProgress({ jobId, onClose, onComplete }: JobProgressProps) {
  const { data: job } = useJobStatus(jobId)
  const isActive = job?.status === 'queued' || job?.status === 'claimed' || job?.status === 'processing'
  const done = job?.status === 'completed' || job?.status === 'failed'

  useEffect(() => {
    if (job?.status === 'completed' && job.output_url && onComplete) {
      onComplete(job.output_url)
    }
  }, [job?.status, job?.output_url, onComplete])

  return (
    <Modal open={Boolean(jobId)} onClose={done ? onClose : () => {}} size="sm" className="text-center">
      <div className="py-4">
        {(!job || isActive) && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-white/[0.06]" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#c9a96e] animate-spin" />
              <div className="absolute inset-3 rounded-full bg-[#c9a96e]/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-[#c9a96e] animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-white">Creating…</h3>
              <p className="text-sm text-[#8b8fa8] mt-1">
                {job?.status === 'processing' ? 'AI is rendering your request' : 'Waiting in queue'}
              </p>
            </div>
          </div>
        )}

        {job?.status === 'completed' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-900/25 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-white">Complete</h3>
              <p className="text-sm text-[#8b8fa8] mt-1">Your creation is ready</p>
            </div>
            <div className="flex gap-3 w-full">
              {job.output_url && (
                <a href={job.output_url} download target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full" leftIcon={<Download className="h-3.5 w-3.5" />}>
                    Download
                  </Button>
                </a>
              )}
              <Link href="/gallery" className="flex-1">
                <Button size="sm" className="w-full" onClick={onClose}>
                  Gallery
                </Button>
              </Link>
            </div>
          </div>
        )}

        {job?.status === 'failed' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-red-900/25 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-white">Something went wrong</h3>
              <p className="text-sm text-[#8b8fa8] mt-1">{job.error_message || 'Please try again.'}</p>
            </div>
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

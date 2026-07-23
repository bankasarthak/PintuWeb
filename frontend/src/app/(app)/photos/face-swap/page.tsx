'use client'

import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { SourcePhotoUpload } from '@/components/generate/SourcePhotoUpload'
import { Button } from '@/components/ui/button'
import { useToast } from '@/stores/ui'
import { CREDIT_COSTS } from '@/lib/catalogs'

export default function PhotoFaceSwapPage() {
  const [source, setSource] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null })
  const [target, setTarget] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null })
  const { toast } = useToast()

  return (
    <PageShell title="Face Swap" subtitle="Swap a face into any scene photo" backHref="/photos">
      <div className="grid sm:grid-cols-2 gap-8">
        <SourcePhotoUpload
          label="Source face"
          hint="The face you want to use."
          file={source.file}
          preview={source.preview}
          onChange={(file, preview) => setSource({ file, preview })}
        />
        <SourcePhotoUpload
          label="Target image"
          hint="The photo to swap into."
          file={target.file}
          preview={target.preview}
          onChange={(file, preview) => setTarget({ file, preview })}
        />
      </div>
      <p className="text-xs text-[#8b8fa8] mt-6">{CREDIT_COSTS.faceSwap} credits per swap</p>
      <Button
        className="w-full mt-4"
        size="lg"
        disabled={!source.file || !target.file}
        leftIcon={<UserCheck className="h-4 w-4" />}
        onClick={() => toast({ type: 'info', title: 'Coming soon', description: 'Face swap will be enabled on web in the next backend update.' })}
      >
        Swap faces
      </Button>
    </PageShell>
  )
}

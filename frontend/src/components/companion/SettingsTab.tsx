'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Trash2 } from 'lucide-react'
import { useUpdateCharacter, useDeleteCharacter } from '@/hooks/useCharacters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { Character } from '@/types'

const bodyTypes = ['petite', 'athletic', 'curvy', 'plus-size', 'tall']
const skinTones = ['fair', 'light', 'medium', 'tan', 'dark']
const breastSizes = ['flat', 'small', 'medium', 'large', 'busty']
const personalities = [
  { id: 'dominant', label: 'Dominant', emoji: '👑' },
  { id: 'submissive', label: 'Submissive', emoji: '🌸' },
  { id: 'caring', label: 'Caring', emoji: '💝' },
  { id: 'playful', label: 'Playful', emoji: '🎮' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🌙' },
  { id: 'romantic', label: 'Romantic', emoji: '🌹' },
  { id: 'intellectual', label: 'Intellectual', emoji: '📚' },
]

const skinColorMap: Record<string, string> = {
  fair: '#f5deb3',
  light: '#e8c9a0',
  medium: '#c68642',
  tan: '#a0522d',
  dark: '#4a2c1a',
}

export function SettingsTab({ character }: { character: Character }) {
  const router = useRouter()
  const [name, setName] = useState(character.name ?? '')
  const [age, setAge] = useState(character.age)
  const [bodyType, setBodyType] = useState(character.body_type)
  const [skinTone, setSkinTone] = useState(character.skin_tone)
  const [breastSize, setBreastSize] = useState(character.breast_size)
  const [personality, setPersonality] = useState(character.personality_type)
  const [faceImage, setFaceImage] = useState<File | null>(null)
  const [facePreview, setFacePreview] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { mutate: updateCharacter, isPending: updating } = useUpdateCharacter()
  const { mutate: deleteCharacter, isPending: deleting } = useDeleteCharacter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setFaceImage(file)
    const reader = new FileReader()
    reader.onload = () => setFacePreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  })

  const handleSave = () => {
    updateCharacter({
      id: character.id,
      payload: {
        name: name || undefined,
        age,
        body_type: bodyType,
        skin_tone: skinTone,
        breast_size: breastSize,
        personality_type: personality,
      },
      faceImage: faceImage ?? undefined,
    })
  }

  const handleDelete = () => {
    deleteCharacter(character.id, {
      onSuccess: () => {
        router.push('/companions')
      },
    })
  }

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-white">Companion Settings</h2>

      {/* Name */}
      <Input
        label="Name"
        placeholder="Luna, Aria, Sakura..."
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Age Slider */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">
          Age: <span className="text-white font-semibold">{age}</span>
        </label>
        <input
          type="range"
          min={18}
          max={60}
          value={age}
          onChange={(e) => setAge(Number(e.target.value))}
          className="w-full accent-purple-500 cursor-pointer"
          aria-label="Age slider"
        />
        <div className="flex justify-between text-xs text-[#94a3b8] mt-1">
          <span>18</span><span>60</span>
        </div>
      </div>

      {/* Body Type */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">Body Type</label>
        <div className="flex flex-wrap gap-2">
          {bodyTypes.map((type) => (
            <button key={type} type="button" onClick={() => setBodyType(type)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all border',
                bodyType === type ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'border-[#1e1e2e] text-[#94a3b8] hover:border-[#2e2e4e] hover:text-white'
              )}
              aria-pressed={bodyType === type}
            >{type}</button>
          ))}
        </div>
      </div>

      {/* Skin Tone */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">Skin Tone</label>
        <div className="flex gap-3 flex-wrap">
          {skinTones.map((tone) => (
            <button key={tone} type="button" onClick={() => setSkinTone(tone)}
              className={cn('h-9 w-9 rounded-full border-2 transition-all', skinTone === tone ? 'border-purple-500 scale-110' : 'border-transparent hover:border-[#2e2e4e]')}
              style={{ backgroundColor: skinColorMap[tone] }}
              aria-label={`${tone} skin tone`}
              aria-pressed={skinTone === tone}
              title={tone}
            />
          ))}
        </div>
      </div>

      {/* Breast Size */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">Breast Size</label>
        <div className="flex flex-wrap gap-2">
          {breastSizes.map((size) => (
            <button key={size} type="button" onClick={() => setBreastSize(size)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all border',
                breastSize === size ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'border-[#1e1e2e] text-[#94a3b8] hover:border-[#2e2e4e] hover:text-white'
              )}
              aria-pressed={breastSize === size}
            >{size}</button>
          ))}
        </div>
      </div>

      {/* Personality */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">Personality</label>
        <div className="grid grid-cols-2 gap-2">
          {personalities.map(({ id, label, emoji }) => (
            <button key={id} type="button" onClick={() => setPersonality(id)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border text-left transition-all',
                personality === id ? 'bg-purple-600/20 border-purple-500' : 'border-[#1e1e2e] bg-[#0a0a0f] hover:border-[#2e2e4e]'
              )}
              aria-pressed={personality === id}
            >
              <span className="text-lg">{emoji}</span>
              <p className={cn('text-sm font-medium', personality === id ? 'text-purple-200' : 'text-white')}>{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Face Photo */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">Face Photo</label>
        {facePreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={facePreview} alt="Face preview" className="h-24 w-24 rounded-xl object-cover border border-[#1e1e2e]" />
            <button type="button" onClick={() => { setFaceImage(null); setFacePreview(null) }}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700"
              aria-label="Remove face photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div {...getRootProps()} className={cn(
            'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all',
            isDragActive ? 'border-purple-500 bg-purple-600/10' : 'border-[#1e1e2e] hover:border-purple-500/50'
          )}>
            <input {...getInputProps()} aria-label="Upload face photo" />
            <Upload className="h-8 w-8 text-[#94a3b8]" />
            <p className="text-sm text-[#94a3b8] text-center">
              {isDragActive ? 'Drop here' : 'Upload new face photo'}
            </p>
            <p className="text-xs text-[#4a4a6a]">JPG, PNG, WebP up to 5MB</p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <Button size="lg" loading={updating} onClick={handleSave} className="w-full" aria-label="Save companion settings">
        Save Changes
      </Button>

      {/* Danger Zone */}
      <div className="border border-red-900/50 rounded-xl p-5 bg-red-900/5">
        <h3 className="text-base font-semibold text-red-400 mb-1">Danger Zone</h3>
        <p className="text-sm text-[#94a3b8] mb-4">
          Permanently delete this companion and all associated media. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={() => setDeleteOpen(true)}
          aria-label="Delete companion permanently"
        >
          Delete Companion
        </Button>
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete companion?"
        description={`Are you sure you want to delete ${character.name || 'this companion'}? All photos, videos, and chat history will be permanently deleted.`}
        confirmLabel="Delete permanently"
        destructive
        loading={deleting}
      />
    </div>
  )
}

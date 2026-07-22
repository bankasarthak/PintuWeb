'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { CreateCharacterPayload } from '@/types'

// These values must exactly match backend ALLOWED_* sets in app/schemas/character.py
const bodyTypes = [
  { id: 'skinny', label: 'Skinny' },
  { id: 'slim', label: 'Slim' },
  { id: 'normal', label: 'Normal' },
  { id: 'fat', label: 'Curvy' },
  { id: 'very_fat', label: 'Plus Size' },
]
const skinTones = ['fair', 'light', 'medium', 'tan', 'dark']
const breastSizes = [
  { id: 'flat', label: 'Flat' },
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
  { id: 'huge', label: 'Huge' },
]
const personalities = [
  { id: 'dominant', label: 'Dominant', desc: 'Confident and in control', emoji: '👑' },
  { id: 'submissive', label: 'Submissive', desc: 'Gentle and obedient', emoji: '🌸' },
  { id: 'sweet', label: 'Sweet', desc: 'Nurturing and caring', emoji: '💝' },
  { id: 'wild', label: 'Wild', desc: 'Spontaneous and daring', emoji: '🔥' },
  { id: 'nerdy', label: 'Nerdy', desc: 'Smart and geeky', emoji: '📚' },
  { id: 'professional', label: 'Professional', desc: 'Polished and sharp', emoji: '💼' },
  { id: 'maternal', label: 'Maternal', desc: 'Warm and nurturing', emoji: '🤍' },
]

interface CreateCompanionFormProps {
  onSuccess: () => void
  onCreate: (payload: CreateCharacterPayload, faceImage?: File) => void
  loading: boolean
  initialValues?: Partial<CreateCharacterPayload>
}

export function CreateCompanionForm({ onSuccess, onCreate, loading, initialValues }: CreateCompanionFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [age, setAge] = useState(initialValues?.age ?? 21)
  const [bodyType, setBodyType] = useState(initialValues?.body_type ?? 'normal')
  const [skinTone, setSkinTone] = useState(initialValues?.skin_tone ?? 'medium')
  const [breastSize, setBreastSize] = useState(initialValues?.breast_size ?? 'medium')
  const [personality, setPersonality] = useState(initialValues?.personality_type ?? 'sweet')
  const [faceImage, setFaceImage] = useState<File | null>(null)
  const [facePreview, setFacePreview] = useState<string | null>(null)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(
      {
        name: name || undefined,
        age,
        body_type: bodyType,
        skin_tone: skinTone,
        breast_size: breastSize,
        personality_type: personality,
      },
      faceImage ?? undefined
    )
    // onSuccess is called by the parent after the mutation succeeds (useCreateCharacter onSuccess)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2 max-h-[70vh] overflow-y-auto pr-1">
      {/* Name */}
      <Input
        label="Name (optional)"
        placeholder="Luna, Aria, Sakura..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        leftIcon={<User className="h-4 w-4" />}
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
          <span>18</span>
          <span>60</span>
        </div>
      </div>

      {/* Body Type */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">Body Type</label>
        <div className="flex flex-wrap gap-2">
          {bodyTypes.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setBodyType(id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all border',
                bodyType === id
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'border-[#1e1e2e] text-[#94a3b8] hover:border-[#2e2e4e] hover:text-white'
              )}
              aria-pressed={bodyType === id}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Skin Tone */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">Skin Tone</label>
        <div className="flex gap-3 flex-wrap">
          {skinTones.map((tone) => {
            const colorMap: Record<string, string> = {
              fair: '#f5deb3',
              light: '#e8c9a0',
              medium: '#c68642',
              tan: '#a0522d',
              dark: '#4a2c1a',
            }
            return (
              <button
                key={tone}
                type="button"
                onClick={() => setSkinTone(tone)}
                className={cn(
                  'relative h-9 w-9 rounded-full border-2 transition-all',
                  skinTone === tone
                    ? 'border-purple-500 scale-110 shadow-lg shadow-purple-900/30'
                    : 'border-transparent hover:border-[#2e2e4e]'
                )}
                style={{ backgroundColor: colorMap[tone] }}
                aria-label={`${tone} skin tone`}
                aria-pressed={skinTone === tone}
                title={tone}
              />
            )
          })}
        </div>
      </div>

      {/* Breast Size */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">Breast Size</label>
        <div className="flex flex-wrap gap-2">
          {breastSizes.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setBreastSize(id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all border',
                breastSize === id
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'border-[#1e1e2e] text-[#94a3b8] hover:border-[#2e2e4e] hover:text-white'
              )}
              aria-pressed={breastSize === id}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Personality */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">Personality</label>
        <div className="grid grid-cols-2 gap-2">
          {personalities.map(({ id, label, desc, emoji }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPersonality(id)}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all',
                personality === id
                  ? 'bg-purple-600/20 border-purple-500'
                  : 'border-[#1e1e2e] bg-[#0a0a0f] hover:border-[#2e2e4e]'
              )}
              aria-pressed={personality === id}
            >
              <span className="text-lg">{emoji}</span>
              <div>
                <p className={cn('text-sm font-medium', personality === id ? 'text-purple-200' : 'text-white')}>
                  {label}
                </p>
                <p className="text-xs text-[#94a3b8]">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Face Image Upload */}
      <div>
        <label className="text-sm font-medium text-[#94a3b8] block mb-2">
          Face Photo <span className="text-xs text-[#4a4a6a]">(optional)</span>
        </label>
        {facePreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={facePreview}
              alt="Face preview"
              className="h-24 w-24 rounded-xl object-cover border border-[#1e1e2e]"
            />
            <button
              type="button"
              onClick={() => { setFaceImage(null); setFacePreview(null) }}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors"
              aria-label="Remove face photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all',
              isDragActive
                ? 'border-purple-500 bg-purple-600/10'
                : 'border-[#1e1e2e] hover:border-purple-500/50 hover:bg-[#13131a]'
            )}
          >
            <input {...getInputProps()} aria-label="Upload face photo" />
            <Upload className="h-8 w-8 text-[#94a3b8]" />
            <p className="text-sm text-[#94a3b8] text-center">
              {isDragActive ? 'Drop photo here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-[#4a4a6a]">JPG, PNG, WebP up to 5MB</p>
          </div>
        )}
      </div>

      <Button
        type="submit"
        loading={loading}
        size="lg"
        className="w-full sticky bottom-0"
        aria-label="Create companion"
      >
        Create Companion
      </Button>
    </form>
  )
}

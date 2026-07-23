import type { CatalogOption, StoryDetail, StorySummary } from '@/types'

// ── I2I still scene wizard (mirrors bot still_catalog) ─────────────────────

export const STILL_SETTINGS: CatalogOption[] = [
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'dungeon', label: 'Dungeon' },
  { id: 'shower', label: 'Shower' },
  { id: 'public', label: 'Public' },
  { id: 'office', label: 'Office' },
  { id: 'outdoor', label: 'Park' },
]

export const STILL_FRAMINGS: CatalogOption[] = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'three_quarter', label: 'Three-quarter' },
  { id: 'full_body', label: 'Full body' },
]

export const STILL_OUTFITS: CatalogOption[] = [
  { id: 'nude', label: 'Nude' },
  { id: 'lingerie', label: 'Lingerie' },
  { id: 'bikini', label: 'Bikini' },
  { id: 'latex', label: 'Latex' },
  { id: 'chains', label: 'Chains' },
]

export const STILL_ACTIONS: CatalogOption[] = [
  { id: 'leashed', label: 'On a leash' },
  { id: 'shibari', label: 'Shibari ropes' },
  { id: 'undressing', label: 'Undressing' },
  { id: 'doggy_front', label: 'Doggy (face view)' },
  { id: 'downblouse', label: 'Downblouse' },
  { id: 'full_nelson', label: 'Full nelson' },
  { id: 'cum_facial', label: 'Facial' },
  { id: 'bodychain', label: 'Bondage gear' },
  { id: 'lash_marks', label: 'Lash marks' },
  { id: 'pillory', label: 'Pillory' },
  { id: 'tied_bed', label: 'Tied to bed' },
  { id: 'fondle', label: 'Self-touch' },
  { id: 'standing', label: 'Standing pose' },
]

export const STILL_MOODS: CatalogOption[] = [
  { id: 'none', label: 'Natural' },
  { id: 'pleading', label: 'Pleading' },
  { id: 'shocked', label: 'Shocked' },
  { id: 'crying', label: 'Tearful' },
]

export const STILL_STEPS = ['setting', 'framing', 'outfit', 'action', 'mood', 'review'] as const
export type StillStep = (typeof STILL_STEPS)[number]

export function buildStillPrompt(selection: Record<string, string>): string {
  const setting = STILL_SETTINGS.find((x) => x.id === selection.setting)?.label ?? selection.setting
  const framing = STILL_FRAMINGS.find((x) => x.id === selection.framing)?.label ?? selection.framing
  const outfit = STILL_OUTFITS.find((x) => x.id === selection.outfit)?.label ?? selection.outfit
  const action = STILL_ACTIONS.find((x) => x.id === selection.action)?.label ?? selection.action
  const mood =
    selection.mood === 'none'
      ? 'natural expression'
      : (STILL_MOODS.find((x) => x.id === selection.mood)?.label ?? selection.mood)

  return [
    `Photorealistic portrait of the same woman in a ${setting.toLowerCase()} setting.`,
    `${framing} framing.`,
    `Wearing ${outfit.toLowerCase()}.`,
    `Pose/action: ${action.toLowerCase()}.`,
    `Mood: ${mood.toLowerCase()}.`,
    'Sharp focus, cinematic lighting, 8k detail.',
  ].join(' ')
}

// ── Stories (summaries for picker; beats simplified for web generation) ────

export const STORY_SUMMARIES: StorySummary[] = [
  {
    id: 'captured_slave',
    title: 'Captured Slave',
    teaser: 'Taken, collared, and broken in — scene by scene.',
    sceneCount: 5,
  },
  {
    id: 'forced_to_watch',
    title: 'Forced to Watch',
    teaser: 'She watches helplessly as everything unfolds.',
    sceneCount: 4,
  },
  {
    id: 'alone_little_sister',
    title: 'Alone Little Sister',
    teaser: 'Home alone — and someone knows.',
    sceneCount: 5,
  },
  {
    id: 'office_secretary',
    title: 'Office Secretary',
    teaser: 'After hours in the corner office.',
    sceneCount: 5,
  },
  {
    id: 'corrupting_step_mom',
    title: 'Corrupting Step Mom',
    teaser: 'Slow corruption, one forbidden scene at a time.',
    sceneCount: 5,
  },
]

const STORY_BEATS: Record<string, StoryDetail> = {
  captured_slave: {
    ...STORY_SUMMARIES[0],
    intro: 'She wakes in chains. Each scene pushes her further.',
    beats: [
      { id: 's1', label: 'Awakening', sceneTitle: 'The Cell', prompt: 'woman waking in dim dungeon cell, chained, fearful' },
      { id: 's2', label: 'Inspection', sceneTitle: 'First Touch', prompt: 'woman standing in dungeon, collar, submissive inspection pose' },
      { id: 's3', label: 'Training', sceneTitle: 'On Her Knees', prompt: 'woman kneeling in dungeon, leash, obedient' },
      { id: 's4', label: 'Breaking', sceneTitle: 'No Resistance', prompt: 'woman in dungeon, tearful, fully surrendered' },
      { id: 's5', label: 'Marked', sceneTitle: 'Owned', prompt: 'woman in dungeon aftermath, marked, owned expression' },
    ],
  },
  forced_to_watch: {
    ...STORY_SUMMARIES[1],
    intro: 'Bound and forced to witness every moment.',
    beats: [
      { id: 's1', label: 'Tied Up', sceneTitle: 'Helpless', prompt: 'woman tied to chair, watching, distressed' },
      { id: 's2', label: 'Humiliation', sceneTitle: 'Front Row', prompt: 'woman restrained, humiliated, tears' },
      { id: 's3', label: 'Breaking Point', sceneTitle: 'Shattered', prompt: 'woman bound, emotional breakdown, cinematic' },
      { id: 's4', label: 'Aftermath', sceneTitle: 'Empty', prompt: 'woman slumped after ordeal, disheveled, exhausted' },
    ],
  },
  alone_little_sister: {
    ...STORY_SUMMARIES[2],
    intro: 'The house is quiet. Too quiet.',
    beats: [
      { id: 's1', label: 'Home Alone', sceneTitle: 'Living Room', prompt: 'young woman alone at home, casual clothes, unaware' },
      { id: 's2', label: 'Intrusion', sceneTitle: 'Cornered', prompt: 'woman startled at home, defensive, tense' },
      { id: 's3', label: 'Pinned', sceneTitle: 'No Escape', prompt: 'woman pinned on couch, struggling, dramatic lighting' },
      { id: 's4', label: 'Taken', sceneTitle: 'Surrender', prompt: 'woman on couch, overpowered, submissive' },
      { id: 's5', label: 'After', sceneTitle: 'Changed', prompt: 'woman disheveled on couch, aftermath, dazed' },
    ],
  },
  office_secretary: {
    ...STORY_SUMMARIES[3],
    intro: 'The desk, the skirt, the overtime nobody approved.',
    beats: [
      { id: 's1', label: 'Late Night', sceneTitle: 'Office', prompt: 'secretary alone in office, pencil skirt, working late' },
      { id: 's2', label: 'Cornered', sceneTitle: 'Desk', prompt: 'secretary bent over office desk, boss presence implied' },
      { id: 's3', label: 'Discipline', sceneTitle: 'Meeting Room', prompt: 'secretary in meeting room, disheveled, submissive' },
      { id: 's4', label: 'Used', sceneTitle: 'After Hours', prompt: 'secretary in office chair, exhausted, used' },
      { id: 's5', label: 'Owned', sceneTitle: 'Return', prompt: 'secretary returning to office, changed demeanor, owned' },
    ],
  },
  corrupting_step_mom: {
    ...STORY_SUMMARIES[4],
    intro: 'She said she would never. Then she did.',
    beats: [
      { id: 's1', label: 'Tension', sceneTitle: 'Kitchen', prompt: 'mature woman in kitchen, domestic, guarded expression' },
      { id: 's2', label: 'First Slip', sceneTitle: 'Hallway', prompt: 'mature woman in hallway, flushed, conflicted' },
      { id: 's3', label: 'Forbidden', sceneTitle: 'Bedroom', prompt: 'mature woman in bedroom, lingerie, guilty arousal' },
      { id: 's4', label: 'Addicted', sceneTitle: 'Waiting', prompt: 'mature woman waiting in bed, eager, corrupted' },
      { id: 's5', label: 'Devoted', sceneTitle: 'Devotion', prompt: 'mature woman devoted pose, fully corrupted, satisfied' },
    ],
  },
}

export function getStoryDetail(id: string): StoryDetail | null {
  return STORY_BEATS[id] ?? null
}

export const CREDIT_COSTS = {
  photo: 2,
  photoCustom: 2,
  faceSwap: 2,
  video: 5,
  videoCustom: 3,
  chat: 0.2,
} as const

export const SCENE_CATEGORIES = [
  'all',
  'intimate',
  'bondage',
  'aftermath',
  'lingerie',
] as const

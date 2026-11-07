export interface Profil {
  age: number;
  employment_status: string;
  economic_condition: string;
  interests: string[];
  goals: string[];
}

export interface CentangAlasan {
  key: string;
  label: string;
  ok: boolean;
}

export interface HasilProgram {
  program_id: number;
  program_name: string;
  /** Skor kesesuaian 0 sampai 1. */
  score: number;
  rank: number;
  matched_features: { group: string; id: string; label: string }[];
  checks: CentangAlasan[];
  reason: string;
}

export type Metode = "cosine" | "euclidean";

export function metodeAktif(): { method: Metode; sementara: boolean };
export function rekomendasikan(profil: Profil): { method: Metode; hasil: HasilProgram[] };
export function validateProfile(profil: Partial<Record<keyof Profil, unknown>>, fields?: string[]): Record<string, string>;
export const FEATURE_GROUPS: Record<
  string,
  { label: string; type: "single" | "multi"; options: { id: string; label: string }[] }
>;
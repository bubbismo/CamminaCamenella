export type Punto = {
  t: number; lat: number; lon: number; alt: number | null; acc: number | null; speed: number | null;
  /** 1 = primo punto dopo un'interruzione: il tratto che lo precede è una stima in linea retta */
  gap?: number | null;
};

export type Camminata = {
  id: number; started_at: number; ended_at: number | null; status: 'recording' | 'paused' | 'done';
  paused_since: number | null; paused_total_ms: number;
  distance_m: number; ascent_m: number; descent_m: number; active_ms: number;
  calories: number | null; rpe: number | null; notes: string | null;
};

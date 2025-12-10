export interface Message {
  role: 'user' | 'model';
  content: string;
  options?: string[];
  timestamp: number;
}

export interface GameState {
  started: boolean;
  loading: boolean;
  error: string | null;
}

export interface CharacterProfile {
  name: string;
  role: string;
  appearance: string;
  background: string;
}
export interface TenseEntry {
  pronoun: string;
  conjugation: string;
  translation: string;
}

export interface VerbTenseData {
  tenseName: string;
  description: string;
  entries: TenseEntry[];
}

export interface VerbTensesData {
  id?: string;
  word: string;
  indicativeSimple: VerbTenseData[];
  indicativeCompound: VerbTenseData[];
  subjunctiveSimple: VerbTenseData[];
  subjunctiveCompound: VerbTenseData[];
  imperative: VerbTenseData[];
}
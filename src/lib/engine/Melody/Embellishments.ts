import * as Tone from 'tone';

export interface EmbellishmentConfig {
  graceNoteProb: number;
  neighborToneProb: number;
  passingToneProb: number;
  suspensionProb: number;
  pedalToneProb: number;
}

export interface MelodyNote {
  note: string;
  duration: string;
  velocity: number;
  time?: number;
  embellishments?: Embellishment[];
}

export interface Embellishment {
  type: 'grace' | 'neighbor' | 'passing' | 'suspension' | 'pedal';
  note: string;
  duration: string;
  velocity: number;
  offset?: number;
}

export class EmbellishmentEngine {
  private config: EmbellishmentConfig;
  
  constructor(config: EmbellishmentConfig = {
    graceNoteProb: 0.03,
    neighborToneProb: 0.05,
    passingToneProb: 0.04,
    suspensionProb: 0.02,
    pedalToneProb: 0.01
  }) {
    this.config = config;
  }

  // Check if a note is a chord tone
  isChordTone(note: string, chordNotes: string[]): boolean {
    const noteClass = note.replace(/\d+/, '');
    return chordNotes.some(chordNote => 
      chordNote.replace(/\d+/, '') === noteClass
    );
  }

  // Get chord tones from current chord
  getChordTones(chord: any, key: string): string[] {
    const root = Tone.Frequency(key + "3").transpose(chord.semitoneDist);
    const voicing = chord.generateVoicing(4);
    return Tone.Frequency(root)
      .harmonize(voicing)
      .map((f) => Tone.Frequency(f).toNote());
  }

  // Generate grace notes (upper or lower)
  generateGraceNote(mainNote: string, chordTones: string[]): Embellishment | null {
    if (Math.random() > this.config.graceNoteProb) return null;

    const noteMidi = Tone.Frequency(mainNote).toMidi();
    
    // Only use upper grace notes for subtlety
    const graceMidi = noteMidi + 1;
    const graceNote = Tone.Frequency(graceMidi, 'midi').toNote();
    
    // Skip if it's a chord tone
    if (this.isChordTone(graceNote, chordTones)) {
      return null;
    }

    return {
      type: 'grace',
      note: graceNote,
      duration: '64n', // Extremely short grace note
      velocity: 0.4, // Very soft
      offset: -0.03 // Play very close to main note
    };
  }

  // Generate neighbor tones (upper or lower)
  generateNeighborTone(mainNote: string, chordTones: string[]): Embellishment | null {
    if (Math.random() > this.config.neighborToneProb) return null;

    const noteMidi = Tone.Frequency(mainNote).toMidi();
    
    // Only use lower neighbor tones for more subtle effect
    let neighborMidi = noteMidi - 1;
    const neighborNote = Tone.Frequency(neighborMidi, 'midi').toNote();
    
    // If it's a chord tone, skip
    if (this.isChordTone(neighborNote, chordTones)) {
      return null;
    }

    return {
      type: 'neighbor',
      note: neighborNote,
      duration: '32n', // Very short
      velocity: 0.3 // Very soft
    };
  }

  // Generate passing tones between melody notes
  generatePassingTone(fromNote: string, toNote: string): Embellishment | null {
    if (Math.random() > this.config.passingToneProb) return null;

    const fromMidi = Tone.Frequency(fromNote).toMidi();
    const toMidi = Tone.Frequency(toNote).toMidi();
    const interval = Math.abs(toMidi - fromMidi);

    // Only add passing tones for larger intervals (4th or more)
    if (interval < 5) return null;

    const direction = toMidi > fromMidi ? 1 : -1;
    const passingMidi = fromMidi + direction;

    return {
      type: 'passing',
      note: Tone.Frequency(passingMidi, 'midi').toNote(),
      duration: '32n', // Very short
      velocity: 0.25 // Very soft
    };
  }

  // Generate suspension (prepare, tension, resolve)
  generateSuspension(currentNote: string, nextChordTones: string[]): Embellishment[] | null {
    if (Math.random() > this.config.suspensionProb) return null;

    // Check if current note can be suspended over next chord
    if (!this.isChordTone(currentNote, nextChordTones)) {
      return null;
    }

    const noteMidi = Tone.Frequency(currentNote).toMidi();
    
    // Find resolution (down by step)
    const resolutionMidi = noteMidi - 1;
    const resolutionNote = Tone.Frequency(resolutionMidi, 'midi').toNote();

    return [
      {
        type: 'suspension',
        note: currentNote,
        duration: '4n', // Shorter suspension
        velocity: 0.5 // Softer
      },
      {
        type: 'suspension',
        note: resolutionNote,
        duration: '4n',
        velocity: 0.4
      }
    ];
  }

  // Generate pedal tone (sustained note through harmony changes)
  generatePedalTone(currentChordTones: string[], previousPedal?: string): Embellishment | null {
    if (Math.random() > this.config.pedalToneProb) return null;

    // Only use tonic as pedal tone for subtlety
    const pedalNote = currentChordTones[0]; // Root only
    
    if (previousPedal && this.isChordTone(previousPedal, currentChordTones)) {
      // Continue existing pedal
      return {
        type: 'pedal',
        note: previousPedal,
        duration: '1n', // Longer pedal
        velocity: 0.2 // Very soft
      };
    }

    // Start new pedal
    return {
      type: 'pedal',
      note: pedalNote,
      duration: '1n',
      velocity: 0.2
    };
  }

  // Apply embellishments to a melody note
  embellishNote(
    note: MelodyNote, 
    chord: any, 
    key: string, 
    previousNote?: MelodyNote,
    nextChord?: any,
    pedalTone?: string
  ): { embellishedNotes: MelodyNote[], newPedal?: string } {
    
    const chordTones = this.getChordTones(chord, key);
    const embellishedNotes: MelodyNote[] = [];
    let newPedal = pedalTone;

    // Only apply ONE type of embellishment per note for subtlety
    const embellishmentType = Math.random();
    
    if (embellishmentType < 0.3) {
      // Grace note
      const graceNote = this.generateGraceNote(note.note, chordTones);
      if (graceNote) {
        embellishedNotes.push({
          note: graceNote.note,
          duration: graceNote.duration,
          velocity: graceNote.velocity,
          time: note.time ? note.time + graceNote.offset! : undefined
        });
      }
    } else if (embellishmentType < 0.5 && previousNote) {
      // Passing tone
      const passingTone = this.generatePassingTone(previousNote.note, note.note);
      if (passingTone) {
        embellishedNotes.push({
          note: passingTone.note,
          duration: passingTone.duration,
          velocity: passingTone.velocity
        });
      }
    } else if (embellishmentType < 0.7) {
      // Neighbor tone
      const neighborTone = this.generateNeighborTone(note.note, chordTones);
      if (neighborTone) {
        embellishedNotes.push({
          note: neighborTone.note,
          duration: neighborTone.duration,
          velocity: neighborTone.velocity
        });
      }
    } else if (embellishmentType < 0.85 && nextChord) {
      // Suspension
      const nextChordTones = this.getChordTones(nextChord, key);
      const suspension = this.generateSuspension(note.note, nextChordTones);
      if (suspension) {
        embellishedNotes.push(...suspension.map(sus => ({
          note: sus.note,
          duration: sus.duration,
          velocity: sus.velocity
        })));
      }
    } else {
      // Pedal tone
      const pedal = this.generatePedalTone(chordTones, pedalTone);
      if (pedal) {
        newPedal = pedal.note;
        embellishedNotes.push({
          note: pedal.note,
          duration: pedal.duration,
          velocity: pedal.velocity
        });
      }
    }

    // Always add the main note
    embellishedNotes.push(note);

    return { embellishedNotes, newPedal };
  }

  // Update configuration
  updateConfig(newConfig: Partial<EmbellishmentConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): EmbellishmentConfig {
    return { ...this.config };
  }
}
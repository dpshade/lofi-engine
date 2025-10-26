import * as Tone from 'tone';
import { EmbellishmentEngine, type MelodyNote, type EmbellishmentConfig } from './Embellishments';
import intervalWeights from '../Chords/IntervalWeights';
import pentatonicIntervalWeights from '../Chords/PentatonicIntervalWeights';

export interface MelodyConfig {
  density: number;
  complexity: number;
  embellishmentConfig: EmbellishmentConfig;
  rhythmicVariety: number;
}

export interface MelodyState {
  scalePos: number;
  previousNote?: MelodyNote;
  pedalTone?: string;
  phrasePosition: number;
}

export class MelodyGenerator {
  private embellishmentEngine: EmbellishmentEngine;
  private config: MelodyConfig;
  private state: MelodyState;
  private embellishmentCount: number = 0;
  private maxEmbellishments: number = 3;

  constructor(config: MelodyConfig) {
    this.config = config;
    this.embellishmentEngine = new EmbellishmentEngine(config.embellishmentConfig);
    this.state = {
      scalePos: 0,
      phrasePosition: 0
    };
  }

  // Generate a single melody note with embellishments
  generateMelodyNote(
    scale: string[],
    progression: any[],
    progress: number,
    key: string,
    scaleType: string
  ): MelodyNote[] {
    
    // Check if we should play a note based on density
    if (Math.random() > this.config.density) {
      return [];
    }

    const currentChord = progression[progress];
    const nextChord = progression[(progress + 1) % progression.length];
    
    // Generate base melody note
    const baseNote = this.generateBaseNote(scale, scaleType);
    
    // Determine note duration based on rhythmic variety
    const duration = this.generateDuration();
    
    // Calculate velocity with musical context
    const velocity = this.calculateVelocity(baseNote, currentChord);

    const melodyNote: MelodyNote = {
      note: baseNote,
      duration: duration,
      velocity: velocity
    };

    // Apply embellishments only if we haven't reached our limit
    let embellishedNotes: MelodyNote[] = [melodyNote];
    let newPedal = this.state.pedalTone;

    if (this.embellishmentCount < this.maxEmbellishments) {
      const embellishmentResult = this.embellishmentEngine.embellishNote(
        melodyNote,
        currentChord,
        key,
        this.state.previousNote,
        nextChord,
        this.state.pedalTone
      );

      // Only count if we actually added embellishments
      if (embellishmentResult.embellishedNotes.length > 1) {
        embellishedNotes = embellishmentResult.embellishedNotes;
        newPedal = embellishmentResult.newPedal;
        this.embellishmentCount++;
      }
    }

    // Update state
    this.state.previousNote = melodyNote;
    this.state.pedalTone = newPedal;
    this.state.phrasePosition++;

    return embellishedNotes;
  }

  // Generate base melody note using existing logic
  private generateBaseNote(scale: string[], scaleType: string): string {
    const descendRange = Math.min(this.state.scalePos, 7) + 1;
    const ascendRange = Math.min(scale.length - this.state.scalePos, 7);

    let descend = descendRange > 1;
    let ascend = ascendRange > 1;

    if (descend && ascend) {
      if (Math.random() > 0.5) {
        ascend = !descend;
      } else {
        descend = !ascend;
      }
    }

    // Choose interval weights based on scale type
    let currentIntervalWeights: number[];
    if (scaleType === "major-pentatonic") {
      currentIntervalWeights = pentatonicIntervalWeights;
    } else if (scaleType === "major") {
      currentIntervalWeights = intervalWeights;
    } else {
      currentIntervalWeights = intervalWeights; // fallback
    }
    
    let weights = descend
      ? currentIntervalWeights.slice(0, descendRange)
      : currentIntervalWeights.slice(0, ascendRange);

    const sum = weights.reduce((prev: number, curr: number) => prev + curr, 0);
    weights = weights.map((w: number) => w / sum);
    for (let i = 1; i < weights.length; i++) {
      weights[i] += weights[i - 1];
    }

    const randomWeight = Math.random();
    let scaleDist = 0;
    let found = false;
    while (!found) {
      if (randomWeight <= weights[scaleDist]) {
        found = true;
      } else {
        scaleDist++;
      }
    }

    const scalePosChange = descend ? -scaleDist : scaleDist;
    const newScalePos = this.state.scalePos + scalePosChange;

    this.state.scalePos = newScalePos;
    return scale[newScalePos];
  }

  // Generate rhythmic duration with variety
  private generateDuration(): string {
    if (Math.random() > this.config.rhythmicVariety) {
      return "2n"; // Default half note
    }

    const durations = ["4n", "8n", "2n", "dotted-4n", "dotted-8n"];
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // Favor shorter notes for lofi
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < durations.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return durations[i];
      }
    }
    
    return "2n"; // fallback
  }

  // Calculate velocity with musical context
  private calculateVelocity(note: string, chord: any): number {
    let baseVelocity = 0.8;
    
    // Check if note is a chord tone
    const noteMidi = Tone.Frequency(note).toMidi();
    const chordRoot = Tone.Frequency("C3").transpose(chord.semitoneDist);
    const chordRootMidi = chordRoot.toMidi();
    
    // Check intervals from chord root
    const interval = ((noteMidi - chordRootMidi) % 12 + 12) % 12;
    
    // Stronger velocity for chord tones
    if ([0, 4, 7].includes(interval)) { // Root, 3rd, 5th
      baseVelocity = 0.9;
    } else if ([2, 9].includes(interval)) { // 9th, 6th
      baseVelocity = 0.7;
    } else {
      baseVelocity = 0.6; // Non-chord tones
    }
    
    // Add complexity-based variation
    const variation = (Math.random() - 0.5) * this.config.complexity * 0.4;
    
    return Math.max(0.4, Math.min(1.0, baseVelocity + variation));
  }

  // Play the generated melody notes
  playMelodyNotes(notes: MelodyNote[], sampler: any, time: number) {
    notes.forEach((note, index) => {
      const noteTime = time + (index * Tone.Time("16n").toSeconds());
      sampler.triggerAttackRelease(
        note.note,
        note.duration,
        noteTime,
        note.velocity
      );
    });
  }

  // Reset melody state for new progression
  resetState(newScalePos?: number) {
    this.state = {
      scalePos: newScalePos || Math.floor(Math.random() * 8),
      phrasePosition: 0,
      previousNote: undefined,
      pedalTone: undefined
    };
    this.embellishmentCount = 0; // Reset embellishment counter
  }

  // Update configuration
  updateConfig(newConfig: Partial<MelodyConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.embellishmentConfig) {
      this.embellishmentEngine.updateConfig(newConfig.embellishmentConfig);
    }
  }

  // Get current state
  getState(): MelodyState {
    return { ...this.state };
  }

  // Get current configuration
  getConfig(): MelodyConfig {
    return { ...this.config };
  }

  // Get embellishment engine for direct access
  getEmbellishmentEngine(): EmbellishmentEngine {
    return this.embellishmentEngine;
  }

  // Get current embellishment count
  getEmbellishmentCount(): number {
    return this.embellishmentCount;
  }
}
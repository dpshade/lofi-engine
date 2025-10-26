import type { MelodyNote } from './Embellishments';

export interface PhraseTemplate {
  name: string;
  pattern: number[]; // 0 = rest, 1 = note, 2 = embellished note
  length: number;
  description: string;
}

export interface CallResponsePattern {
  call: PhraseTemplate;
  response: PhraseTemplate;
}

export class PhraseBuilder {
  private phraseTemplates: PhraseTemplate[];
  private callResponsePatterns: CallResponsePattern[];
  private currentPhraseIndex: number;
  private phraseHistory: PhraseTemplate[];

  constructor() {
    this.phraseTemplates = this.initializePhraseTemplates();
    this.callResponsePatterns = this.initializeCallResponsePatterns();
    this.currentPhraseIndex = 0;
    this.phraseHistory = [];
  }

  // Initialize phrase templates for lofi style
  private initializePhraseTemplates(): PhraseTemplate[] {
    return [
      // Simple, sparse phrases
      {
        name: 'minimal',
        pattern: [1, 0, 0, 0, 1, 0, 0, 0],
        length: 8,
        description: 'Minimal phrase with space'
      },
      {
        name: 'gentle',
        pattern: [1, 0, 1, 0, 0, 1, 0, 0],
        length: 8,
        description: 'Gentle flowing phrase'
      },
      {
        name: 'contemplative',
        pattern: [1, 0, 0, 1, 0, 0, 1, 0],
        length: 8,
        description: 'Contemplative sparse phrase'
      },
      
      // More active phrases
      {
        name: 'flowing',
        pattern: [1, 0, 1, 0, 1, 0, 1, 0],
        length: 8,
        description: 'Steady flowing phrase'
      },
      {
        name: 'questioning',
        pattern: [1, 1, 0, 1, 0, 0, 1, 2],
        length: 8,
        description: 'Questioning phrase with embellishment'
      },
      {
        name: 'answering',
        pattern: [0, 0, 1, 2, 1, 0, 0, 1],
        length: 8,
        description: 'Answering phrase with resolution'
      },
      
      // Complex phrases
      {
        name: 'decorated',
        pattern: [2, 0, 1, 2, 0, 1, 2, 0],
        length: 8,
        description: 'Heavily decorated phrase'
      },
      {
        name: 'cascading',
        pattern: [1, 2, 1, 0, 1, 2, 1, 0],
        length: 8,
        description: 'Cascading sixteenth notes'
      },
      
      // Extended phrases (16 beats)
      {
        name: 'journey',
        pattern: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 2, 0, 0, 1, 0],
        length: 16,
        description: 'Extended journey phrase'
      },
      {
        name: 'story',
        pattern: [1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 2, 0, 1, 0, 0, 1],
        length: 16,
        description: 'Storytelling phrase'
      }
    ];
  }

  // Initialize call-and-response patterns
  private initializeCallResponsePatterns(): CallResponsePattern[] {
    return [
      {
        call: this.phraseTemplates[0], // minimal
        response: this.phraseTemplates[1] // gentle
      },
      {
        call: this.phraseTemplates[2], // contemplative
        response: this.phraseTemplates[3] // flowing
      },
      {
        call: this.phraseTemplates[4], // questioning
        response: this.phraseTemplates[5] // answering
      },
      {
        call: this.phraseTemplates[1], // gentle
        response: this.phraseTemplates[2] // contemplative
      }
    ];
  }

  // Get a phrase template based on complexity and mood
  getPhraseTemplate(complexity: number, useCallResponse: boolean = false): PhraseTemplate {
    if (useCallResponse && Math.random() < 0.3) {
      // Use call-and-response pattern
      const pattern = this.callResponsePatterns[Math.floor(Math.random() * this.callResponsePatterns.length)];
      const isCall = this.currentPhraseIndex % 2 === 0;
      this.currentPhraseIndex++;
      return isCall ? pattern.call : pattern.response;
    }

    // Filter templates by complexity
    const maxComplexity = Math.floor(complexity * 10); // 0-10 scale
    let availableTemplates = this.phraseTemplates;

    if (maxComplexity < 3) {
      // Simple templates
      availableTemplates = this.phraseTemplates.filter(t => 
        ['minimal', 'gentle', 'contemplative'].includes(t.name)
      );
    } else if (maxComplexity < 7) {
      // Moderate templates
      availableTemplates = this.phraseTemplates.filter(t => 
        !['decorated', 'cascading', 'journey', 'story'].includes(t.name)
      );
    }

    // Avoid repeating the same template too often
    const recentTemplates = this.phraseHistory.slice(-2);
    const filteredTemplates = availableTemplates.filter(t => 
      !recentTemplates.some(recent => recent.name === t.name)
    );

    const templatesToUse = filteredTemplates.length > 0 ? filteredTemplates : availableTemplates;
    const selectedTemplate = templatesToUse[Math.floor(Math.random() * templatesToUse.length)];
    
    // Update history
    this.phraseHistory.push(selectedTemplate);
    if (this.phraseHistory.length > 4) {
      this.phraseHistory.shift();
    }

    return selectedTemplate;
  }

  // Apply phrase template to melody notes
  applyPhraseTemplate(
    notes: MelodyNote[],
    template: PhraseTemplate,
    beatPosition: number = 0
  ): MelodyNote[] {
    const result: MelodyNote[] = [];
    const templateLength = template.length;
    
    for (let i = 0; i < templateLength; i++) {
      const patternValue = template.pattern[i];
      const noteIndex = Math.floor((i + beatPosition) % notes.length);
      
      if (patternValue === 0) {
        // Rest - skip this position
        continue;
      } else if (patternValue === 1) {
        // Regular note
        if (noteIndex < notes.length) {
          result.push(notes[noteIndex]);
        }
      } else if (patternValue === 2) {
        // Embellished note - add extra decoration
        if (noteIndex < notes.length) {
          const note = notes[noteIndex];
          // Add a grace note or make it more expressive
          const embellishedNote = {
            ...note,
            velocity: Math.min(1.0, note.velocity + 0.1),
            duration: this.shortenDuration(note.duration)
          };
          result.push(embellishedNote);
        }
      }
    }

    return result;
  }

  // Shorten duration for embellished notes
  private shortenDuration(duration: string): string {
    const durationMap: { [key: string]: string } = {
      '1n': '2n',
      '2n': '4n',
      '4n': '8n',
      '8n': '16n',
      '16n': '32n',
      'dotted-1n': '1n',
      'dotted-2n': '2n',
      'dotted-4n': '4n',
      'dotted-8n': '8n'
    };

    return durationMap[duration] || '8n';
  }

  // Generate a phrase variation
  generateVariation(template: PhraseTemplate, variationLevel: number = 0.3): PhraseTemplate {
    const variedPattern = [...template.pattern];
    
    // Apply random variations based on variation level
    for (let i = 0; i < variedPattern.length; i++) {
      if (Math.random() < variationLevel) {
        // Randomly modify pattern elements
        const current = variedPattern[i];
        if (current === 0 && Math.random() < 0.2) {
          // Occasionally turn rests into notes
          variedPattern[i] = Math.random() < 0.7 ? 1 : 2;
        } else if (current === 1 && Math.random() < 0.3) {
          // Occasionally embellish regular notes
          variedPattern[i] = 2;
        } else if (current === 2 && Math.random() < 0.4) {
          // Occasionally simplify embellished notes
          variedPattern[i] = 1;
        }
      }
    }

    return {
      ...template,
      pattern: variedPattern,
      name: `${template.name}_varied`,
      description: `${template.description} (varied)`
    };
  }

  // Get phrase information for debugging/display
  getPhraseInfo(template: PhraseTemplate): string {
    const activeBeats = template.pattern.filter(p => p > 0).length;
    const embellishedBeats = template.pattern.filter(p => p === 2).length;
    return `${template.name}: ${activeBeats}/${template.length} active, ${embellishedBeats} embellished`;
  }

  // Reset phrase history
  resetHistory() {
    this.phraseHistory = [];
    this.currentPhraseIndex = 0;
  }

  // Get all available templates
  getAllTemplates(): PhraseTemplate[] {
    return [...this.phraseTemplates];
  }

  // Get call-and-response patterns
  getCallResponsePatterns(): CallResponsePattern[] {
    return [...this.callResponsePatterns];
  }
}
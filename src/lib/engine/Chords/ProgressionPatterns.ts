// Predefined progression patterns for musically coherent loops
// Each pattern creates a proper cadence and loops seamlessly

class ProgressionPatterns {
  // Major scale patterns (using degrees 1-7)
  static getMajorPatterns() {
    return [
      // Classic pop/lofi patterns
      [1, 5, 6, 4],     // I-V-vi-IV (most common)
      [1, 6, 4, 5],     // I-vi-IV-V
      [1, 4, 5, 1],     // I-IV-V-I (strong cadence)
      [2, 5, 1, 6],     // ii-V-I-vi (jazzy)
      [6, 4, 1, 5],     // vi-IV-I-V
      [1, 4, 1, 5],     // I-IV-I-V
      
      // Extended 8-chord patterns - prefer contrasting 4-chord sets
      [1, 4, 5, 1, 2, 5, 1, 6],     // I-IV-V-I, ii-V-I-vi (cadence + jazzy)
      [1, 2, 4, 1, 5, 6, 4, 5],     // I-ii-IV-I, V-vi-IV-V (sophisticated)
      [1, 6, 2, 5, 1, 6, 4, 5],     // I-vi-ii-V, I-vi-IV-V (jazzy + pop)
      [1, 5, 6, 4, 2, 5, 1, 6],     // I-V-vi-IV, ii-V-I-vi (pop + jazzy)
      [1, 6, 4, 5, 2, 5, 1, 6],     // I-vi-IV-V, ii-V-I-vi (pop + jazzy)
      [6, 4, 1, 5, 1, 4, 5, 1],     // vi-IV-I-V, I-IV-V-I (contrast)
      
      // Limited exact repeats (only 20% of patterns)
      [1, 5, 6, 4, 1, 5, 6, 4],     // I-V-vi-IV repeated (classic)
      [2, 5, 1, 6, 2, 5, 1, 6],     // ii-V-I-vi repeated (jazzy progression)
    ];
  }



  // Add controlled randomness to patterns
  static addVariation(pattern, scaleType) {
    const varied = [...pattern];
    
    // 30% chance to modify one chord (except first and last for cadence integrity)
    if (Math.random() < 0.3 && varied.length > 4) {
      const modifyIndex = 1 + Math.floor(Math.random() * (varied.length - 2)); // Avoid first/last
      const originalDegree = varied[modifyIndex];
      const prevChord = varied[modifyIndex - 1];
      const nextChord = varied[modifyIndex + 1];
      
      // Choose a musically appropriate substitution based on context
      const substitutions = this.getSubstitutions(originalDegree, prevChord, nextChord, scaleType);
      if (substitutions.length > 0) {
        varied[modifyIndex] = substitutions[Math.floor(Math.random() * substitutions.length)];

      }
    }
    
    // 20% chance to add a passing chord between two chords
    if (Math.random() < 0.2 && varied.length < 8) {
      const insertIndex = 1 + Math.floor(Math.random() * (varied.length - 1));
      const passingChord = this.getPassingChord(varied[insertIndex - 1], varied[insertIndex], scaleType);
      if (passingChord) {
        varied.splice(insertIndex, 0, passingChord);

      }
    }
    
    // 15% chance to reverse a section for variety
    if (Math.random() < 0.15 && varied.length >= 6) {
      const reverseStart = 2 + Math.floor(Math.random() * 3); // Positions 2-4
      const reverseLength = 2 + Math.floor(Math.random() * 2); // 2-3 chords
      const section = varied.splice(reverseStart, reverseLength).reverse();
      varied.splice(reverseStart, 0, ...section);

    }
    
    return varied;
  }

  // Get context-aware substitutions that maintain progression flow
  static getSubstitutions(degree, prevChord, nextChord, scaleType) {
    // Only substitute if it maintains good voice leading and harmonic flow
    if (scaleType === "major") {
      const subs = {
        1: { // I - can substitute if going to V or vi
          5: [6],      // I-V → vi-V (more emotional)
          6: [4],      // I-vi → IV-vi (gentler)
        },
        2: { // ii - can substitute if going to V or vi
          5: [4],      // ii-V → IV-V (stronger)
          6: [4],      // ii-vi → IV-vi (prettier)
        },
        3: { // iii - can substitute if going to IV or vi
          4: [1],      // iii-IV → I-IV (stronger)
          6: [1],      // iii-vi → I-vi (more common)
        },
        4: { // IV - can substitute if going to V or I
          5: [2],      // IV-V → ii-V (more sophisticated)
          1: [2],      // IV-I → ii-I (more interesting)
        },
        5: { // V - can substitute if going to I or vi
          1: [6],      // V-I → V-vi (deceptive cadence)
          6: [1],      // V-vi → I-vi (more common)
        },
        6: { // vi - can substitute if going to IV or ii
          4: [2],      // vi-IV → vi-ii (more movement)
          2: [4],      // vi-ii → vi-IV (stronger)
        },
        7: { // vii° - can substitute if going to I or iii
          1: [5],      // vii°-I → V-I (stronger)
          3: [1],      // vii°-iii → I-iii (more common)
        }
      };
      return subs[degree]?.[nextChord] || [];
    }
  }

  // Get a passing chord between two chords
  static getPassingChord(fromChord, toChord, scaleType) {
    // Common passing chords in lofi
    const passingChords = {
      major: {
        '1-5': 2,    // I to V: add ii
        '4-1': 5,    // IV to I: add V  
        '5-6': 1,    // V to vi: add I
        '2-5': 4,    // ii to V: add IV
        '6-4': 2     // vi to IV: add ii
      }
    };
    
    const key = `${fromChord}-${toChord}`;
    const chords = passingChords.major; // always major now
    return chords[key] || null;
  }

  // Generate a progression based on scale type
  static generate(scaleType, length = 8) {
    let patterns;
    if (scaleType === "major" || scaleType === "major-pentatonic") {
      patterns = this.getMajorPatterns();
    } else {
      patterns = this.getMajorPatterns(); // fallback
    }
    
    // Choose a random pattern
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    // Add controlled variation
    const variedPattern = this.addVariation(pattern, scaleType);
    
    // Extend or truncate to desired length
    if (variedPattern.length >= length) {
      return variedPattern.slice(0, length);
    } else {
      // Repeat pattern to reach desired length
      const extended = [];
      while (extended.length < length) {
        extended.push(...variedPattern);
      }
      return extended.slice(0, length);
    }
  }

  // Get a pattern description for debugging
  static getPatternDescription(pattern, scaleType) {
    const romanNumerals = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
    const numerals = romanNumerals; // always major now
    
    return pattern.map(degree => numerals[degree - 1]).join("-");
  }
}

export default ProgressionPatterns;
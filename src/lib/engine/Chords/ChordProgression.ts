import Chords from './Chords';
import Chord from './Chord';
import ProgressionPatterns from './ProgressionPatterns';

class ChordProgression {
    static generate(length, customChords = Chords, scaleType = "major") {
        if(length < 2)
            return null;

        console.log(`🎼 Generating PATTERN-BASED progression for ${scaleType}`);
        console.log("Available chords:", customChords.map(c => `Degree ${c.degree} (${c.semitoneDist} semitones)`));

        // Get a predefined pattern
        const pattern = ProgressionPatterns.generate(scaleType, length);
        const patternDescription = ProgressionPatterns.getPatternDescription(pattern, scaleType);
        
        console.log(`🎵 Using pattern: ${patternDescription}`);
        console.log(`Pattern degrees: [${pattern.join(" -> ")}]`);

        // Convert pattern degrees to actual chord objects
        const progression = pattern.map(degree => {
            const chord = customChords[degree - 1]; // degrees are 1-based, array is 0-based
            console.log(`Creating chord: Degree ${chord.degree} (${chord.semitoneDist} semitones)`);
            return new Chord(
                chord.degree,
                [...chord.intervals],
                [...chord.nextChordIdxs]);
        });
        
        console.log(`Generated progression: [${progression.map(c => c.degree).join(" -> ")}]`);
        return progression;
    }
}

export default ChordProgression;
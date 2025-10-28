import Chords from './Chords';
import Chord from './Chord';
import ProgressionPatterns from './ProgressionPatterns';

class ChordProgression {
    static generate(length, customChords = Chords, scaleType = "major") {
        if(length < 2)
            return null;

        // Get a predefined pattern
        const pattern = ProgressionPatterns.generate(scaleType, length);

        // Convert pattern degrees to actual chord objects
        const progression = pattern.map(degree => {
            const chord = customChords[degree - 1]; // degrees are 1-based, array is 0-based
            return new Chord(
                chord.degree,
                [...chord.intervals],
                [...chord.nextChordIdxs]);
        });
        return progression;
    }
}

export default ChordProgression;
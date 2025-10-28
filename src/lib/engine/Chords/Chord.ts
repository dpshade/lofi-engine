import { singleOct } from './MajorScale';

class Chord {
    degree;
    semitoneDist;
    intervals;
    nextChordIdxs;

    constructor(degree,intervals,nextChordIdxs,scale = singleOct) {
        this.degree = degree;
        this.semitoneDist = scale[degree-1];
        this.intervals = intervals;
        this.nextChordIdxs = nextChordIdxs;
    }

    generateVoicing(size, prevVoicing = null) {
        if(size<3)
            return this.intervals.slice(0,3);
        let voicing = this.intervals.slice(1,size);
        voicing.sort(() => Math.random()-0.5);
        for(let i = 1; i<voicing.length; i++) {
            while(voicing[i] < voicing[i-1]){
                voicing[i] += 12;
            }
        }
        voicing.unshift(0);
        
        // Add subtle voice leading preference if we have previous voicing
        if(prevVoicing && prevVoicing.length === voicing.length) {
            voicing = this.applyGentleVoiceLeading(voicing, prevVoicing);
        }
        
        return voicing;
    }

    applyGentleVoiceLeading(voicing, prevVoicing) {
        // 30% chance to apply gentle voice leading
        if(Math.random() > 0.3) {
            return voicing;
        }
        
        const adjusted = [...voicing];
        
        // Try to minimize movement for each voice
        for(let i = 0; i < adjusted.length; i++) {
            const prevNote = prevVoicing[i];
            const currentNote = adjusted[i];
            
            if(prevNote !== undefined) {
                const movement = currentNote - prevNote;
                
                // If movement is large (>6 semitones), try to reduce it
                if(Math.abs(movement) > 6) {
                    // Try octave adjustment
                    const octaveDown = currentNote - 12;
                    const octaveUp = currentNote + 12;
                    
                    const downMovement = Math.abs(octaveDown - prevNote);
                    const upMovement = Math.abs(octaveUp - prevNote);
                    
                    if(downMovement < Math.abs(movement) && octaveDown > prevVoicing[0] - 12) {
                        adjusted[i] = octaveDown;
                    } else if(upMovement < Math.abs(movement) && octaveUp < prevVoicing[prevVoicing.length - 1] + 12) {
                        adjusted[i] = octaveUp;
                    }
                }
            }
        }
        
        // Re-sort to maintain proper voice ordering
        adjusted.sort((a, b) => a - b);
        
        return adjusted;
    }

    generateMode() {
        return this.intervals.map(n => {
            if(n>=12)
                return n-12;
            else
                return n;
        });
    }
}

export default Chord;
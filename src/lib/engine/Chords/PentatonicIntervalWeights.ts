// Pentatonic scale interval weights
// Major pentatonic: root, 2nd, 3rd, 5th, 6th
// Favors stepwise motion within the pentatonic scale
// Index: 0=unison, 1=2nd, 2=3rd, 3=5th, 4=6th, 5=octave+2nd, 6=octave+3rd, 7=octave+5th, 8=octave+6th
const pentatonicIntervalWeights = [0.15, 0.30, 0.25, 0.20, 0.10, 0.15, 0.10, 0.05, 0.05];

export default pentatonicIntervalWeights;
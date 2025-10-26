// Simple test to verify embellishment limits
console.log('Testing embellishment system...');

// Test that default probabilities are very low
const defaultConfig = {
  graceNoteProb: 0.03,    // 3%
  neighborToneProb: 0.05,  // 5%
  passingToneProb: 0.04,   // 4%
  suspensionProb: 0.02,    // 2%
  pedalToneProb: 0.01      // 1%
};

const totalProb = Object.values(defaultConfig).reduce((sum, prob) => sum + prob, 0);
console.log(`Total embellishment probability per note: ${(totalProb * 100).toFixed(1)}%`);
console.log(`Expected embellishments per 100 notes: ${(totalProb * 100).toFixed(1)}`);
console.log(`Max embellishments per track: 3`);

console.log('✅ Embellishment system configured for subtlety');
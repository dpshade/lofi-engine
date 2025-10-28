import * as Tone from 'tone';
import Samples from './Samples';

const lpf = new Tone.Filter(1000, "lowpass");
const sw = new Tone.StereoWidener(0.5);
const reverb = new Tone.Reverb(2.5).toDestination(); // 2.5s decay for subtle lofi space
reverb.wet.value = 0.25; // 25% wet for subtle lofi space

class Piano {
	sampler: any;
	
	constructor(cb) {
		this.sampler = new Tone.Sampler(Samples, () => {
			cb();
		}).chain(lpf,sw,reverb);
	}

	getSampler() {
		return this.sampler;
	}
}

export default Piano;
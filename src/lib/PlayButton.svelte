<script lang="ts">
  import {
      IconLoader,
      IconPlayerPauseFilled,
      IconPlayerPlayFilled,
      IconRefresh,
  } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
// @ts-ignore
  import * as Tone from "tone";
  import Visualizer from "../lib/components/Visualizer/index.svelte";
  import ChordProgression from "../lib/engine/Chords/ChordProgression";
  import intervalWeights from "../lib/engine/Chords/IntervalWeights";
  import pentatonicIntervalWeights from "../lib/engine/Chords/PentatonicIntervalWeights";
  import Keys from "../lib/engine/Chords/Keys";
  import { fiveToFive as majorScale } from "../lib/engine/Chords/MajorScale";
  import Chords from "../lib/engine/Chords/Chords";
  import Hat from "../lib/engine/Drums/Hat";
  import Kick from "../lib/engine/Drums/Kick";
  import Noise from "../lib/engine/Drums/Noise";
  import Snare from "../lib/engine/Drums/Snare";
  import Piano from "../lib/engine/Piano/Piano";

  const STORAGE_KEY = "Volumes";
  const DEFFAULT_VOLUMES = {
    rain: 1,
    thunder: 1,
    campfire: 1,
    jungle: 1,
    main_track: 1,
  };
  // Load previous vols or defualt
  let volumes =
    JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFFAULT_VOLUMES;
  // Convert linear volume (0 to 1) to dB
  const linearToDb = (value) =>
    value === 0 ? -Infinity : 20 * Math.log10(value);

  // Setup audio chain
  const cmp = new Tone.Compressor({
    threshold: -6,
    ratio: 3,
    attack: 0.5,
    release: 0.1,
  });
  const lpf = new Tone.Filter(2000, "lowpass");
  const vol = new Tone.Volume(linearToDb(volumes.main_track));
  Tone.Master.chain(cmp, lpf, vol);
  Tone.Transport.bpm.value = 156;
  Tone.Transport.swing = 1;

  // State variables
  let key = "C";
  let scaleType = "major"; // "major" or "major-pentatonic"
  let progression = [];
  let scale = [];
  let progress = 0;
  let scalePos = 0;

  let pianoLoaded = false;
  let kickLoaded = false;
  let snareLoaded = false;
  let hatLoaded = false;

  let contextStarted = false;
  let genChordsOnce = false;

  let kickOff = false;
  let snareOff = false;
  let hatOff = false;
  let melodyDensity = 0.33;
  let melodyOff = false;

  let isPlaying = false;
  let previousVoicing = [];

  // Initialize instruments
  const pn = new Piano(() => (pianoLoaded = true)).sampler;
  const kick = new Kick(() => (kickLoaded = true)).sampler;
  const snare = new Snare(() => (snareLoaded = true)).sampler;
  const hat = new Hat(() => (hatLoaded = true)).sampler;
  const noise = Noise;

  // Sequences
  let chords, melody, kickLoop, snareLoop, hatLoop;

  onMount(() => {
    // Setup sequences
    chords = new Tone.Sequence(
      (time, note) => {
        playChord();
      },
      [""],
      "1n",
    );

    melody = new Tone.Sequence(
      (time, note) => {
        playMelody();
      },
      [""],
      "8n",
    );

    kickLoop = new Tone.Sequence(
      (time, note) => {
        if (!kickOff) {
          if (note === "C4" && Math.random() < 0.9) {
            // @ts-ignore
            kick.triggerAttack(note);
          } else if (note === "." && Math.random() < 0.1) {
            // @ts-ignore
            kick.triggerAttack("C4");
          }
        }
      },
      ["C4", "", "", "", "", "", "", "C4", "C4", "", ".", "", "", "", "", ""],
      "8n",
    );

    snareLoop = new Tone.Sequence(
      (time, note) => {
        if (!snareOff) {
          if (note !== "" && Math.random() < 0.8) {
            // @ts-ignore
            snare.triggerAttack(note);
          }
        }
      },
      ["", "C4"],
      "2n",
    );

    hatLoop = new Tone.Sequence(
      (time, note) => {
        if (!hatOff) {
          // @ts-ignore
          if (note !== "" && Math.random() < 0.8) {
            // @ts-ignore
            hat.triggerAttack(note);
          }
        }
      },
      ["C4", "C4", "C4", "C4", "C4", "C4", "C4", "C4"],
      "4n",
    );

    chords.humanize = true;
    melody.humanize = true;
    kickLoop.humanize = true;
    snareLoop.humanize = true;
    hatLoop.humanize = true;
  });

  function nextChord() {
    progress = (progress + 1) % progression.length;
  }

  function playChord() {
    const chord = progression[progress];
    const root = Tone.Frequency(key + "3").transpose(chord.semitoneDist);
    const size = 4;
    
    // Use gentle voice leading if we have previous voicing
    const voicing = chord.generateVoicing(size, previousVoicing);
    
    // Store current voicing for next chord
    previousVoicing = [...voicing];
    
    const notes = Tone.Frequency(root)
      .harmonize(voicing)
      .map((f) => Tone.Frequency(f).toNote());
    
    // Get note names and intervals
    const rootNote = root.toNote();
    const noteNames = notes.map(note => {
      const noteName = note.replace(/\d+/, ''); // Remove octave
      const octave = note.match(/\d+/)?.[0] || '3';
      return noteName;
    });
    
    // Calculate intervals from root
    const intervals = notes.map(note => {
      const rootMidi = Tone.Frequency(root).toMidi();
      const noteMidi = Tone.Frequency(note).toMidi();
      return noteMidi - rootMidi;
    });
    
    const intervalNames = intervals.map(semi => {
      if (semi === 0) return 'R';
      if (semi === 3) return 'm3';
      if (semi === 4) return 'M3';
      if (semi === 7) return 'P5';
      if (semi === 10) return 'm7';
      if (semi === 11) return 'M7';
      return `${semi}`;
    });
    
    // Simplified debug logging
    console.log(`🎹 CHORD ${progress + 1}/8: ${toRomanNumeral(chord.degree)} in ${key} ${scaleType}`);
    console.log(`   Notes: [${noteNames.join(" - ")}]`);
    console.log(`   Intervals: [${intervalNames.join(" - ")}]`);
    console.log(`   Root: ${rootNote}`);
    
    // Add procedural dynamics to chords with musical context
    let baseVelocity = 0.7; // Base velocity
    
    // Make certain chord degrees naturally louder or softer
    if (chord.degree === 1 || chord.degree === 4) {
      baseVelocity = 0.8; // Tonic and subdominant slightly stronger
    } else if (chord.degree === 5) {
      baseVelocity = 0.85; // Dominant strongest for resolution
    } else if (chord.degree === 6) {
      baseVelocity = 0.6; // Submediant more gentle
    }
    
    // Add random variation
    const chordVelocity = Math.max(0.4, Math.min(1.0, baseVelocity + (Math.random() - 0.5) * 0.2));
    // @ts-ignore
    pn.triggerAttackRelease(notes, "1n", undefined, chordVelocity);
    nextChord();
  }

  function playMelody() {
    if (melodyOff || !(Math.random() < melodyDensity)) {
      return;
    }

    const descendRange = Math.min(scalePos, 7) + 1;
    const ascendRange = Math.min(scale.length - scalePos, 7);

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
    let currentIntervalWeights;
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

    const sum = weights.reduce((prev, curr) => prev + curr, 0);
    weights = weights.map((w) => w / sum);
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
    const newScalePos = scalePos + scalePosChange;

    scalePos = newScalePos;
    const melodyNote = scale[newScalePos];
    const noteName = melodyNote.replace(/\d+/, ''); // Remove octave
    
    // Add procedural dynamics to melody with musical context
    let baseMelodyVelocity = 0.8;
    
    // Larger intervals get slightly more emphasis
    if (Math.abs(scaleDist) >= 4) {
      baseMelodyVelocity = 0.9; // Leaps more prominent
    } else if (Math.abs(scaleDist) === 1) {
      baseMelodyVelocity = 0.7; // Steps more gentle
    }
    
    // Directional dynamics - ascending slightly stronger than descending
    if (scalePosChange > 0) {
      baseMelodyVelocity += 0.1; // Ascending lines
    } else {
      baseMelodyVelocity -= 0.05; // Descending lines
    }
    
    // Add random variation and cap at reasonable range
    const melodyVelocity = Math.max(0.5, Math.min(1.0, baseMelodyVelocity + (Math.random() - 0.5) * 0.3));
    
    console.log(`🎵 Melody: ${noteName} in ${key} ${scaleType} (velocity: ${melodyVelocity.toFixed(2)})`);
    // @ts-ignore
    pn.triggerAttackRelease(melodyNote, "2n", undefined, melodyVelocity);
  }

  function generateProgression() {
    // Reset previous voicing when generating new progression
    previousVoicing = [];
    
    // Randomly choose between plain major and pentatonic major
    const rand = Math.random();
    let newScaleType;
    if (rand < 0.5) {
      newScaleType = "major-pentatonic";
    } else {
      newScaleType = "major";
    }
    
    const newKey = Keys[Math.floor(Math.random() * Keys.length)];
    let _scale, chords, newScale, newProgression, newScalePos;
    
    if (newScaleType === "major-pentatonic") {
      // Major with pentatonic melody
      _scale = majorScale;
      chords = Chords;
      
      const pentatonicScale = [0, 2, 4, 7, 9]; // Major pentatonic: root, 2nd, 3rd, 5th, 6th
      const pentatonicFiveToFive = [...pentatonicScale.map(n=>n-12).slice(3), ...pentatonicScale, ...pentatonicScale.map(n=>n+12).slice(0,3)];
      
      newScale = Tone.Frequency(newKey + "5")
        .harmonize(pentatonicFiveToFive)
        .map((f) => Tone.Frequency(f).toNote());
      newProgression = ChordProgression.generate(8, chords, "major-pentatonic");
      newScalePos = Math.floor(Math.random() * pentatonicFiveToFive.length);
      
      console.log(`=== ${newKey} MAJOR with PENTATONIC MELODY ===`);
      console.log("Pentatonic scale intervals:", pentatonicFiveToFive);
    } else if (newScaleType === "major") {
      // Plain major with full diatonic melody
      _scale = majorScale;
      chords = Chords;
      
      newScale = Tone.Frequency(newKey + "5")
        .harmonize(_scale)
        .map((f) => Tone.Frequency(f).toNote());
      newProgression = ChordProgression.generate(8, chords, "major");
      newScalePos = Math.floor(Math.random() * _scale.length);
      
      console.log(`=== ${newKey} PLAIN MAJOR PROGRESSION ===`);
      console.log("Major scale intervals:", _scale);
    }
    
    console.log("Scale notes:", newScale);
    console.log("Chord progression:");
    newProgression.forEach((chord, idx) => {
      const root = Tone.Frequency(newKey + "3").transpose(chord.semitoneDist);
      const voicing = chord.generateVoicing(4);
      const notes = Tone.Frequency(root)
        .harmonize(voicing)
        .map((f) => Tone.Frequency(f).toNote());
      console.log(`  ${idx + 1}. Degree ${chord.degree} (${chord.semitoneDist} semitones): [${notes.join(", ")}]`);
    });
    console.log("=====================================");

    key = newKey;
    scaleType = newScaleType;
    progress = 0;
    progression = newProgression;
    scale = newScale;
    genChordsOnce = true;
    scalePos = newScalePos;
  }

  function toggle() {
    progress = 0;
    if (Tone.Transport.state === "started") {
      noise.stop();
      Tone.Transport.stop();
      isPlaying = false;
    } else {
      Tone.start();
      Tone.Transport.start();
      noise.start(0);
      chords.start(0);
      melody.start(0);
      kickLoop.start(0);
      snareLoop.start(0);
      hatLoop.start(0);
      isPlaying = true;
    }
  }

  function startAudioContext() {
    Tone.start();
    contextStarted = true;
  }

  $: allSamplesLoaded = pianoLoaded && kickLoaded && snareLoaded && hatLoaded;
  $: activeProgressionIndex = (progress + 7) % 8;
  // Update volume
  onMount(() => {
    setInterval(() => {
      let updatedVol =
        JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFFAULT_VOLUMES;
      vol.volume.value = linearToDb(updatedVol.main_track);
    }, 100);
  });
  // automically start audio context after samples are loaded
  $: if (allSamplesLoaded && !contextStarted) {
    startAudioContext();
    generateProgression();
  }

  function toRomanNumeral(degree) {
    const majorNumerals = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
    const naturalMinorNumerals = ["i", "ii°", "III", "iv", "v", "VI", "VII"];
    
    let numerals;
    if (scaleType === "major-pentatonic" || scaleType === "major") {
      numerals = majorNumerals;
    } else {
      numerals = majorNumerals; // fallback
    }
    
    return numerals[degree - 1] || degree;
  }

  function handleButtonAction() {
    if (!allSamplesLoaded) {
      // Do nothing, button is disabled
      return;
    } else if (!contextStarted) {
      // Initialize audio context
      startAudioContext();
    } else if (!genChordsOnce) {
      // Chords not generated yet, can't play
      return;
    } else {
      // Normal play/pause functionality
      toggle();
    }
  }
</script>

<div>
  <div class="controls">
    <button
      class="play-button"
      on:click={handleButtonAction}
      disabled={!allSamplesLoaded}
    >
      {#if !allSamplesLoaded}
        <IconLoader size={30} class="spinning" />
      {:else if !contextStarted}
        <span class="context-text">Initialize Audio</span>
      {:else if !genChordsOnce}
        <IconPlayerPlayFilled size={30} class="disabled" />
      {:else if isPlaying}
        <IconPlayerPauseFilled size={30} />
      {:else}
        <IconPlayerPlayFilled size={30} />
      {/if}
    </button>
    <button class="generateBtn" on:click={generateProgression}>
      <IconRefresh size={16} />
    </button>
  </div>

  {#if allSamplesLoaded && contextStarted}
    {#if genChordsOnce}
      <ol class="progressionList">
        {#each progression as chord, idx}
          <li id="blurred" class={idx === activeProgressionIndex ? "live" : ""}>
            <strong>{toRomanNumeral(chord.degree)}</strong>
          </li>
        {/each}
      </ol>
    {/if}
  {/if}
  {#if Tone.Transport.state === "started"}
    <div class="visualizer-container">
      <Visualizer audio={Tone.Master} />
    </div>
  {/if}
  
  {#if allSamplesLoaded && contextStarted && genChordsOnce}
    <div class="scale-indicator">
      {key} {scaleType === "major-pentatonic" ? "Major (Pentatonic)" : scaleType === "major" ? "Major" : "Natural Minor"}
    </div>
  {/if}
</div>

<style>
  .controls {
    position: fixed;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column-reverse;
    justify-content: center;
    align-items: center;
    gap: 5px;
  }

  .play-button {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background-color: white;
    color: black;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .play-button:hover {
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
  }

  .generateBtn {
    background-color: #00000010;
    backdrop-filter: blur(10px);
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 10px;
    outline: none;
  }

  .progressionList {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    list-style: none;
    padding: 0;
    justify-content: center;
    align-items: center;
    z-index: 1;
    white-space: nowrap;
  }

  .progressionList li {
    padding: 5px 10px;
    border: 2px transparent;
    font-family: monospace;
    font-weight: 900;
    font-size: 14px;
    min-width: 30px;
    text-align: center;
  }

  .progressionList li.live {
    border: 2px solid #ffffff66;
  }

  .visualizer-container {
    position: absolute;
    left: 30px;
    bottom: 30px;
    height: 180px;
    overflow: hidden;
    margin-top: 10px;
  }

  .scale-indicator {
    position: fixed;
    bottom: 20px;
    right: 20px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    font-family: monospace;
    text-transform: uppercase;
    letter-spacing: 1px;
    z-index: 5;
    backdrop-filter: blur(5px);
    background-color: rgba(0, 0, 0, 0.3);
    padding: 4px 8px;
    border-radius: 4px;
  }

  @media only screen and (max-width: 600px) {
    .play-button {
      margin-bottom: 40px;
    }
    .progressionList {
      bottom: 0;
      left: 0;
      width: 100vw;
      transform: scale(0.8);
    }
    .visualizer-container {
      display: none;
    }
    .scale-indicator {
      bottom: 10px;
      right: 10px;
      font-size: 10px;
    }
  }
</style>

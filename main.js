// Strudel imports - will be loaded dynamically
let initStrudel, evaluate, note, silence, hush, loadSamples;

// P2P imports
let trystero;

// Initialize Strudel
let strudelInitialized = false;
let isPlaying = false;

// Multi-player state
let room = null;
let peers = new Map(); // Map of peerId -> { name, blocks, code }
let userName = '';
let roomId = '';
let isConnected = false;

// Block management (local user's blocks)
let blocks = [];
let blockIdCounter = 0;

// Preset options for dropdowns
const PRESET_OPTIONS = {
  drumSamples: ['bd', 'sn', 'hh', 'cp', 'oh', 'ride', 'crash', 'tom', 'rim', 'clap', 'perc', '808', '909'],
  scales: ['major', 'minor', 'pentatonic', 'blues', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'harmonic', 'melodic'],
  waves: ['sine', 'saw', 'square', 'triangle'],
  effects: ['reverb', 'delay', 'lpf', 'hpf', 'gain', 'pan'],
  modulationTypes: ['sine', 'saw', 'perlin'],
  modulationTargets: ['lpf', 'hpf', 'gain', 'pan', 'room']
};

// Quick preset blocks for fast drum kit creation
const QUICK_PRESETS = [
  {
    name: 'Kick',
    icon: '🥁',
    blocks: [
      { type: 'sample', params: { sample: 'bd', pattern: 'x ~ ~ ~' } }
    ]
  },
  {
    name: 'Snare',
    icon: '🎵',
    blocks: [
      { type: 'sample', params: { sample: 'sn', pattern: '~ ~ x ~' } }
    ]
  },
  {
    name: 'Hi-Hat',
    icon: '🔔',
    blocks: [
      { type: 'sample', params: { sample: 'hh', pattern: '~ x ~ x' } }
    ]
  },
  {
    name: 'Full Kit',
    icon: '🎤',
    blocks: [
      { type: 'sample', params: { sample: 'bd', pattern: 'x ~ ~ ~ x ~ ~ ~' } },
      { type: 'sample', params: { sample: 'sn', pattern: '~ ~ x ~ ~ ~ x ~' } },
      { type: 'sample', params: { sample: 'hh', pattern: '~ x ~ x ~ x ~ x' } }
    ]
  },
  {
    name: 'House Beat',
    icon: '🏠',
    blocks: [
      { type: 'sample', params: { sample: 'bd', pattern: 'x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~' } },
      { type: 'sample', params: { sample: 'hh', pattern: '~ x ~ x ~ x ~ x ~ x ~ x ~ x ~ x' } }
    ]
  },
  {
    name: 'Breakbeat',
    icon: '🎶',
    blocks: [
      { type: 'sample', params: { sample: 'bd', pattern: 'x*2 ~ x ~ x' } },
      { type: 'sample', params: { sample: 'sn', pattern: '~ ~ x ~ ~ x ~ ~' } },
      { type: 'sample', params: { sample: 'hh', pattern: '~ x ~ x ~ x*2 ~ x' } }
    ]
  }
];

// Block types and their parameters with field types
const BLOCK_TYPES = {
  note: {
    name: 'Note Pattern',
    icon: '🎵',
    defaultParams: {
      pattern: '<c e g>',
      scale: 'major',
      octave: 4
    },
    paramTypes: {
      pattern: 'text',
      scale: 'select',
      octave: 'number'
    },
    generate: (params) => {
      return `n("${params.pattern}").scale("${params.octave === '' ? 'C' : 'C' + params.octave}:${params.scale}")`;
    }
  },
  sample: {
    name: 'Drum Sample',
    icon: '🥁',
    defaultParams: {
      sample: 'bd',
      pattern: 'x ~ x ~'
    },
    paramTypes: {
      sample: 'select',
      pattern: 'text'
    },
    generate: (params) => {
      // Replace pattern characters with actual sample name
      // Convert pattern like "x ~ x ~" to "bd ~ bd ~" using the selected sample
      const samplePattern = params.pattern.replace(/x/g, params.sample);
      return `s("${samplePattern}")`;
    }
  },
  synth: {
    name: 'Synth',
    icon: '🎹',
    defaultParams: {
      pattern: '<c e g>',
      wave: 'sine',
      scale: 'major',
      octave: 4
    },
    paramTypes: {
      pattern: 'text',
      wave: 'select',
      scale: 'select',
      octave: 'number'
    },
    generate: (params) => {
      return `n("${params.pattern}").scale("${params.octave === '' ? 'C' : 'C' + params.octave}:${params.scale}").s("${params.wave}")`;
    }
  },
  effect: {
    name: 'Effect',
    icon: '✨',
    defaultParams: {
      effect: 'reverb',
      room: 0.5
    },
    paramTypes: {
      effect: 'select',
      room: 'number',
      delay: 'number',
      freq: 'number',
      gain: 'number'
    },
    generate: (params) => {
      if (params.effect === 'reverb') {
        return `.room(${params.room || 0.5})`;
      } else if (params.effect === 'delay') {
        return `.delay(${params.delay || 0.25})`;
      } else if (params.effect === 'lpf') {
        return `.lpf(${params.freq || 2000})`;
      } else if (params.effect === 'hpf') {
        return `.hpf(${params.freq || 200})`;
      } else if (params.effect === 'gain') {
        return `.gain(${params.gain || 1})`;
      }
      return '';
    }
  },
  modulation: {
    name: 'Modulation',
    icon: '🌊',
    defaultParams: {
      target: 'lpf',
      type: 'sine',
      speed: 1,
      min: 200,
      max: 2000
    },
    paramTypes: {
      target: 'select',
      type: 'select',
      speed: 'number',
      min: 'number',
      max: 'number'
    },
    generate: (params) => {
      const modFunc = params.type === 'perlin' ? 'perlin' : 'sine';
      return `.${params.target}(${modFunc}.range(${params.min}, ${params.max}).slow(${params.speed}))`;
    }
  },
  structure: {
    name: 'Structure',
    icon: '🏗️',
    defaultParams: {
      type: 'stack',
      amount: 2
    },
    paramTypes: {
      type: 'select',
      amount: 'number',
      n: 'number',
      effect: 'text'
    },
    generate: (params) => {
      if (params.type === 'stack') {
        return `.stack(${params.amount})`;
      } else if (params.type === 'sometimes') {
        return `.sometimes(${params.effect || 'rev'})`;
      } else if (params.type === 'every') {
        return `.every(${params.n || 4}, ${params.effect || 'rev'})`;
      }
      return '';
    }
  }
};

// Drum-focused example patterns - REAL SAMPLES NOW!
const EXAMPLE_PATTERNS = [
  // Drum Patterns - THE MOST IMPORTANT! Using REAL drum samples
  {
    name: '4/4 Kick Pattern',
    description: 'Standard four-on-the-floor',
    code: 's("bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~")',
    category: 'Drums'
  },
  {
    name: 'Full Kit Pattern',
    description: 'Complete drum kit pattern',
    code: 's("bd hh sn hh bd hh sn hh")',
    category: 'Drums'
  },
  {
    name: 'Kick + Snare',
    description: 'Classic kick and snare',
    code: 's("bd ~ sn ~ bd ~ sn ~")',
    category: 'Drums'
  },
  {
    name: 'Breakbeat',
    description: 'Amen-style breakbeat',
    code: 's("bd*2 ~ sn bd ~ sn ~ bd").fast(2).room(0.3)',
    category: 'Drums'
  },
  {
    name: 'Techno Kick',
    description: 'Driving techno pattern',
    code: 's("bd ~ bd ~ bd ~ bd ~").gain(1.1)',
    category: 'Drums'
  },
  {
    name: 'Jungle Breaks',
    description: 'Fast jungle break pattern',
    code: 's("bd*2 ~ sn ~ hh*2 sn ~ bd").fast(4).room(0.5)',
    category: 'Drums'
  },
  {
    name: 'Double Time',
    description: 'Fast double-time pattern',
    code: 's("bd bd sn ~ bd bd sn ~").fast(2)',
    category: 'Drums'
  },
  {
    name: '808 Pattern',
    description: 'Classic 808 pattern',
    code: 's("bd ~ ~ ~ bd ~ ~ sn ~ ~ bd ~ ~ ~ bd")',
    category: 'Drums'
  },
  {
    name: 'Hi-Hat Groove',
    description: 'Hi-hat focused groove',
    code: 's("~ hh ~ hh ~ hh*2 ~ hh").room(0.2)',
    category: 'Drums'
  },
  {
    name: 'Rolling Snare',
    description: 'Snare roll pattern',
    code: 's("~ ~ sn*4 ~ ~ ~ ~")',
    category: 'Drums'
  },
  {
    name: 'Open Hi-Hat Pattern',
    description: 'Open hi-hat accents',
    code: 's("bd ~ oh ~ sn ~ oh ~")',
    category: 'Drums'
  },
  {
    name: 'Cymbal Crash',
    description: 'Crash cymbal accents',
    code: 's("crash ~ ~ ~ ~ crash ~ ~")',
    category: 'Drums'
  },
  // Melodic Patterns
  {
    name: 'Melodic Scale',
    description: 'Ascending scale pattern',
    code: 'n("<0 1 2 3 4 5 6 7>").scale("C4:major")',
    category: 'Melody'
  },
  {
    name: 'Pentatonic Melody',
    description: 'Pentatonic scale melody',
    code: 'n("<0 2 4 7 9 7 4 2>").scale("C4:pentatonic")',
    category: 'Melody'
  },
  {
    name: 'Blues Scale',
    description: 'Classic blues scale pattern',
    code: 'n("<0 3 5 6 7 10 12>").scale("C4:blues")',
    category: 'Melody'
  },
  // Arpeggiators
  {
    name: 'Major Arpeggio',
    description: 'Upward major chord arpeggio',
    code: 'n("0 4 7 12").scale("C4:major").s("sine").lpf(2000)',
    category: 'Arpeggiator'
  },
  {
    name: 'Minor Arpeggio',
    description: 'Minor chord arpeggio pattern',
    code: 'n("0 3 7 12").scale("C4:minor").s("saw").lpf(1500)',
    category: 'Arpeggiator'
  },
  // Chord Builders
  {
    name: 'Major Triad',
    description: 'C major triad',
    code: 'note("c4 e4 g4").s("saw").lpf(3000).room(0.4)',
    category: 'Chords'
  },
  {
    name: 'Minor Triad',
    description: 'C minor triad',
    code: 'note("c4 eb4 g4").s("saw").lpf(3000).room(0.4)',
    category: 'Chords'
  },
  // Bass Lines
  {
    name: 'Deep Bass',
    description: 'Deep sub bass pattern',
    code: 'n("c2 ~ c2 ~ eb2 ~ c2 ~").s("saw").lpf(300).gain(1.2)',
    category: 'Bass'
  },
  {
    name: '808 Bass',
    description: 'Classic 808 sub bass',
    code: 's("bd ~ ~ bd ~ ~ bd ~").lpf(200).gain(1.3)',
    category: 'Bass'
  },
  // Synths
  {
    name: 'Ambient Pad',
    description: 'Slow ambient synth pad',
    code: 'note("<c e g b>").s("saw").lpf(sine.range(500, 5000).slow(4)).room(0.8)',
    category: 'Synth'
  },
  // Effects
  {
    name: 'Reverb Wash',
    description: 'Heavy reverb effect',
    code: 'note("c4").s("sine").gain(sine.range(0.2, 0.8).slow(8)).room(2)',
    category: 'Effects'
  },
  {
    name: 'Filter Sweep',
    description: 'Automated filter sweep',
    code: 's("bd hh sn hh").lpf(sine.range(200, 8000).slow(4))',
    category: 'Effects'
  }
];

// Documentation content
const DOCUMENTATION = {
  'Samples': {
    description: 'Play audio samples. Common samples include: bd, sn, hh, cp, oh, etc.',
    examples: [
      's("bd ~ ~ bd") // Kick drum pattern',
      's("bd hh sn hh").room(0.5) // Full kit with reverb',
      's("bd*2 ~ hh").gain(0.8) // Multiple hits per cycle'
    ]
  },
  'Synths': {
    description: 'Generate sounds using basic waveforms: sine, saw, square, triangle',
    examples: [
      'note("c4 e4 g4").s("sine") // Sine wave triad',
      'note("<c e g b>").s("saw").lpf(2000) // Saw pad with filter',
      'note("c2").s("square").gain(sine.range(0.3, 0.7).slow(4)) // Modulated square'
    ]
  },
  'Effects': {
    description: 'Apply audio effects to patterns',
    examples: [
      '.room(0.5) // Reverb',
      '.delay(0.25) // Delay',
      '.lpf(2000) // Low-pass filter',
      '.hpf(200) // High-pass filter',
      '.gain(0.8) // Volume control'
    ]
  },
  'Modulation': {
    description: 'Modulate parameters using functions like sine, saw, perlin',
    examples: [
      '.lpf(sine.range(500, 5000).slow(4)) // Filter sweep',
      '.gain(sine.range(0.2, 0.8).slow(8)) // Volume modulation',
      '.pan(sine.range(-1, 1).slow(2)) // Panning'
    ]
  },
  'Patterns': {
    description: 'Create complex patterns using mini-notation',
    examples: [
      '"<a b c>" // Random choice',
      '"a*2 b c" // Repeat a twice',
      '"a [b c]" // Polyphony',
      '"[a b] [c d] e" // Multiple polyphony',
      '"[a b]*2 c" // Repeat polyphony'
    ]
  },
  'Scales': {
    description: 'Apply musical scales to note patterns',
    examples: [
      '.scale("C4:major")',
      '.scale("A4:minor")',
      '.scale("G4:pentatonic")',
      '.scale("D4:dorian")'
    ]
  },
  'Structure': {
    description: 'Control how patterns are structured',
    examples: [
      '.stack(2) // Layer multiple times',
      '.sometimes(rev) // Occasionally reverse',
      '.every(4, slow(2)) // Every 4th cycle, slow down',
      '.jux(rev) // Apply effect to right channel'
    ]
  },
  'Time': {
    description: 'Control timing and speed',
    examples: [
      'setcps(0.5) // Set cycles per second',
      '.slow(2) // Slow down by factor',
      '.fast(2) // Speed up by factor',
      '.delay(0.5) // Delay start'
    ]
  }
};

// DOM elements
const blocksContainer = document.getElementById('blocks-container');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const clearBtn = document.getElementById('clear-btn');
const presetBtn = document.getElementById('preset-btn');
const docsBtn = document.getElementById('docs-btn');
const addBlockBtn = document.getElementById('add-block-btn');
const presetModal = document.getElementById('preset-modal');
const docsModal = document.getElementById('docs-modal');
const presetUrlInput = document.getElementById('preset-url');
const loadPresetBtn = document.getElementById('load-preset-btn');
const presetExamplesList = document.getElementById('preset-examples-list');
const docsContent = document.getElementById('docs-content');
const blockSelectModal = document.getElementById('block-select-modal');
const blockTypesList = document.getElementById('block-types-list');
const connectBtn = document.getElementById('connect-btn');
const connectModal = document.getElementById('connect-modal');
const userNameInput = document.getElementById('user-name-input');
const roomIdInput = document.getElementById('room-id-input');
const joinRoomBtn = document.getElementById('join-room-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const roomStatus = document.getElementById('room-status');
const peerCount = document.getElementById('peer-count');
const userNameDisplay = document.getElementById('user-name-display');
const peersContainer = document.getElementById('peers-container');
const copyUrlBtn = document.getElementById('copy-url-btn');
const shareRoomBtn = document.getElementById('share-room-btn');

// Initialize Strudel
async function initializeStrudel() {
  if (strudelInitialized) return;
  
  try {
    // Try importing from npm package first (when using Vite)
    try {
      const strudelModule = await import('@strudel/web');
      initStrudel = strudelModule.initStrudel;
      evaluate = strudelModule.evaluate;
      note = strudelModule.note;
      silence = strudelModule.silence;
      hush = strudelModule.hush;
      loadSamples = strudelModule.loadSamples || strudelModule.load || null;
    } catch (npmError) {
      // Fallback to CDN
      console.log('Trying CDN import...');
      const cdnModule = await import('https://unpkg.com/@strudel/web@latest/dist/strudel.js');
      initStrudel = cdnModule.initStrudel;
      evaluate = cdnModule.evaluate;
      note = cdnModule.note;
      silence = cdnModule.silence;
      hush = cdnModule.hush;
      loadSamples = cdnModule.loadSamples || cdnModule.load || null;
    }
    
    if (!initStrudel || !evaluate) {
      throw new Error('Strudel functions not available');
    }
    
    await initStrudel();
    
    // Load default samples using Strudel's built-in sample loading
    // Use the 'github:tidalcycles/dirt-samples' syntax which is the proper way
    try {
      evaluate(`samples({
        bd: ['bd/BT0AADA.wav', 'bd/BT0AAD0.wav'],
        sn: ['sn/rytm-01-classic.wav', 'sn/rytm-00-hard.wav'],
        sd: ['sn/rytm-01-classic.wav'],
        hh: ['hh27/000_hh27closedhh.wav', 'hh/000_hh3closedhh.wav'],
        cp: ['cp/mask1.wav'],
        oh: ['oh/hihat.wav'],
        ride: ['ride/000_ride1.wav'],
        crash: ['crash/000_crash1.wav'],
        tom: ['tom/000_tom1.wav'],
        rim: ['rim/RIM01.WAV'],
        clap: ['clap/handclap.wav'],
        perc: ['perc/bell1.wav']
      }, 'github:tidalcycles/dirt-samples'); silence()`);
      console.log('Strudel default samples loaded successfully');
    } catch (sampleError) {
      console.warn('Could not load samples, trying alternative:', sampleError);
      // Alternative: try loading without the github: prefix
      try {
        evaluate(`samples({
          bd: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/bd/BT0A0D0.wav',
          sn: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/sn/rytm-01-classic.wav',
          sd: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/sn/rytm-01-classic.wav',
          hh: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/hh/000_hh27closedhh.wav',
          cp: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/cp/mask1.wav',
          oh: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/oh/hihat.wav',
          ride: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/ride/000_ride1.wav',
          crash: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/crash/000_crash1.wav',
          tom: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/tom/000_tom1.wav',
          rim: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/rim/RIM01.WAV',
          clap: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/clap/handclap.wav',
          perc: 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/perc/bell1.wav'
        }, ''); silence()`);
        console.log('Strudel samples loaded via direct URLs');
      } catch (fallbackError) {
        console.error('Sample loading failed completely:', fallbackError);
      }
    }
    
    strudelInitialized = true;
    console.log('Strudel initialized successfully');
    
    // Create embedded REPL
    createEmbeddedREPL();
  } catch (error) {
    console.error('Failed to initialize Strudel:', error);
    alert('Failed to initialize Strudel. Please check your connection and try refreshing the page. Error: ' + error.message);
  }
}

// Create embedded REPL
function createEmbeddedREPL() {
  const replContainer = document.getElementById('repl-container');
  replContainer.innerHTML = `
    <textarea id="code-editor" class="code-editor" spellcheck="false"></textarea>
    <div class="repl-controls">
      <button id="eval-btn" class="btn btn-primary">Evaluate</button>
      <button id="clear-code-btn" class="btn btn-secondary">Clear</button>
    </div>
  `;
  
  const codeEditor = document.getElementById('code-editor');
  const evalBtn = document.getElementById('eval-btn');
  const clearCodeBtn = document.getElementById('clear-code-btn');
  
  codeEditor.style.cssText = `
    width: 100%;
    flex: 1;
    min-height: 400px;
    padding: 1rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    resize: vertical;
    white-space: pre;
    overflow-wrap: normal;
    overflow-x: auto;
  `;
  
  // Sync code changes to peers in multiplayer mode (with debouncing)
  let codeSyncTimeout;
  codeEditor.addEventListener('input', () => {
    if (isConnected && room && room.actions && room.actions.sendCode) {
      // Debounce code sync to avoid spamming peers
      clearTimeout(codeSyncTimeout);
      codeSyncTimeout = setTimeout(() => {
        syncCodeToPeers();
      }, 500); // Wait 500ms after last keystroke
    }
  });
  
  evalBtn.addEventListener('click', () => {
    const code = codeEditor.value;
    if (code.trim() && evaluate) {
      try {
        evaluate(code);
        playBtn.textContent = '⏸ Pause';
      } catch (error) {
        console.error('Evaluation error:', error);
        alert('Error evaluating code: ' + error.message);
      }
    } else if (!evaluate) {
      alert('Strudel is not initialized yet. Please wait...');
    }
  });
  
  clearCodeBtn.addEventListener('click', () => {
    codeEditor.value = '';
    generateCodeFromBlocks();
  });
  
  // Auto-update code when blocks change
  const updateCodeBtn = document.getElementById('update-code-btn');
  updateCodeBtn.addEventListener('click', () => {
    generateCodeFromBlocks();
  });
}

// Generate code from blocks
function generateCodeFromBlocks() {
  const codeEditor = document.getElementById('code-editor');
  if (!codeEditor) return;
  
  const activeBlocks = blocks.filter(b => !b.disabled && !b.muted);
  
  if (activeBlocks.length === 0) {
    if (blocks.length === 0) {
      codeEditor.value = '// No active blocks. Add a block to start making music!';
    } else {
      codeEditor.value = '// All blocks are muted. Unmute blocks to hear them.';
    }
    return;
  }
  
  // Separate blocks by type
  const baseBlocks = activeBlocks.filter(b => ['note', 'synth', 'sample'].includes(b.type));
  const effectBlocks = activeBlocks.filter(b => b.type === 'effect');
  const modulationBlocks = activeBlocks.filter(b => b.type === 'modulation');
  const structureBlocks = activeBlocks.filter(b => b.type === 'structure');
  
  // If no base blocks, show message
  if (baseBlocks.length === 0) {
    codeEditor.value = '// Add a Note, Synth, or Sample block first!';
    return;
  }
  
  // Generate code - combine base patterns or process individually
  const patterns = [];
  
  baseBlocks.forEach((baseBlock, idx) => {
    let patternCode = BLOCK_TYPES[baseBlock.type].generate(baseBlock.params);
    
    // Apply modulations (typically for parameters like lpf, gain, etc.)
    modulationBlocks.forEach(modBlock => {
      const modCode = BLOCK_TYPES.modulation.generate(modBlock.params);
      // For now, modulations are applied as separate chains
      // In a full implementation, you'd want to associate modulations with specific base blocks
    });
    
    // Apply effects
    effectBlocks.forEach(effectBlock => {
      const effectCode = BLOCK_TYPES.effect.generate(effectBlock.params);
      if (effectCode) {
        patternCode += effectCode;
      }
    });
    
    // Apply structures
    structureBlocks.forEach(structBlock => {
      const structCode = BLOCK_TYPES.structure.generate(structBlock.params);
      if (structCode) {
        patternCode += structCode;
      }
    });
    
    patterns.push(patternCode);
  });
  
  // Combine patterns - use stack() to layer them properly
  let code = '';
  if (patterns.length === 0) {
    code = '// No active blocks';
  } else if (patterns.length === 1) {
    code = patterns[0];
  } else {
    // Stack multiple patterns to play them simultaneously
    code = `stack(\n  ${patterns.join(',\n  ')}\n)`;
  }
  
  // Add setcps if not present
  if (!code.includes('setcps') && patterns.length > 0) {
    code = 'setcps(1)\n' + code;
  }
  
  codeEditor.value = code;
  
  // Sync blocks with peers (but not the code itself)
  if (isConnected && room) {
    syncBlocksToPeers();
  }
  
  // Generate and evaluate mixed code from all peers
  if (isConnected) {
    evaluateMixedCode();
  } else {
    // Single player mode - just evaluate local code
    if (isPlaying && strudelInitialized && evaluate && code.trim() && !code.startsWith('//')) {
      try {
        evaluate(code);
      } catch (error) {
        console.warn('Auto-evaluation failed:', error);
      }
    }
  }
}

// Sync blocks to peers (without sharing code)
function syncBlocksToPeers() {
  if (!room || !room.actions || !room.actions.sendBlocks) return;
  
  // Send block metadata (not code) to peers
  const blockData = blocks.map(b => ({
    id: b.id,
    type: b.type,
    muted: b.muted,
    disabled: b.disabled,
    params: b.params
  }));
  
  try {
    room.actions.sendBlocks([blockData, userName]);
  } catch (error) {
    console.warn('Failed to sync blocks:', error);
  }
}

// Sync code to peers
function syncCodeToPeers() {
  if (!room || !room.actions || !room.actions.sendCode) return;
  
  const codeEditor = document.getElementById('code-editor');
  if (!codeEditor) return;
  
  const code = codeEditor.value.trim();
  
  try {
    room.actions.sendCode([code, userName]);
  } catch (error) {
    console.warn('Failed to sync code:', error);
  }
}

// Generate mixed code from all peers
function evaluateMixedCode() {
  if (!isPlaying || !strudelInitialized || !evaluate) return;
  
  // Check if any peer has custom code (not generated from blocks)
  const hasCustomCode = Array.from(peers.values()).some(peer => peer.code && peer.code.trim() && !peer.code.startsWith('//'));
  const codeEditor = document.getElementById('code-editor');
  const localHasCustomCode = codeEditor && codeEditor.value.trim() && !codeEditor.value.startsWith('//') && !codeEditor.value.includes('stack(');
  
  // If using custom code mode, combine all custom code
  if (hasCustomCode || localHasCustomCode) {
    const allCode = [];
    
    // Add local custom code if present
    if (localHasCustomCode) {
      allCode.push(codeEditor.value.trim());
    }
    
    // Add peer custom code
    peers.forEach((peerData) => {
      if (peerData.code && peerData.code.trim() && !peerData.code.startsWith('//')) {
        allCode.push(peerData.code.trim());
      }
    });
    
    if (allCode.length > 0) {
      // Combine custom code from all peers
      let combinedCode = allCode.join('\n\n');
      
      // Only add setcps if not present
      if (!combinedCode.includes('setcps')) {
        combinedCode = 'setcps(1)\n' + combinedCode;
      }
      
      try {
        evaluate(combinedCode);
        return;
      } catch (error) {
        console.warn('Custom code evaluation failed:', error);
        // Fall through to block-based mixing
      }
    }
  }
  
  // Fallback to block-based pattern mixing
  const allPatterns = [];
  
  // Add local patterns from blocks
  const localActiveBlocks = blocks.filter(b => !b.disabled && !b.muted);
  const localBaseBlocks = localActiveBlocks.filter(b => ['note', 'synth', 'sample'].includes(b.type));
  localBaseBlocks.forEach(block => {
    let patternCode = BLOCK_TYPES[block.type].generate(block.params);
    // Apply local effects/modulations to local blocks
    const localEffects = blocks.filter(b => b.type === 'effect' && !b.disabled && !b.muted);
    localEffects.forEach(effectBlock => {
      const effectCode = BLOCK_TYPES.effect.generate(effectBlock.params);
      if (effectCode) patternCode += effectCode;
    });
    allPatterns.push(patternCode);
  });
  
  // Add peer patterns from blocks
  peers.forEach((peerData, peerId) => {
    if (!peerData.blocks) return;
    peerData.blocks.forEach(block => {
      if (block.disabled || block.muted) return;
      if (!['note', 'synth', 'sample'].includes(block.type)) return;
      const patternCode = BLOCK_TYPES[block.type].generate(block.params);
      allPatterns.push(patternCode);
    });
  });
  
  if (allPatterns.length === 0) return;
  
  // Mix all patterns together
  let mixedCode = '';
  if (allPatterns.length === 1) {
    mixedCode = allPatterns[0];
  } else {
    mixedCode = `stack(\n  ${allPatterns.join(',\n  ')}\n)`;
  }
  
  if (!mixedCode.includes('setcps')) {
    mixedCode = 'setcps(1)\n' + mixedCode;
  }
  
  try {
    evaluate(mixedCode);
  } catch (error) {
    console.warn('Mixed code evaluation failed:', error);
  }
}

// Create a block
function createBlock(type) {
  const blockType = BLOCK_TYPES[type];
  if (!blockType) return;
  
  const block = {
    id: blockIdCounter++,
    type: type,
    muted: false,
    disabled: false,
    params: { ...blockType.defaultParams }
  };
  
  blocks.push(block);
  renderBlock(block);
  generateCodeFromBlocks();
}

// Render a block with proper form controls
function renderBlock(block) {
  // Remove old block if exists
  const oldBlock = document.getElementById(`block-${block.id}`);
  if (oldBlock) {
    oldBlock.remove();
  }
  
  const blockElement = document.createElement('div');
  blockElement.className = `block ${block.muted ? 'muted' : ''} ${block.disabled ? 'disabled' : ''}`;
  blockElement.id = `block-${block.id}`;
  
  const blockType = BLOCK_TYPES[block.type];
  
  let paramsHTML = '';
  Object.keys(block.params).forEach(key => {
    const value = block.params[key];
    const paramType = blockType.paramTypes?.[key] || 'text';
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    
    if (paramType === 'select') {
      // Determine which options to use
      let options = [];
      if (key === 'sample') {
        options = PRESET_OPTIONS.drumSamples;
      } else if (key === 'scale') {
        options = PRESET_OPTIONS.scales;
      } else if (key === 'wave') {
        options = PRESET_OPTIONS.waves;
      } else if (key === 'effect') {
        options = PRESET_OPTIONS.effects;
      } else if (key === 'type' && block.type === 'modulation') {
        options = PRESET_OPTIONS.modulationTypes;
      } else if (key === 'target' && block.type === 'modulation') {
        options = PRESET_OPTIONS.modulationTargets;
      } else if (key === 'type' && block.type === 'structure') {
        options = ['stack', 'sometimes', 'every'];
      }
      
      paramsHTML += `
        <div class="param-group">
          <label class="param-label">${label}</label>
          <select class="param-select" data-param="${key}" data-block="${block.id}">
            ${options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </div>
      `;
    } else if (paramType === 'number') {
      paramsHTML += `
        <div class="param-group">
          <label class="param-label">${label}</label>
          <input type="number" class="param-input" data-param="${key}" data-block="${block.id}" value="${value}" step="0.1">
        </div>
      `;
    } else {
      paramsHTML += `
        <div class="param-group">
          <label class="param-label">${label}</label>
          <input type="text" class="param-input" data-param="${key}" data-block="${block.id}" value="${value}">
        </div>
      `;
    }
  });
  
  blockElement.innerHTML = `
    <div class="block-header">
      <div class="block-title">${blockType.icon} ${blockType.name}</div>
      <div class="block-controls">
        <button class="block-control-btn mute-btn ${block.muted ? 'active' : ''}" data-block="${block.id}" data-muted="${block.muted}" title="${block.muted ? 'Unmute' : 'Mute'}">${block.muted ? '🔇' : '🔊'}</button>
        <button class="block-control-btn enable-btn ${!block.disabled ? 'active' : ''}" data-block="${block.id}" data-enabled="${!block.disabled}">✓</button>
        <button class="block-control-btn delete-btn" data-block="${block.id}">🗑</button>
      </div>
    </div>
    <div class="block-params">
      ${paramsHTML}
    </div>
    <div class="block-code">${blockType.generate(block.params)}</div>
  `;
  
  blocksContainer.appendChild(blockElement);
  
  // Add event listeners - CRITICAL: use closure to capture the block reference
  const muteBtn = blockElement.querySelector('.mute-btn');
  const enableBtn = blockElement.querySelector('.enable-btn');
  const deleteBtn = blockElement.querySelector('.delete-btn');
  const paramInputs = blockElement.querySelectorAll('.param-input, .param-select');
  
  // FIXED: Proper mute/unmute with closure
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Update the block object directly
    block.muted = !block.muted;
    
    // Update UI immediately
    muteBtn.classList.toggle('active');
    muteBtn.textContent = block.muted ? '🔇' : '🔊';
    muteBtn.title = block.muted ? 'Unmute' : 'Mute';
    muteBtn.setAttribute('data-muted', block.muted);
    blockElement.classList.toggle('muted');
    
    // Regenerate code
    generateCodeFromBlocks();
  });
  
  enableBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    block.disabled = !block.disabled;
    enableBtn.classList.toggle('active');
    enableBtn.setAttribute('data-enabled', !block.disabled);
    blockElement.classList.toggle('disabled');
    generateCodeFromBlocks();
  });
  
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    blocks = blocks.filter(b => b.id !== block.id);
    blockElement.remove();
    generateCodeFromBlocks();
  });
  
  paramInputs.forEach(input => {
    input.addEventListener('change', () => {
      block.params[input.dataset.param] = input.type === 'number' ? parseFloat(input.value) : input.value;
      const blockCode = blockElement.querySelector('.block-code');
      blockCode.textContent = blockType.generate(block.params);
      generateCodeFromBlocks();
    });
  });
}

// Render all blocks
function renderBlocks() {
  blocksContainer.innerHTML = '';
  blocks.forEach(block => renderBlock(block));
}

// Load preset from URL
async function loadPresetFromURL(url) {
  try {
    // Convert GitHub raw URL if needed
    if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
      url = url.replace('/blob/', '/').replace('github.com', 'raw.githubusercontent.com');
    }
    
    // Convert Gist URL
    if (url.includes('gist.github.com')) {
      url = url.replace('/gist.github.com/', '/gist.githubusercontent.com/') + '/raw';
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch preset');
    
    const text = await response.text();
    const preset = JSON.parse(text);
    
    if (preset.blocks && Array.isArray(preset.blocks)) {
      blocks = preset.blocks.map(b => ({ ...b, id: blockIdCounter++ }));
      renderBlocks();
      generateCodeFromBlocks();
      closeModal(presetModal);
      alert('Preset loaded successfully!');
    } else {
      throw new Error('Invalid preset format');
    }
  } catch (error) {
    console.error('Error loading preset:', error);
    alert('Failed to load preset: ' + error.message);
  }
}

// Render documentation
function renderDocumentation() {
  docsContent.innerHTML = '';
  
  Object.keys(DOCUMENTATION).forEach(category => {
    const section = DOCUMENTATION[category];
    const sectionElement = document.createElement('div');
    sectionElement.className = 'docs-section';
    
    let examplesHTML = section.examples.map(ex => `<code>${ex}</code>`).join('');
    
    sectionElement.innerHTML = `
      <h3>${category}</h3>
      <p>${section.description}</p>
      ${examplesHTML}
    `;
    
    docsContent.appendChild(sectionElement);
  });
}

// Create preset blocks
function createPresetBlocks(preset) {
  preset.blocks.forEach(blockDef => {
    const block = {
      id: blockIdCounter++,
      type: blockDef.type,
      muted: false,
      disabled: false,
      params: { ...blockDef.params }
    };
    blocks.push(block);
    renderBlock(block);
  });
  generateCodeFromBlocks();
  closeModal(blockSelectModal);
}

// Render block types selection
function renderBlockTypes() {
  blockTypesList.innerHTML = '';
  
  // Quick Presets Section
  const presetSection = document.createElement('div');
  presetSection.style.cssText = 'grid-column: 1 / -1; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);';
  presetSection.innerHTML = '<h3 style="margin-bottom: 0.75rem; color: var(--accent-primary);">Quick Presets (Add Multiple Blocks)</h3>';
  blockTypesList.appendChild(presetSection);
  
  QUICK_PRESETS.forEach(preset => {
    const card = document.createElement('div');
    card.className = 'block-type-card';
    card.innerHTML = `
      <div class="icon">${preset.icon}</div>
      <h4>${preset.name}</h4>
      <p>Add ${preset.blocks.length} block${preset.blocks.length > 1 ? 's' : ''}</p>
    `;
    
    card.addEventListener('click', () => {
      createPresetBlocks(preset);
    });
    
    blockTypesList.appendChild(card);
  });
  
  // Regular Block Types Section
  const typesSection = document.createElement('div');
  typesSection.style.cssText = 'grid-column: 1 / -1; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);';
  typesSection.innerHTML = '<h3 style="margin-bottom: 0.75rem; color: var(--accent-primary);">Individual Blocks</h3>';
  blockTypesList.appendChild(typesSection);
  
  Object.keys(BLOCK_TYPES).forEach(typeKey => {
    const blockType = BLOCK_TYPES[typeKey];
    const card = document.createElement('div');
    card.className = 'block-type-card';
    card.innerHTML = `
      <div class="icon">${blockType.icon}</div>
      <h4>${blockType.name}</h4>
      <p>Click to add</p>
    `;
    
    card.addEventListener('click', () => {
      createBlock(typeKey);
      closeModal(blockSelectModal);
    });
    
    blockTypesList.appendChild(card);
  });
}

// Render preset examples
function renderPresetExamples() {
  presetExamplesList.innerHTML = '';
  
  // Group patterns by category
  const categories = {};
  EXAMPLE_PATTERNS.forEach(pattern => {
    if (!categories[pattern.category]) {
      categories[pattern.category] = [];
    }
    categories[pattern.category].push(pattern);
  });
  
  // Create sections for each category - DRUMS FIRST!
  const sortedCategories = Object.keys(categories).sort((a, b) => {
    if (a === 'Drums') return -1;
    if (b === 'Drums') return 1;
    return a.localeCompare(b);
  });
  
  sortedCategories.forEach(category => {
    const categoryTitle = document.createElement('h4');
    categoryTitle.className = 'preset-category-title';
    categoryTitle.textContent = category;
    categoryTitle.style.cssText = 'grid-column: 1 / -1; margin-top: 1rem; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--accent-primary); font-weight: 600;';
    presetExamplesList.appendChild(categoryTitle);
    
    categories[category].forEach(pattern => {
      const card = document.createElement('div');
      card.className = 'preset-example-card';
      card.innerHTML = `
        <h4>${pattern.name}</h4>
        <p>${pattern.description}</p>
      `;
      
      card.addEventListener('click', () => {
        const codeEditor = document.getElementById('code-editor');
        if (codeEditor) {
          codeEditor.value = pattern.code;
        }
        closeModal(presetModal);
      });
      
      presetExamplesList.appendChild(card);
    });
  });
}

// Modal functions
function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

// Event listeners
playBtn.addEventListener('click', async () => {
  if (!strudelInitialized) {
    await initializeStrudel();
  }
  
  const codeEditor = document.getElementById('code-editor');
  if (codeEditor && codeEditor.value.trim() && evaluate) {
    try {
      evaluate(codeEditor.value);
      isPlaying = true;
      playBtn.textContent = '⏸ Pause';
    } catch (error) {
      console.error('Play error:', error);
      alert('Error playing code: ' + error.message);
      isPlaying = false;
    }
  } else if (!evaluate) {
    alert('Strudel is not initialized yet. Please wait...');
  }
});

stopBtn.addEventListener('click', () => {
  if (hush) {
    try {
      hush();
      isPlaying = false;
      playBtn.textContent = '▶ Play';
    } catch (error) {
      console.error('Stop error:', error);
      // Fallback to evaluate
      if (evaluate) {
        try {
          evaluate('hush()');
          isPlaying = false;
          playBtn.textContent = '▶ Play';
        } catch (evalError) {
          console.error('Stop fallback error:', evalError);
        }
      }
    }
  } else if (evaluate) {
    try {
      evaluate('hush()');
      isPlaying = false;
      playBtn.textContent = '▶ Play';
    } catch (error) {
      console.error('Stop error:', error);
    }
  }
});

clearBtn.addEventListener('click', () => {
  if (confirm('Clear all blocks?')) {
    blocks = [];
    renderBlocks();
    generateCodeFromBlocks();
  }
});

addBlockBtn.addEventListener('click', () => {
  renderBlockTypes();
  openModal(blockSelectModal);
});

presetBtn.addEventListener('click', () => {
  openModal(presetModal);
  renderPresetExamples();
});

docsBtn.addEventListener('click', () => {
  renderDocumentation();
  openModal(docsModal);
});

loadPresetBtn.addEventListener('click', () => {
  const url = presetUrlInput.value.trim();
  if (url) {
    loadPresetFromURL(url);
  } else {
    alert('Please enter a URL');
  }
});


// Initialize Trystero and P2P
async function initializeP2P() {
  try {
    // Try IPFS first (no signup required)
    const trysteroIPFS = await import('trystero/ipfs');
    trystero = trysteroIPFS.joinRoom;
    console.log('Trystero (IPFS) loaded successfully');
  } catch (ipfsError) {
    console.error('Failed to load Trystero IPFS:', ipfsError);
    // Fallback to Firebase (requires config but more reliable)
    try {
      const trysteroFirebase = await import('trystero/firebase');
      trystero = trysteroFirebase.joinRoom;
      console.log('Trystero (Firebase) loaded successfully');
    } catch (firebaseError) {
      console.error('Failed to load Trystero Firebase:', firebaseError);
      alert('P2P functionality unavailable. Please check your connection.');
    }
  }
}

// Initialize room connection
function initializeRoom(config) {
  if (!trystero) {
    alert('Trystero not loaded. Please refresh the page.');
    return;
  }
  
  try {
    room = trystero(config, roomId);
    
    // Create action for sending blocks
    const [sendBlocks, getBlocks] = room.makeAction('blocks');
    
    // Create action for sending code
    const [sendCode, getCode] = room.makeAction('code');
    
    // Store actions for use in sync functions
    room.actions = { sendBlocks, sendCode };
    
    // Set up block receive handler
    getBlocks((data, peerId) => {
      const [receivedBlocks, peerName] = data || [[], 'Unknown'];
      console.log('Received blocks from:', peerName, peerId);
      
      if (!peers.has(peerId)) {
        peers.set(peerId, { name: peerName, blocks: [], code: '' });
        updatePeersDisplay();
      }
      peers.get(peerId).blocks = receivedBlocks;
      peers.get(peerId).name = peerName; // Update name in case it changed
      updatePeersDisplay();
      
      // Re-evaluate mixed code if playing
      if (isPlaying) {
        evaluateMixedCode();
      }
    });
    
    // Set up code receive handler
    getCode((data, peerId) => {
      const [receivedCode, peerName] = data || ['', 'Unknown'];
      console.log('Received code from:', peerName, peerId);
      
      if (!peers.has(peerId)) {
        peers.set(peerId, { name: peerName, blocks: [], code: '' });
        updatePeersDisplay();
      }
      peers.get(peerId).code = receivedCode;
      peers.get(peerId).name = peerName; // Update name in case it changed
      updatePeersDisplay();
      
      // Re-evaluate mixed code if playing (including custom code from peers)
      if (isPlaying) {
        evaluateMixedCode();
      }
    });
    
    // Peer connection/disconnection handlers
    room.onPeerJoin((peerId) => {
      console.log('Peer joined:', peerId);
      if (!peers.has(peerId)) {
        peers.set(peerId, { name: 'Unknown', blocks: [], code: '' });
      }
      updatePeersDisplay();
      
      // Send our blocks and code to the new peer
      setTimeout(() => {
        syncBlocksToPeers();
        syncCodeToPeers();
      }, 500);
    });
    
    room.onPeerLeave((peerId) => {
      console.log('Peer left:', peerId);
      peers.delete(peerId);
      updatePeersDisplay();
      
      // Re-evaluate if playing
      if (isPlaying) {
        evaluateMixedCode();
      }
    });
    
    // Send initial blocks and code on join
    setTimeout(() => {
      syncBlocksToPeers();
      syncCodeToPeers();
    }, 1000);
    
    isConnected = true;
    updateConnectionUI();
    
  } catch (error) {
    console.error('Failed to initialize room:', error);
    alert('Failed to connect to room: ' + error.message);
  }
}

// Update connection UI
function updateConnectionUI() {
  if (isConnected) {
    roomStatus.textContent = 'Connected';
    roomStatus.classList.add('connected');
    connectBtn.textContent = 'Disconnect';
    peerCount.textContent = `${peers.size} peer${peers.size !== 1 ? 's' : ''}`;
    userNameDisplay.textContent = userName || 'You';
    userNameDisplay.style.display = 'inline-block';
    if (shareRoomBtn) {
      shareRoomBtn.style.display = 'inline-block';
    }
  } else {
    roomStatus.textContent = 'Disconnected';
    roomStatus.classList.remove('connected');
    connectBtn.textContent = '🔗 Connect';
    peerCount.textContent = '0 peers';
    userNameDisplay.style.display = 'none';
    if (shareRoomBtn) {
      shareRoomBtn.style.display = 'none';
    }
    peers.clear();
    updatePeersDisplay();
  }
}

// Update peers display
function updatePeersDisplay() {
  peersContainer.innerHTML = '';
  
  if (peers.size === 0) {
    peersContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem; text-align: center; padding: 2rem;">No other players connected</p>';
    peerCount.textContent = '0 peers';
    return;
  }
  
  peerCount.textContent = `${peers.size} peer${peers.size !== 1 ? 's' : ''}`;
  
  peers.forEach((peerData, peerId) => {
    const card = document.createElement('div');
    card.className = 'peer-card';
    const blockCount = peerData.blocks ? peerData.blocks.filter(b => !b.disabled && !b.muted).length : 0;
    const hasCode = peerData.code && peerData.code.trim() && !peerData.code.startsWith('//');
    card.innerHTML = `
      <h4>${peerData.name || 'Unknown'}</h4>
      <div class="peer-status">Active</div>
      <div class="peer-blocks">
        ${blockCount > 0 ? `${blockCount} active block${blockCount !== 1 ? 's' : ''}` : ''}
        ${hasCode ? (blockCount > 0 ? ' + custom code' : 'Custom code') : ''}
      </div>
    `;
    peersContainer.appendChild(card);
  });
}

// Connection event handlers
connectBtn.addEventListener('click', () => {
  if (isConnected) {
    // Disconnect
    if (room) {
      room.leave();
      room = null;
    }
    isConnected = false;
    updateConnectionUI();
    
    // Remove room ID from URL
    const url = new URL(window.location);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
  } else {
    // Show connect modal
    openModal(connectModal);
    // Read room ID from URL if not already set
    if (!roomIdInput.value) {
      readRoomIdFromURL();
      // Generate random room ID if still empty
      if (!roomIdInput.value) {
        roomIdInput.value = Math.random().toString(36).substring(2, 9);
      }
    }
  }
});

createRoomBtn.addEventListener('click', () => {
  const newRoomId = Math.random().toString(36).substring(2, 9);
  roomIdInput.value = newRoomId;
  updateURLWithRoomId(newRoomId);
});

joinRoomBtn.addEventListener('click', () => {
  const name = userNameInput.value.trim();
  let roomName = roomIdInput.value.trim();
  
  if (!name) {
    alert('Please enter your name');
    return;
  }
  
  // If no room ID provided, generate one
  if (!roomName) {
    roomName = Math.random().toString(36).substring(2, 9);
    roomIdInput.value = roomName;
  }
  
  userName = name;
  roomId = roomName;
  
  // Update URL with room ID
  updateURLWithRoomId(roomId);
  
  // Trystero config - using IPFS (no signup required)
  // For production, consider Firebase or custom signaling server
  const config = {
    announce: ['/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star']
  };
  
  initializeRoom(config);
  closeModal(connectModal);
});

// Update URL with room ID
function updateURLWithRoomId(roomId) {
  const url = new URL(window.location);
  url.searchParams.set('room', roomId);
  window.history.pushState({ room: roomId }, '', url);
}

// Read room ID from URL on page load
function readRoomIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomIdFromURL = urlParams.get('room');
  if (roomIdFromURL) {
    roomIdInput.value = roomIdFromURL;
    roomId = roomIdFromURL;
  }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomIdFromURL = urlParams.get('room');
  if (roomIdFromURL && roomIdFromURL !== roomId && isConnected) {
    // User navigated to a different room - disconnect and reconnect
    if (room) {
      room.leave();
      room = null;
    }
    isConnected = false;
    updateConnectionUI();
    
    // Auto-join new room if user was connected
    roomId = roomIdFromURL;
    roomIdInput.value = roomId;
    if (userName) {
      const config = {
        announce: ['/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star']
      };
      initializeRoom(config);
    }
  } else if (!roomIdFromURL && isConnected) {
    // Room ID removed from URL - disconnect
    if (room) {
      room.leave();
      room = null;
    }
    isConnected = false;
    updateConnectionUI();
  }
});

// Close modals
document.querySelectorAll('.close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    const modal = closeBtn.closest('.modal');
    closeModal(modal);
  });
});

// Close modals on outside click
[presetModal, docsModal, blockSelectModal, connectModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
});

// Copy room URL to clipboard
function copyRoomURL() {
  const currentRoomId = roomId || roomIdInput.value.trim();
  if (currentRoomId) {
    const url = new URL(window.location);
    url.searchParams.set('room', currentRoomId);
    navigator.clipboard.writeText(url.toString()).then(() => {
      // Update button text temporarily
      if (copyUrlBtn) {
        copyUrlBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyUrlBtn.textContent = '📋 Copy Room URL';
        }, 2000);
      }
      if (shareRoomBtn) {
        shareRoomBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          shareRoomBtn.textContent = '📋 Share Room';
        }, 2000);
      }
      // Show brief notification
      const notification = document.createElement('div');
      notification.textContent = 'Room URL copied to clipboard!';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy URL:', err);
      alert('Failed to copy URL. Room ID: ' + currentRoomId);
    });
  } else {
    alert('No room ID available');
  }
}

if (copyUrlBtn) {
  copyUrlBtn.addEventListener('click', copyRoomURL);
}

if (shareRoomBtn) {
  shareRoomBtn.addEventListener('click', copyRoomURL);
}

// Initialize
readRoomIdFromURL();
initializeP2P();
initializeStrudel().then(() => {
  generateCodeFromBlocks();
  updateConnectionUI();
});

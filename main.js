// Strudel imports - will be loaded dynamically
let initStrudel, evaluate, note, silence, hush, loadSamples;

// Initialize Strudel
let strudelInitialized = false;

// Block management
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
      return `n("${params.pattern}").scale('${params.scale}${params.octave}')`;
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
      return `s("${params.pattern}")`;
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
      return `n("${params.pattern}").scale('${params.scale}${params.octave}').s('${params.wave}')`;
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

// Drum-focused example patterns
const EXAMPLE_PATTERNS = [
  // Drum Patterns - THE MOST IMPORTANT!
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
    code: 'n("<0 1 2 3 4 5 6 7>").scale("C4 major")',
    category: 'Melody'
  },
  {
    name: 'Pentatonic Melody',
    description: 'Pentatonic scale melody',
    code: 'n("<0 2 4 7 9 7 4 2>").scale("C4 pentatonic")',
    category: 'Melody'
  },
  {
    name: 'Blues Scale',
    description: 'Classic blues scale pattern',
    code: 'n("<0 3 5 6 7 10 12>").scale("C4 blues")',
    category: 'Melody'
  },
  // Arpeggiators
  {
    name: 'Major Arpeggio',
    description: 'Upward major chord arpeggio',
    code: 'n("0 4 7 12").scale("C4 major").s("sine").lpf(2000)',
    category: 'Arpeggiator'
  },
  {
    name: 'Minor Arpeggio',
    description: 'Minor chord arpeggio pattern',
    code: 'n("0 3 7 12").scale("C4 minor").s("saw").lpf(1500)',
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
      '.scale("C4 major")',
      '.scale("A4 minor")',
      '.scale("G4 pentatonic")',
      '.scale("D4 dorian")'
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
    
    // Load sound samples - CRITICAL for drum samples to work!
    if (loadSamples) {
      try {
        await loadSamples();
        console.log('Strudel samples loaded successfully');
      } catch (sampleError) {
        console.warn('Could not load samples via loadSamples(), trying alternative method:', sampleError);
        // Try alternative: evaluate code to load samples
        try {
          await evaluate('loadSamples()');
          console.log('Strudel samples loaded via evaluate');
        } catch (evalError) {
          console.warn('Could not load samples, trying direct load:', evalError);
          // Final fallback: load via code
          try {
            await evaluate('await loadSamples()');
          } catch (e) {
            console.error('Failed to load samples:', e);
          }
        }
      }
    } else {
      // Fallback: use evaluate to load samples
      try {
        await evaluate('await loadSamples()');
        console.log('Strudel samples loaded via evaluate fallback');
      } catch (evalError) {
        console.warn('Sample loading may have failed:', evalError);
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
  
  // Combine patterns (stack them or separate with newlines)
  let code = '';
  if (patterns.length === 1) {
    code = patterns[0];
  } else {
    // Multiple patterns - combine them
    code = patterns.join('\n');
  }
  
  // Add setcps if not present
  if (!code.includes('setcps')) {
    code = 'setcps(1)\n' + code;
  }
  
  codeEditor.value = code;
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

// Render block types selection
function renderBlockTypes() {
  blockTypesList.innerHTML = '';
  
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
      playBtn.textContent = '⏸ Pause';
    } catch (error) {
      console.error('Play error:', error);
      alert('Error playing code: ' + error.message);
    }
  } else if (!evaluate) {
    alert('Strudel is not initialized yet. Please wait...');
  }
});

stopBtn.addEventListener('click', () => {
  if (hush) {
    try {
      hush();
      playBtn.textContent = '▶ Play';
    } catch (error) {
      console.error('Stop error:', error);
      // Fallback to evaluate
      if (evaluate) {
        try {
          evaluate('hush()');
          playBtn.textContent = '▶ Play';
        } catch (evalError) {
          console.error('Stop fallback error:', evalError);
        }
      }
    }
  } else if (evaluate) {
    try {
      evaluate('hush()');
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

// Close modals
document.querySelectorAll('.close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    const modal = closeBtn.closest('.modal');
    closeModal(modal);
  });
});

// Close modals on outside click
[presetModal, docsModal, blockSelectModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
});

// Initialize
initializeStrudel().then(() => {
  generateCodeFromBlocks();
});

# 🎵 Strudelism

A beautiful web-based UI for live Strudel performances. Enable performers to create, modify, mute, and control Strudel blocks visually without writing code (unless they want to).

## Features

- **Block-Based Interface**: Create musical patterns using visual blocks instead of typing code
- **Live Performance Controls**: Mute, enable, disable, and modify blocks in real-time
- **Embedded REPL**: View and edit the generated Strudel code directly
- **Preset System**: Load patterns from GitHub/Gist URLs
- **Comprehensive Examples**: Built-in examples covering all Strudel functionalities
- **Documentation**: Built-in documentation to inspire performers
- **Static Web App**: No server required - works entirely client-side

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This will start a development server at `http://localhost:3000`

### Build

```bash
npm run build
```

The built files will be in the `dist` directory, ready for static hosting.

## Usage

### Adding Blocks

1. Click the "+ Add Block" button
2. Select a block type from the modal:
   - **Note Pattern**: Create melodic patterns with scales
   - **Sample**: Play audio samples
   - **Synth**: Generate sounds with waveforms
   - **Effect**: Apply audio effects (reverb, delay, filters, etc.)
   - **Modulation**: Modulate parameters with functions
   - **Structure**: Control pattern structure (stack, sometimes, every)

### Block Controls

Each block has three controls:
- **Mute (🔇)**: Temporarily disable the block without removing it
- **Enable (✓)**: Toggle block on/off
- **Delete (🗑)**: Remove the block completely

### Editing Blocks

- Click on any parameter field to edit it
- Changes are automatically reflected in the code editor
- The code updates in real-time as you modify blocks

### Code Editor

- The REPL panel shows the generated Strudel code
- You can edit the code directly if you want more control
- Click "Evaluate" to play the code
- Click "Refresh" to regenerate code from blocks

### Loading Presets

1. Click "📥 Load Preset"
2. Enter a GitHub or Gist URL containing a JSON preset file
3. Or choose from the built-in examples

#### Preset Format

Presets should be JSON files with the following format:

```json
{
  "blocks": [
    {
      "type": "note",
      "muted": false,
      "disabled": false,
      "params": {
        "pattern": "<c e g>",
        "scale": "major",
        "octave": 4
      }
    }
  ]
}
```

#### Example Preset URLs

- GitHub raw URL: `https://raw.githubusercontent.com/username/repo/main/preset.json`
- Gist URL: `https://gist.githubusercontent.com/username/gist-id/raw`

### Examples & Documentation

Click "📚 Examples" to view:
- Comprehensive documentation for all Strudel features
- Code examples for each functionality
- Inspiration for creating patterns

## Block Types

### Note Pattern
Creates melodic patterns with musical scales.

**Parameters:**
- `pattern`: Mini-notation pattern (e.g., "<c e g>")
- `scale`: Scale name (e.g., "major", "minor")
- `octave`: Octave number (default: 4)

### Sample
Plays audio samples.

**Parameters:**
- `sample`: Sample name (e.g., "bd", "sn", "hh")
- `pattern`: Trigger pattern (e.g., "x ~ x ~")

### Synth
Generates sounds using waveforms.

**Parameters:**
- `pattern`: Note pattern
- `wave`: Waveform type (sine, saw, square, triangle)
- `octave`: Octave number

### Effect
Applies audio effects to patterns.

**Parameters:**
- `effect`: Effect type (reverb, delay, lpf, hpf, gain)
- Additional parameters vary by effect type

### Modulation
Modulates parameters using functions.

**Parameters:**
- `type`: Modulation function (sine, saw, perlin)
- `speed`: Modulation speed
- `range`: Value range (e.g., "0.5 1")

### Structure
Controls pattern structure and timing.

**Parameters:**
- `type`: Structure type (stack, sometimes, every)
- Additional parameters vary by type

## Keyboard Shortcuts

- `Space`: Play/Pause (coming soon)
- `S`: Stop (coming soon)

## Browser Support

- Modern browsers with ES6 support
- Chrome/Edge (recommended)
- Firefox
- Safari

## Deployment

### GitHub Pages

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

1. **Enable GitHub Pages:**
   - Go to your repository Settings → Pages
   - Under "Source", select "GitHub Actions"
   - The workflow will automatically deploy on pushes to `main`

2. **Automatic Deployment:**
   - Push to the `main` branch
   - GitHub Actions will build and deploy automatically
   - Your site will be available at `https://yourusername.github.io/strudelism/`

3. **Manual Deployment:**
   - You can also trigger deployment manually via the Actions tab → "Deploy to GitHub Pages" → "Run workflow"

### Other Static Hosting

The `dist/` folder can be deployed to any static hosting service:
- **Netlify:** Drag and drop the `dist/` folder or connect your Git repository
- **Vercel:** `vercel --prod` or connect via Git
- **Cloudflare Pages:** Connect repository or upload `dist/` folder

## License

This project is licensed under the AGPL-3.0 license, same as Strudel.

## Credits

Built with:
- [Strudel](https://strudel.cc/) - The live coding environment
- [Vite](https://vitejs.dev/) - Build tool
- [@strudel/web](https://www.npmjs.com/package/@strudel/web) - Strudel web package

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Resources

- [Strudel Documentation](https://strudel.cc/)
- [Strudel on GitHub](https://github.com/tidalcycles/strudel)
- [Strudel Technical Manual](https://strudel.cc/technical-manual/project-start/)


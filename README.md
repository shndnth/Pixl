<div align="center">
  
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/HTML.svg" width="30" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/CSS.svg" width="30" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/JavaScript.svg" width="30" />

  <h1>Pixl</h1>
  <p><b>Premium Procedural Pixel Art & Sprite Studio</b></p>
  <p>Generate infinite, mathematically unique pixel graphics, game assets, and seamless patterns entirely in your browser.</p>

</div>

---

## ✨ Overview

**Pixl.** is a zero-dependency, client-side rendering engine that mathematically generates unique pixel art, vintage sprites, and complex geometric patterns using seeded random number generation. 

Built with pure Vanilla HTML, CSS, and JavaScript, it utilizes the HTML5 Canvas API for raw pixel manipulation and layout. Because it runs 100% locally in your browser, it requires no build steps, no backend servers, and offers lightning-fast generation perfectly suited for rapid asset creation and ideation.

## 🚀 Key Features

### 🧩 Algorithmic Art Engine
* **Cellular Automata (Islands):** Generates organic, island-like landmasses using multi-pass neighbor-counting logic.
* **Random Walkers (Maze):** Uses directional step algorithms to carve out intricate, labyrinthine paths.
* **Mathematical Patterns:** Utilizes sine/cosine waves and distance formulas to generate woven **Quilts** and concentric **Rings**.
* **Classic Sprites:** Generates traditional, center-weighted retro game entities.
* **Totems:** Builds vertically stacked, segmented architectural structures.

### 🎨 Color & Symmetry Control
* **Procedural Palettes:** Automatically generates harmonious color schemes across specific aesthetic constraints (**Neon, Retro, Sunset, Mono**, or completely **Random**).
* **Matrix Mirroring:** Force structural symmetry via Vertical, Horizontal, or Quad mirroring passes.
* **Post-Processing:** Apply destructive effects to the final grid, including outlining, color inversion, and retro checkerboard dithering.
* **Chaos Mode:** Selectively bypasses symmetry constraints to introduce organic, localized entropy into the design.

### ⚙️ Professional Workflow Utilities
* **Deterministic Seeding:** Every generation is tied to an exact alphanumeric seed. Share, copy, or lock seeds to reliably recreate exact graphical states.
* **Studio Automation:** Toggle "Auto" mode with variable speeds to turn the studio into an autonomous art gallery.
* **Batch Processing:** Instantly generate 5 seeded variations with a single click.
* **Non-Destructive History:** A visual filmstrip automatically tracks your last 5 generations, allowing you to seamlessly click backward and forward through time.
* **Native Export:** One-click download to save the current `<canvas>` state as a crisp, scaled PNG.

### 📱 Premium Native UI/UX
* **Custom Component Architecture:** Intercepts native, clunky `<select>` dropdowns and rebuilds them into fully styled, custom HTML/CSS option menus.
* **Responsive Workspace:** Utilizes strict CSS Grid and Flexbox to create an app-like layout that perfectly centers itself and adapts flawlessly to mobile viewports.
* **Keyboard Shortcuts:** Keep your workflow fast with mapped hotkeys (`Space` to Generate, `R` to Remix, `B` to Batch).

---

## 🛠️ Installation & Usage

Pixl requires **zero build tools, dependencies, or servers**. 

1. Clone or download the repository.
2. Ensure all three core files are in the same folder:
   * `index.html` (The UI structure)
   * `styles.css` (The Premium Dark-Mode styling)
   * `script.js` (The Math & Rendering engine)
3. Double-click `index.html` to open it in any modern web browser (Chrome, Firefox, Safari, Edge).

---

## 🧠 Under the Hood (Architecture)

The JavaScript engine is cleanly separated into distinct logic blocks:

* `Custom PRNG`: Replaces standard `Math.random()` with a highly predictable 32-bit Shift-Register pseudo-random number generator. It feeds alphanumeric strings through a custom hashing function to establish the baseline seed.
* `Grid Manipulation`: All art is generated conceptually on an abstract 2D array (`-1` for empty, `0-3` for colors) before ever touching the DOM, allowing for mathematical mirroring and effect passes.
* `RenderEngine`: Translates the final 2D array matrix into optimized `fillRect` instructions on the HTML5 Canvas, utilizing `imageSmoothingEnabled = false` to guarantee crisp, hard pixel edges.

---

## 📜 License

This project is open-source and available under the **MIT License**. Feel free to fork, modify, and integrate the engine into your own projects.
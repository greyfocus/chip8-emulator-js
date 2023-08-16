import Renderer from "./renderer.js";
import Keyboard from "./keyboard.js";
import Speaker from "./speaker.js";
import CPU from "./cpu.js";

class Chip8Emulator {
    constructor(rom) {
        this.renderer = new Renderer(10);
        this.keyboard = new Keyboard();
        this.speaker = new Speaker();
        this.cpu = new CPU(this.renderer, this.keyboard, this.speaker);

        this.loop = undefined;

        // CHIP-8 uses 60hz as refresh rate
        this.fps = 60;
        this.fpsInterval = 1000 / this.fps;
        this.then = Date.now();
        this.startTime = this.then;
        this.cpu.loadSpritesInMemory();

        this.stopped = false;

        this.cpu.loadProgramInMemory(rom);
    }

    step() {
        if (this.stopped) {
            return;
        }

        let now = Date.now();
        let elapsed = now - this.then;

        if (elapsed > this.fpsInterval) {
            this.cpu.cycle();
        }

        this.requestAnimationFrameId = requestAnimationFrame(this.step.bind(this));
    }

    stop() {        
        this.stopped = true;
        this.cpu.pause();

        if (this.requestAnimationFrameId) {
            cancelAnimationFrame(this.requestAnimationFrameId);
        }
    }
}

let emulator;

document.querySelector("#input-rom")
    .addEventListener("change", function (e) {
        let file = e.target.files[0];

        (async () => {
            const rom = await file.arrayBuffer();

            if (emulator) {
                emulator.stop();
            }

            emulator = new Chip8Emulator(new Uint8Array(rom));
            emulator.step();
        })();
    }, false);

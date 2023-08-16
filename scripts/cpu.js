const StartAddress = 0x200;
const MaxSize = 4096 - StartAddress;

const DefaultSoundFreq = 440;

class CPU {

    constructor(renderer, keyboard, speaker) {
        this.renderer = renderer;
        this.keyboard = keyboard;
        this.speaker = speaker;

        // 4 KB (4096 bytes) of memory
        this.memory = new Uint8Array(4096);

        // 16 8-bit registers
        this.v = new Uint8Array(16);

        // Stores memory addresses. Set this to 0 since we aren't storing anything at initialization.
        this.i = 0;

        // Timers
        this.delayTimer = 0;
        this.soundTimer = 0;

        // Program counter. Stores the currently executing address.
        // this.pc = StartAddress;
        this.pc = 0x200;

        // Don't initialize this with a size in order to avoid empty results.
        this.stack = new Array();

        // Some instructions require pausing, such as Fx0A.
        this.paused = false;

        this.speed = 10;
        // this.speed = 1;
    }

    loadSpritesInMemory() {
        // Array of hex values for each sprite. Each sprite is 5 bytes.
        // The technical reference provides us with each one of these values.
        const sprites = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F
        ];

        for (let i = 0; i < sprites.length; i++) {
            this.memory[i] = sprites[i];
        }
    }

    loadProgramInMemory(program) {
        if (program.length > MaxSize) {
            throw new Error("Program size (" + program.length + ") exceeds max size (" + MaxSize + ").");
        }

        for (let i = 0; i < program.length; i++) {
            this.memory[StartAddress + i] = program[i];
        }

        console.log("program loaded (" + program.length + " bytes)");
    }

    loadRom(romName) {
        var self = this;
        return new Promise(function(resolve, reject) {
            var request = new XMLHttpRequest();
    
            request.onload = function () {
                if (request.response) {
                    let program = new Uint8Array(request.response);
    
                    self.loadProgramInMemory(program);

                    resolve();
                }
            }

            request.onerror = function() {
                reject(new Error("There was a network error."));
            }
    
            request.open("GET", "roms/" + romName);
            request.responseType = "arraybuffer";
    
            request.send();    
        });
    }

    cycle() {
        for (let i = 0; i < this.speed; i++) {
            if (!this.paused) {
                // TODO - Do we need to add boundary guards?
                let opcode = (this.memory[this.pc] << 8 | this.memory[this.pc + 1]);
                this.executeInstruction(opcode);
            }
        }

        this.updateTimers();

        this.playSound();
        this.renderer.render();
    }

    executeInstruction(opcode) {
        // TODO - Do we need to add boundary guards?
        this.pc += 2;

        let x = (opcode & 0x0f00) >> 8;
        let y = (opcode & 0x00f0) >> 4;

        switch (opcode & 0xf000) {
            case 0x0000:
                switch (opcode) {
                    // 0x0nnn - NOOP - ignored                     
                    case 0x00e0:
                        this.renderer.clear();
                        break;

                    case 0x00ee:
                        this.pc = this.stack.pop();
                        if (this.pc === undefined) {
                            throw new Error("Received pop stack, but call stack was empty.");
                        }

                        break;
                }
                break;
            case 0x1000:                
                // 1nnn - JP addr
                this.pc = opcode & 0x0fff;
                break;
            case 0x2000:
                // 2nnn - CALL addr
                this.stack.push(this.pc);
                this.pc = (opcode & 0x0fff);
                break;
            case 0x3000:
                // 3xkk - SE Vx, byte
                if (this.v[x] === (opcode & 0x00ff)) {
                    this.pc += 2;
                }
                break;
            case 0x4000:
                // 4xkk - SNE Vx, byte
                if (this.v[x] !== (opcode & 0x00ff)) {
                    this.pc += 2;
                }
                break;
            case 0x5000:
                switch (opcode & 0x000f) {
                    case 0x0:
                        // 5xy0 - SE Vx, Vy
                        if (this.v[x] === this.v[y]) {
                            this.pc += 2;
                        }
                        break;
                }
                break;
            case 0x6000:
                // 6xkk - LD Vx, byte
                this.v[x] = opcode & 0x00ff;
                break;

            case 0x7000:
                // 7xkk - ADD Vx, byte
                this.v[x] += (opcode & 0x00ff);
                break;
            case 0x8000:
                switch (opcode & 0x000f) {
                    case 0x0:
                        // 8xy0 - LD Vx, Vy
                        this.v[x] = this.v[y]
                        break;

                    case 0x1:
                        // 8xy1 - OR Vx, Vy
                        this.v[x] |= this.v[y]

                        // Quicks - set VF to 0
                        this.v[0xf] = 0;
                        break;

                    case 0x2:
                        // 8xy2 - AND Vx, Vy
                        this.v[x] &= this.v[y];

                        // Quicks - set VF to 0
                        this.v[0xf] = 0;
                        break;

                    case 0x3:
                        // 8xy3 - XOR Vx, Vy
                        this.v[x] ^= this.v[y];

                        // Quicks - set VF to 0
                        this.v[0xf] = 0;
                        break;

                    case 0x4:
                        // 8xy4 - ADD Vx, Vy
                        let sum = this.v[x] + this.v[y];
                        this.v[x] = sum;

                        this.v[0xf] = 0;
                        if (sum > 0xff) {
                            this.v[0xf] = 1;
                        }

                        break;

                    case 0x5: {
                        // 8xy5 - SUB Vx, Vy

                        // Use a temporary variable to avoid issues due to ordering in case one of the operands is Vf
                        let notBorrow = 0;

                        if (this.v[x] > this.v[y]) {
                            notBorrow = 1
                        }

                        this.v[x] -= this.v[y];
                        this.v[0xf] = notBorrow;
                        break;
                    }

                    case 0x6: {
                        // 8xy6 - SHR Vx {, Vy}
                        // let vf = this.v[x] & 0x01;
                        // this.v[x] >>= 1;

                        // this.v[0xf] = vf;
                        let vf = this.v[x] & 0x01;
                        this.v[x] = this.v[x] >> 1;

                        this.v[0xf] = vf;
                        break;
                    }

                    case 0x7: {
                        // 8xy7 - SUBN Vx, Vy
                        let notBorrow = 0;

                        if (this.v[y] > this.v[x]) {
                            notBorrow = 1;
                        }

                        this.v[x] = this.v[y] - this.v[x];
                        this.v[0xf] = notBorrow;
                        break;

                    }

                    case 0xe: {
                        // 8xyE - SHL Vx {, Vy}
                        // let vf = (this.v[x] & 0x80);
                        let vf = (this.v[x] >> 7) & 1;
                        this.v[x] = (this.v[x] << 1);
                        this.v[0xf] = vf;
                        break;
                    }
                }

                break;
            case 0x9000:
                switch (opcode & 0x000f) {
                    // 9xy0 - SNE Vx, Vy
                    case 0x0:
                        if (this.v[x] !== this.v[y]) {
                            this.pc += 2;
                        }
                }
                break;
            case 0xa000:
                // Annn - LD I, addr
                this.i = opcode & 0x0fff;
                break;

            case 0xb000:
                // Bnnn - JP V0, addr
                this.pc = (opcode & 0x0fff) + this.v[0];
                break;

            case 0xc000:
                // Cxkk - RND Vx, byte
                let rand = Math.floor(Math.random() * 0xff);
                this.v[x] = rand & (opcode & 0x00ff);
                break;

            case 0xd000:
                // Dxyn - DRW Vx, Vy, nibble
                let width = 8;
                let height = opcode & 0x000f;

                this.v[0xf] = 0;

                for (let row = 0; row < height; row++) {
                    let sprite = this.memory[this.i + row];

                    for (let col = 0; col < width; col++) {
                        if ((sprite & 0x80) > 0) {
                            if (this.renderer.setPixel(this.v[x] + col, this.v[y] + row)) {
                                this.v[0xf] = 1;
                            }
                        }

                        // Shift the sprite left 1. This will move the next next col/bit of the sprite into the first position.
                        // Ex. 10010000 << 1 will become 0010000
                        sprite <<= 1;
                    }
                }
                break;

            case 0xe000:
                switch (opcode & 0x00ff) {
                    case 0x009e:
                        // Ex9E - SKP Vx
                        if (this.keyboard.isKeyPressed(this.v[x])) {
                            this.pc += 2;
                        }
                        break;

                    case 0x00a1:
                        // ExA1 - SKNP Vx
                        if (!this.keyboard.isKeyPressed(this.v[x])) {
                            this.pc += 2;
                        }
                        break;
                }
                break;

            case 0xf000:
                switch (opcode & 0x00ff) {
                    case 0x0007:
                        // Fx07 - LD Vx, DT
                        this.v[x] = this.delayTimer;
                        break;

                    case 0x000a:
                        // Fx0A - LD Vx, K
                        this.paused = true;
                        this.keyboard.onNextKeyPress = function(key) {
                            this.v[x] = key;
                            this.paused = false;
                        }.bind(this);
                        break;

                    case 0x0015:
                        // Fx15 - LD DT, Vx
                        this.delayTimer = this.v[x];
                        break;

                    case 0x0018:
                        // Fx18 - LD ST, Vx
                        this.soundTimer = this.v[x];
                        break;
                    
                    case 0x001e:
                        // Fx1E - ADD I, Vx
                        this.i += this.v[x];
                        break;

                    case 0x0029:
                        // Fx29 - LD F, Vx
                        this.i += this.v[x] * 5
                        break;

                    case 0x0033:
                        // Fx33 - LD B, Vx
                        this.memory[this.i] = parseInt(this.v[x] / 100);
                        this.memory[this.i + 1] = parseInt((this.v[x] % 100) / 10);
                        this.memory[this.i + 2] = parseInt(this.v[x] % 10);
                        break;

                    case 0x0055:
                        // Fx55 - LD [I], Vx
                        for (let register = 0; register <= x; register++) {
                            this.memory[this.i + register] = this.v[register];
                        }
                        break;

                    case 0x0065:
                        // Fx65 - LD Vx, [I]
                        for (let register = 0; register <= x; register++) {
                            this.v[register] = this.memory[this.i + register];
                        }
                        break;
                }
                break;
        }
    }

    updateTimers() {
        if (this.delayTimer > 0) {
            this.delayTimer -= 1;
        }

        if (this.soundTimer > 0) {
            this.soundTimer -= 1;
        }
    }

    playSound() {
        if (this.soundTimer > 0) {
            this.speaker.play(DefaultSoundFreq);
        } else {
            this.speaker.stop();
        }
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }
}

export default CPU;
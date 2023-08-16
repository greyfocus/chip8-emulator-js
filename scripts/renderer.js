class Renderer {

    constructor(scale) {
        this.cols = 64;
        this.rows = 32;

        this.scale = scale;
        this.canvas = document.querySelector("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.canvas.width = this.cols * this.scale;
        this.canvas.height = this.rows * this.scale;

        this.display = new Array(this.cols * this.rows);

        this.needsDraw = true;
    }

    setPixel(x, y) {
        this.needsDraw = true;

        if (x > this.cols) {
            x -= this.cols;
        } else if (x < 0) {
            x += this.cols;
        }

        if (y > this.rows) {
            y -= this.rows;
        } else if (y < 0) {
            y += this.rows;
        }

        let pixelLoc = x + (y * this.cols);
        this.display[pixelLoc] ^= 1;

        return !this.display[pixelLoc];
    }

    clear() {
        this.needsDraw = true;
        this.display = new Array(this.cols * this.rows);
    }

    render() {
        if (!this.needsDraw) {
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.cols * this.rows; i++) {

            let x = (i % this.cols) * this.scale;
            let y = Math.floor(i / this.cols) * this.scale;

            if (this.display[i]) {
                this.ctx.fillStyle = "#000";

                // Place a pixel by taking into account the scale
                this.ctx.fillRect(x, y, this.scale, this.scale);
            }
        }

        this.needsDraw = false;
    }

    testRender() {
        this.setPixel(0, 0);
        this.setPixel(5, 2);
        this.setPixel(this.cols - 1, this.rows - 1);
    }
}

export default Renderer;

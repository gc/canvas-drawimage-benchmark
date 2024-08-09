const { Canvas: NAPICanvas, loadImage: NAPILoadImage } = require('@napi-rs/canvas');
const { Canvas: NodeCanvas, loadImage: nodeLoadImage } = require('canvas');
const { Canvas: SkiaCanvas, loadImage: skiaLoadImage } = require('skia-canvas');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const SPRITESHEET_PATH = "./spritesheet.png";
const SPRITE_COUNT = 20;
const SPRITE_SIZE = 10;
const SIZE = SPRITE_COUNT * SPRITE_SIZE;

const canvasProviders = [
    {
        name: "NAPI Canvas",
        createCanvas: () => new NAPICanvas(SIZE,SIZE),
        loadImage: NAPILoadImage,
        saveCanvas: async (canvas) => {
            const pngData = await canvas.encode('jpeg');
            fs.writeFileSync(path.join(__dirname, 'napi.jpg'), pngData)
        }
    },
    {
        name: "Node Canvas",
        createCanvas: () => new NodeCanvas(SIZE, SIZE),
        loadImage: nodeLoadImage,
        saveCanvas: async (canvas) => {
            const buf3 = canvas.toBuffer('image/jpeg');
            fs.writeFileSync(path.join(__dirname, 'node.jpg'), buf3);
        }
    },
    {
        name: "Skia Canvas",
        createCanvas: () => new SkiaCanvas(SIZE, SIZE),
        loadImage: skiaLoadImage,
        saveCanvas: async (canvas) => {
            return canvas.saveAs('skia.jpg')
        }
    }
];

async function benchmark() {
    for (const provider of canvasProviders) {
        const spritesheet = await provider.loadImage(fs.readFileSync(SPRITESHEET_PATH));
        const canvas = provider.createCanvas();
        const ctx = canvas.getContext('2d');

        const samples = 5;
        const results = [];

        for (let t = 0; t < samples; t++) {
            const start = performance.now();
            for (let i = 0; i < SPRITE_COUNT; i++) {
                for (let j = 0; j < SPRITE_COUNT; j++) {
                    const x = i * SPRITE_SIZE;
                    const y = j * SPRITE_SIZE;
                    ctx.drawImage(spritesheet, x, y, SPRITE_SIZE, SPRITE_SIZE, x, y, SPRITE_SIZE, SPRITE_SIZE);
                }
            }
            const end = performance.now();
            results.push(end - start);

            if (t === samples - 1) {
                await provider.saveCanvas(canvas);
            }
        }

        const average = results.reduce((a, b) => a + b, 0) / results.length;
        const min = Math.min(...results);
        const max = Math.max(...results);
        console.log(`${provider.name} Average: ${average.toFixed(2)} ms, Min: ${min.toFixed(2)} ms, Max: ${max.toFixed(2)} ms`);
    }
}

benchmark();
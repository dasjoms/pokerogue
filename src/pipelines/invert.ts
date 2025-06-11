import type { Game } from "phaser";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const fragShader = readFileSync(join(dir, "glsl/invert.frag"), "utf8");

export default class InvertPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Game) {
    super({
      game,
      name: "InvertPostFX",
      fragShader,
      uniforms: ["uMainSampler"],
    } as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig);
  }
}

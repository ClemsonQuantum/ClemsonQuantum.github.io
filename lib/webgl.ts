// Minimal WebGL2 helpers: shader programs that fail loudly, and float lookup
// textures read with texelFetch. Float textures are sampled NEAREST and
// interpolated by hand in the shader: linear filtering of R32F needs
// OES_texture_float_linear, which many phones lack, and half floats would
// cost the tables their precision.

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('[webgl] createShader returned null');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? '(no log)';
    gl.deleteShader(shader);
    const kind = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    throw new Error(`[webgl] ${kind} shader failed to compile:\n${log}`);
  }
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('[webgl] createProgram returned null');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? '(no log)';
    gl.deleteProgram(program);
    throw new Error(`[webgl] program failed to link:\n${log}`);
  }
  return program;
}

// A program compiling in the background. poll() returns null while the
// driver is still working, the linked program once done, and throws (with
// the compile and link logs) on failure.
export interface PendingProgram {
  poll(): WebGLProgram | null;
  cancel(): void;
}

// Start compiling and linking without waiting for the result. With
// KHR_parallel_shader_compile the driver works off the main thread and
// COMPLETION_STATUS_KHR says when a status query will no longer block;
// without it, the first poll blocks like createProgram. A large shader can
// take tens to hundreds of milliseconds to link on some drivers.
export function startProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): PendingProgram {
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vs || !fs || !program) throw new Error('[webgl] could not allocate a shader program');
  gl.shaderSource(vs, vertexSource);
  gl.shaderSource(fs, fragmentSource);
  gl.compileShader(vs);
  gl.compileShader(fs);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  let state: 'pending' | 'ready' | 'closed' = 'pending';
  const release = () => {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  };
  return {
    poll() {
      if (state !== 'pending') return state === 'ready' ? program : null;
      if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) return null;
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const logs = [
          gl.getShaderParameter(vs, gl.COMPILE_STATUS) ? '' : `vertex: ${gl.getShaderInfoLog(vs) ?? ''}`,
          gl.getShaderParameter(fs, gl.COMPILE_STATUS) ? '' : `fragment: ${gl.getShaderInfoLog(fs) ?? ''}`,
          gl.getProgramInfoLog(program) ?? '',
        ].filter(Boolean);
        state = 'closed';
        release();
        gl.deleteProgram(program);
        throw new Error(`[webgl] program failed to compile or link:\n${logs.join('\n')}`);
      }
      state = 'ready';
      release();
      return program;
    },
    cancel() {
      if (state !== 'pending') return;
      state = 'closed';
      release();
      gl.deleteProgram(program);
    },
  };
}

// A single-channel 32-bit float texture (width x height), NEAREST-sampled.
export function createFloatTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  data: Float32Array,
): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error('[webgl] createTexture returned null');
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, width, height, 0, gl.RED, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

export function updateFloatTexture(
  gl: WebGL2RenderingContext,
  tex: WebGLTexture,
  width: number,
  height: number,
  data: Float32Array,
): void {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.FLOAT, data);
}

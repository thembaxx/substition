"use client";
import { useEffect, useRef } from "react";

// One small shader; no 3D framework, no tracking, no continuous work in a hidden tab.
export default function Ambient({ playful = false }: { playful?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches || connection?.saveData)
      return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;
    const make = (kind: number, source: string) => {
      const shader = gl.createShader(kind)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const vertex = make(
      gl.VERTEX_SHADER,
      "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}",
    );
    const fragment = make(
      gl.FRAGMENT_SHADER,
      "precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform float d;void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv+0.07*sin(t*0.15+uv.yx*4.);float a=exp(-7.*length(p-vec2(.6+.1*sin(t*.12),.3)));float b=exp(-9.*length(p-m));vec3 c=mix(vec3(.60,.85,.72),vec3(.78,.7,.92),.5+.5*sin(t*.08));gl_FragColor=vec4(c,(a*.2+b*.12)*(1.-d*.3));}",
    );
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const pos = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, "r"),
      time = gl.getUniformLocation(program, "t"),
      mouse = gl.getUniformLocation(program, "m"),
      dark = gl.getUniformLocation(program, "d");
    let frame = 0,
      visible = true,
      last = 0,
      pointer = [0.7, 0.5];
    const resize = () => {
      canvas.width = Math.min(innerWidth, 1200);
      canvas.height = 600;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const move = (e: PointerEvent) => {
      pointer = [e.clientX / innerWidth, 1 - e.clientY / innerHeight];
    };
    const render = (now: number) => {
      if (!visible) return;
      if (now - last > 60) {
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform1f(time, (now / 1000) * (playful ? 3 : 1));
        gl.uniform2f(mouse, pointer[0], pointer[1]);
        gl.uniform1f(dark, document.documentElement.dataset.theme === "dark" ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        last = now;
      }
      frame = requestAnimationFrame(render);
    };
    const visibility = () => {
      visible = !document.hidden;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", visibility);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteBuffer(buffer);
    };
  }, [playful]);
  return <canvas ref={ref} className="ambient-canvas" aria-hidden="true" />;
}

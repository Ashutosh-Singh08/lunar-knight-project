import { useEffect, useRef } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  ImageSegmenter,
} from "@mediapipe/tasks-vision";

export default function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationIdRef = useRef(null);
  const segmenterRef = useRef(null);
  const isActiveRef = useRef(false);
  const sequenceStartRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    async function setup() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite",
    delegate: "GPU",
  },
  runningMode: "VIDEO",
  outputCategoryMask: true,
});
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();

        canvasRef.current.width = 640;
        canvasRef.current.height = 480;

        detectLoop();
      };
    }

    function detectLoop() {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) {
          animationIdRef.current = requestAnimationFrame(detectLoop);
          return;
        }

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let landmarks = null;

        if (video.readyState >= 2 && landmarkerRef.current) {
          const result = landmarkerRef.current.detectForVideo(
            video,
            performance.now()
          );

          if (result.landmarks && result.landmarks.length > 0) {
            landmarks = result.landmarks[0];
            drawBaseTracking(ctx, landmarks, canvas.width, canvas.height);
          }
        }

        if (isActiveRef.current) {
          const elapsed = performance.now() - sequenceStartRef.current;

          drawDarkOverlay(ctx, canvas.width, canvas.height);

          if (elapsed < 2200) {
            drawScanLine(ctx, canvas.width, canvas.height, elapsed);
            drawParticles(ctx);
          } else if (elapsed < 3600) {
            const progress = (elapsed - 2200) / 1400;
            drawEnergyFormation(ctx, canvas.width, canvas.height, progress);
          } else if (elapsed < 6500) {
            const progress = (elapsed - 3600) / 2900;

            if (landmarks) {
              drawSuitRevealOnBody(
                ctx,
                landmarks,
                canvas.width,
                canvas.height,
                progress
              );
            }

            drawSuitReveal(ctx, canvas.width, canvas.height, progress);
          } else {
            if (landmarks) {
              drawFinalLook(ctx, landmarks, canvas.width, canvas.height);
            }

            drawLunarMode(ctx, canvas.width, canvas.height);
          }
        }
      } catch (err) {
        console.error("detectLoop error:", err);
      }

      animationIdRef.current = requestAnimationFrame(detectLoop);
    }

    setup();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  function activateMode() {
    console.log("BUTTON CLICKED");
    isActiveRef.current = true;
    sequenceStartRef.current = performance.now();
    particlesRef.current = [];
  }

  function resetMode() {
    isActiveRef.current = false;
    sequenceStartRef.current = null;
    particlesRef.current = [];
  }

  function drawBaseTracking(ctx, landmarks, width, height) {
    const ls = landmarks[11];
    const rs = landmarks[12];
    const lh = landmarks[23];
    const rh = landmarks[24];

    if (!ls || !rs || !lh || !rh) return;

    const shoulderCenterX = ((ls.x + rs.x) / 2) * width;
    const shoulderCenterY = ((ls.y + rs.y) / 2) * height;
    const hipCenterX = ((lh.x + rh.x) / 2) * width;
    const hipCenterY = ((lh.y + rh.y) / 2) * height;

    const chestPosition = 0.3;
    const chestX =
      shoulderCenterX + (hipCenterX - shoulderCenterX) * chestPosition;
    const chestY =
      shoulderCenterY + (hipCenterY - shoulderCenterY) * chestPosition;

    const shoulderWidth = Math.abs(ls.x - rs.x) * width;

    drawSoftSkeleton(ctx, landmarks, width, height);
    drawCrescent(ctx, chestX, chestY, shoulderWidth * 0.11, 0.45, 12);
  }

  function drawSoftSkeleton(ctx, landmarks, width, height) {
    const connections = [
      [11, 12],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [11, 23],
      [12, 24],
      [23, 24],
    ];

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;

    connections.forEach(([a, b]) => {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      if (!p1 || !p2) return;

      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    ctx.restore();
  }

  function drawCrescent(ctx, x, y, r, alpha = 1, glow = 25) {
    ctx.save();

    ctx.shadowColor = "rgba(255,245,220,1)";
    ctx.shadowBlur = glow;

    ctx.fillStyle = `rgba(255,245,220,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "destination-out";

    ctx.beginPath();
    ctx.arc(x + r * 0.45, y - r * 0.05, r * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";

    ctx.strokeStyle = `rgba(220,190,120,${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 0.55, Math.PI * 1.45);
    ctx.stroke();

    ctx.restore();
  }

  function drawDarkOverlay(ctx, width, height) {
    ctx.save();

    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      80,
      width / 2,
      height / 2,
      width / 1.1
    );

    gradient.addColorStop(0, "rgba(255,245,220,0.08)");
    gradient.addColorStop(1, "rgba(0,0,0,0.55)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  function drawScanLine(ctx, width, height, elapsed) {
    const duration = 2200;
    const progress = Math.min(elapsed / duration, 1);
    const y = progress * height;

    for (let i = 0; i < 5; i++) {
      particlesRef.current.push({
        x: 80 + Math.random() * (width - 160),
        y: y + (Math.random() - 0.5) * 35,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2,
        size: 1 + Math.random() * 3,
        life: 1,
      });
    }

    ctx.save();

    ctx.shadowColor = "rgba(255,245,220,1)";
    ctx.shadowBlur = 25;

    ctx.strokeStyle = "rgba(255,245,220,0.95)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(width - 80, y);
    ctx.stroke();

    ctx.strokeStyle = "rgba(220,190,120,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(130, y - 10);
    ctx.lineTo(width - 130, y - 10);
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, y - 45, 0, y + 45);
    gradient.addColorStop(0, "rgba(255,245,220,0)");
    gradient.addColorStop(0.5, "rgba(255,245,220,0.2)");
    gradient.addColorStop(1, "rgba(255,245,220,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - 45, width, 90);

    ctx.fillStyle = "rgba(255,245,220,0.9)";
    ctx.font = "bold 18px Arial";
    ctx.fillText("LUNAR SCAN ACTIVE", 20, 40);

    ctx.restore();
  }

  function drawParticles(ctx) {
    const particles = particlesRef.current;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;

      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = "rgba(255,245,220,1)";
      ctx.shadowColor = "rgba(255,245,220,1)";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function drawEnergyFormation(ctx, width, height, progress) {
    const p = Math.min(progress, 1);

    ctx.save();

    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      10,
      width / 2,
      height / 2,
      280 * p
    );

    gradient.addColorStop(0, `rgba(255,245,220,${0.45 * (1 - p * 0.2)})`);
    gradient.addColorStop(0.6, `rgba(220,190,120,${0.18 * (1 - p)})`);
    gradient.addColorStop(1, "rgba(255,245,220,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,245,220,0.95)";
    ctx.font = "bold 26px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ENERGY FORMING", width / 2, 70);

    ctx.restore();
  }

  function drawSuitReveal(ctx, width, height, progress) {
    const p = Math.min(progress, 1);

    ctx.save();

    ctx.fillStyle = `rgba(255,245,220,${0.08 * p})`;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,245,220,0.95)";
    ctx.font = "bold 26px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SUIT REVEAL", width / 2, 70);

    ctx.restore();
  }

  function drawSuitRevealOnBody(ctx, landmarks, width, height, progress) {
    const ls = landmarks[11];
    const rs = landmarks[12];
    const lh = landmarks[23];
    const rh = landmarks[24];

    if (!ls || !rs || !lh || !rh) return;

    const p = Math.min(progress, 1);

    const lsX = ls.x * width;
    const lsY = ls.y * height;
    const rsX = rs.x * width;
    const rsY = rs.y * height;
    const lhX = lh.x * width;
    const lhY = lh.y * height;
    const rhX = rh.x * width;
    const rhY = rh.y * height;

    const chestX = (lsX + rsX + lhX + rhX) / 4;
    const chestY = (lsY + rsY + lhY + rhY) / 4 - 30;

    const revealRadius = 220 * p;

    ctx.save();

    ctx.beginPath();
    ctx.arc(chestX, chestY, revealRadius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = `rgba(245,240,220,${0.38 * p})`;
    ctx.shadowColor = "rgba(255,245,220,0.9)";
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.moveTo(lsX, lsY);
    ctx.lineTo(rsX, rsY);
    ctx.lineTo(rhX, rhY);
    ctx.lineTo(lhX, lhY);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(80,70,55,${0.45 * p})`;
    ctx.lineWidth = 3;

    for (let y = Math.min(lsY, rsY); y < Math.max(lhY, rhY); y += 18) {
      ctx.beginPath();
      ctx.moveTo(lsX - 15, y);
      ctx.lineTo(rsX + 15, y + 14);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFinalLook(ctx, landmarks, width, height) {
    const ls = landmarks[11];
    const rs = landmarks[12];
    const le = landmarks[2];
    const re = landmarks[5];

    if (!ls || !rs) return;

    const shoulderWidth = Math.abs(ls.x - rs.x) * width;

    drawCape(ctx, landmarks, width, height);

    if (le && re) {
      drawEyeGlow(ctx, landmarks, width, height);
    }

    const chestX = ((ls.x + rs.x + landmarks[23].x + landmarks[24].x) / 4) * width;
    const chestY =
      ((ls.y + rs.y + landmarks[23].y + landmarks[24].y) / 4) * height - 30;

    drawCrescent(ctx, chestX, chestY, shoulderWidth * 0.13, 1, 32);
  }

  function drawCape(ctx, landmarks, width, height) {
    const ls = landmarks[11];
    const rs = landmarks[12];
    const lh = landmarks[23];
    const rh = landmarks[24];

    if (!ls || !rs || !lh || !rh) return;

    const lsX = ls.x * width;
    const lsY = ls.y * height;
    const rsX = rs.x * width;
    const rsY = rs.y * height;
    const hipY = ((lh.y + rh.y) / 2) * height;
    const shoulderWidth = Math.abs(lsX - rsX);

    ctx.save();

    const gradient = ctx.createLinearGradient(0, lsY, 0, height);
    gradient.addColorStop(0, "rgba(18,18,18,0.45)");
    gradient.addColorStop(1, "rgba(0,0,0,0.9)");

    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(255,245,220,0.35)";
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.moveTo(lsX, lsY);
    ctx.lineTo(rsX, rsY);
    ctx.lineTo(rsX + shoulderWidth * 0.8, hipY + shoulderWidth * 1.5);
    ctx.lineTo((lsX + rsX) / 2, height - 20);
    ctx.lineTo(lsX - shoulderWidth * 0.8, hipY + shoulderWidth * 1.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawEyeGlow(ctx, landmarks, width, height) {
    const le = landmarks[2];
    const re = landmarks[5];

    ctx.save();

    ctx.shadowColor = "rgba(255,245,220,1)";
    ctx.shadowBlur = 25;
    ctx.fillStyle = "rgba(255,245,220,1)";

    [le, re].forEach((eye) => {
      const x = eye.x * width;
      const y = eye.y * height + 4;

      ctx.beginPath();
      ctx.ellipse(x, y, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function drawLunarMode(ctx, width, height) {
    ctx.save();

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,245,220,1)";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("LUNAR MODE ONLINE", width / 2, 50);

    ctx.restore();
  }

  return (
    <div
      style={{
        position: "relative",
        width: "640px",
        height: "480px",
        margin: "20px auto",
        background: "black",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          width: "640px",
          height: "480px",
          top: 0,
          left: 0,
          objectFit: "cover",
          transform: "scaleX(-1)",
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          width: "640px",
          height: "480px",
          top: 0,
          left: 0,
          transform: "scaleX(-1)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      <button
        onClick={activateMode}
        style={{
          position: "absolute",
          bottom: "20px",
          left: "38%",
          transform: "translateX(-50%)",
          padding: "12px 18px",
          borderRadius: "30px",
          border: "1px solid rgba(255,245,220,0.8)",
          background: "rgba(10,10,10,0.85)",
          color: "white",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        Activate
      </button>

      <button
        onClick={resetMode}
        style={{
          position: "absolute",
          bottom: "20px",
          left: "62%",
          transform: "translateX(-50%)",
          padding: "12px 18px",
          borderRadius: "30px",
          border: "1px solid rgba(255,245,220,0.45)",
          background: "rgba(10,10,10,0.75)",
          color: "white",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        Reset
      </button>
    </div>
  );
}
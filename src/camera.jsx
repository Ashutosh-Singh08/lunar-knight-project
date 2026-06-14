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

  // const isActivatedRef = useRef(false);
  // const activationStartRef = useRef(null);
  const animationIdRef = useRef(null);
  const particlesRef = useRef([]);
  const segmenterRef = useRef(null);
const modeRef = useRef("IDLE");
const sequenceStartRef = useRef(null);
//   const transformationStateRef = useRef("IDLE");
// const transformationProgressRef = useRef(0);
//   const suitProgressRef = useRef(0);
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
//       segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
//   baseOptions: {
//     modelAssetPath:
//       "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.task",
//     delegate: "GPU",
//   },
//   runningMode: "VIDEO",
//   outputCategoryMask: true,
// });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();

        const canvas = canvasRef.current;
        canvas.width = 640;
        canvas.height = 480;

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

    if (video.readyState >= 2 && landmarkerRef.current) {
      const result = landmarkerRef.current.detectForVideo(
        video,
        performance.now()
      );

      if (result.landmarks && result.landmarks.length > 0) {
        drawLandmarks(ctx, result.landmarks[0], canvas.width, canvas.height);
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

  function drawSuitReveal(ctx, width, height, progress) {
  const p = Math.min(progress, 1);

  ctx.save();

  // dark background pressure
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(0, 0, width, height);

  // expanding lunar energy from center
  const radius = p * 260;

  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    10,
    width / 2,
    height / 2,
    radius
  );

  gradient.addColorStop(0, `rgba(255,245,220,${0.45 * (1 - p * 0.3)})`);
  gradient.addColorStop(0.6, `rgba(220,190,120,${0.18 * (1 - p)})`);
  gradient.addColorStop(1, "rgba(255,245,220,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // text for test
  ctx.fillStyle = "rgba(255,245,220,0.95)";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("SUIT REVEAL", width / 2, 80);

  ctx.restore();
}
  function drawLandmarks(ctx, landmarks, width, height) {
    const connections = [
      [11, 12],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [11, 23],
      [12, 24],
      [23, 24],
      [23, 25],
      [25, 27],
      [24, 26],
      [26, 28],
    ];

    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;

    connections.forEach(([a, b]) => {
      const p1 = landmarks[a];
      const p2 = landmarks[b];

      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    const shoulderCenterX = ((leftShoulder.x + rightShoulder.x) / 2) * width;
    const shoulderCenterY = ((leftShoulder.y + rightShoulder.y) / 2) * height;

    const hipCenterX = ((leftHip.x + rightHip.x) / 2) * width;
    const hipCenterY = ((leftHip.y + rightHip.y) / 2) * height;

    const chestPosition = 0.3;

    const chestX =
      shoulderCenterX + (hipCenterX - shoulderCenterX) * chestPosition;
    const chestY =
      shoulderCenterY + (hipCenterY - shoulderCenterY) * chestPosition;

    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) * width;
  drawCape(ctx, landmarks, width, height);
drawBodyGlow(ctx, landmarks, width, height);

const state = transformationStateRef.current;
if (
  state === "ENERGY_FORMING" ||
  state === "LUNAR_MODE"
) {
  drawTorsoSuit(ctx, landmarks, width, height, state);
}

drawCrescent(ctx, chestX, chestY, shoulderWidth * 0.12, state);

if (state === "ENERGY_FORMING" || state === "LUNAR_MODE") {
  drawEyeGlow(ctx, landmarks, width, height, state);
}
  }
  

function drawCrescent(ctx, x, y, r, state) {
  let glow = 10;
  let alpha = 0.35;
  let scale = 0.8;

  if (state === "SCANNING") {
    glow = 22;
    alpha = 0.75;
    scale = 1;
  }

  if (state === "ENERGY_FORMING") {
    glow = 35;
    alpha = 1;
    scale = 1.25;
  }

  if (state === "LUNAR_MODE") {
    glow = 28;
    alpha = 1;
    scale = 1.1;
  }

  const rr = r * scale;

  ctx.save();

  ctx.shadowColor = "rgba(255, 245, 210, 1)";
  ctx.shadowBlur = glow;

  ctx.fillStyle = `rgba(255, 245, 220, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(x + rr * 0.45, y - rr * 0.05, rr * 0.95, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";

  ctx.strokeStyle = `rgba(220, 190, 120, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, rr, Math.PI * 0.55, Math.PI * 1.45);
  ctx.stroke();

  ctx.restore();
}
  function drawHoodShadow(ctx, landmarks, width, height) {
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (!nose || !leftShoulder || !rightShoulder) return;

  const headX = nose.x * width;
  const headY = nose.y * height;

  const shoulderWidth =
    Math.abs(leftShoulder.x - rightShoulder.x) * width;

  const hoodWidth = shoulderWidth * 0.9;
  const hoodHeight = shoulderWidth * 1.05;

  const hoodX = headX;
  const hoodY = headY - hoodHeight * 0.05;

  ctx.save();

  ctx.shadowColor = "rgba(255, 245, 220, 0.8)";
  ctx.shadowBlur = 18;

  // outer hood
  ctx.strokeStyle = "rgba(255, 245, 220, 0.75)";
  ctx.lineWidth = 6;

  ctx.beginPath();
  ctx.arc(
    hoodX,
    hoodY,
    hoodWidth / 2,
    Math.PI * 1.05,
    Math.PI * 1.95
  );
  ctx.stroke();

  // dark face shadow
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";

  ctx.beginPath();
  ctx.ellipse(
    hoodX,
    hoodY + hoodHeight * 0.12,
    hoodWidth * 0.32,
    hoodHeight * 0.28,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // cloth sides
  ctx.strokeStyle = "rgba(230, 220, 200, 0.6)";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(hoodX - hoodWidth * 0.35, hoodY);
  ctx.lineTo(hoodX - hoodWidth * 0.55, leftShoulder.y * height);

  ctx.moveTo(hoodX + hoodWidth * 0.35, hoodY);
  ctx.lineTo(hoodX + hoodWidth * 0.55, rightShoulder.y * height);

  ctx.stroke();

  ctx.restore();
}
function drawLunarMode(ctx, width, height) {
  ctx.save();

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,245,220,1)";
  ctx.font = "bold 34px Arial";
  ctx.textAlign = "center";
  ctx.fillText("LUNAR MODE ONLINE", width / 2, 60);

  ctx.restore();
}
function drawSegmentationMask(ctx, mask, width, height) {
  const maskWidth = mask.width;
  const maskHeight = mask.height;
  const maskData = mask.getAsUint8Array();

  const imageData = ctx.createImageData(maskWidth, maskHeight);
  const data = imageData.data;

  for (let i = 0; i < maskData.length; i++) {
    const isPerson = maskData[i] === 0;

    data[i * 4] = 255;
    data[i * 4 + 1] = 245;
    data[i * 4 + 2] = 220;
    data[i * 4 + 3] = isPerson ? 70 : 0;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = maskWidth;
  tempCanvas.height = maskHeight;

  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.putImageData(imageData, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  ctx.restore();
}
function drawBodyGlow(ctx, landmarks, width, height) {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const x1 = leftShoulder.x * width;
  const y1 = leftShoulder.y * height;

  const x2 = rightShoulder.x * width;
  const y2 = rightShoulder.y * height;

  const x3 = rightHip.x * width;
  const y3 = rightHip.y * height;

  const x4 = leftHip.x * width;
  const y4 = leftHip.y * height;

  ctx.save();

  // Big obvious torso glow
  ctx.shadowColor = "rgba(255, 245, 220, 1)";
  ctx.shadowBlur = 35;

  ctx.strokeStyle = "rgba(255, 245, 220, 0.95)";
  ctx.lineWidth = 8;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.stroke();

  // Soft filled glow
  ctx.fillStyle = "rgba(255, 245, 220, 0.08)";
  ctx.fill();

  ctx.restore();
}
function drawCape(ctx, landmarks, width, height) {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

  const lsX = leftShoulder.x * width;
  const lsY = leftShoulder.y * height;

  const rsX = rightShoulder.x * width;
  const rsY = rightShoulder.y * height;

  const lhX = leftHip.x * width;
  const lhY = leftHip.y * height;

  const rhX = rightHip.x * width;
  const rhY = rightHip.y * height;

  const shoulderWidth = Math.abs(lsX - rsX);
  const hipY = (lhY + rhY) / 2;

  ctx.save();

  ctx.shadowColor = "rgba(255, 245, 220, 0.45)";
  ctx.shadowBlur = 25;

  const gradient = ctx.createLinearGradient(0, lsY, 0, height);
  gradient.addColorStop(0, "rgba(20, 20, 20, 0.55)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)");

  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.moveTo(lsX, lsY);
  ctx.lineTo(rsX, rsY);

  ctx.lineTo(rsX + shoulderWidth * 0.9, hipY + shoulderWidth * 1.8);
  ctx.lineTo((lsX + rsX) / 2, height - 20);
  ctx.lineTo(lsX - shoulderWidth * 0.9, hipY + shoulderWidth * 1.8);

  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 245, 220, 0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}
function drawDarkOverlay(ctx, width, height) {
  ctx.save();

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    80,
    width / 2,
    height / 2,
    width / 1.2
  );

  gradient.addColorStop(0, "rgba(255, 245, 220, 0.08)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}
function drawEnergyFormation(ctx, width, height, progress) {
  const alpha = Math.min(progress, 1);

  ctx.save();

  // Obvious test overlay
  ctx.fillStyle = `rgba(255, 245, 220, ${0.35 * alpha})`;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "white";
  ctx.font = "bold 28px Arial";
  ctx.fillText("ENERGY FORMING", 170, 80);

  ctx.restore();
}
function drawEyeGlow(ctx, landmarks, width, height, state) {
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];

  if (!leftEye || !rightEye) return;

  let alpha = 0.75;
  let blur = 18;

  if (state === "ENERGY_FORMING") {
    alpha = 0.9;
    blur = 28;
  }

  if (state === "LUNAR_MODE") {
    alpha = 1;
    blur = 25;
  }

  const leftX = leftEye.x * width;
  const leftY = leftEye.y * height + 4;

  const rightX = rightEye.x * width;
  const rightY = rightEye.y * height + 4;

  ctx.save();

  ctx.shadowColor = "rgba(255, 245, 220, 1)";
  ctx.shadowBlur = blur;

  ctx.fillStyle = `rgba(255, 245, 220, ${alpha})`;

  ctx.beginPath();
  ctx.ellipse(leftX, leftY, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(rightX, rightY, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
function drawTorsoSuit(ctx, landmarks, width, height, state) {
  const ls = landmarks[11];
  const rs = landmarks[12];
  const lh = landmarks[23];
  const rh = landmarks[24];

  if (!ls || !rs || !lh || !rh) return;

  const alpha = state === "LUNAR_MODE" ? 0.45 : 0.25;

  ctx.save();

  ctx.fillStyle = `rgba(245, 240, 220, ${alpha})`;
  ctx.shadowColor = "rgba(255,245,220,0.8)";
  ctx.shadowBlur = 18;

  ctx.beginPath();
  ctx.moveTo(ls.x * width, ls.y * height);
  ctx.lineTo(rs.x * width, rs.y * height);
  ctx.lineTo(rh.x * width, rh.y * height);
  ctx.lineTo(lh.x * width, lh.y * height);
  ctx.closePath();
  ctx.fill();

  // cloth wrap lines
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(90, 80, 65, 0.35)";
  ctx.lineWidth = 3;

  const topY = ((ls.y + rs.y) / 2) * height;
  const bottomY = ((lh.y + rh.y) / 2) * height;

  for (let y = topY; y < bottomY; y += 18) {
    ctx.beginPath();
    ctx.moveTo(ls.x * width - 10, y);
    ctx.lineTo(rs.x * width + 10, y + 12);
    ctx.stroke();
  }

  ctx.restore();
}
 function drawScanLine(ctx, width, height, elapsed) {
  const duration = 2200;
  const progress = Math.min(elapsed / duration, 1);
  const y = progress * height;
  for (let i = 0; i < 5; i++) {
  particlesRef.current.push({
    x: 80 + Math.random() * (width - 160),
    y: y + (Math.random() - 0.5) * 30,
    vx: (Math.random() - 0.5) * 2,
    vy: -Math.random() * 2,
    size: 1 + Math.random() * 3,
    life: 1,
  });
}

  ctx.save();

  // main glowing scan line
  ctx.shadowColor = "rgba(255, 245, 220, 1)";
  ctx.shadowBlur = 25;
  ctx.strokeStyle = "rgba(255, 245, 220, 0.95)";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(80, y);
  ctx.lineTo(width - 80, y);
  ctx.stroke();

  // golden secondary line
  ctx.shadowBlur = 8;
  ctx.strokeStyle = "rgba(220, 190, 120, 0.75)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(130, y - 10);
  ctx.lineTo(width - 130, y - 10);
  ctx.stroke();

  // soft scan glow rectangle
  const gradient = ctx.createLinearGradient(0, y - 45, 0, y + 45);
  gradient.addColorStop(0, "rgba(255,245,220,0)");
  gradient.addColorStop(0.5, "rgba(255,245,220,0.18)");
  gradient.addColorStop(1, "rgba(255,245,220,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, y - 45, width, 90);

  // scan text
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(255, 245, 220, 0.9)";
  ctx.font = "bold 18px Arial";
  ctx.fillText("LUNAR SCAN ACTIVE", 20, 40);

  ctx.restore();

// if (progress >= 1) {
//   isActivatedRef.current = false;
//   activationStartRef.current = null;

//   transformationStateRef.current = "ENERGY_FORMING";
//   transformationProgressRef.current = 0;
// }
}
function drawParticles(ctx) {
  const particles = particlesRef.current;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;

    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = "rgba(255, 245, 220, 1)";
    ctx.shadowColor = "rgba(255, 245, 220, 1)";
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

function activateMode() {
  console.log("Activated");
  modeRef.current = "ACTIVE";
  sequenceStartRef.current = performance.now();
  particlesRef.current = [];
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
          left: "50%",
          transform: "translateX(-50%)",
          padding: "12px 22px",
          borderRadius: "30px",
          border: "1px solid rgba(255,245,220,0.8)",
          background: "rgba(10,10,10,0.85)",
          color: "white",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        Activate Lunar Mode
      </button>
    </div>
  );
}
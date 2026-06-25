import { useRef, useEffect } from 'react';
import fishSpriteUrl from '../../assets/fish_spritesheet.png';

interface AquariumCanvasProps {
  theme: string;
}

interface Fish {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetX: number;
  targetY: number;
  size: number;
  maxSpeed: number;
  wigglePhase: number;
  wiggleSpeed: number;
  spriteCol: number;
  spriteRow: number;
  facingLeft: boolean;
  currentFlip: number;
}

interface Bubble {
  x: number;
  y: number;
  size: number;
  speed: number;
  swayPhase: number;
  swaySpeed: number;
  swayWidth: number;
}

interface Seaweed {
  x: number;
  height: number;
  width: number;
  segments: number;
  phaseOffset: number;
  color: string;
}

interface Plankton {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

export function AquariumCanvas({ theme }: AquariumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- 1. High-DPI (Retina/4K) Resolution Scaling Setup ---
    const dpr = window.devicePixelRatio || 1;
    const width = 300;
    const height = 155;

    // Scale backing store for high sharpness, keep CSS style size static
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // --- Initialize Fish ---
    const FISH_SPRITES = [
      { col: 0, row: 0, facingLeft: false },
      { col: 1, row: 0, facingLeft: false },
      { col: 2, row: 0, facingLeft: false },
      { col: 0, row: 1, facingLeft: false },
      { col: 1, row: 1, facingLeft: false },
      { col: 2, row: 1, facingLeft: false },
      { col: 0, row: 2, facingLeft: true },
      { col: 1, row: 2, facingLeft: false },
      { col: 2, row: 2, facingLeft: false },
      { col: 0, row: 3, facingLeft: false },
      { col: 1, row: 3, facingLeft: true },
      { col: 2, row: 3, facingLeft: false },
      { col: 0, row: 4, facingLeft: false },
      { col: 1, row: 4, facingLeft: false },
      { col: 2, row: 4, facingLeft: true },
    ];

    const fishList: Fish[] = Array.from({ length: 6 }, (_, i) => {
      const sprite = FISH_SPRITES[Math.floor(Math.random() * FISH_SPRITES.length)];
      return {
        id: i + 1,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 0.5,
        angle: 0,
        targetX: Math.random() * width,
        targetY: Math.random() * height,
        size: 0.15 + Math.random() * 0.1,
        maxSpeed: 0.5 + Math.random() * 0.5,
        wigglePhase: Math.random() * Math.PI * 2,
        wiggleSpeed: 0.1 + Math.random() * 0.15,
        spriteCol: sprite.col,
        spriteRow: sprite.row,
        facingLeft: sprite.facingLeft,
        currentFlip: 1,
      };
    });

    const fishImage = new Image();
    fishImage.src = fishSpriteUrl;

    // --- Initialize Bubbles ---
    const bubbles: Bubble[] = Array.from({ length: 10 }, () => ({
      x: Math.random() * width,
      y: height + Math.random() * 50,
      size: 1.5 + Math.random() * 4.0,
      speed: 0.45 + Math.random() * 0.55,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.025 + Math.random() * 0.035,
      swayWidth: 2 + Math.random() * 3.5,
    }));

    // --- Initialize 12-Segment Seaweed (Smooth curve movement) ---
    const seaweeds: Seaweed[] = [
      {
        x: 35,
        height: 60,
        width: 6,
        segments: 12,
        phaseOffset: 0,
        color: '#1a5f36',
      },
      {
        x: 48,
        height: 80,
        width: 7,
        segments: 14,
        phaseOffset: Math.PI / 4,
        color: '#114b29',
      },
      {
        x: 255,
        height: 65,
        width: 5,
        segments: 12,
        phaseOffset: Math.PI / 3,
        color: '#1a5f36',
      },
      {
        x: 268,
        height: 85,
        width: 8,
        segments: 15,
        phaseOffset: Math.PI / 6,
        color: '#165330',
      },
    ];

    // --- Initialize Micro-Plankton (Adds environmental depth of field) ---
    const planktons: Plankton[] = Array.from({ length: 15 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.4 + Math.random() * 0.9,
      speedX: -0.12 + Math.random() * 0.24,
      speedY: -0.05 - Math.random() * 0.07, // Slow drift upwards
      opacity: 0.15 + Math.random() * 0.35,
    }));

    // --- Initialize Ripples ---
    const ripples: Ripple[] = [];

    // --- Click interaction handler ---
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * width;
      const clickY = ((e.clientY - rect.top) / rect.height) * height;

      // Add ripple
      ripples.push({
        x: clickX,
        y: clickY,
        radius: 0,
        maxRadius: 40,
        opacity: 0.85,
      });

      // Scatter fish away from the click point
      fishList.forEach((fish) => {
        const dx = fish.x - clickX;
        const dy = fish.y - clickY;
        const dist = Math.hypot(dx, dy);
        if (dist < 85) {
          const force = (85 - dist) / 85;
          const angle = Math.atan2(dy, dx);
          fish.vx += Math.cos(angle) * force * 2.8;
          fish.vy += Math.sin(angle) * force * 2.2;

          // Target recalculation
          fish.targetX = Math.random() * (width - 60) + 30;
          fish.targetY = Math.random() * (height - 40) + 20;
        }
      });
    };

    canvas.addEventListener('mousedown', handleCanvasClick);

    // --- Render Loop variables ---
    let animationFrameId: number;
    let time = 0;

    // --- Render Loop ---
    const render = () => {
      time += 0.02;

      // 1. Clear & Background water gradient
      ctx.clearRect(0, 0, width, height);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#001a4d'); // Deep blue surface
      bgGrad.addColorStop(0.5, '#000b24'); // Midwater
      bgGrad.addColorStop(1, '#00030f'); // Abyss bottom
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Caustic Light Beams (Sunlight rays)
      ctx.save();
      const beamGrad = ctx.createLinearGradient(0, 0, width, height);
      beamGrad.addColorStop(0, 'rgba(0, 242, 254, 0.14)');
      beamGrad.addColorStop(0.5, 'rgba(0, 242, 254, 0.04)');
      beamGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');

      ctx.fillStyle = beamGrad;

      const beamSway1 = Math.sin(time * 0.4) * 18;
      const beamSway2 = Math.cos(time * 0.25) * 22;

      ctx.beginPath();
      ctx.moveTo(25 + beamSway1, -10);
      ctx.lineTo(85 + beamSway2, -10);
      ctx.lineTo(195 + beamSway2, height + 10);
      ctx.lineTo(85 + beamSway1, height + 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(135 + beamSway2, -10);
      ctx.lineTo(195 + beamSway1, -10);
      ctx.lineTo(315 + beamSway1, height + 10);
      ctx.lineTo(225 + beamSway2, height + 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 3. Swaying Seaweeds (12-15 segments for maximum smoothness)
      seaweeds.forEach((plant) => {
        ctx.save();
        ctx.beginPath();

        // Multi-layered plant styling
        ctx.strokeStyle = plant.color;
        ctx.lineWidth = plant.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(plant.x, height);
        const segmentHeight = plant.height / plant.segments;
        const sway = Math.sin(time + plant.phaseOffset) * 7;

        let currentX = plant.x;
        let currentY = height;

        for (let i = 1; i <= plant.segments; i++) {
          const nextY = height - i * segmentHeight;
          const factor = i / plant.segments;
          // Exponential curvature toward the tip
          const nextX = plant.x + sway * Math.pow(factor, 1.8);

          const cpY = currentY - segmentHeight / 2;
          ctx.quadraticCurveTo(currentX, cpY, nextX, nextY);

          currentX = nextX;
          currentY = nextY;
        }

        ctx.stroke();

        // Add a secondary lighter spine highlight on the seaweed for 3D structure
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = plant.width * 0.25;
        ctx.stroke();

        ctx.restore();
      });

      // 4. Update and Draw Micro-Plankton (Floating particulate environment)
      planktons.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Reset if offscreen
        if (p.y < -5) p.y = height + 5;
        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;

        // Shiny glowing particulate
        ctx.fillStyle = `rgba(144, 224, 239, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Update and Draw Bubbles (Elastical squash & stretch wobble)
      bubbles.forEach((bubble) => {
        bubble.y -= bubble.speed;
        bubble.swayPhase += bubble.swaySpeed;
        const currentX = bubble.x + Math.sin(bubble.swayPhase) * bubble.swayWidth;

        // Wobble physics based on motion
        const wobble = Math.sin(time * 12 + bubble.swayPhase) * 0.08;
        const scaleX = 1 + wobble;
        const scaleY = 1 - wobble;

        // Reset bubble
        if (bubble.y < -10) {
          bubble.y = height + 10 + Math.random() * 20;
          bubble.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(currentX, bubble.y);
        ctx.scale(scaleX, scaleY);

        // Bubble shell with cyan-blue gradient outline
        ctx.beginPath();
        ctx.arc(0, 0, bubble.size, 0, Math.PI * 2);
        const bubbleGrad = ctx.createRadialGradient(
          -bubble.size * 0.2,
          -bubble.size * 0.2,
          0,
          0,
          0,
          bubble.size
        );
        bubbleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        bubbleGrad.addColorStop(0.85, 'rgba(144, 224, 239, 0.2)');
        bubbleGrad.addColorStop(1, 'rgba(144, 224, 239, 0.65)');
        ctx.fillStyle = bubbleGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(144, 224, 239, 0.5)';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // 4K Highlight glint
        ctx.beginPath();
        ctx.arc(-bubble.size * 0.35, -bubble.size * 0.35, bubble.size * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();

        ctx.restore();
      });

      // 6. Update and Draw Fish (With Drop Shadows and Fine skeletal Fin Rays)
      fishList.forEach((fish) => {
        // AI Pathing steering force toward wandering target
        const distToTarget = Math.hypot(fish.targetX - fish.x, fish.targetY - fish.y);
        if (distToTarget < 25 || Math.random() < 0.015) {
          fish.targetX = Math.random() * (width - 60) + 30;
          fish.targetY = Math.random() * (height - 40) + 20;
        }

        const targetAngle = Math.atan2(fish.targetY - fish.y, fish.targetX - fish.x);
        let angleDiff = targetAngle - fish.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        fish.angle += angleDiff * 0.045; // Smooth steering speed

        const speedMultiplier = distToTarget < 40 ? 0.6 : 1.0;
        const desiredVx = Math.cos(fish.angle) * fish.maxSpeed * speedMultiplier;
        const desiredVy = Math.sin(fish.angle) * fish.maxSpeed * speedMultiplier;

        fish.vx += (desiredVx - fish.vx) * 0.07;
        fish.vy += (desiredVy - fish.vy) * 0.07;

        // Boundary collision avoidance
        const margin = 20;
        if (fish.x < margin) {
          fish.vx += 0.16;
          fish.angle = Math.PI - fish.angle;
        }
        if (fish.x > width - margin) {
          fish.vx -= 0.16;
          fish.angle = Math.PI - fish.angle;
        }
        if (fish.y < margin) {
          fish.vy += 0.16;
          fish.angle = -fish.angle;
        }
        if (fish.y > height - margin) {
          fish.vy -= 0.16;
          fish.angle = -fish.angle;
        }

        fish.x += fish.vx;
        fish.y += fish.vy;
        fish.angle = Math.atan2(fish.vy, fish.vx);

        const speed = Math.hypot(fish.vx, fish.vy);
        fish.wigglePhase += fish.wiggleSpeed * (speed / fish.maxSpeed + 0.3);

        // --- DRAW FISH ---
        ctx.save();
        ctx.translate(fish.x, fish.y);

        const isMovingLeft = fish.vx < 0;
        const scaleX = isMovingLeft !== fish.facingLeft ? -1 : 1;

        // Instant horizontal flip
        ctx.scale(scaleX, 1);

        // Pitch rotation based on velocity vector
        const speedX = Math.abs(fish.vx);
        const pitch = Math.atan2(fish.vy, speedX);

        // Wiggle rotation
        const wiggle = Math.sin(fish.wigglePhase) * 0.1;

        ctx.rotate(pitch + wiggle);

        // Scale by fish size
        ctx.scale(fish.size, fish.size);

        // 3D Drop Shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 5;

        const srcW = 1024 / 3;
        const srcH = 1024 / 5;
        const srcX = fish.spriteCol * srcW;
        const srcY = fish.spriteRow * srcH;

        if (fishImage.complete) {
          ctx.drawImage(fishImage, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
        }

        ctx.restore();
      });

      // 7. Render Water Ripples
      ripples.forEach((ripple, index) => {
        ripple.radius += 1.35;
        ripple.opacity = 1 - ripple.radius / ripple.maxRadius;

        if (ripple.radius >= ripple.maxRadius) {
          ripples.splice(index, 1);
          return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(144, 224, 239, ${ripple.opacity * 0.45})`;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Secondary ripple refraction ring
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(144, 224, 239, ${ripple.opacity * 0.28})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      });

      // 8. Soft Vignette & Depth blending color pass
      ctx.save();
      const vigGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width / 4,
        width / 2,
        height / 2,
        width / 2
      );
      vigGrad.addColorStop(0, 'rgba(0, 180, 216, 0.02)');
      vigGrad.addColorStop(1, 'rgba(0, 4, 15, 0.28)'); // Darkened screen edges
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Loop frame
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Clean up on component unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleCanvasClick);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full rounded-2xl z-0 overflow-hidden cursor-pointer select-none touch-none"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
      }}
      title="Sentuh layar untuk membuat riak air 3D dan mengejutkan ikan!"
    />
  );
}

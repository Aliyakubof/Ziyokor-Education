import { useEffect, useRef } from 'react';

export default function InteractiveBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        let mouse = { x: -1000, y: -1000, radius: 180 };

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseOut = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseOut);

        // Antigravity style colors (Google / DeepMind inspired)
        const colors = [
            '#4285F4', // Blue
            '#EA4335', // Red
            '#FBBC05', // Yellow
            '#34A853', // Green
            '#8AB4F8', // Light Blue
            '#C5221F', // Dark Red
        ];

        class Particle {
            x: number;
            y: number;
            size: number;
            baseX: number;
            baseY: number;
            speedX: number;
            speedY: number;
            color: string;
            originalSize: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.baseX = this.x;
                this.baseY = this.y;
                this.size = Math.random() * 2.5 + 1; // Small elegant dots
                this.originalSize = this.size;
                this.speedX = (Math.random() - 0.5) * 0.6;
                this.speedY = (Math.random() - 0.5) * 0.6;
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }

            update() {
                // Bounce off edges gently
                if (this.x > width || this.x < 0) this.speedX = -this.speedX;
                if (this.y > height || this.y < 0) this.speedY = -this.speedY;

                this.x += this.speedX;
                this.y += this.speedY;

                // Mouse interaction - magnetic pulling / repulsion
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius) {
                    // Repel slightly to create a physical "push" effect
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (mouse.radius - distance) / mouse.radius;

                    this.x -= forceDirectionX * force * 1.5;
                    this.y -= forceDirectionY * force * 1.5;

                    // Slightly increase size when nearby
                    if (this.size < this.originalSize * 2) {
                        this.size += 0.1;
                    }
                } else {
                    if (this.size > this.originalSize) {
                        this.size -= 0.1;
                    }
                }
            }
        }

        let particlesArray: Particle[] = [];

        function init() {
            particlesArray = [];
            // Optimal density for nodes
            let numberOfParticles = (width * height) / 12000;
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        }

        function drawLines() {
            if (!ctx) return;
            let a = 1;

            for (let i = 0; i < particlesArray.length; i++) {
                // Draw lines to the mouse
                let dxMouse = mouse.x - particlesArray[i].x;
                let dyMouse = mouse.y - particlesArray[i].y;
                let distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

                if (distanceMouse < mouse.radius) {
                    a = 1 - (distanceMouse / mouse.radius);
                    ctx.beginPath();
                    // Connect cursor with a clean subtle line
                    ctx.strokeStyle = `rgba(66, 133, 244, ${a * 0.4})`; // Google Blue with dynamic opacity
                    ctx.lineWidth = 1;
                    ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }

                // Connect to other nearby particles
                for (let j = i; j < particlesArray.length; j++) {
                    let dx = particlesArray[i].x - particlesArray[j].x;
                    let dy = particlesArray[i].y - particlesArray[j].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 110) {
                        a = 1 - (distance / 110);
                        ctx.beginPath();
                        // Elegant slate/indigo colored lines
                        ctx.strokeStyle = `rgba(79, 70, 229, ${a * 0.15})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                        ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        let animationFrameId: number;
        function animate() {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            drawLines();
            animationFrameId = requestAnimationFrame(animate);
        }

        init();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseOut);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[-1] pointer-events-none bg-slate-50 hidden md:block" // Retaining original classes
            style={{ width: '100vw', height: '100vh', opacity: 0.95 }}
        />
    );
}

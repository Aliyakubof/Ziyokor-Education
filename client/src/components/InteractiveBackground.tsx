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

        let mouse = { x: -1000, y: -1000, radius: 150 };

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            init();
        });

        window.addEventListener('mousemove', (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        window.addEventListener('mouseout', () => {
            mouse.x = -1000;
            mouse.y = -1000;
        });

        // Letters and symbols fitting a language learning app
        const characters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'a', 'b', 'c', 'd', 'e', '!', '?', '@', '#', '1', '2', '3', 'Vocab', 'Unit', 'Test'];
        const colors = [
            'rgba(79, 70, 229, 0.12)', // Indigo
            'rgba(147, 51, 234, 0.08)', // Purple
            'rgba(59, 130, 246, 0.12)', // Blue
        ];

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            character: string;
            color: string;
            angle: number;
            spin: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 24 + 12; // Font sizes between 12px and 36px
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.8 - 0.2; // Slowly moving upwards generally
                this.character = characters[Math.floor(Math.random() * characters.length)];
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.angle = Math.random() * 360;
                this.spin = (Math.random() - 0.5) * 1; // subtle rotation
            }

            draw() {
                if (!ctx) return;
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate((this.angle * Math.PI) / 180);
                ctx.fillStyle = this.color;
                ctx.font = `bold ${this.size}px "Inter", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.character, 0, 0);
                ctx.restore();
            }

            update() {
                // Wrap around edges to keep them flowing continuously
                if (this.x > width + 50) this.x = -50;
                else if (this.x < -50) this.x = width + 50;

                if (this.y > height + 50) this.y = -50;
                else if (this.y < -50) this.y = height + 50;

                this.x += this.speedX;
                this.y += this.speedY;
                this.angle += this.spin;

                // Mouse interaction - letters gently move out of the way
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (mouse.radius - distance) / mouse.radius;
                    this.x -= forceDirectionX * force * 3;
                    this.y -= forceDirectionY * force * 3;
                    this.angle += forceDirectionX * 2; // spin a bit extra when pushed
                }
            }
        }

        let particlesArray: Particle[] = [];

        function init() {
            particlesArray = [];
            let numberOfParticles = (width * height) / 15000; // Optimal density for words/letters
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        }

        function animate() {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            requestAnimationFrame(animate);
        }

        init();
        animate();

        return () => {
            window.removeEventListener('resize', init);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[-1] pointer-events-none bg-slate-50 hidden md:block"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
}

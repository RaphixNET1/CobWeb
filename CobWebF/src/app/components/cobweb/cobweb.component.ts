import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// CWC
type Point = { x: number; y: number };

// CWC
interface Thread {
  d: string;
  delay: string;
}

// CWC
interface Web {
  spokes: Thread[];
  rings: Thread[];
  dews: (Point & { delay: string })[];
}

// CWC
function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// CWC
function polar(center: Point, radius: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return { x: center.x + radius * Math.cos(radians), y: center.y + radius * Math.sin(radians) };
}

// CWC
function format(point: Point): string {
  return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
}

// CWC
function buildWeb(center: Point, angles: number[], length: number, ringRadii: number[], closed: boolean): Web {
  const spokes = angles.map((angle, i) => ({
    d: `M${format(center)} L${format(polar(center, length * (0.9 + 0.1 * noise(i + 7)), angle))}`,
    delay: `${(i * 0.05).toFixed(2)}s`,
  }));

  const segments = closed ? angles.length : angles.length - 1;
  const rings = ringRadii.map((radius, ring) => {
    const points = angles.map((angle, i) => polar(center, radius * (0.94 + 0.12 * noise(ring * 31 + i)), angle));
    let d = `M${format(points[0])}`;
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % angles.length;
      const end = next === 0 ? angles[0] + 360 : angles[next];
      const sag = polar(center, radius * 0.84, (angles[i] + end) / 2);
      d += ` Q${format(sag)} ${format(points[next])}`;
    }
    return { d, delay: `${(0.45 + ring * 0.12).toFixed(2)}s` };
  });

  const dews = [2, 4, 5]
    .filter((ring) => ring < ringRadii.length)
    .map((ring, i) => ({
      ...polar(center, ringRadii[ring], angles[(ring * 3 + 1) % angles.length]),
      delay: `${(1.4 + i * 0.7).toFixed(2)}s`,
    }));

  return { spokes, rings, dews };
}

// CWC
function cornerWeb(): Web {
  const angles = Array.from({ length: 7 }, (_, i) => 90 + i * 15 + (noise(i) - 0.5) * 6);
  const radii = Array.from({ length: 7 }, (_, i) => 14 + i * 13);
  return buildWeb({ x: 100, y: 0 }, angles, 140, radii, false);
}

// CWC
function fullWeb(): Web {
  const angles = Array.from({ length: 12 }, (_, i) => i * 30 + (noise(i + 3) - 0.5) * 10);
  const radii = Array.from({ length: 6 }, (_, i) => 8 + i * 8);
  return buildWeb({ x: 50, y: 50 }, angles, 50, radii, true);
}

// CWC
@Component({
  selector: 'app-cobweb',
  templateUrl: './cobweb.component.html',
  styleUrls: ['./cobweb.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class CobwebComponent {
  readonly variant = input<'corner' | 'full'>('corner');

  protected readonly web = computed(() => (this.variant() === 'full' ? fullWeb() : cornerWeb()));
}

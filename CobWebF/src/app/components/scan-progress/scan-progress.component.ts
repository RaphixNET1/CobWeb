import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Check, Lock, LucideAngularModule, MapPin } from 'lucide-angular';

import { DetectionProgress } from '../../models/business.model';

const CENTER = 100;
const RING_RADIUS = 92;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const WEB_RADII = [26, 46, 66, 84];
const SPOKES = 8;
const GOLDEN_ANGLE = 137.508;

type Phase = 'discover' | 'check' | 'finish';
type StepState = 'pending' | 'active' | 'done';

function point(radius: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(radians), y: CENTER + radius * Math.sin(radians) };
}

@Component({
  selector: 'app-scan-progress',
  templateUrl: './scan-progress.component.html',
  styleUrls: ['./scan-progress.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
})
export class ScanProgressComponent {
  protected readonly Check = Check;
  protected readonly Lock = Lock;
  protected readonly MapPin = MapPin;

  protected readonly ringRadius = RING_RADIUS;
  protected readonly ringLength = RING_LENGTH;

  protected readonly webRings = WEB_RADII.map((radius) =>
    Array.from({ length: SPOKES }, (_, i) => point(radius, i * (360 / SPOKES) - 90))
      .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' '),
  );

  protected readonly spokes = Array.from({ length: SPOKES }, (_, i) =>
    point(WEB_RADII[WEB_RADII.length - 1], i * (360 / SPOKES) - 90),
  );

  readonly progress = input<DetectionProgress | null>(null);
  readonly finishing = input(false);

  protected readonly phase = computed<Phase>(() =>
    this.finishing() ? 'finish' : this.progress() ? 'check' : 'discover',
  );

  protected readonly percent = computed(() => {
    if (this.finishing()) return 100;
    const progress = this.progress();
    if (!progress?.total) return 0;
    return Math.round((progress.checked / progress.total) * 100);
  });

  protected readonly ringOffset = computed(() =>
    this.phase() === 'discover' ? RING_LENGTH * 0.78 : RING_LENGTH * (1 - this.percent() / 100),
  );

  protected readonly blips = computed(() =>
    (this.progress()?.recent ?? []).map((site) => ({
      ...site,
      ...point(20 + ((site.n * 29) % 62), site.n * GOLDEN_ANGLE),
    })),
  );

  protected readonly steps = computed(() => {
    const phase = this.phase();
    const progress = this.progress();
    const states: Record<Phase, StepState[]> = {
      discover: ['active', 'pending', 'pending'],
      check: ['done', 'active', 'pending'],
      finish: ['done', 'done', 'done'],
    };
    const [find, check, score] = states[phase];

    return [
      { label: 'Finding businesses', detail: 'OpenStreetMap', state: find },
      {
        label: 'Checking websites',
        detail: progress ? `${progress.checked} / ${progress.total}` : '',
        state: check,
      },
      {
        label: 'Scoring leads',
        detail: progress ? `${progress.leads} ${phase === 'finish' ? 'found' : 'so far'}` : '',
        state: score,
      },
    ];
  });

  protected readonly valueText = computed(() => {
    const progress = this.progress();
    switch (this.phase()) {
      case 'discover':
        return 'Finding businesses';
      case 'check':
        return `${progress?.checked} of ${progress?.total} websites checked`;
      case 'finish':
        return `Done, ${progress?.leads ?? 0} leads found`;
    }
  });
}

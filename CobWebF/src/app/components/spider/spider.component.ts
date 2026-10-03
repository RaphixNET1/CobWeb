import { ChangeDetectionStrategy, Component } from '@angular/core';

// CWC
@Component({
  selector: 'app-spider',
  templateUrl: './spider.component.html',
  styleUrls: ['./spider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class SpiderComponent {
  protected readonly legs = [
    'M17 15 Q9 5 4 9',
    'M16 18 Q6 13 1 17',
    'M16 21 Q6 22 2 28',
    'M17 24 Q11 30 7 35',
    'M23 15 Q31 5 36 9',
    'M24 18 Q34 13 39 17',
    'M24 21 Q34 22 38 28',
    'M23 24 Q29 30 33 35',
  ];
}

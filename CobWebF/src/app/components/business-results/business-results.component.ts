import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ArrowDownWideNarrow,
  ExternalLink,
  Facebook,
  Instagram,
  LucideAngularModule,
  Mail,
  Phone,
  RotateCw,
  Search,
  SearchX,
  TriangleAlert,
  Bookmark,
  BookmarkCheck,
  X,
} from 'lucide-angular';

import {
  Business,
  LeadStatus,
  SearchStatus,
  formatDistance,
  issueLabel,
  issueTitle,
  scoreLevel,
  searchUrl,
  statusLabel,
  websiteLabel,
} from '../../models/business.model';
import {SaveleadService} from '../../services/savelead.service';


const FILTER_THRESHOLD = 8;
const SKELETON_ROWS = [1, 2, 3, 4, 5];
const MAX_BADGES = 3;

type Tab = 'all' | LeadStatus;
type SortMode = 'score' | 'distance';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'socialOnly', label: 'Social' },
  { id: 'noWebsite', label: 'No site' },
  { id: 'outdated', label: 'Outdated' },
];

@Component({
  selector: 'app-business-results',
  templateUrl: './business-results.component.html',
  styleUrls: ['./business-results.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
})
export class BusinessResultsComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly savelead = inject(SaveleadService);

  protected readonly ArrowDownWideNarrow = ArrowDownWideNarrow;
  protected readonly ExternalLink = ExternalLink;
  protected readonly Facebook = Facebook;
  protected readonly Instagram = Instagram;
  protected readonly Mail = Mail;
  protected readonly Phone = Phone;
  protected readonly RotateCw = RotateCw;
  protected readonly Search = Search;
  protected readonly SearchX = SearchX;
  protected readonly TriangleAlert = TriangleAlert;
  protected readonly X = X;
  protected readonly Bookmark = Bookmark;
  protected readonly BookmarkCheck = BookmarkCheck;

  protected readonly tabs = TABS;
  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly maxBadges = MAX_BADGES;
  protected readonly websiteLabel = websiteLabel;
  protected readonly formatDistance = formatDistance;
  protected readonly issueLabel = issueLabel;
  protected readonly issueTitle = issueTitle;
  protected readonly scoreLevel = scoreLevel;
  protected readonly searchUrl = searchUrl;
  protected readonly statusLabel = statusLabel;

  readonly businesses = input<Business[]>([]);
  readonly status = input<SearchStatus>('idle');
  readonly selectedId = input<string | null>(null);
  readonly placeName = input('');
  readonly radiusKm = input(1);

  readonly businessSelected = output<Business>();
  readonly retry = output<void>();
  readonly closed = output<void>();

  protected readonly filterText = signal('');
  protected readonly tab = signal<Tab>('all');
  protected readonly sortMode = signal<SortMode>('score');

  protected readonly counts = computed(() => {
    const counts: Record<Tab, number> = { all: 0, noWebsite: 0, socialOnly: 0, outdated: 0 };
    for (const business of this.businesses()) {
      counts.all++;
      counts[business.status]++;
    }
    return counts;
  });

  protected readonly showFilter = computed(() => this.businesses().length > FILTER_THRESHOLD);

  protected readonly visible = computed(() => {
    const term = this.filterText().trim().toLowerCase();
    const tab = this.tab();

    const matches = this.businesses().filter(
      (b) =>
        (tab === 'all' || b.status === tab) &&
        (!term || b.name.toLowerCase().includes(term) || b.category.toLowerCase().includes(term)),
    );

    return this.sortMode() === 'distance'
      ? [...matches].sort((a, b) => a.distanceKm - b.distanceKm)
      : matches;
  });

  constructor() {
    effect(() => {
      this.businesses();
      this.filterText.set('');
      this.tab.set('all');
    });

    effect(() => {
      const id = this.selectedId();
      if (!id) {
        return;
      }
      queueMicrotask(() =>
        this.host.nativeElement
          .querySelector(`[data-id="${CSS.escape(id)}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
      );
    });
  }

  onFilterInput(event: Event): void {
    this.filterText.set((event.target as HTMLInputElement).value);
  }

  moreTitle(business: Business): string {
    return business.issues.slice(MAX_BADGES).map(issueTitle).join('\n');
  }

  toggleSort(): void {
    this.sortMode.update((mode) => (mode === 'score' ? 'distance' : 'score'));
  }

  isSaved(business: Business): boolean {
    return this.savelead.isSaved(business.id);
  }

  toggleSave(business: Business): void {
    this.savelead.toggle(business);
  }
}

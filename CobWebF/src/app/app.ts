import {Component, inject, signal} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { LucideAngularModule, Map as MapIcon, Bookmark, User } from 'lucide-angular';
import {ModeSetting} from './components/mode-setting/mode-setting';
import { HealthService } from './services/health.service';
import { SpiderComponent } from './components/spider/spider.component';
import { CobwebComponent } from './components/cobweb/cobweb.component';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, NgOptimizedImage, ModeSetting, SpiderComponent, CobwebComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {

  private readonly router = inject(Router);
  protected readonly health = inject(HealthService);

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let route = this.router.routerState.snapshot.root;
        while (route.firstChild) route = route.firstChild;
        return route.title ?? '';
      }),
    ),
    { initialValue: '' },
  );
  protected readonly title = signal('CobWebF');
  protected readonly Map = Map;
  protected readonly Bookmark = Bookmark;
  protected readonly User = User;
  protected readonly MapIcon = MapIcon;
}

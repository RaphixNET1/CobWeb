import {Component, effect, signal} from '@angular/core';

@Component({
  imports: [],
  selector: 'app-mode-setting',
  styleUrl: './mode-setting.css',
  templateUrl: './mode-setting.html',
})
export class ModeSetting {
  isDark = signal(localStorage.getItem('theme') === 'dark');

  constructor() {
    effect(() => {
      const dark = this.isDark();

      document.body.classList.remove('darkmode', 'lightmode');
      document.body.classList.add(dark ? 'darkmode' : 'lightmode');

      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  }

  toggle() {
    this.isDark.update(v => !v);
  }
}

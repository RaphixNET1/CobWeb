import { Component, input } from '@angular/core';

@Component({
  selector: 'app-explore-container',
  templateUrl: './explore-container.component.html',
  styleUrls: ['./explore-container.component.css'],
})
export class ExploreContainerComponent {
  readonly name = input<string>();
}

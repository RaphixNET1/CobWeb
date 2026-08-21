import { Component } from '@angular/core';
import {IonHeader, IonToolbar, IonTitle, IonContent, IonButtons} from '@ionic/angular';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, ExploreContainerComponent, IonButtons]
})
export class Tab2Page {

  constructor() {}

}

import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { earthOutline, heartCircleOutline, informationCircleOutline } from 'ionicons/icons';

addIcons({
  'earth-outline': earthOutline,
  'heart-circle-outline': heartCircleOutline,
  'information-circle-outline': informationCircleOutline,
});

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  constructor() {
    addIcons({ earthOutline, heartCircleOutline, informationCircleOutline });
  }
}

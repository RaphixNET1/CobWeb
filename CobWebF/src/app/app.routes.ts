import { Routes } from '@angular/router';
import { MapPage } from './pages/map-page/map-page';
import { SavedLocations } from './pages/saved-locations/saved-locations';
import { Aboutme } from './pages/aboutme/aboutme';
import { LeadDetail } from './pages/lead-detail/lead-detail';

export const routes: Routes = [
  { path: 'map', component: MapPage, title: 'Map' },
  { path: 'saved', component: SavedLocations, title: 'Saved' },
  { path: 'saved/:id', component: LeadDetail, title: 'Lead' },
  { path: 'about', component: Aboutme, title: 'About me' },
  { path: '', redirectTo: 'map', pathMatch: 'full' },
];

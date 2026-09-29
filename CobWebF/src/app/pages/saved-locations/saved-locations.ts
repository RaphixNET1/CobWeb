import { Component } from '@angular/core';
import {SavedLeads} from '../../components/saved-leads/saved-leads';

@Component({
  imports: [
    SavedLeads
  ],
  selector: 'app-saved-locations',
  styleUrl: './saved-locations.css',
  templateUrl: './saved-locations.html',
})
export class SavedLocations {}

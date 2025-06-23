// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2023, Input Labs Oy.

import { NgModule, Component, ApplicationConfig, isDevMode } from '@angular/core'
import { CommonModule } from '@angular/common'
import { provideRouter} from '@angular/router'

import { routes } from 'routing'
import { HeaderComponent } from 'components/header/header'
import { SidebarComponent } from 'components/sidebar/sidebar'
import { CentralComponent } from 'components/central/central';
import { provideServiceWorker } from '@angular/service-worker'

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes),provideServiceWorker('ngsw-worker.js', {
	  enabled: !isDevMode(),
	  registrationStrategy: 'registerWhenStable:30000'
  })]
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SidebarComponent,
    CentralComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.sass']
})
export class AppComponent {

}

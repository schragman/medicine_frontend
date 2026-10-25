import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { LocalStorageProfileRepository } from './core/persistence/local-storage-profile.repository';
import { ProfileRepository } from './core/persistence/profile.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Swapping this single binding for an HTTP implementation moves the application to
    // the backend without touching any component (NFR-4).
    { provide: ProfileRepository, useClass: LocalStorageProfileRepository },
  ],
};

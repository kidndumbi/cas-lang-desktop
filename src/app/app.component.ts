import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatSidenavModule, MatListModule, MatIconModule, MatToolbarModule, MatButtonModule,
  ],
  template: `
    <mat-toolbar color="primary" style="position: sticky; top: 0; z-index: 1000;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <mat-icon>language</mat-icon>
        <span style="font-size: 1.2em; font-weight: 500;">Cas-Lang Desktop</span>
      </div>
    </mat-toolbar>

    <mat-sidenav-container style="height: calc(100vh - 64px);">
      <mat-sidenav mode="side" opened style="width: 180px; background: #fafafa; border-right: 1px solid #e0e0e0;">
        <mat-nav-list style="padding-top: 8px;">
          <a mat-list-item
             *ngFor="let item of navItems"
             [routerLink]="item.route"
             routerLinkActive="active-link"
             [routerLinkActiveOptions]="{ exact: false }"
             style="display: flex; align-items: center; gap: 12px; border-radius: 0; margin: 2px 8px;">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content style="background: #f5f5f5; padding: 0;">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .active-link {
      background: rgba(63, 81, 181, 0.12) !important;
      color: #3f51b5 !important;
      font-weight: 500;
    }
    .active-link mat-icon {
      color: #3f51b5;
    }
    mat-list-item {
      cursor: pointer;
    }
  `],
})
export class AppComponent {
  navItems: NavItem[] = [
    { label: 'Practice', icon: 'school', route: '/practice' },
    { label: 'Vocabulary', icon: 'spellcheck', route: '/vocabulary' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
  ];
}
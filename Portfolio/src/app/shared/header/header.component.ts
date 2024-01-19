import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Input() title?: string = "Portfolio";
  @Input() subtitle?: string = "A portfolio of my work";
  @Input() btn?: string = "View my work";
}

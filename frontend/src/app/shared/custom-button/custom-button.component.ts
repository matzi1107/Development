import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-custom-button',
  standalone: true,
  templateUrl: './custom-button.component.html',
  styleUrls: ['./custom-button.component.scss']
})
export class CustomButtonComponent {
  @Input() text: string = 'Klick mich';
  @Input() color: string = 'primary';
  
  @Output() btnClick = new EventEmitter();
  
  onClick() {
    this.btnClick.emit();
  }
}
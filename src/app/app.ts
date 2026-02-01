import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Loader } from './core/components/loader/loader';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet , Loader , CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit{
   isLoading = true;
  protected title = 'zokhrof';

ngOnInit() {
    setTimeout(() => {
      this.isLoading = false;
    }, 100000); // مؤقتًا
  }
}

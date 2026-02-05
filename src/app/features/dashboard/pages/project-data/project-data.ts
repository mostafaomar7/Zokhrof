import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-project-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-data.html',
  styleUrl: './project-data.css',
})
export class ProjectData {
  private fb = inject(FormBuilder);

  isEdit = false;

  projectForm = this.fb.group({
    owner: this.fb.control('GV', Validators.required),
    sector: this.fb.control('HLT', Validators.required),
    type: this.fb.control('مستشفى', Validators.required),
    name: this.fb.control('تجهيزي', Validators.required),
    scale: this.fb.control('SM', Validators.required),
    budgetFrom: this.fb.control('000.000'),
    budgetTo: this.fb.control('000.000'),

    // إضافي حسب الصورة (تقدر توسّع)
    region: this.fb.control('عام'),
    centerType: this.fb.control('مركزي'),
    costPerM2: this.fb.control('200,000'),
    duration: this.fb.control('000'),
    shadedRatio: this.fb.control('000'),
    floors: this.fb.control(4),
  });

  toggleEdit() {
    this.isEdit = !this.isEdit;
    if (!this.isEdit) {
      this.projectForm.markAsPristine();
    }
  }

  save() {
    // هنا هتربط API بعدين
    this.isEdit = false;
    this.projectForm.markAsPristine();
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PassKeyFooterComponent } from '../pass-key-footer/pass-key-footer';
interface ConsultItem {
  code: string;
  price: string;
  time: string;
  color: 'purple' | 'orange';
}

// تعريف واجهة للصف (مجموعة يمين ومجموعة يسار)
interface ConsultRow {
  right: ConsultItem[];
  left: ConsultItem[];
  center?: boolean; // جديد
}

@Component({
  selector: 'app-project-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule , PassKeyFooterComponent],
  templateUrl: './project-data.html',
  styleUrl: './project-data.css',
})
export class ProjectData {
  private fb = inject(FormBuilder);

  isEdit = false;
  activeTab: 'dash' | 'designer' | 'project' = 'project';

  projectForm = this.fb.group({
    owner: this.fb.control('GV', Validators.required),
    sector: this.fb.control('HLT', Validators.required),
    type: this.fb.control('مستشفى', Validators.required),
    name: this.fb.control('تجهيزي', Validators.required),
    scale: this.fb.control('SM', Validators.required),
    budgetFrom: this.fb.control('000.000'),
    budgetTo: this.fb.control('000.000'),
    region: this.fb.control('عام'),
    centerType: this.fb.control('مركزي'),
    costPerM2: this.fb.control('200,000'),
    duration: this.fb.control('000'),
    shadedRatio: this.fb.control('000'),
    floors: this.fb.control(4),
  });

  toggleEdit() {
    this.isEdit = !this.isEdit;
    if (!this.isEdit) this.projectForm.markAsPristine();
  }

  save() {
    this.isEdit = false;
    this.projectForm.markAsPristine();
  }

  setValue<K extends keyof ProjectData['projectForm']['controls']>(key: K, val: any) {
    this.projectForm.controls[key].setValue(val);
    this.projectForm.markAsDirty();
  }

  // --- Logic for the Dot Chart ---
  // Rows representing Y-axis values (5 down to 2)
  chartRows = [5, 4, 3, 2];
  // Columns 1 to 30
  chartCols = Array.from({ length: 30 }, (_, i) => i + 1);
chartXAxis = Array.from({ length: 30 }, (_, i) => i + 1);
  // Helper to check if a specific dot should be colored
  // This simulates the curve in the Figma image
  getDotClass(row: number, col: number): string {
    // Example logic to match the image curve roughly
    // Green dots curve
    if (row === 3 && col >= 4 && col <= 7) return 'dot-green';
    if (row === 4 && col >= 8 && col <= 13) return 'dot-green';
    if (row === 5 && col >= 14 && col <= 18) return 'dot-green';
    
    // Purple dot
    if (row === 4 && col === 13) return 'dot-purple'; // Intersection/Special point

    // Red dots (top right)
    if (row === 5 && col >= 28) return 'dot-red';

    // Blue dots (start)
    if (row === 2 && col <= 3) return 'dot-cyan';

    return ''; // Default gray dot
  }
consultationRows: ConsultRow[] = [
    // Row 1
    {
      right: [
        { code: 'GIO', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'TOP', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'SRV', price: '100,30', time: '2,3', color: 'purple' }
      ],
      left: [
        { code: 'ECO', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'PLN', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'ENV', price: '100,30', time: '2,3', color: 'purple' }
      ]
    },
   // Row 2
{
  center: true,
  right: [
    { code: 'PRS', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'INT', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'LNS', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'IDP', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'IDD', price: '100,30', time: '2,3', color: 'purple' }
  ],
  left: []
},

// Row 3
{
  center: true,
  right: [
    { code: 'XTR', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'XTR', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'MEC', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'ELC', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'PLM', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'CVL', price: '100,30', time: '2,3', color: 'purple' },
    { code: 'ARC', price: '100,30', time: '2,3', color: 'purple' }
  ],
  left: []
},

    // Row 4
    {
      right: [
        { code: 'SMB', price: '100,30', time: '2,3', color: 'orange' },
        { code: 'INV', price: '100,30', time: '2,3', color: 'orange' },
        { code: 'SPR', price: '100,30', time: '2,3', color: 'orange' }
      ],
      left: [
        { code: 'CON', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'SPS', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'QNT', price: '100,30', time: '2,3', color: 'purple' }
      ]
    }
  ];
}
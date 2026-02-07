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

  setValue<K extends keyof ProjectData['projectForm']['controls']>(key: K, val: any) {
    this.projectForm.controls[key].setValue(val);
    this.projectForm.markAsDirty();
  }

  ganttMonths = Array.from({ length: 30 }, (_, i) => (i + 1).toString()); // 1..36
ganttLines  = Array.from({ length: 30 }, () => 0);

// helper: build 36 cells with colored segment(s)
private makeRow(seg: { g?: [number,number], y?: [number,number], p?: [number,number], b?: [number,number] }) {
  const n = 36;
  const row = Array.from({ length: n }, () => '');
  const paint = (k: string, range?: [number,number]) => {
    if(!range) return;
    const [s,e] = range;        // 1-based indexes
    for(let i=s; i<=e; i++){
      if(i>=1 && i<=n) row[i-1] = k;
    }
  };
  paint('g', seg.g);
  paint('y', seg.y);
  paint('p', seg.p);
  paint('b', seg.b);
  return row;
}
ganttY = [5,4,3,2,1,0];
ganttX = Array.from({ length: 36 }, (_, i) => (i + 1).toString()); // 1..36

sqData: string[][] = [
  this.row36([{ from: 1,  len: 2,  c: 'r' }]),   // row
  this.row36([{ from: 3,  len: 3,  c: 'g' }]),
  this.row36([{ from: 5,  len: 5,  c: 'g' }]),
  this.row36([{ from: 8,  len: 9,  c: 'g' }]),
  this.row36([{ from: 15, len: 1,  c: 'p' }]),
  this.row36([{ from: 15, len: 12, c: 'c' }]),
];

private row36(segs: { from: number; len: number; c: 'r'|'g'|'p'|'c' }[]) {
  const n = 36;
  const row = Array.from({ length: n }, () => '');
  for (const s of segs) {
    const start = Math.max(1, s.from);
    const end = Math.min(n, s.from + s.len - 1);
    for (let i = start; i <= end; i++) row[i - 1] = s.c;
  }
  return row;
}


}

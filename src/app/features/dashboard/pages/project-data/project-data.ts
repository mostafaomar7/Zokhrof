import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core'; // 1. استيراد inject
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

type EmployeeCard = {
  name: string;
  role: string;
  statusText: string;
  statusType: 'online' | 'offline';
  phone: string;
  email: string;
  score: number;
  metrics: { label: string; value: number }[];
};

@Component({
  selector: 'app-project-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-data.html',
  styleUrl: './project-data.css',
})
export class ProjectData {
  // 2. حقن FormBuilder هنا بدلاً من الـ Constructor ليتم تعريفه قبل الفورم
  private fb = inject(FormBuilder);

  // Tabs
  tabs = [
    { id: 'project', label: 'بيانات المشروع' },
    { id: 'designer', label: 'بيانات المصمم' },
    { id: 'control', label: 'بيانات لوحة التحكم' },
  ] as const;

  activeTab: (typeof this.tabs)[number]['id'] = 'project';

  // Edit Mode
  isEditMode = false;

  // Demo data
  leftEmployee: EmployeeCard = {
    name: 'فاطمة عبدالله جمعة',
    role: 'الموظف 2',
    statusText: 'غير متاح الآن',
    statusType: 'offline',
    phone: '+218 91-4400422',
    email: 'Fatma.ab@azzukhruf.ly',
    score: 85,
    metrics: [
      { label: 'جودة التواصل', value: 0 },
      { label: 'الالتزام بالمواعيد', value: 0 },
      { label: 'تحقيق الأهداف', value: 0 },
      { label: 'حسن التعامل', value: 0 },
      { label: 'قوة الإبداع', value: 0 },
      { label: 'قابلية التطوير', value: 0 },
    ],
  };

  rightEmployee: EmployeeCard = {
    name: 'عبدالمنعم علي',
    role: 'الموظف 1',
    statusText: 'متاح الآن',
    statusType: 'online',
    phone: '+218 91-4400422',
    email: 'Fatmam.mn@azzukhruf.ly',
    score: 95,
    metrics: [
      { label: 'جودة التواصل', value: 0 },
      { label: 'الالتزام بالمواعيد', value: 0 },
      { label: 'تحقيق الأهداف', value: 0 },
      { label: 'حسن التعامل', value: 0 },
      { label: 'قوة الإبداع', value: 0 },
      { label: 'قابلية التطوير', value: 0 },
    ],
  };

  // Form
  // الآن سيعمل الكود لأن fb تم تعريفه في السطر الأعلى باستخدام inject
  form = this.fb.group({
    owner: this.fb.control('GV', { nonNullable: true }),
    sector: this.fb.control('HLT', { nonNullable: true }),
    type: this.fb.control('مستشفى', { nonNullable: true }),
    name: this.fb.control('SM', { nonNullable: true }),
    classification: this.fb.control('عام', { nonNullable: true }),
    location: this.fb.control('مركز طرابلس', { nonNullable: true }),
    scope: this.fb.control('مركزي', { nonNullable: true }),
    level: this.fb.control('IV', { nonNullable: true }),

    sizeFrom: this.fb.control(200000, { nonNullable: true, validators: [Validators.min(0)] }),
    sizeTo: this.fb.control(200000, { nonNullable: true, validators: [Validators.min(0)] }),
    unit: this.fb.control('m2', { nonNullable: true }),

    // مؤشرات
    builtAreaRatio: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(100)] }),
    floorsCount: this.fb.control(4, { nonNullable: true, validators: [Validators.min(0), Validators.max(999)] }),
    fastCost: this.fb.control(200000, { nonNullable: true, validators: [Validators.min(0)] }),
    progress: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(100)] }),

    // أسعار وزمن الاستشارات
    consult: this.fb.group({
      GIO_price: this.fb.control(100.3, { nonNullable: true, validators: [Validators.min(0)] }),
      GIO_month: this.fb.control(2.3, { nonNullable: true, validators: [Validators.min(0)] }),

      TOP_price: this.fb.control(100.3, { nonNullable: true, validators: [Validators.min(0)] }),
      TOP_month: this.fb.control(2.3, { nonNullable: true, validators: [Validators.min(0)] }),

      SRV_price: this.fb.control(100.3, { nonNullable: true, validators: [Validators.min(0)] }),
      SRV_month: this.fb.control(2.3, { nonNullable: true, validators: [Validators.min(0)] }),

      ECO_price: this.fb.control(100.3, { nonNullable: true, validators: [Validators.min(0)] }),
      ECO_month: this.fb.control(2.3, { nonNullable: true, validators: [Validators.min(0)] }),

      PLN_price: this.fb.control(100.3, { nonNullable: true, validators: [Validators.min(0)] }),
      PLN_month: this.fb.control(2.3, { nonNullable: true, validators: [Validators.min(0)] }),

      ENV_price: this.fb.control(100.3, { nonNullable: true, validators: [Validators.min(0)] }),
      ENV_month: this.fb.control(2.3, { nonNullable: true, validators: [Validators.min(0)] }),
    }),
  });

  // 3. إزالة fb من الـ constructor لأنه تم حقنه بالأعلى
  constructor() {}

  setTab(id: (typeof this.tabs)[number]['id']) {
    this.activeTab = id;
  }

  toggleEdit() {
    this.isEditMode = true;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // API Call Logic
    console.log('SAVE', this.form.getRawValue());

    this.isEditMode = false;
  }

  // Helpers
  get disabledInputs(): boolean {
    return !this.isEditMode;
  }

  scoreStrokeDash(score: number) {
    // دائرة SVG: r=44 => circumference ≈ 276.46
    const c = 2 * Math.PI * 44;
    const filled = (score / 100) * c;
    return `${filled} ${c - filled}`;
  }

  scoreColor(score: number) {
    return score >= 90 ? '#22C55E' : '#F59E0B';
  }
}

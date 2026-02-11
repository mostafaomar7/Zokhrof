import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PassKeyFooterComponent } from '../pass-key-footer/pass-key-footer';
import { ProjectDataService } from '../../../../core/services/project-data';

interface ConsultItem {
  code: string;
  price: string;
  time: string;
  color: 'purple' | 'orange';
}

interface ConsultRow {
  right: ConsultItem[];
  left: ConsultItem[];
  center?: boolean;
}
interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  iban: string;
}

@Component({
  selector: 'app-project-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PassKeyFooterComponent],
  templateUrl: './project-data.html',
  styleUrl: './project-data.css',
})
export class ProjectData implements OnInit {
 ngOnInit(): void {
  this.loadBankAccounts();
  this.loadSubscriptionFees();

  // أول تحميل
  this.loadSectors();

  // (اختياري) Logs مرة واحدة فقط (مش جوه projectName)
  this.projectForm.controls.owner.valueChanges.subscribe(v => console.log('[owner]', v));
  this.projectForm.controls.scale.valueChanges.subscribe(v => console.log('[scale]', v));
  this.projectForm.controls.sectorId.valueChanges.subscribe(v => console.log('[sectorId]', v));
  this.projectForm.controls.projectTypeName.valueChanges.subscribe(v => console.log('[projectTypeName]', v));
  this.projectForm.controls.projectName.valueChanges.subscribe(v => console.log('[projectName]', v));

  // تغيّر owner أو size → إعادة تحميل القطاعات
  this.projectForm.controls.owner.valueChanges.subscribe(() => this.loadSectors());
  this.projectForm.controls.scale.valueChanges.subscribe(() => this.loadSectors());

  // تغيّر sector → تحميل templates
  this.projectForm.controls.sectorId.valueChanges.subscribe((sid) => {
    if (sid) this.loadTemplatesBySector(sid);
  });

  // تغيّر type → فلترة names
  this.projectForm.controls.projectTypeName.valueChanges.subscribe((t) => {
    this.projectForm.patchValue(
      { projectName: null, budgetFrom: '0', budgetTo: '0' },
      { emitEvent: false }
    );
    this.projectNames = [];
    if (t) this.loadNamesByType(t);
  });

  // تغيّر projectName → املا المساحة من template ثم (هيتنادي loadProjectDetailsFromFilter داخل fillAreaFromTemplate)
  this.projectForm.controls.projectName.valueChanges.subscribe((name) => {
    if (!name) return;
    this.fillAreaFromTemplate(); // ✅ هيعمل patch area ثم ينادي loadProjectDetailsFromFilter()
  });
}


  private fb = inject(FormBuilder);
  private projectDataService = inject(ProjectDataService);
  subscriptionFees: any[] = [];
subscriptionLoading = false;

  // ===== UI State =====
  isEdit = false;
  activeTab: 'dash' | 'designer' | 'project' = 'project';

  // ===== Project Form =====
projectForm = this.fb.group({
  owner: this.fb.control<'GV' | 'IV'>('GV', Validators.required),
  sectorId: this.fb.control<string | null>(null, Validators.required),

  projectTypeName: this.fb.control<string | null>(null, Validators.required),
  projectName: this.fb.control<string | null>(null, Validators.required),

  scale: this.fb.control<'SM' | 'LR'>('SM', Validators.required),

  budgetFrom: this.fb.control('0'),
  budgetTo: this.fb.control('0'),

  // ✅ add missing controls used in template
  shadedRatio: this.fb.control<string>('0'),
  floors: this.fb.control<string>('0'),
  costPerM2: this.fb.control<string>('0'),
  duration: this.fb.control<string>('0'),
});


sectors: { id: string; name_ar: string; name_en: string }[] = [];
templates: any[] = [];

projectTypes: string[] = [];
projectNames: string[] = [];
private mapOwner(owner: 'GV' | 'IV') {
  return owner === 'GV' ? 'government' : 'investor';
}
private mapSize(size: 'SM' | 'LR') {
  return size === 'SM' ? 'small' : 'large';
}
loadSectors() {
  const owner = this.mapOwner(this.projectForm.controls.owner.value!);
  const size = this.mapSize(this.projectForm.controls.scale.value!);

  // Reset تحت
  this.sectors = [];
  this.templates = [];
  this.projectTypes = [];
  this.projectNames = [];

 this.projectForm.patchValue({
  sectorId: null,
  projectTypeName: null,
  projectName: null,
  budgetFrom: '0',
  budgetTo: '0',
  shadedRatio: '0',
  floors: '0',
  costPerM2: '0',
  duration: '0',
}, { emitEvent: false });

  this.projectDataService.getProjectTemplates({
    owner_type: owner,
    project_size: size,
  }).subscribe({
    next: (res) => {
      const data = res?.data ?? [];
      // Unique sectors من data
      const map = new Map<string, any>();
      data.forEach(t => {
        const s = t.sector;
        if (s?.id && !map.has(s.id)) map.set(s.id, s);
      });
      this.sectors = Array.from(map.values());
    },
  });
}
loadTemplatesBySector(sectorId: string) {
  const owner = this.mapOwner(this.projectForm.controls.owner.value!);
  const size = this.mapSize(this.projectForm.controls.scale.value!);

  // Reset type/name + area = 0
  this.templates = [];
  this.projectTypes = [];
  this.projectNames = [];

  this.projectForm.patchValue({
    projectTypeName: null,
    projectName: null,
    budgetFrom: '0',
    budgetTo: '0',
  }, { emitEvent: false });

  this.projectDataService.getProjectTemplates({
    owner_type: owner,
    project_size: size,
    sector_id: sectorId,
  }).subscribe({
    next: (res) => {
      this.templates = res?.data ?? [];

      // Unique types
      const typeSet = new Set<string>();
      this.templates.forEach(t => {
        if (t.project_type_name) typeSet.add(t.project_type_name);
      });
      this.projectTypes = Array.from(typeSet);

      // لو عندك نوع واحد بس، اختاره تلقائيًا واملأ الأسماء
      if (this.projectTypes.length === 1) {
        const onlyType = this.projectTypes[0];
        this.projectForm.controls.projectTypeName.setValue(onlyType);
        this.loadNamesByType(onlyType);
      }
    },
  });
}

loadNamesByType(typeName: string) {
  const nameSet = new Set<string>();
  this.templates
    .filter(t => t.project_type_name === typeName)
    .forEach(t => nameSet.add(t.project_name));

  this.projectNames = Array.from(nameSet);

  // لو اسم واحد بس اختاره تلقائيًا واملأ المساحة
  if (this.projectNames.length === 1) {
    const onlyName = this.projectNames[0];
    this.projectForm.controls.projectName.setValue(onlyName);
    this.fillAreaFromTemplate();
  }
}
fillAreaFromTemplate() {
  const typeName = this.projectForm.controls.projectTypeName.value;
  const name = this.projectForm.controls.projectName.value;

  if (!typeName || !name) return;

  const row = this.templates.find(t =>
    t.project_type_name === typeName && t.project_name === name
  );

  this.projectForm.patchValue({
    budgetFrom: row?.area_from ?? '0',
    budgetTo: row?.area_to ?? '0',
  }, { emitEvent: false });

  // ✅ call بعد ما المساحة تتحدث
  this.loadProjectDetailsFromFilter();
}

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

  if (key === 'projectName') {
    console.log('[setValue] projectName clicked', val);
    this.fillAreaFromTemplate();
    this.loadProjectDetailsFromFilter();
  }
}

  // ===== Dot Chart =====
  chartRows = [5, 4, 3, 2, 1];
  chartCols = Array.from({ length: 30 }, (_, i) => i + 1);
  chartXAxis = Array.from({ length: 30 }, (_, i) => i + 1);
timelinePhases: any[] = [];

  // getDotClass(row: number, col: number): string {
  //   if (row === 3 && col >= 4 && col <= 7) return 'dot-green';
  //   if (row === 4 && col >= 8 && col <= 13) return 'dot-green';
  //   if (row === 5 && col >= 14 && col <= 18) return 'dot-green';

  //   if (row === 4 && col === 13) return 'dot-purple';

  //   if (row === 5 && col >= 28) return 'dot-red';

  //   if (row === 2 && col <= 3) return 'dot-cyan';

  //   return '';
  // }

  // ===== Consultation Rows =====
  consultationRows: ConsultRow[] = [
    {
      right: [
        { code: 'GIO', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'TOP', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'SRV', price: '100,30', time: '2,3', color: 'purple' },
      ],
      left: [
        { code: 'ECO', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'PLN', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'ENV', price: '100,30', time: '2,3', color: 'purple' },
      ],
    },
    {
      center: true,
      right: [
        { code: 'PRS', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'INT', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'LNS', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'IDP', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'IDD', price: '100,30', time: '2,3', color: 'purple' },
      ],
      left: [],
    },
    {
      center: true,
      right: [
        { code: 'XTR', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'XTR', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'MEC', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'ELC', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'PLM', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'CVL', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'ARC', price: '100,30', time: '2,3', color: 'purple' },
      ],
      left: [],
    },
    {
      right: [
        { code: 'SMB', price: '100,30', time: '2,3', color: 'orange' },
        { code: 'INV', price: '100,30', time: '2,3', color: 'orange' },
        { code: 'SPR', price: '100,30', time: '2,3', color: 'orange' },
      ],
      left: [
        { code: 'CON', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'SPS', price: '100,30', time: '2,3', color: 'purple' },
        { code: 'QNT', price: '100,30', time: '2,3', color: 'purple' },
      ],
    },
  ];

  // ===== Bank =====
  savingBank = false;
  bankMessage: { type: 'success' | 'error'; text: string } | null = null;
  private bankMsgTimer: ReturnType<typeof setTimeout> | null = null;

  bankForm = this.fb.group({
    accounts: this.fb.array([
      this.fb.group({
        account_name: ['', [Validators.required]],
        account_number: ['', [Validators.required]],
        iban: ['', [Validators.required]],
      }),
      this.fb.group({
        account_name: [''],
        account_number: [''],
        iban: [''],
      }),
      this.fb.group({
        account_name: [''],
        account_number: [''],
        iban: [''],
      }),
    ]),
  });

  private showBankMessage(type: 'success' | 'error', text: string) {
    this.bankMessage = { type, text };

    if (this.bankMsgTimer) clearTimeout(this.bankMsgTimer);

    this.bankMsgTimer = setTimeout(() => {
      this.bankMessage = null;
      this.bankMsgTimer = null;
    }, 5000);
  }

  private getBackendErrorMessage(err: HttpErrorResponse): string {
    const e: any = err.error;

    if (!e) return err.message || 'حدث خطأ غير متوقع';

    if (typeof e === 'string') return e;

    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;

    if (Array.isArray(e.errors)) {
      return e.errors.filter(Boolean).join(' | ') || 'حدث خطأ غير متوقع';
    }

    if (e.errors && typeof e.errors === 'object') {
      const msgs: string[] = [];
      Object.values(e.errors).forEach((v: any) => {
        if (Array.isArray(v)) msgs.push(...v);
        else if (typeof v === 'string') msgs.push(v);
      });
      if (msgs.length) return msgs.join(' | ');
    }

    return e?.toString?.() ?? err.message ?? 'حدث خطأ غير متوقع';
  }

  saveBankAccounts() {
    // clear old message + timer
    this.bankMessage = null;
    if (this.bankMsgTimer) {
      clearTimeout(this.bankMsgTimer);
      this.bankMsgTimer = null;
    }

    if (this.savingBank) return;

    this.savingBank = true;

    const accounts = (this.bankForm.value.accounts ?? [])
      .filter((acc): acc is { account_name: string; account_number: string; iban: string } =>
        !!acc?.account_name && !!acc?.account_number && !!acc?.iban
      )
      .map((acc) => ({
        account_name: acc.account_name.trim(),
        account_number: acc.account_number.trim(),
        iban: acc.iban.trim(),
      }));

    if (!accounts.length) {
      this.savingBank = false;
      console.warn('[Bank Accounts] No valid accounts to send.');
      this.showBankMessage('error', 'يرجى إدخال بيانات حساب بنكي واحد على الأقل');
      return;
    }

    console.log('[Bank Accounts] Payload to send:', accounts);

    let completed = 0;
    let hasError = false;

    accounts.forEach((acc, index) => {
      console.log(`[Bank Accounts] Sending account #${index + 1}`, acc);

      this.projectDataService.saveBankAccount(acc).subscribe({
        next: (res) => {
          console.log(`[Bank Accounts] Saved account #${index + 1} successfully:`, res);

          completed++;
          if (completed === accounts.length && !hasError) {
            this.savingBank = false;
            this.bankForm.markAsPristine();

            this.showBankMessage('success', 'تم حفظ الحسابات البنكية بنجاح');
            console.log('[Bank Accounts] All accounts saved successfully.');
          }
        },
        error: (err: HttpErrorResponse) => {
          hasError = true;
          this.savingBank = false;

          const backendMsg = this.getBackendErrorMessage(err);

          console.error(`[Bank Accounts] Failed to save account #${index + 1}`, {
            status: err.status,
            message: err.message,
            backend: err.error,
          });

          this.showBankMessage('error', backendMsg || 'حدث خطأ غير متوقع');
        },
      });
    });
  }
  get accountsArray() {
  return this.bankForm.get('accounts') as FormArray;
}
loadBankAccounts() {
  this.projectDataService.getBankAccounts().subscribe({
    next: (res) => {
      const accounts: BankAccount[] = res?.data ?? [];
      console.log('[Bank Accounts] Loaded from API:', accounts);

      const formArray = this.accountsArray;

      if (!formArray) return;

      // املا الموجود فقط (حد أقصى 3)
      accounts.slice(0, 3).forEach((acc, index) => {
        const group = formArray.at(index);
        if (group) {
          group.patchValue({
            account_name: acc.account_name,
            account_number: acc.account_number,
            iban: acc.iban,
          });
        }
      });

      // لو 3 حسابات → اقفل الفورم (اختياري)
      if (accounts.length >= 3) {
        formArray.disable({ emitEvent: false });
        console.warn('[Bank Accounts] Max 3 accounts reached → form disabled');
      }
    },

    error: (err: HttpErrorResponse) => {
      console.error('[Bank Accounts] Failed to load accounts', err);
      this.showBankMessage(
        'error',
        this.getBackendErrorMessage(err)
      );
    }
  });
}
loadSubscriptionFees() {
  this.subscriptionLoading = true;

  this.projectDataService.getSubscriptionFees().subscribe({
    next: (res) => {
      const data = res?.data ?? [];
      this.subscriptionFees = Array.isArray(data) ? data : [];
      this.subscriptionLoading = false;

      console.log('[Subscription Fees] Raw response:', res);
      console.log('[Subscription Fees] data:', this.subscriptionFees);
    },
    error: (err: HttpErrorResponse) => {
      this.subscriptionLoading = false;
      console.error('[Subscription Fees] Failed', err);
      this.showBankMessage('error', this.getBackendErrorMessage(err));
    }
  });
}
getConsultOrder(i: number): number {
  // يخلي العرض صفوف (كل صف فيه 2)
  // i=0 -> 0, i=1 -> 1, i=2 -> 2 ...
  return i;
}

getFee(userType: string, type: string) {
  return this.subscriptionFees.find(
    f => f.user_type === userType && f.subscription_type === type
  );
}
updateAllSubscriptions() {
  if (!this.subscriptionFees.length) {
    this.showBankMessage('error', 'لا توجد بيانات اشتراك للتعديل');
    return;
  }

  this.subscriptionLoading = true;
  this.showBankMessage('success', 'جاري حفظ تعديلات الإشتراكات...');

  let completed = 0;
  let hasError = false;

  this.subscriptionFees.forEach(fee => {
    this.projectDataService
      .updateSubscriptionFee(fee.id, fee.annual_fee)
      .subscribe({
        next: () => {
          completed++;

          if (completed === this.subscriptionFees.length && !hasError) {
            this.subscriptionLoading = false;
            this.showBankMessage('success', 'تم تحديث الإشتراكات بنجاح');
          }
        },
        error: (err: HttpErrorResponse) => {
          hasError = true;
          this.subscriptionLoading = false;

          this.showBankMessage('error', this.getBackendErrorMessage(err) || 'حدث خطأ أثناء تحديث الإشتراكات');
        }
      });
  });
}

updateFeeValue(userType: string, type: string, value: string) {
  const fee = this.getFee(userType, type);
  if (fee) {
    fee.annual_fee = value;
    this.showBankMessage('success', 'تم تعديل قيمة الإشتراك (لم يتم الحفظ بعد)');
  }
}
// داخل ProjectData component

selectedProject: any | null = null;

consultationCategories: any[] = []; // من consultation_fees_and_timeframes

totals = {
  consultCost: 0,
  consultDays: 0,
  supervisCost: 0,
  supervisDays: 0,
};
private mapOwnerForFilter(owner: 'GV' | 'IV') {
  return owner === 'GV' ? 'government' : 'investor'; // ✅ بدل individual
}

private mapSizeForFilter(size: 'SM' | 'LR') {
  return size === 'SM' ? 'small' : 'large';
}
loadProjectDetailsFromFilter() {
  const owner = this.projectForm.controls.owner.value;
  const sectorId = this.projectForm.controls.sectorId.value;
  const size = this.projectForm.controls.scale.value;
  const typeName = this.projectForm.controls.projectTypeName.value;
  const projectName = this.projectForm.controls.projectName.value;

  console.log('[Filter] inputs', { owner, sectorId, size, typeName, projectName });

  if (!owner || !sectorId || !size || !typeName || !projectName) {
    console.warn('[Filter] missing value -> skip');
    return;
  }

  // 👇 دور على التيمبلت المطابق
  const row = this.templates.find((t: any) =>
    t.project_type_name === typeName && t.project_name === projectName
  );

  const project_type_id =
    row?.project_type_id || row?.project_type?.id;

  const project_specialization_id =
    row?.project_specialization_id || row?.specialization?.id;

  // ✅ هنا بالظبط تحط اللوجات
  console.log('[Filter] typeName/name', typeName, projectName);
  console.log('[Filter] templates count', this.templates?.length);
  console.log('[Filter] matched row', row);
  console.log('[Filter] extracted ids', {
    project_type_id,
    project_specialization_id,
  });

  // 👇 بعد كده ابنِ الـ payload
  const payload: any = {
    owner_type: this.mapOwnerForFilter(owner),
    project_size: this.mapSizeForFilter(size),
    project_sector_id: sectorId,
    area_from: this.projectForm.controls.budgetFrom.value,
    area_to: this.projectForm.controls.budgetTo.value,
  };

  if (project_type_id)
    payload.project_type_id = project_type_id;

  if (project_specialization_id)
    payload.project_specialization_id = project_specialization_id;

  console.log('[Filter] payload', payload);

  this.projectDataService.filterProjects(payload).subscribe({
    next: (res) => {
      console.log('[Filter] response', res);

      const data = res?.data;
      const project = data?.projects?.[0];

      if (project) {
        this.applyProjectToUI(project);
      } else {
        console.warn('[Filter] no projects returned -> use base_consultation_summary');
        this.applyBaseSummaryToUI(data?.base_consultation_summary);
      }
    },
    error: (err) => console.error('[Filter Projects] Failed', err),
  });
}

applyBaseSummaryToUI(summary: any) {
  const shadedRatio =
    summary?.building_codes?.covered_area_percentage ??
    summary?.covered_area_percentage;

  const floors =
    summary?.building_codes?.number_of_floors ??
    summary?.number_of_floors;

  const costPerM2 =
    summary?.project_indicators?.cost_per_square_meter ??
    summary?.cost_per_square_meter;

  const duration =
    summary?.project_indicators?.project_completion_time_percentage ??
    summary?.project_completion_time_percentage;

  this.projectForm.patchValue(
    {
      shadedRatio: shadedRatio != null ? String(shadedRatio) : this.projectForm.controls.shadedRatio.value,
      floors: floors != null ? String(floors) : this.projectForm.controls.floors.value,
      costPerM2: costPerM2 != null ? String(costPerM2) : this.projectForm.controls.costPerM2.value,
      duration: duration != null ? String(duration) : this.projectForm.controls.duration.value,
    },
    { emitEvent: false }
  );

  // باقي البيانات
  this.consultationCategories = summary?.consultation_fees_and_timeframes ?? [];
  this.rebuildConsultLayout();
  this.timelinePhases = summary?.project_timeline_phases ?? [];
  this.rebuildTimeline();
}

applyProjectToUI(project: any) {
  const shadedRatio =
    project?.building_codes?.covered_area_percentage ??
    project?.covered_area_percentage ??
    '0';

  const floors =
    project?.building_codes?.number_of_floors ??
    project?.number_of_floors ??
    '0';

  const costPerM2 =
    project?.project_indicators?.cost_per_square_meter ??
    project?.cost_per_square_meter ??
    '0';

  const duration =
    project?.project_indicators?.project_completion_time_percentage ??
    project?.project_completion_time_percentage ??
    '0';

  this.projectForm.patchValue(
    {
      shadedRatio: String(shadedRatio),
      floors: String(floors),
      costPerM2: String(costPerM2),
      duration: String(duration),
    },
    { emitEvent: false }
  );
  console.log('[UI] patched', this.projectForm.value);

}

// ===== Consult layout مطلوب =====
consultRowsUI: any[][] = [];

private buildConsultRows(items: any[]) {
  const sizes = [3, 3, 5, 6, 3, 3]; // ✅ المطلوب
  const rows: any[][] = [];

  let idx = 0;
  for (const size of sizes) {
    rows.push(items.slice(idx, idx + size));
    idx += size;
  }

  // لو فيه عناصر زيادة (احتياطي)
  if (idx < items.length) rows.push(items.slice(idx));

  this.consultRowsUI = rows.filter(r => r.length);
}

private rebuildConsultLayout() {
  const flat = (this.consultationCategories ?? [])
    .flatMap(c => c?.sub_consultations ?? []);

  this.buildConsultRows(flat);
}
private phaseSegments: { from: number; to: number }[] = [];

private rebuildTimeline() {
  const phases = this.timelinePhases ?? [];
  const totalDays = phases.reduce((a, p) => a + Number(p?.total_duration_days ?? 0), 0);

  if (!totalDays) {
    this.phaseSegments = [];
    return;
  }

  let cursor = 1;
  this.phaseSegments = phases.map(p => {
    const days = Number(p?.total_duration_days ?? 0);
    const width = Math.max(1, Math.round((days / totalDays) * this.chartCols.length));
    const seg = { from: cursor, to: Math.min(this.chartCols.length, cursor + width - 1) };
    cursor = seg.to + 1;
    return seg;
  });
}

getDotClass(row: number, col: number): string {
  // مثال: خلي الصف 5 هو اللي يرسم الجدول (أو وزعهم زي ما تحب)
  if (row !== 5) return '';

  const idx = this.phaseSegments.findIndex(s => col >= s.from && col <= s.to);
  if (idx === -1) return '';

  // class مختلفة لكل phase (اعملها زي ما تحب)
  return idx % 2 === 0 ? 'dot-green' : 'dot-purple';
}


}

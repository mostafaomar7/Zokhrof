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

type SectionKey = 'dash' | 'consult' | 'subs' | 'bank';

@Component({
  selector: 'app-project-data',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PassKeyFooterComponent],
  templateUrl: './project-data.html',
  styleUrl: './project-data.css',
})
export class ProjectData implements OnInit {
  private fb = inject(FormBuilder);
  private projectDataService = inject(ProjectDataService);

  // ===== Global message (used for ALL submits) =====
  bankMessage: { type: 'success' | 'error'; text: string } | null = null;
  private bankMsgTimer: ReturnType<typeof setTimeout> | null = null;

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

  // ===== UI Tabs =====
  activeTab: 'dash' | 'designer' | 'project' = 'project';

  // ===== Section State (Edit/Save logic) =====
  sectionState: Record<SectionKey, { hasData: boolean; isEditing: boolean; loading: boolean }> = {
    dash: { hasData: false, isEditing: false, loading: false },
    consult: { hasData: false, isEditing: false, loading: false },
    subs: { hasData: false, isEditing: false, loading: false },
    bank: { hasData: false, isEditing: false, loading: false },
  };

  private isZeroLike(v: any): boolean {
    if (v === null || v === undefined) return true;
    const s = String(v).trim();
    if (s === '') return true;
    const n = Number(s);
    return !Number.isNaN(n) && n === 0;
  }

  private hasAnyNonZero(obj: Record<string, any>): boolean {
    return Object.values(obj).some(v => !this.isZeroLike(v));
  }

  private toNumberOrNull(v: any): number | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  }

  // ===== Forms =====
  projectForm = this.fb.group({
    owner: this.fb.control<'GV' | 'IV'>('GV', Validators.required),
    sectorId: this.fb.control<string | null>(null, Validators.required),
    projectTypeName: this.fb.control<string | null>(null, Validators.required),
    projectName: this.fb.control<string | null>(null, Validators.required),
    scale: this.fb.control<'SM' | 'LR'>('SM', Validators.required),

    budgetFrom: this.fb.control('0'),
    budgetTo: this.fb.control('0'),

    shadedRatio: this.fb.control<string>('0'),
    floors: this.fb.control<string>('0'),
    costPerM2: this.fb.control<string>('0'),
    duration: this.fb.control<string>('0'),
  });

  bankForm = this.fb.group({
    accounts: this.fb.array([
      this.fb.group({
        account_name: ['', [Validators.required]],
        account_number: ['', [Validators.required]],
        iban: ['', [Validators.required]],
      }),
      this.fb.group({ account_name: [''], account_number: [''], iban: [''] }),
      this.fb.group({ account_name: [''], account_number: [''], iban: [''] }),
    ]),
  });

  get accountsArray() {
    return this.bankForm.get('accounts') as FormArray;
  }

  // ===== Data =====
  sectors: { id: string; name_ar: string; name_en: string }[] = [];
  templates: any[] = [];
  projectTypes: string[] = [];
  projectNames: string[] = [];

  selectedProject: any | null = null;

  // ===== Subscription =====
  subscriptionFees: any[] = [];
  subscriptionLoading = false;

  // ===== Bank =====
  savingBank = false;

  // ===== Dash/Timeline =====
  chartRows = [5, 4, 3, 2, 1];
  chartCols = Array.from({ length: 30 }, (_, i) => i + 1);
  chartXAxis = Array.from({ length: 30 }, (_, i) => i + 1);
  timelinePhases: any[] = [];

  // ===== Consultation =====
  consultationCategories: any[] = [];
  consultRowsUI: any[][] = [];

  totals = {
    consultCost: 0,
    consultDays: 0,
    supervisCost: 0,
    supervisDays: 0,
  };

  // Dummy (unchanged) — not used in UI now
  consultationRows: ConsultRow[] = [];

  // ===== Init =====
  ngOnInit(): void {
    this.loadBankAccounts();
    this.loadSubscriptionFees();
    this.loadSectors();

    // Reload sectors when owner/scale changes
    this.projectForm.controls.owner.valueChanges.subscribe(() => this.loadSectors());
    this.projectForm.controls.scale.valueChanges.subscribe(() => this.loadSectors());

    // sector -> templates
    this.projectForm.controls.sectorId.valueChanges.subscribe((sid) => {
      if (sid) this.loadTemplatesBySector(sid);
    });

    // type -> reset name + area + names list
    this.projectForm.controls.projectTypeName.valueChanges.subscribe((t) => {
      this.projectForm.patchValue(
        { projectName: null, budgetFrom: '0', budgetTo: '0' },
        { emitEvent: false }
      );
      this.projectNames = [];
      if (t) this.loadNamesByType(t);
    });

    // projectName -> fill area + filter
    this.projectForm.controls.projectName.valueChanges.subscribe((name) => {
      if (!name) return;
      this.fillAreaFromTemplate();
    });
  }

  // ===== Templates mapping =====
  private mapOwner(owner: 'GV' | 'IV') {
    return owner === 'GV' ? 'government' : 'investor';
  }

  private mapSize(size: 'SM' | 'LR') {
    return size === 'SM' ? 'small' : 'large';
  }

  // ===== State refreshers =====
  private updateDashStateFromForm() {
    const v = this.projectForm.value;
    const payload = {
      shadedRatio: v.shadedRatio,
      floors: v.floors,
      costPerM2: v.costPerM2,
      duration: v.duration,
    };
    this.sectionState.dash.hasData = this.hasAnyNonZero(payload);
    if (this.sectionState.dash.hasData) this.sectionState.dash.isEditing = false;
  }

  private updateConsultStateFromData() {
    const all = (this.consultationCategories ?? []).flatMap(c => c.sub_consultations ?? []);
    this.sectionState.consult.hasData = all.some(sc =>
      sc.project_price != null ||
      sc.project_duration_days != null ||
      sc.price_for_owner != null ||
      sc.actual_duration_days != null
    );
    if (this.sectionState.consult.hasData) this.sectionState.consult.isEditing = false;
  }

  // ===== Load sectors/templates =====
  loadSectors() {
    const owner = this.mapOwner(this.projectForm.controls.owner.value!);
    const size = this.mapSize(this.projectForm.controls.scale.value!);

    // Reset
    this.sectors = [];
    this.templates = [];
    this.projectTypes = [];
    this.projectNames = [];
    this.selectedProject = null;

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

    this.consultationCategories = [];
    this.consultRowsUI = [];
    this.timelinePhases = [];
    this.totals = { consultCost: 0, consultDays: 0, supervisCost: 0, supervisDays: 0 };
    this.sectionState.dash = { hasData: false, isEditing: false, loading: false };
    this.sectionState.consult = { hasData: false, isEditing: false, loading: false };

    this.projectDataService.getProjectTemplates({
      owner_type: owner,
      project_size: size,
    }).subscribe({
      next: (res) => {
        const data = res?.data ?? [];
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
        const typeSet = new Set<string>();
        this.templates.forEach(t => {
          if (t.project_type_name) typeSet.add(t.project_type_name);
        });
        this.projectTypes = Array.from(typeSet);

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
    if (!row) return;

    this.projectForm.patchValue({
      budgetFrom: row.area_from ?? '0',
      budgetTo: row.area_to ?? '0',
    }, { emitEvent: false });

    this.loadProjectDetailsFromFilter();
  }

  // Keep your setValue signature (chips)
  setValue<K extends keyof ProjectData['projectForm']['controls']>(key: K, val: any) {
    this.projectForm.controls[key].setValue(val);
    this.projectForm.markAsDirty();

    if (key === 'projectName') {
      this.fillAreaFromTemplate();
      Promise.resolve().then(() => this.loadProjectDetailsFromFilter());
    }
  }

  // ===== Filter =====
  private mapSizeForAPI(size: 'SM' | 'LR') {
    return size === 'SM' ? 'small' : 'large';
  }

  loadProjectDetailsFromFilter() {
    const owner = this.projectForm.controls.owner.value;
    const sectorId = this.projectForm.controls.sectorId.value;
    const size = this.projectForm.controls.scale.value;
    const typeName = this.projectForm.controls.projectTypeName.value;
    const projectName = this.projectForm.controls.projectName.value;

    if (!owner || !sectorId || !size || !typeName || !projectName) return;

    const matchedRow = this.templates.find(t =>
      t.project_type_name === typeName && t.project_name === projectName
    );
    if (!matchedRow) return;

    const payload: any = {
      owner_type: owner, // GV or IV
      project_size: this.mapSizeForAPI(size as 'SM' | 'LR'),
      project_sector_id: sectorId,
      area_from: matchedRow.area_from,
      area_to: matchedRow.area_to,
      project_type_id: matchedRow.project_type_id || matchedRow.project_type?.id,
      project_specialization_id: matchedRow.project_specialization_id || matchedRow.specialization?.id
    };

    this.projectDataService.filterProjects(payload).subscribe({
      next: (res) => {
        const data = res?.data;
        if (data?.projects?.length > 0) {
          this.applyProjectToUI(data.projects[0]);
        } else {
          this.selectedProject = null;
          this.applyBaseSummaryToUI(data?.base_consultation_summary);
        }
      }
    });
  }

  applyProjectToUI(project: any) {
    this.selectedProject = project;

    const shaded =
      project?.building_codes?.covered_area_percentage ??
      project?.covered_area_percentage ??
      '0';

    const floors_count =
      project?.building_codes?.number_of_floors ??
      project?.number_of_floors ??
      '0';

    const cost =
      project?.project_indicators?.cost_per_square_meter ??
      project?.cost_per_square_meter ??
      '0';

    const duration_val =
      project?.project_indicators?.project_completion_time_percentage ??
      project?.project_completion_time_percentage ??
      '0';

    this.projectForm.patchValue({
      shadedRatio: String(shaded),
      floors: String(floors_count),
      costPerM2: String(cost),
      duration: String(duration_val),
    }, { emitEvent: false });

    this.consultationCategories = project?.consultation_fees_and_timeframes ?? [];
    this.rebuildConsultLayout();

    this.timelinePhases = project?.project_timeline_phases ?? [];
    this.rebuildTimeline();

    if (project?.calculated_totals) {
      this.totals = {
        consultCost: project.calculated_totals.engineering_consultations?.total_cost || 0,
        consultDays: project.calculated_totals.engineering_consultations?.total_duration_days || 0,
        supervisCost: project.calculated_totals.engineering_supervision?.total_cost || 0,
        supervisDays: project.calculated_totals.engineering_supervision?.total_duration_days || 0,
      };
    }

    this.updateDashStateFromForm();
    this.updateConsultStateFromData();
  }

  applyBaseSummaryToUI(summary: any) {
    if (!summary) return;

    const shaded = summary?.building_codes?.covered_area_percentage ?? summary?.covered_area_percentage ?? '0';
    const floors = summary?.building_codes?.number_of_floors ?? summary?.number_of_floors ?? '0';
    const cost = summary?.project_indicators?.cost_per_square_meter ?? summary?.cost_per_square_meter ?? '0';
    const duration = summary?.project_indicators?.project_completion_time_percentage ?? summary?.project_completion_time_percentage ?? '0';

    this.projectForm.patchValue({
      shadedRatio: String(shaded),
      floors: String(floors),
      costPerM2: String(cost),
      duration: String(duration),
    }, { emitEvent: false });

    this.consultationCategories = summary?.consultation_fees_and_timeframes ?? [];
    this.rebuildConsultLayout();

    this.timelinePhases = summary?.project_timeline_phases ?? [];
    this.rebuildTimeline();

    this.totals = {
      consultCost: summary?.calculated_totals?.engineering_consultations?.total_cost || 0,
      consultDays: summary?.calculated_totals?.engineering_consultations?.total_duration_days || 0,
      supervisCost: summary?.calculated_totals?.engineering_supervision?.total_cost || 0,
      supervisDays: summary?.calculated_totals?.engineering_supervision?.total_duration_days || 0,
    };

    this.updateDashStateFromForm();
    this.updateConsultStateFromData();
  }

  // ===== Timeline =====
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
    if (row !== 5) return '';
    const idx = this.phaseSegments.findIndex(s => col >= s.from && col <= s.to);
    if (idx === -1) return '';
    return idx % 2 === 0 ? 'dot-green' : 'dot-purple';
  }

  // ===== Consult Layout =====
  private rebuildConsultLayout() {
    const allSubConsultations = (this.consultationCategories ?? [])
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .flatMap(cat => cat.sub_consultations ?? []);

    const layoutSchema = [3, 3, 5, 6, 3, 3];
    const distributedRows: any[][] = [];
    let currentIndex = 0;

    for (const count of layoutSchema) {
      const row = allSubConsultations.slice(currentIndex, currentIndex + count);
      if (row.length > 0) distributedRows.push(row);
      currentIndex += count;
    }

    this.consultRowsUI = distributedRows;
  }

  setConsultValue(sc: any, field: 'project_price' | 'project_duration_days', value: string) {
    sc[field] = value;
    this.showBankMessage('success', 'تم تعديل قيمة (لم يتم الحفظ بعد)');
  }

  // ===== DASH Actions =====
  startEditDash() {
    this.sectionState.dash.isEditing = true;
  }

  saveDash() {
    const projectId = this.selectedProject?.id;
    if (!projectId) {
      this.showBankMessage('error', 'لا يمكن الحفظ: لا يوجد Project ID');
      return;
    }
    if (this.sectionState.dash.loading) return;

    const v = this.projectForm.value;
    const payload = {
      covered_area_percentage: Number(v.shadedRatio ?? 0),
      number_of_floors: Number(v.floors ?? 0),
      cost_per_square_meter: Number(v.costPerM2 ?? 0),
      project_completion_time_percentage: Number(v.duration ?? 0),
    };

    this.sectionState.dash.loading = true;
    this.showBankMessage('success', 'جاري حفظ بيانات لوحة التحكم...');

    // لازم تكون ضايف updateProjectDashboard في السيرفيس
    this.projectDataService.updateProjectDashboard(projectId, payload).subscribe({
      next: () => {
        this.sectionState.dash.loading = false;
        this.sectionState.dash.isEditing = false;
        this.sectionState.dash.hasData = this.hasAnyNonZero(payload);
        this.projectForm.markAsPristine();
        this.showBankMessage('success', 'تم حفظ بيانات لوحة التحكم بنجاح');
      },
      error: (err: HttpErrorResponse) => {
        this.sectionState.dash.loading = false;
        this.showBankMessage('error', this.getBackendErrorMessage(err));
      }
    });
  }

  // ===== CONSULT Actions =====
  startEditConsult() {
    this.sectionState.consult.isEditing = true;
  }

  saveConsultOverrides() {
    const projectId = this.selectedProject?.id;
    if (!projectId) {
      this.showBankMessage('error', 'لا يمكن الحفظ: لا يوجد Project ID');
      return;
    }
    if (this.sectionState.consult.loading) return;

    const all = (this.consultationCategories ?? []).flatMap(c => c.sub_consultations ?? []);
    const items = all.map(sc => ({
      sub_consultation_id: String(sc.id ?? sc.sub_consultation_id),
      price_for_owner: this.toNumberOrNull(sc.project_price ?? sc.price_for_owner),
      actual_duration_days: this.toNumberOrNull(sc.project_duration_days ?? sc.actual_duration_days),
    }));

    this.sectionState.consult.loading = true;
    this.showBankMessage('success', 'جاري حفظ أسعار وزمن الاستشارات...');

    // لازم تكون ضايف updateProjectSubConsultations في السيرفيس
    this.projectDataService.updateProjectSubConsultations(projectId, { items }).subscribe({
      next: () => {
        this.sectionState.consult.loading = false;
        this.sectionState.consult.isEditing = false;
        this.sectionState.consult.hasData = items.some(x => x.price_for_owner != null || x.actual_duration_days != null);
        this.showBankMessage('success', 'تم حفظ الاستشارات بنجاح');
      },
      error: (err: HttpErrorResponse) => {
        this.sectionState.consult.loading = false;
        this.showBankMessage('error', this.getBackendErrorMessage(err));
      }
    });
  }

  // ===== BANK =====
loadBankAccounts() {
  this.projectDataService.getBankAccounts().subscribe({
    next: (res) => {
      const accounts: BankAccount[] = res?.data ?? [];
      const formArray = this.accountsArray;
      if (!formArray) return;

      // reset enabling (خليها)
      formArray.enable({ emitEvent: false });

      accounts.slice(0, 3).forEach((acc, index) => {
        const group = formArray.at(index);
        if (group) {
          group.patchValue(
            {
              account_name: acc.account_name,
              account_number: acc.account_number,
              iban: acc.iban,
            },
            { emitEvent: false }
          );
        }
      });

      this.sectionState.bank.hasData = accounts.length > 0;
      this.sectionState.bank.isEditing = !this.sectionState.bank.hasData;

      // ❌ شيلنا disable عشان يفضلوا قابلين للكتابة
      // if (accounts.length >= 3) {
      //   formArray.disable({ emitEvent: false });
      // }
    },
    error: (err: HttpErrorResponse) => {
      this.showBankMessage('error', this.getBackendErrorMessage(err));
    },
  });
}

  saveBankAccounts() {
    this.bankMessage = null;
    if (this.bankMsgTimer) {
      clearTimeout(this.bankMsgTimer);
      this.bankMsgTimer = null;
    }

    if (this.savingBank) return;

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
      this.showBankMessage('error', 'يرجى إدخال بيانات حساب بنكي واحد على الأقل');
      return;
    }

    this.savingBank = true;
    this.showBankMessage('success', 'جاري حفظ الحسابات البنكية...');

    let completed = 0;
    let hasError = false;

    accounts.forEach((acc) => {
      this.projectDataService.saveBankAccount(acc).subscribe({
        next: () => {
          completed++;
          if (completed === accounts.length && !hasError) {
            this.savingBank = false;
            this.bankForm.markAsPristine();
            this.sectionState.bank.hasData = true;
            this.sectionState.bank.isEditing = false;
            this.showBankMessage('success', 'تم حفظ الحسابات البنكية بنجاح');
          }
        },
        error: (err: HttpErrorResponse) => {
          hasError = true;
          this.savingBank = false;
          this.showBankMessage('error', this.getBackendErrorMessage(err));
        },
      });
    });
  }

  // ===== SUBSCRIPTIONS =====
  loadSubscriptionFees() {
    this.subscriptionLoading = true;

    this.projectDataService.getSubscriptionFees().subscribe({
      next: (res) => {
        const data = res?.data ?? [];
        this.subscriptionFees = Array.isArray(data) ? data : [];
        this.subscriptionLoading = false;

        this.sectionState.subs.hasData = (this.subscriptionFees ?? []).some(f => !this.isZeroLike(f.annual_fee));
        this.sectionState.subs.isEditing = false;
      },
      error: (err: HttpErrorResponse) => {
        this.subscriptionLoading = false;
        this.showBankMessage('error', this.getBackendErrorMessage(err));
      }
    });
  }

  getFee(userType: string, type: string) {
    return this.subscriptionFees.find(
      f => f.user_type === userType && f.subscription_type === type
    );
  }

  updateFeeValue(userType: string, type: string, value: string) {
    const fee = this.getFee(userType, type);
    if (fee) {
      fee.annual_fee = value;
      this.showBankMessage('success', 'تم تعديل قيمة الإشتراك (لم يتم الحفظ بعد)');
    }
  }

  updateAllSubscriptions() {
    if (!this.subscriptionFees.length) {
      this.showBankMessage('error', 'لا توجد بيانات اشتراك للتعديل');
      return;
    }

    if (this.subscriptionLoading) return;

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
              this.sectionState.subs.hasData = true;
              this.sectionState.subs.isEditing = false;
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
}

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
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

  // ✅ NEW: saved flags (عشان نفرّق بين حفظ أول مرة وتعديل بعدين)
  private isSaved: Record<SectionKey, boolean> = {
    dash: false,
    consult: false,
    subs: false,
    bank: false,
  };

  // ✅ NEW: initial snapshots (عشان نعرف هل حصل تغيير ولا لأ)
  private initial = {
    dash: { shadedRatio: '0', floors: '0', costPerM2: '0', duration: '0' },
    consultMap: new Map<string, { price: number | null; days: number | null }>(),
    subsMap: new Map<string, number | null>(),
    bankMap: new Map<number, { name: string; number: string; iban: string }>(),
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

  consultationRows: ConsultRow[] = [];
private _restoring = false;

  // ===== Init =====
  ngOnInit(): void {
    this.loadBankAccounts();
    this.loadSubscriptionFees();
    this.loadSectors();

    // Reload sectors when owner/scale changes
this.projectForm.controls.owner.valueChanges.subscribe(() => this.loadSectors(true));
this.projectForm.controls.scale.valueChanges.subscribe(() => this.loadSectors(true));

    // sector -> templates
    this.projectForm.controls.sectorId.valueChanges.subscribe((sid) => {
      if (sid) this.loadTemplatesBySector(sid);
    });

    // type -> reset name + area + names list
   this.projectForm.controls.projectTypeName.valueChanges.subscribe((t) => {
  if (!this._restoring) {
    this.projectForm.patchValue(
      { projectName: null, budgetFrom: '0', budgetTo: '0' },
      { emitEvent: false }
    );
    this.projectNames = [];
  }
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
loadSectors(preserveSelection = false) {
  const owner = this.mapOwner(this.projectForm.controls.owner.value!);
  const size  = this.mapSize(this.projectForm.controls.scale.value!);

  // ✅ خزّني الاختيارات الحالية
  const prev = preserveSelection ? {
    sectorId: this.projectForm.controls.sectorId.value,
    typeName: this.projectForm.controls.projectTypeName.value,
    projectName: this.projectForm.controls.projectName.value,
  } : { sectorId: null, typeName: null, projectName: null };

  // Reset "خفيف": امسحي القوائم بس، مش الفورم كله
  this.sectors = [];
  this.templates = [];
  this.projectTypes = [];
  this.projectNames = [];
  this.selectedProject = null;

  // ❗️متصفريش sector/type/name هنا لو preserveSelection=true
  if (!preserveSelection) {
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
  }

  // (لو محتاجة تصفير الداتا الكبيرة حتى مع preserveSelection خليها، بس ده بيرجّعك “من الأول”)
  // الأفضل ما تمسحيش الاستشارات/التايملاين إلا لو فعلاً القطاع/النوع/الاسم اتغيروا.

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

  const stillHasSector =
    !!prev.sectorId && this.sectors.some(s => s.id === prev.sectorId);

  // ✅ مهم جدًا: خزّني قبل setValue
  this._pendingRestore = prev;

  if (stillHasSector) {
    this.projectForm.controls.sectorId.setValue(prev.sectorId); // emitEvent=true افتراضيًا
  } else {
    this.projectForm.patchValue({
      sectorId: null,
      projectTypeName: null,
      projectName: null,
      budgetFrom: '0',
      budgetTo: '0',
    }, { emitEvent: false });
  }
}
,
  });
}

// ✅ متغير مساعد
private _pendingRestore: { sectorId: string|null; typeName: string|null; projectName: string|null } | null = null;

  loadTemplatesBySector(sectorId: string) {
  const owner = this.mapOwner(this.projectForm.controls.owner.value!);
  const size  = this.mapSize(this.projectForm.controls.scale.value!);

  const restore = this._pendingRestore; // اللي جاي من loadSectors()

  this.templates = [];
  this.projectTypes = [];
  this.projectNames = [];

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

      // ✅ رجّعي type لو لسه موجود (TypeScript-safe)
      const prevType = restore?.typeName ?? null;

      if (prevType && this.projectTypes.includes(prevType)) {
  this._restoring = true;

  this._pendingName = restore?.projectName ?? null;
  this.projectForm.controls.projectTypeName.setValue(prevType); // هيفعل valueChanges
  // loadNamesByType هيتنادى من subscription فوق (مش لازم تناديه هنا)
  // لكن لو مصمّم تناديه هنا، سيبه وتمام.

  this._restoring = false;
}
 else {
        // النوع مش صالح
        this.projectForm.patchValue(
          {
            projectTypeName: null,
            projectName: null,
            budgetFrom: '0',
            budgetTo: '0',
          },
          { emitEvent: false }
        );
      }

      this._pendingRestore = null;
    },
  });
}


private _pendingName: string | null = null;


  loadNamesByType(typeName: string) {
  const nameSet = new Set<string>();
  this.templates
    .filter(t => t.project_type_name === typeName)
    .forEach(t => nameSet.add(t.project_name));

  this.projectNames = Array.from(nameSet);

  const pending = this._pendingName;
  this._pendingName = null;

  const nameOk = !!pending && this.projectNames.includes(pending);

  if (nameOk) {
    this.projectForm.controls.projectName.setValue(pending);
    this.fillAreaFromTemplate();
    return;
  }

  // fallback: لو اسم واحد بس
  if (this.projectNames.length === 1) {
    const onlyName = this.projectNames[0];
    this.projectForm.controls.projectName.setValue(onlyName);
    this.fillAreaFromTemplate();
  } else {
    // لو أكتر من اسم، سيبيه للمستخدم من غير ما تصفر بقية الدنيا
    this.projectForm.controls.projectName.setValue(null, { emitEvent: false });
    this.projectForm.patchValue({ budgetFrom: '0', budgetTo: '0' }, { emitEvent: false });
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
      owner_type: this.mapOwner(owner as any),

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

    // ✅ snapshot dash
    this.initial.dash = {
      shadedRatio: String(shaded),
      floors: String(floors_count),
      costPerM2: String(cost),
      duration: String(duration_val),
    };
    // if server returned values => considered saved
    this.isSaved.dash = this.hasAnyNonZero(this.initial.dash);

    this.consultationCategories = project?.consultation_fees_and_timeframes ?? [];
    this.rebuildConsultLayout();

    // ✅ snapshot consult
    this.captureConsultSnapshot();
    this.isSaved.consult = this.sectionState.consult.hasData;

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

    // ✅ snapshot dash
    this.initial.dash = {
      shadedRatio: String(shaded),
      floors: String(floors),
      costPerM2: String(cost),
      duration: String(duration),
    };
    this.isSaved.dash = this.hasAnyNonZero(this.initial.dash);

    this.consultationCategories = summary?.consultation_fees_and_timeframes ?? [];
    this.rebuildConsultLayout();
    this.captureConsultSnapshot();
    this.isSaved.consult = this.sectionState.consult.hasData;

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
    // ✅ خليها dirty عند التعديل
    sc.__dirty = true;
    this.showBankMessage('success', 'تم تعديل قيمة (لم يتم الحفظ بعد)');
  }

  // ===== DASH Actions =====
  startEditDash() {
    this.sectionState.dash.isEditing = true;
  }

  // ✅ بدل saveDash القديمة: خليها private وتشتغل حسب mode + dirty
  private buildDashPayload() {
    const v = this.projectForm.value;
    return {
      covered_area_percentage: Number(v.shadedRatio ?? 0),
      number_of_floors: Number(v.floors ?? 0),
      cost_per_square_meter: Number(v.costPerM2 ?? 0),
      project_completion_time_percentage: Number(v.duration ?? 0),
    };
  }

  private dashChanged(): boolean {
    const v = this.projectForm.value;
    return (
      String(v.shadedRatio ?? '0') !== String(this.initial.dash.shadedRatio ?? '0') ||
      String(v.floors ?? '0') !== String(this.initial.dash.floors ?? '0') ||
      String(v.costPerM2 ?? '0') !== String(this.initial.dash.costPerM2 ?? '0') ||
      String(v.duration ?? '0') !== String(this.initial.dash.duration ?? '0')
    );
  }

  private saveDashInternal(): Observable<any> {
    const projectId = this.selectedProject?.id;
    if (!projectId) {
      this.showBankMessage('error', 'لا يمكن الحفظ: لا يوجد Project ID');
      return of(null);
    }
    if (this.sectionState.dash.loading) return of(null);

    const payload = this.buildDashPayload();

    this.sectionState.dash.loading = true;

    return this.projectDataService.updateProjectDashboard(projectId, payload).pipe(
      finalize(() => (this.sectionState.dash.loading = false)),
      map((res) => {
        this.sectionState.dash.isEditing = false;
        this.sectionState.dash.hasData = this.hasAnyNonZero({
          shadedRatio: this.projectForm.value.shadedRatio,
          floors: this.projectForm.value.floors,
          costPerM2: this.projectForm.value.costPerM2,
          duration: this.projectForm.value.duration,
        });
        this.projectForm.markAsPristine();

        // update snapshots
        this.initial.dash = {
          shadedRatio: String(this.projectForm.value.shadedRatio ?? '0'),
          floors: String(this.projectForm.value.floors ?? '0'),
          costPerM2: String(this.projectForm.value.costPerM2 ?? '0'),
          duration: String(this.projectForm.value.duration ?? '0'),
        };
        this.isSaved.dash = true;

        return res;
      })
    );
  }

  // ===== CONSULT Actions =====
  startEditConsult() {
    this.sectionState.consult.isEditing = true;
  }

  private captureConsultSnapshot() {
    this.initial.consultMap.clear();
    const all = (this.consultationCategories ?? []).flatMap(c => c.sub_consultations ?? []);
    all.forEach(sc => {
      const id = String(sc.id ?? sc.sub_consultation_id);
      const price = this.toNumberOrNull(sc.project_price ?? sc.price_for_owner);
      const days = this.toNumberOrNull(sc.project_duration_days ?? sc.actual_duration_days);
      this.initial.consultMap.set(id, { price, days });
    });
  }

  private consultChanged(): boolean {
    const all = (this.consultationCategories ?? []).flatMap(c => c.sub_consultations ?? []);
    return all.some(sc => {
      const id = String(sc.id ?? sc.sub_consultation_id);
      const prev = this.initial.consultMap.get(id);
      const price = this.toNumberOrNull(sc.project_price ?? sc.price_for_owner);
      const days = this.toNumberOrNull(sc.project_duration_days ?? sc.actual_duration_days);

      if (!prev) return (price != null || days != null);
      return prev.price !== price || prev.days !== days || sc.__dirty === true;
    });
  }

  private saveConsultInternal(mode: 'create' | 'update'): Observable<any> {
    const projectId = this.selectedProject?.id;
    if (!projectId) {
      this.showBankMessage('error', 'لا يمكن الحفظ: لا يوجد Project ID');
      return of(null);
    }
    if (this.sectionState.consult.loading) return of(null);

    const all = (this.consultationCategories ?? []).flatMap(c => c.sub_consultations ?? []);
    const items = all
      .filter(sc => {
        if (mode === 'create') return true;
        // update: ابعت اللي اتغير فقط
        const id = String(sc.id ?? sc.sub_consultation_id);
        const prev = this.initial.consultMap.get(id);
        const price = this.toNumberOrNull(sc.project_price ?? sc.price_for_owner);
        const days = this.toNumberOrNull(sc.project_duration_days ?? sc.actual_duration_days);
        if (!prev) return (price != null || days != null);
        return prev.price !== price || prev.days !== days || sc.__dirty === true;
      })
      .map(sc => ({
        sub_consultation_id: String(sc.id ?? sc.sub_consultation_id),
        price_for_owner: this.toNumberOrNull(sc.project_price ?? sc.price_for_owner),
        actual_duration_days: this.toNumberOrNull(sc.project_duration_days ?? sc.actual_duration_days),
      }));

    if (!items.length) return of(null);

    this.sectionState.consult.loading = true;

    return this.projectDataService.updateProjectSubConsultations(projectId, { items }).pipe(
      finalize(() => (this.sectionState.consult.loading = false)),
     map((res: any) => {
  // ✅ طبّق البيانات الجديدة على الواجهة (هي فيها totals + consultation + timeline)
  if (res?.data) {
    this.applyProjectToUI(res.data);
  }

  this.sectionState.consult.isEditing = false;
  this.isSaved.consult = true;

  // clear dirty flags + refresh snapshot
  const allLocal = (this.consultationCategories ?? []).flatMap(c => c.sub_consultations ?? []);
  allLocal.forEach(sc => (sc.__dirty = false));
  this.captureConsultSnapshot();

  return res;
})

    );
  }
bankUuids: (string | null)[] = [null, null, null];

  // ===== BANK =====
 loadBankAccounts() {
  this.projectDataService.getBankAccounts().subscribe({
    next: (res) => {
      const accounts: BankAccount[] = res?.data ?? [];
      const formArray = this.accountsArray;
      if (!formArray) return;

      // ✅ reset uuids
      this.bankUuids = [null, null, null];

      formArray.enable({ emitEvent: false });

      // ✅ fill first 3 + store uuid
      accounts.slice(0, 3).forEach((acc, index) => {
        this.bankUuids[index] = acc.id;

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

      // ✅ snapshot + pristine
      this.captureBankSnapshot();
      this.bankForm.markAsPristine();
    },
    error: (err: HttpErrorResponse) => {
      this.showBankMessage('error', this.getBackendErrorMessage(err));
    },
  });
}

private bankSnapshot = new Map<number, { name: string; number: string; iban: string }>();

private captureBankSnapshot() {
  this.bankSnapshot.clear();
  this.accountsArray.controls.forEach((ctrl, i) => {
    const v: any = ctrl.value ?? {};
    this.bankSnapshot.set(i, {
      name: String(v.account_name ?? '').trim(),
      number: String(v.account_number ?? '').trim(),
      iban: String(v.iban ?? '').trim(),
    });
  });
}

private bankRowChanged(i: number): boolean {
  const prev = this.bankSnapshot.get(i) ?? { name: '', number: '', iban: '' };
  const v: any = this.accountsArray.at(i).value ?? {};
  const now = {
    name: String(v.account_name ?? '').trim(),
    number: String(v.account_number ?? '').trim(),
    iban: String(v.iban ?? '').trim(),
  };
  return prev.name !== now.name || prev.number !== now.number || prev.iban !== now.iban;
}

  private bankChanged(): boolean {
  return this.accountsArray.controls.some((_, i) => this.bankRowChanged(i));
}
onDashInput(
  key: 'shadedRatio' | 'floors' | 'costPerM2' | 'duration',
  value: string
) {
  this.projectForm.controls[key].setValue(value);
  this.projectForm.controls[key].markAsDirty();
  this.projectForm.markAsDirty();
}

private saveBankInternal(mode: 'create' | 'update') {
  // create: لو عندك بالفعل حسابات محفوظة، متضيفش
  // (لو عايز تسمح بإضافة حساب 2 أو 3 لو فاضي، سيبها)
  if (this.savingBank) return of(null);

  // update: لازم يكون فيه تغييرات
  if (mode === 'update' && !this.bankChanged()) return of(null);

  const formArray = this.accountsArray;

  // جهّز requests لكل صف متغير فقط
  const reqs = formArray.controls
    .map((ctrl, i) => ({ ctrl, i }))
    .filter(x => x.ctrl.dirty) // ✅ ابعت المتغير بس
    .map(x => {
      const v: any = x.ctrl.value ?? {};
      const payload = {
        account_name: String(v.account_name ?? '').trim(),
        account_number: String(v.account_number ?? '').trim(),
        iban: String(v.iban ?? '').trim(),
      };

      // لو الصف فاضي -> متبعتش
      if (!payload.account_name || !payload.account_number || !payload.iban) {
        return of(null);
      }

      const uuid = this.bankUuids[x.i];

      if (uuid) {
        // ✅ UPDATE (PUT)
        return this.projectDataService.updateBankAccount(uuid, payload);
      }

      // ✅ لو مفيش uuid يبقى ده Create (لو عندك POST)
      // لو عندك saveBankAccount = POST:
      if (this.projectDataService.saveBankAccount) {
        return this.projectDataService.saveBankAccount(payload);
      }

      // لو مفيش endpoint إنشاء، امنع
      return of(null);
    });

  // شيل null requests
  const realReqs = reqs.filter(Boolean);

  if (!realReqs.length) return of(null);

  this.savingBank = true;

  return forkJoin(realReqs).pipe(
    finalize(() => (this.savingBank = false)),
    map((results: any[]) => {
      // ✅ لو حصل create ورجع id خزنه
      // (لو API بتاع POST بيرجع data.id)
      results.forEach((r, idx) => {
        const dataId = r?.data?.id;
        // مش دايمًا نقدر نحدد index الحقيقي من forkJoin لو في nulls
        // فالأفضل بعد الحفظ تعمل reload من السيرفر
      });

      // safer: reload accounts to refresh uuids + pristine
      this.loadBankAccounts();

      this.sectionState.bank.hasData = true;
      this.sectionState.bank.isEditing = false;

      this.showBankMessage('success', mode === 'create' ? 'تم حفظ الحسابات البنكية' : 'تم تعديل الحسابات البنكية');
      return results;
    })
  );
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

        // ✅ saved + snapshot
        this.isSaved.subs = this.sectionState.subs.hasData;
        this.captureSubsSnapshot();
      },
      error: (err: HttpErrorResponse) => {
        this.subscriptionLoading = false;
        this.showBankMessage('error', this.getBackendErrorMessage(err));
      }
    });
  }

  private captureSubsSnapshot() {
    this.initial.subsMap.clear();
    (this.subscriptionFees ?? []).forEach(f => {
      this.initial.subsMap.set(String(f.id), this.toNumberOrNull(f.annual_fee));
    });
  }

  private subsChanged(): boolean {
    return (this.subscriptionFees ?? []).some(f => {
      const prev = this.initial.subsMap.get(String(f.id));
      const now = this.toNumberOrNull(f.annual_fee);
      return prev !== now || f.__dirty === true;
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
      fee.__dirty = true;
      this.showBankMessage('success', 'تم تعديل قيمة الإشتراك (لم يتم الحفظ بعد)');
    }
  }

  private saveSubsInternal(mode: 'create' | 'update'): Observable<any> {
    if (!this.subscriptionFees.length) return of(null);

    if (mode === 'create' && this.isSaved.subs) return of(null);
    if (mode === 'update' && !this.subsChanged()) return of(null);

    if (this.subscriptionLoading) return of(null);
    this.subscriptionLoading = true;

    const changed = (this.subscriptionFees ?? []).filter(f => {
      if (mode === 'create') return true;
      const prev = this.initial.subsMap.get(String(f.id));
      const now = this.toNumberOrNull(f.annual_fee);
      return prev !== now || f.__dirty === true;
    });

    if (!changed.length) {
      this.subscriptionLoading = false;
      return of(null);
    }

    const calls = changed.map(fee =>
      this.projectDataService.updateSubscriptionFee(fee.id, fee.annual_fee)
    );

    return forkJoin(calls).pipe(
      finalize(() => (this.subscriptionLoading = false)),
      map((res) => {
        this.sectionState.subs.hasData = true;
        this.sectionState.subs.isEditing = false;
        this.isSaved.subs = true;

        // clear dirty + snapshot
        (this.subscriptionFees ?? []).forEach(f => (f.__dirty = false));
        this.captureSubsSnapshot();

        return res;
      })
    );
  }

  // =========================
  // ✅ NEW: Unified Submit
  // =========================
  submit(mode: 'create' | 'update') {
    // رسائل
    this.bankMessage = null;
    if (this.bankMsgTimer) {
      clearTimeout(this.bankMsgTimer);
      this.bankMsgTimer = null;
    }

    // build list of requests (only needed)
    const reqs: Observable<any>[] = [];

    // DASH: create => if not saved ; update => if changed
    const dashShouldSend =
      mode === 'create' ? !this.isSaved.dash : this.dashChanged();

    if (dashShouldSend) {
      this.showBankMessage('success', mode === 'create' ? 'جاري حفظ بيانات لوحة التحكم...' : 'جاري تعديل بيانات لوحة التحكم...');
      reqs.push(this.saveDashInternal());
    }

    // CONSULT
    const consultShouldSend =
      mode === 'create' ? !this.isSaved.consult : this.consultChanged();

    if (consultShouldSend) {
      this.showBankMessage('success', mode === 'create' ? 'جاري حفظ أسعار وزمن الاستشارات...' : 'جاري تعديل أسعار وزمن الاستشارات...');
      reqs.push(this.saveConsultInternal(mode));
    }

    // SUBS
    const subsShouldSend =
      mode === 'create' ? !this.isSaved.subs : this.subsChanged();

    if (subsShouldSend) {
      this.showBankMessage('success', mode === 'create' ? 'جاري حفظ الإشتراكات...' : 'جاري تعديل الإشتراكات...');
      reqs.push(this.saveSubsInternal(mode));
    }

    // BANK
    const bankShouldSend =
      mode === 'create' ? !this.isSaved.bank : this.bankChanged();

    if (bankShouldSend) {
      this.showBankMessage('success', mode === 'create' ? 'جاري حفظ الحسابات البنكية...' : 'جاري تعديل الحسابات البنكية...');
      reqs.push(this.saveBankInternal(mode));
    }

    // لو مفيش حاجة تتبعت
    if (!reqs.length) {
      this.showBankMessage('success', mode === 'create' ? 'لا يوجد بيانات جديدة للحفظ' : 'لا توجد تعديلات للحفظ');
      return;
    }

    forkJoin(reqs).subscribe({
      next: () => {
        this.showBankMessage('success', mode === 'create' ? 'تم الحفظ بنجاح' : 'تم التعديل بنجاح');
      },
      error: (err: HttpErrorResponse) => {
        this.showBankMessage('error', this.getBackendErrorMessage(err));
      }
    });
  }

  // ====== (OPTIONAL) keep old methods but route to submit ======
  // لو مش هتغير الـ HTML:
 saveBankAccounts() {
  this.bankMessage = null;
  if (this.bankMsgTimer) {
    clearTimeout(this.bankMsgTimer);
    this.bankMsgTimer = null;
  }
  if (this.savingBank) return;

  // ✅ POST فقط للصفوف اللي مفيهاش uuid
  const createReqs = this.accountsArray.controls
    .map((ctrl, i) => ({ ctrl, i }))
    .filter(x => !this.bankUuids[x.i]) // مفيش uuid => جديد
    .filter(x => x.ctrl.dirty)        // اتغير
    .map(x => {
      const v: any = x.ctrl.value ?? {};
      const payload = {
        account_name: String(v.account_name ?? '').trim(),
        account_number: String(v.account_number ?? '').trim(),
        iban: String(v.iban ?? '').trim(),
      };

      if (!payload.account_name || !payload.account_number || !payload.iban) {
        return null;
      }

      return this.projectDataService.saveBankAccount(payload);
    })
    .filter((x): x is any => !!x);

  if (!createReqs.length) {
    this.showBankMessage('success', 'لا يوجد حسابات جديدة للحفظ');
    return;
  }

  this.savingBank = true;
  this.showBankMessage('success', 'جاري حفظ الحسابات البنكية الجديدة...');

  forkJoin(createReqs).subscribe({
    next: () => {
      this.savingBank = false;
      this.showBankMessage('success', 'تم حفظ الحسابات البنكية بنجاح');

      // ✅ مهم: reload عشان نجيب ids للحسابات الجديدة
      this.loadBankAccounts();
    },
    error: (err: HttpErrorResponse) => {
      this.savingBank = false;
      this.showBankMessage('error', this.getBackendErrorMessage(err));
    }
  });
}

  updateAllSubscriptions() {
    this.submit('update');
  }
  // =========================
// ✅ Create = حفظ (POST فقط)
// =========================
createAll() {
  // هنا "حفظ" معناه إنشاء فقط (POST)
  // البنك فقط عندك POST
  this.saveBankAccounts(); // ✅ POST only
}

// =========================
// ✅ Update = تعديل (PUT فقط)
// =========================
updateAll() {
  this.bankMessage = null;
  if (this.bankMsgTimer) {
    clearTimeout(this.bankMsgTimer);
    this.bankMsgTimer = null;
  }

  const reqs: Observable<any>[] = [];

  // DASH (PUT)
  if (this.dashChanged()) reqs.push(this.saveDashInternal());

  // CONSULT (PUT)
  if (this.consultChanged()) reqs.push(this.saveConsultInternal('update'));

  // SUBS (PUT)
  if (this.subsChanged()) reqs.push(this.saveSubsInternal('update'));

  // BANK (PUT)
  // بدل ما تعمل forkJoin جوا updateBankAccounts، نضيفه هنا كـ Observable واحد:
  reqs.push(this.updateBankAccountsInternal());

  // شيل nulls (لو رجع of(null))
  const realReqs = reqs.filter(Boolean);

  // ✅ لو مفيش أي تعديل
  if (!realReqs.length) {
    this.showBankMessage('success', 'لا توجد تعديلات للحفظ');
    return;
  }

  this.showBankMessage('success', 'جاري حفظ التعديلات...');

  forkJoin(realReqs).subscribe({
    next: () => {
      this.showBankMessage('success', 'تم التعديل بنجاح');
    },
    error: (err: HttpErrorResponse) => {
      this.showBankMessage('error', this.getBackendErrorMessage(err));
    }
  });
}
private updateBankAccountsInternal(): Observable<any> {
  const updateReqs = this.accountsArray.controls
    .map((ctrl, i) => ({ ctrl, i }))
    .filter(x => !!this.bankUuids[x.i])     // عنده uuid
    .filter(x => this.bankRowChanged(x.i))  // اتغير
    .map(x => {
      const v: any = x.ctrl.value ?? {};
      const payload = {
        account_name: String(v.account_name ?? '').trim(),
        account_number: String(v.account_number ?? '').trim(),
        iban: String(v.iban ?? '').trim(),
      };
      if (!payload.account_name || !payload.account_number || !payload.iban) return null;
      return this.projectDataService.updateBankAccount(this.bankUuids[x.i]!, payload);
    })
    .filter((x): x is any => !!x);

  if (!updateReqs.length) return of(null);

  this.savingBank = true;

  return forkJoin(updateReqs).pipe(
    finalize(() => (this.savingBank = false)),
    map((res) => {
      // snapshot + pristine
      this.captureBankSnapshot();
      this.bankForm.markAsPristine();
      this.accountsArray.controls.forEach(c => c.markAsPristine());
      return res;
    })
  );
}

// لو لسه محتاج زر منفصل للبنك فقط:
updateBankAccounts() {
  this.updateBankAccountsInternal().subscribe({
    next: () => this.showBankMessage('success', 'تم تعديل الحسابات البنكية بنجاح'),
    error: (err: HttpErrorResponse) => this.showBankMessage('error', this.getBackendErrorMessage(err))
  });
}

}

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
  }
  private fb = inject(FormBuilder);
  private projectDataService = inject(ProjectDataService);

  // ===== UI State =====
  isEdit = false;
  activeTab: 'dash' | 'designer' | 'project' = 'project';

  // ===== Project Form =====
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

  // ===== Dot Chart =====
  chartRows = [5, 4, 3, 2];
  chartCols = Array.from({ length: 30 }, (_, i) => i + 1);
  chartXAxis = Array.from({ length: 30 }, (_, i) => i + 1);

  getDotClass(row: number, col: number): string {
    if (row === 3 && col >= 4 && col <= 7) return 'dot-green';
    if (row === 4 && col >= 8 && col <= 13) return 'dot-green';
    if (row === 5 && col >= 14 && col <= 18) return 'dot-green';

    if (row === 4 && col === 13) return 'dot-purple';

    if (row === 5 && col >= 28) return 'dot-red';

    if (row === 2 && col <= 3) return 'dot-cyan';

    return '';
  }

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

}

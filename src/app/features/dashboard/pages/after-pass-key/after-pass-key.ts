import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PassKeyFooterComponent } from '../pass-key-footer/pass-key-footer';

type InboxItem = {
  title: string;
  amount: string;
  currency: string;
  codeLine: string;
  direction: 'in' | 'out';
};

type DuePaymentItem = {
  title: string;
  code: string;
  badge: string;
};

type AlertRewardItem = {
  text: string;
  thumb: 'up' | 'down';
};

type RowItem = {
  name: string;
  code: string;
  percent?: number;
  action: string;
};

@Component({
  selector: 'app-after-pass-key',
  standalone: true,
  imports: [CommonModule , PassKeyFooterComponent],
  templateUrl: './after-pass-key.html',
  styleUrl: './after-pass-key.css',
})
export class AfterPassKey {
  // mock topbar
  notifications = 1;
  username = 'موظف 1';
  dateText = '22 نوفمبر 2025';
  timeText = '07:40';

  // tabs
  leftSubsTab: 'owner' | 'designer' = 'owner';
  rightOutboxTab: 'owner' | 'designer' = 'owner';
  rightLettersTab: 'owner' | 'designer' = 'owner';

  // LEFT phone (finance - old)
  payments: RowItem[] = [
    { name: 'مستشفى مركزي متوسط', percent: 25, code: 'HLT-25-GV-109', action: 'متابعة' },
    { name: 'فندق خاص كبير', percent: 50, code: 'TOR-25-IV-511', action: 'متابعة' },
    { name: 'مدرسة إعدادية كبيرة', percent: 100, code: 'EDU-25-GV-333', action: 'متابعة' },
  ];

  subsOwner: RowItem[] = [
    { name: 'مصنع غذائي كبير', code: 'MNF-25-GV-107', action: 'متابعة' },
    { name: 'مدرسة إعدادية كبيرة', code: 'EDU-25-GV-333', action: 'متابعة' },
  ];
  subsDesigner: RowItem[] = [
    { name: 'مستشفى مركزي متوسط', code: 'HLT-25-GV-109', action: 'متابعة' },
    { name: 'فندق خاص كبير', code: 'TOR-25-IV-511', action: 'متابعة' },
  ];

  get subsList(): RowItem[] {
    return this.leftSubsTab === 'owner' ? this.subsOwner : this.subsDesigner;
  }

  // RIGHT phone (admin)
  outboxOwner: RowItem[] = [
    { name: 'مستشفى مركزي متوسط', code: 'HLT-25-GV-109', action: 'اعتماد' },
    { name: 'فندق خاص كبير', code: 'TOR-25-IV-511', action: 'اعتماد' },
    { name: 'مدرسة إعدادية كبيرة', code: 'EDU-25-GV-333', action: 'اعتماد' },
  ];
  outboxDesigner: RowItem[] = [
    { name: 'مصنع غذائي كبير', code: 'MNF-25-GV-107', action: 'اعتماد' },
    { name: 'مدرسة إعدادية كبيرة', code: 'EDU-25-GV-333', action: 'اعتماد' },
  ];

  lettersOwner: RowItem[] = [
    { name: 'مصنع غذائي كبير', code: 'MNF-25-GV-107', action: 'إرسال' },
    { name: 'مدرسة إعدادية كبيرة', code: 'EDU-25-GV-333', action: 'إرسال' },
  ];
  lettersDesigner: RowItem[] = [{ name: 'مستشفى مركزي متوسط', code: 'HLT-25-GV-109', action: 'إرسال' }];

  get outboxList(): RowItem[] {
    return this.rightOutboxTab === 'owner' ? this.outboxOwner : this.outboxDesigner;
  }
  get lettersList(): RowItem[] {
    return this.rightLettersTab === 'owner' ? this.lettersOwner : this.lettersDesigner;
  }

  // pass key (5 خانات زي ما عندك)
  passKeys = new Array(5);

  onKeyInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 1);

    if (input.value) {
      const next = input.nextElementSibling as HTMLInputElement | null;
      next?.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value) {
      const prev = input.previousElementSibling as HTMLInputElement | null;
      prev?.focus();
    }
  }

  // -------- Phone 4 (NEW screen like figma) --------
  inbox: InboxItem[] = [
    {
      title: 'اشتراكات مالك المشروع',
      amount: '2000.00',
      currency: 'LYD',
      codeLine: 'HLT-25-GV-109 | 27 يونيو 2025 (11:07 م)',
      direction: 'in',
    },
    {
      title: 'اشتراكات مصمم المشروع',
      amount: '2501.00',
      currency: 'LYD',
      codeLine: 'CIVIL-25-7-OS-107 | 27 يونيو 2025 (11:07 م)',
      direction: 'in',
    },
    {
      title: 'دفعات مالك المشروع',
      amount: '6000.00',
      currency: 'LYD',
      codeLine: 'HLT-25-GV-109 | 27 يونيو 2025 (11:07 م)',
      direction: 'in',
    },
    {
      title: 'مصروفات',
      amount: '250,000.00',
      currency: 'LYD',
      codeLine: 'ARCH-25-5-EN-121 | 27 يونيو 2025 (11:07 م)',
      direction: 'out',
    },
  ];

  duePayments: DuePaymentItem[] = [
    { title: 'مستشفى مركزي متوسط - %50', code: 'HLT-25-GV-109', badge: 'LNS' },
    { title: 'مستشفى مركزي متوسط - %50', code: 'HLT-25-GV-109', badge: 'LNS' },
  ];

  alertsRewards: AlertRewardItem[] = [
    { text: 'إنذار للموظف 1', thumb: 'down' },
    { text: 'مكافأة للموظف 2', thumb: 'up' },
  ];

  isPayModalOpen = false;

payModalData = {
  // Project
  projectName: 'مدرسة خاصة',
  projectCode: 'EDU-25-IV-333',
  subscription: 'PLN',

  // Designer
  designerName: 'عبدالرحيم سليمان علي',
  designerCode: 'ARCH-25-5-EN-121',

  // Payment
  percent: 50,
  amount: '250,000',
  currency: 'LYD',

  // Bank
  bankName: 'البنك الأهلي',
  iban: '35235235',
  accountNumber: '23523523523523523523',
  swift: '23523523523',
};

openPayModal(p: DuePaymentItem) {
  // لو حابب تربط بيانات حقيقية من العنصر p
  // مثال: استخراج % من العنوان " - %50"
  const match = p.title.match(/%(\d+)/);
  const percent = match ? Number(match[1]) : 50;

  this.payModalData = {
    ...this.payModalData,
    percent,
    projectCode: p.code,
  };

  this.isPayModalOpen = true;

  // قفل بالـ ESC
  setTimeout(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closePayModal();
    };
    window.addEventListener('keydown', handler, { once: true });
  });
}

closePayModal() {
  this.isPayModalOpen = false;
}

confirmPay() {
  // هنا تحط API call أو أي منطق
  this.closePayModal();
}
}

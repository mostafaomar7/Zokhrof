import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type RowItem = {
  name: string;
  code: string;
  percent?: number;
  action: string; // متابعة / اعتماد / إرسال
};

@Component({
  selector: 'app-after-pass-key-management',
  imports: [CommonModule],
  templateUrl: './after-pass-key-management.html',
  styleUrl: './after-pass-key-management.css',
})
export class AfterPassKeyManagement{
  // mock topbar
  notifications = 1;
  username = 'موظف 1';
  dateText = '22 نوفمبر 2025';
  timeText = '07:40';

  // tabs
  leftSubsTab: 'owner' | 'designer' = 'owner';
  rightOutboxTab: 'owner' | 'designer' = 'owner';
  rightLettersTab: 'owner' | 'designer' = 'owner';

  // LEFT phone (finance)
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
    { name: 'مصنع غذائي كبير', code: 'MNF-25-GV-107', action: 'تسلـيم' },
    { name: 'مدرسة إعدادية كبيرة', code: 'EDU-25-GV-333', action: 'تسلـيم' },
  ];
  lettersDesigner: RowItem[] = [{ name: 'مستشفى مركزي متوسط', code: 'HLT-25-GV-109', action: 'إرسال' }];

  get outboxList(): RowItem[] {
    return this.rightOutboxTab === 'owner' ? this.outboxOwner : this.outboxDesigner;
  }
  get lettersList(): RowItem[] {
    return this.rightLettersTab === 'owner' ? this.lettersOwner : this.lettersDesigner;
  }
  // عدد خانات الـ pass key
passKeys = new Array(5);

// انتقال تلقائي بين الخانات
onKeyInput(event: Event, index: number) {
  const input = event.target as HTMLInputElement;

  // نخلي خانة واحدة بس
  input.value = input.value.replace(/[^0-9]/g, '').slice(0, 1);

  if (input.value && input.nextElementSibling instanceof HTMLInputElement) {
    input.nextElementSibling.focus();
  }
}

// رجوع للخانة اللي قبلها مع Backspace
onKeyDown(event: KeyboardEvent, index: number) {
  const input = event.target as HTMLInputElement;

  if (event.key === 'Backspace' && !input.value) {
    const prev = input.previousElementSibling as HTMLInputElement | null;
    prev?.focus();
  }
}
// Finance (Part 4) - payments with percent
payments2 = [
  { name: 'مستشفى مركزي متوسط', percent: 25, code: 'HLT-25-GV-109' },
  { name: 'فندق خاص كبير', percent: 50, code: 'TOR-25-IV-511' },
  { name: 'مدرسة إعدادية كبيرة', percent: 100, code: 'EDU-25-GV-333' },
];

// Finance (Part 4) - subscriptions tabs
subsOwner2 = [
  { name: 'طلب بن مودح', code: 'ARCH-25-GV-109' },
  { name: 'الكتائب الجمالية', code: 'CIVIL-25-OS-107' },
];

subsDesigner2 = [
  { name: 'مستشفى مركزي متوسط', code: 'HLT-25-GV-109' },
  { name: 'فندق خاص كبير', code: 'TOR-25-IV-511' },
];

get subsList2() {
  return this.leftSubsTab === 'owner' ? this.subsOwner2 : this.subsDesigner2;
}

}

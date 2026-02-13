import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { PassKeyFooterComponent } from '../pass-key-footer/pass-key-footer';

type RowItem = {
  name: string;
  code: string;
  percent?: number;
  action: string; // متابعة / اعتماد / إرسال
};

@Component({
  selector: 'app-after-pass-key-management',
  imports: [CommonModule , PassKeyFooterComponent],
  templateUrl: './after-pass-key-management.html',
  styleUrl: './after-pass-key-management.css',
})
export class AfterPassKeyManagement implements OnInit, OnDestroy {
  // mock topbar
  notifications = 1;
  username = 'موظف 1';
  dateText: string = '';
  timeText: string = '';
  
  // متغير لحفظ العداد
  private timer: any;

  // 4. دالة التشغيل عند بداية الكومبوننت
  ngOnInit() {
    this.updateDateTime(); // تشغيل فوري أول مرة
    this.timer = setInterval(() => {
      this.updateDateTime();
    }, 1000); // تحديث كل ثانية (1000 ميلي ثانية)
  }

  // 5. دالة التنظيف عند الخروج من الكومبوننت
  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  // 6. دالة حساب الوقت والتاريخ
  updateDateTime() {
    const now = new Date();

    // -- تنسيق الوقت (HH:mm) --
    // padStart(2, '0') تضمن ظهور 07 بدلاً من 7
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    this.timeText = `${hours}:${minutes}`;

    // -- تنسيق التاريخ (يوم شهر سنة) --
    // استخدام ar-EG للحصول على أسماء الشهور العربية
    const day = now.getDate();
    const month = now.toLocaleDateString('ar-EG', { month: 'long' });
    const year = now.getFullYear();
    
    // تجميع النص: 22 نوفمبر 2025
    this.dateText = `${day} ${month} ${year}`;
  }


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

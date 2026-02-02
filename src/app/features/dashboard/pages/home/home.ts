import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type RowItem = {
  name: string;
  code: string;
  percent?: number;
  action: string; // متابعة / اعتماد / إرسال
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
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
    { name: 'مصنع غذائي كبير', code: 'MNF-25-GV-107', action: 'إرسال' },
    { name: 'مدرسة إعدادية كبيرة', code: 'EDU-25-GV-333', action: 'إرسال' },
  ];
  lettersDesigner: RowItem[] = [
    { name: 'مستشفى مركزي متوسط', code: 'HLT-25-GV-109', action: 'إرسال' },
  ];

  get outboxList(): RowItem[] {
    return this.rightOutboxTab === 'owner' ? this.outboxOwner : this.outboxDesigner;
  }
  get lettersList(): RowItem[] {
    return this.rightLettersTab === 'owner' ? this.lettersOwner : this.lettersDesigner;
  }
}

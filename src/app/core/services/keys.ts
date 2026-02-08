// src/app/core/services/keys.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment';
import { Observable } from 'rxjs';

export type KeyType =
  | 'general_admin'
  | 'admin_technical_portal'
  | 'financial_control';

export interface VerifyKeyBody {
  key_type: KeyType;
  code: string; // "9999"
}

export interface VerifyKeyResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class KeysService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  verify(body: VerifyKeyBody): Observable<VerifyKeyResponse> {
    return this.http.post<VerifyKeyResponse>(
      `${this.baseUrl}/v1/dashboard/master-key/verify`,
      body
    );
  }
}

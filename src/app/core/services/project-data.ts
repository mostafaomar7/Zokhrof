import { Injectable } from '@angular/core';
import { environment } from '../../../environment';
import { HttpClient } from '@angular/common/http';
interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  iban: string;
}

// project-data.service.ts
@Injectable({ providedIn: 'root' })
export class ProjectDataService {
  apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  saveBankAccount(payload: {
    account_name: string;
    account_number: string;
    iban: string;
  }) {
    return this.http.post(
      `${this.apiUrl}/v1/dashboard/project-data/bank-accounts`,
      payload
    );
  }
  getBankAccounts() {
  return this.http.get<{
    success: boolean;
    message: string;
    data: BankAccount[];
  }>(`${this.apiUrl}/v1/dashboard/project-data/bank-accounts`);
}
getSubscriptionFees() {
  return this.http.get<{
    success: boolean;
    message: string;
    data: any[];
  }>(`${this.apiUrl}/v1/dashboard/project-data/subscription-fees`);
}

updateSubscriptionFee(id: string, annual_fee: string) {
  return this.http.put(
    `${this.apiUrl}/v1/dashboard/project-data/subscription-fees/${id}`,
    { annual_fee }
  );
}

}

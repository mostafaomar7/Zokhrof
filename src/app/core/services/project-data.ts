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
getProjectTemplates(params: {
  owner_type?: 'investor' | 'government';
  project_size?: 'small' | 'large';
  sector_id?: string;
}) {
  const qp = new URLSearchParams();
  if (params.owner_type) qp.set('owner_type', params.owner_type);
  if (params.project_size) qp.set('project_size', params.project_size);
  if (params.sector_id) qp.set('sector_id', params.sector_id);

  return this.http.get<{
    success: boolean;
    message: string;
    data: any[];
  }>(`${this.apiUrl}/v1/projects/templates?${qp.toString()}`);
}
// project-data.service.ts
// project-data.service.ts
filterProjects(params: {
  owner_type?: 'government' | 'individual';
  project_sector_id?: string;
  project_type_id?: string;
  project_specialization_id?: string;
  project_size?: 'small' | 'large';
  status?: string;
  area_from?: string | number;
  area_to?: string | number;
}) {
  const qp = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      qp.set(k, String(v));
    }
  });

  return this.http.get<{
    success: boolean;
    message: string;
    data: {
  projects: any[];
  base_consultation_template?: any[];
  base_consultation_summary?: any;
};
  }>(`${this.apiUrl}/v1/dashboard/project-data/filter?${qp.toString()}`);
}

}

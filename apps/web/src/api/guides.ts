import { api } from '../lib/api';

export async function getMyCollaboratedGuides(_token: string): Promise<any[]> {
  return api.get<any[]>('/guides/collaborated');
}

export type Kind = 'course' | 'scholarship';
export type Stage = 'shortlisted' | 'preparing' | 'submitted' | 'offer' | 'unsuccessful';
export type Visa = 'humanitarian-protection' | 'refugee' | 'asylum-seeker' | 'other';
export interface Profile { nationality: 'Palestinian' | 'Other'; residence: 'UK' | 'Palestine' | 'Other'; visa: Visa; studentFinance: 'unknown' | 'yes' | 'no'; }
export interface Opportunity {
  id: string; kind: Kind; title: string; university: string; location: string;
  mode: string[]; duration: string; cycle: string; status: 'open' | 'closed' | 'unknown';
  deadline: string | null; deadlineNote: string; amount: string; description: string;
  tags: string[]; verifiedAt: string; source: string; relatedIds: string[];
  applicationTasks?: string[];
  eligibility: { statuses?: Visa[]; nationalities?: string[]; residence?: string[]; excludesUK?: boolean; noStudentFinance?: boolean; mastersExcluded?: boolean; manual?: boolean; note: string; };
}
export interface Application { stage: Stage; tasks: Record<string, boolean>; notes: string; reminder: string; }
export interface Store { version: 1; profile: Profile; applications: Record<string, Application>; custom: Opportunity[]; dismissed: string[]; theme: 'light' | 'dark'; }
export interface MonitorEvent { id: string; sourceId: string; title: string; kind: 'page_changed' | 'possible_opening' | 'new_link'; url: string; detectedAt: string; summary: string; }
export interface MonitorReport { configured: boolean; lastRun: string | null; lastSuccessfulRun?: string | null; sources: Record<string, { title: string; url: string; checkedAt: string; fingerprint: string; signals: string[]; links: Record<string, string> }>; events: MonitorEvent[]; errors: { sourceId: string; title: string; message: string }[]; }
export const stages: Stage[] = ['shortlisted', 'preparing', 'submitted', 'offer', 'unsuccessful'];
export const stageLabels: Record<Stage, string> = { shortlisted: 'Shortlisted', preparing: 'Preparing', submitted: 'Submitted', offer: 'Offer / awarded', unsuccessful: 'Unsuccessful' };
export const courseTasks = ['Check academic entry requirements', 'Confirm fee status and funding options', 'Prepare CV', 'Draft personal statement', 'Arrange references', 'Check English language evidence', 'Submit application'];
export const scholarshipTasks = ['Confirm immigration and residence criteria', 'Check financial need / student finance rules', 'Apply for the linked master’s course', 'Prepare funding statement', 'Gather required supporting documents', 'Check references and award conditions', 'Submit scholarship application'];
export const defaultProfile: Profile = { nationality: 'Palestinian', residence: 'UK', visa: 'humanitarian-protection', studentFinance: 'unknown' };
export function freshStore(): Store { return { version: 1, profile: { ...defaultProfile }, applications: {}, custom: [], dismissed: [], theme: 'dark' }; }
export function tasksFor(o: Opportunity): string[] { return o.applicationTasks?.length ? o.applicationTasks : o.kind === 'course' ? courseTasks : scholarshipTasks; }
export function newApplication(): Application { return { stage: 'shortlisted', tasks: {}, notes: '', reminder: '' }; }
export function progress(o: Opportunity, a?: Application): number { const tasks = tasksFor(o); return a ? Math.round(tasks.filter(t => a.tasks[t]).length / tasks.length * 100) : 0; }
export function matching(o: Opportunity, p: Profile): { level: 'review' | 'status-fit' | 'excluded'; label: string; reason: string } {
  const e = o.eligibility;
  const excluded = (reason: string) => ({ level: 'excluded' as const, label: 'Profile mismatch', reason });
  if (e.mastersExcluded) return excluded('This award funds undergraduate study, not a master’s.');
  if (e.nationalities && !e.nationalities.includes(p.nationality)) return excluded('The published nationality requirement does not match your profile.');
  if (e.excludesUK && p.residence === 'UK') return excluded('The published criteria exclude applicants already living in the UK.');
  if (e.residence && !e.residence.includes(p.residence)) return excluded('The published residence requirement does not match your profile.');
  if (e.statuses && !e.statuses.includes(p.visa)) return { level: 'review', label: 'Confirm status', reason: 'Your status is not explicitly included in the criteria recorded here. Ask the funding team.' };
  if (e.noStudentFinance && p.studentFinance === 'yes') return excluded('This scheme requires applicants to lack access to student finance.');
  if (e.noStudentFinance && p.studentFinance === 'unknown') return { level: 'review', label: 'Check student finance', reason: 'Confirm whether you have access to student finance before prioritising this award.' };
  if (o.kind === 'course' || e.manual) return { level: 'review', label: o.kind === 'course' ? 'Academic review needed' : 'Eligibility to confirm', reason: e.note };
  return { level: 'status-fit', label: 'Status fits · check full criteria', reason: e.note };
}
export function currentStatus(o: Opportunity, now = new Date()): Opportunity['status'] { if (o.deadline && new Date(o.deadline).getTime() <= now.getTime()) return 'closed'; return o.status; }
export function daysUntil(date: string, now = new Date()): number { return Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000); }
export function isOpportunity(v: unknown): v is Opportunity {
  if (!v || typeof v !== 'object') return false;
  const o = v as Opportunity;
  return typeof o.id === 'string' && o.id.length > 0 && !['__proto__', 'constructor', 'prototype'].includes(o.id) && ['course', 'scholarship'].includes(o.kind) && ['open', 'closed', 'unknown'].includes(o.status) && ['title', 'university', 'location', 'duration', 'cycle', 'deadlineNote', 'amount', 'description', 'verifiedAt'].every(k => typeof (o as unknown as Record<string, unknown>)[k] === 'string') && typeof o.source === 'string' && /^https:\/\//.test(o.source) && Array.isArray(o.mode) && o.mode.every(x => typeof x === 'string') && Array.isArray(o.tags) && o.tags.every(x => typeof x === 'string') && Array.isArray(o.relatedIds) && o.relatedIds.every(x => typeof x === 'string') && (o.deadline === null || (typeof o.deadline === 'string' && Number.isFinite(Date.parse(o.deadline)))) && !!o.eligibility && typeof o.eligibility.note === 'string' && (!o.applicationTasks || (Array.isArray(o.applicationTasks) && o.applicationTasks.every(x => typeof x === 'string'))) && (!o.eligibility.nationalities || (Array.isArray(o.eligibility.nationalities) && o.eligibility.nationalities.every(x => typeof x === 'string'))) && (!o.eligibility.statuses || (Array.isArray(o.eligibility.statuses) && o.eligibility.statuses.every(x => ['humanitarian-protection', 'refugee', 'asylum-seeker', 'other'].includes(x)))) && (!o.eligibility.residence || (Array.isArray(o.eligibility.residence) && o.eligibility.residence.every(x => typeof x === 'string')));
}
export function validateBackup(v: unknown): v is Store {
  if (!v || typeof v !== 'object') return false;
  const s = v as Store;
  if (s.version !== 1 || !s.profile || !['UK', 'Palestine', 'Other'].includes(s.profile.residence) || !['Palestinian', 'Other'].includes(s.profile.nationality) || !['humanitarian-protection', 'refugee', 'asylum-seeker', 'other'].includes(s.profile.visa) || !['yes', 'no', 'unknown'].includes(s.profile.studentFinance) || !['dark', 'light'].includes(s.theme) || !Array.isArray(s.custom) || !s.custom.every(isOpportunity) || !Array.isArray(s.dismissed) || !s.dismissed.every(x => typeof x === 'string') || !s.applications || typeof s.applications !== 'object' || Array.isArray(s.applications)) return false;
  return Object.entries(s.applications).every(([key, a]) => !['__proto__', 'constructor', 'prototype'].includes(key) && !!a && stages.includes(a.stage) && typeof a.notes === 'string' && typeof a.reminder === 'string' && (!a.reminder || /^\d{4}-\d{2}-\d{2}$/.test(a.reminder)) && !!a.tasks && typeof a.tasks === 'object' && !Array.isArray(a.tasks) && Object.values(a.tasks).every(x => typeof x === 'boolean'));
}

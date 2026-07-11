import { supabase } from '@/lib/supabase';
import { assertContentFields } from '@/lib/contentSafety';
import type {
  Assignment,
  AssignmentProgress,
  ClassStudent,
  ContentProgress,
  MeritEvent,
  PanelMessage,
  ParentStudentLink,
  Profile,
  TeacherClass,
  UserRole,
} from '@/types/domain';

type DashboardBase = {
  classes: TeacherClass[];
  students: ClassStudent[];
  assignments: Assignment[];
  progress: AssignmentProgress[];
  merit: MeritEvent[];
  parentLinks: ParentStudentLink[];
  messages: PanelMessage[];
  profiles: Profile[];
  contentProgress: ContentProgress[];
};

export type DashboardData = DashboardBase & {
  role: UserRole;
};

const emptyDashboard = (role: UserRole): DashboardData => ({
  role,
  classes: [],
  students: [],
  assignments: [],
  progress: [],
  merit: [],
  parentLinks: [],
  messages: [],
  profiles: [],
  contentProgress: [],
});

const profileColumns = 'id,role,email,first_name,last_name,full_name,city,district,school_id,school_name,school_missing,branch,grade_level,avatar_url,approval_status,verification_status,verification_file_path,verification_file_name,verification_file_type,verification_submitted_at,active,parent_link_code';

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean).map(String)));
}

async function selectProfiles(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('user_profiles')
    .select(profileColumns)
    .in('id', ids);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(profileColumns)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string; email: string; role: UserRole }) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(profile, { onConflict: 'id' })
    .select(profileColumns)
    .maybeSingle();
  if (error) throw error;
  return data as Profile;
}

export async function findProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id,email,role')
    .eq('email', email)
    .maybeSingle();
  if (error) return null;
  return data as Pick<Profile, 'id' | 'email' | 'role'> | null;
}

export async function uploadTeacherVerification(input: {
  userId: string;
  uri: string;
  name: string;
  mimeType?: string;
}) {
  const response = await fetch(input.uri);
  const blob = await response.blob();
  const safeName = String(input.name || 'ogretmen-belgesi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'ogretmen-belgesi';
  const path = `${input.userId}/${Date.now()}-${safeName}`;
  const contentType = input.mimeType || blob.type || 'application/octet-stream';
  const { error: uploadError } = await supabase.storage
    .from('teacher-verifications')
    .upload(path, blob, {
      cacheControl: '3600',
      contentType,
      upsert: true,
    });
  if (uploadError) throw uploadError;
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      verification_status: 'submitted',
      verification_file_path: path,
      verification_file_name: safeName,
      verification_file_type: contentType,
      verification_submitted_at: new Date().toISOString(),
      approval_status: 'pending',
    })
    .eq('id', input.userId);
  if (updateError) throw updateError;
  return path;
}

export async function fetchDashboard(profile: Profile): Promise<DashboardData> {
  if (profile.role === 'teacher') return fetchTeacherDashboard(profile);
  if (profile.role === 'parent') return fetchParentDashboard(profile);
  return fetchStudentDashboard(profile);
}

async function fetchStudentDashboard(profile: Profile): Promise<DashboardData> {
  const base = emptyDashboard('student');
  const [{ data: students, error: studentsError }, { data: messages, error: messagesError }, { data: parentLinks, error: linksError }, { data: contentProgress, error: contentError }] =
    await Promise.all([
      supabase.from('teacher_class_students').select('*').eq('student_profile_id', profile.id).neq('status', 'removed'),
      supabase.from('panel_messages').select('*').or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(40),
      supabase.from('parent_student_links').select('*').eq('student_profile_id', profile.id).in('status', ['pending', 'active']),
      supabase.from('user_content_progress').select('*').eq('user_id', profile.id).order('updated_at', { ascending: false }).limit(50),
    ]);
  if (studentsError) throw studentsError;
  if (messagesError) throw messagesError;
  if (linksError) throw linksError;
  if (contentError) throw contentError;

  const membershipRows = (students ?? []) as ClassStudent[];
  const classIds = unique(membershipRows.map((row) => row.class_id));
  const membershipIds = unique(membershipRows.map((row) => row.id));

  const [{ data: classes, error: classesError }, { data: assignments, error: assignmentError }, { data: progress, error: progressError }, { data: merit, error: meritError }] =
    await Promise.all([
      classIds.length ? supabase.from('teacher_classes').select('*').in('id', classIds) : Promise.resolve({ data: [], error: null }),
      classIds.length ? supabase.from('teacher_assignments').select('*').in('class_id', classIds).eq('status', 'active').order('due_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
      membershipIds.length ? supabase.from('teacher_assignment_progress').select('*').in('student_membership_id', membershipIds) : Promise.resolve({ data: [], error: null }),
      membershipIds.length ? supabase.from('teacher_merit_events').select('*').in('student_membership_id', membershipIds).order('created_at', { ascending: false }).limit(40) : Promise.resolve({ data: [], error: null }),
    ]);
  if (classesError) throw classesError;
  if (assignmentError) throw assignmentError;
  if (progressError) throw progressError;
  if (meritError) throw meritError;

  const messageRows = (messages ?? []) as PanelMessage[];
  const profiles = await selectProfiles(unique([
    ...messageRows.flatMap((row) => [row.sender_id, row.recipient_id]),
    ...((parentLinks ?? []) as ParentStudentLink[]).flatMap((row) => [row.parent_id, row.teacher_id]),
    ...membershipRows.map((row) => row.teacher_id),
  ]));

  return {
    ...base,
    classes: (classes ?? []) as TeacherClass[],
    students: membershipRows,
    assignments: (assignments ?? []) as Assignment[],
    progress: (progress ?? []) as AssignmentProgress[],
    merit: (merit ?? []) as MeritEvent[],
    parentLinks: (parentLinks ?? []) as ParentStudentLink[],
    messages: messageRows,
    profiles,
    contentProgress: (contentProgress ?? []) as ContentProgress[],
  };
}

async function fetchTeacherDashboard(profile: Profile): Promise<DashboardData> {
  const base = emptyDashboard('teacher');
  const [{ data: classes, error: classesError }, { data: students, error: studentsError }, { data: assignments, error: assignmentsError }, { data: messages, error: messagesError }, { data: parentLinks, error: linksError }] =
    await Promise.all([
      supabase.from('teacher_classes').select('*').eq('teacher_id', profile.id).neq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('teacher_class_students').select('*').eq('teacher_id', profile.id).neq('status', 'removed').order('display_name', { ascending: true }),
      supabase.from('teacher_assignments').select('*').eq('teacher_id', profile.id).neq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('panel_messages').select('*').or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(50),
      supabase.from('parent_student_links').select('*').eq('teacher_id', profile.id).in('status', ['pending', 'active']),
    ]);
  if (classesError) throw classesError;
  if (studentsError) throw studentsError;
  if (assignmentsError) throw assignmentsError;
  if (messagesError) throw messagesError;
  if (linksError) throw linksError;

  const assignmentIds = unique(((assignments ?? []) as Assignment[]).map((row) => row.id));
  const membershipIds = unique(((students ?? []) as ClassStudent[]).map((row) => row.id));
  const [{ data: progress, error: progressError }, { data: merit, error: meritError }] = await Promise.all([
    assignmentIds.length ? supabase.from('teacher_assignment_progress').select('*').in('assignment_id', assignmentIds) : Promise.resolve({ data: [], error: null }),
    membershipIds.length ? supabase.from('teacher_merit_events').select('*').in('student_membership_id', membershipIds).order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
  ]);
  if (progressError) throw progressError;
  if (meritError) throw meritError;

  const messageRows = (messages ?? []) as PanelMessage[];
  const studentRows = (students ?? []) as ClassStudent[];
  const profiles = await selectProfiles(unique([
    ...studentRows.map((row) => row.student_profile_id),
    ...messageRows.flatMap((row) => [row.sender_id, row.recipient_id]),
    ...((parentLinks ?? []) as ParentStudentLink[]).flatMap((row) => [row.parent_id, row.student_profile_id]),
  ]));

  return {
    ...base,
    classes: (classes ?? []) as TeacherClass[],
    students: studentRows,
    assignments: (assignments ?? []) as Assignment[],
    progress: (progress ?? []) as AssignmentProgress[],
    merit: (merit ?? []) as MeritEvent[],
    parentLinks: (parentLinks ?? []) as ParentStudentLink[],
    messages: messageRows,
    profiles,
  };
}

async function fetchParentDashboard(profile: Profile): Promise<DashboardData> {
  const base = emptyDashboard('parent');
  const [{ data: links, error: linksError }, { data: messages, error: messagesError }] = await Promise.all([
    supabase.from('parent_student_links').select('*').eq('parent_id', profile.id).in('status', ['pending', 'active']),
    supabase.from('panel_messages').select('*').or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(50),
  ]);
  if (linksError) throw linksError;
  if (messagesError) throw messagesError;

  const parentLinks = (links ?? []) as ParentStudentLink[];
  const studentProfileIds = unique(parentLinks.map((row) => row.student_profile_id));
  const membershipIds = unique(parentLinks.map((row) => row.student_membership_id));
  const classIds = unique(parentLinks.map((row) => row.class_id));

  const [{ data: assignments, error: assignmentsError }, { data: progress, error: progressError }, { data: merit, error: meritError }, { data: contentProgress, error: contentError }] =
    await Promise.all([
      classIds.length ? supabase.from('teacher_assignments').select('*').in('class_id', classIds).eq('status', 'active').order('due_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
      membershipIds.length ? supabase.from('teacher_assignment_progress').select('*').in('student_membership_id', membershipIds) : Promise.resolve({ data: [], error: null }),
      membershipIds.length ? supabase.from('teacher_merit_events').select('*').in('student_membership_id', membershipIds).order('created_at', { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
      studentProfileIds.length ? supabase.from('user_content_progress').select('*').in('user_id', studentProfileIds).order('updated_at', { ascending: false }).limit(80) : Promise.resolve({ data: [], error: null }),
    ]);
  if (assignmentsError) throw assignmentsError;
  if (progressError) throw progressError;
  if (meritError) throw meritError;
  if (contentError) throw contentError;

  const messageRows = (messages ?? []) as PanelMessage[];
  const profiles = await selectProfiles(unique([
    ...studentProfileIds,
    ...parentLinks.map((row) => row.teacher_id),
    ...messageRows.flatMap((row) => [row.sender_id, row.recipient_id]),
  ]));

  return {
    ...base,
    assignments: (assignments ?? []) as Assignment[],
    progress: (progress ?? []) as AssignmentProgress[],
    merit: (merit ?? []) as MeritEvent[],
    parentLinks,
    messages: messageRows,
    profiles,
    contentProgress: (contentProgress ?? []) as ContentProgress[],
  };
}

export async function sendMessage(input: {
  senderId: string;
  senderRole: UserRole;
  recipientId: string;
  subject: string;
  body: string;
  relatedStudentProfileId?: string | null;
  classId?: string | null;
}) {
  assertContentFields([
    { label: 'mesaj_konusu', value: input.subject },
    { label: 'mesaj_metni', value: input.body },
  ]);
  const { data, error } = await supabase
    .from('panel_messages')
    .insert({
      sender_id: input.senderId,
      sender_role: input.senderRole,
      recipient_id: input.recipientId,
      related_student_profile_id: input.relatedStudentProfileId ?? null,
      class_id: input.classId ?? null,
      subject: input.subject,
      body: input.body,
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as PanelMessage;
}

export async function markMessageRead(messageId: string) {
  const { error } = await supabase
    .from('panel_messages')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

export async function updateAssignmentProgress(input: {
  assignmentId: string;
  studentMembershipId: string;
  studentProfileId: string;
  status: 'started' | 'completed';
}) {
  const { data, error } = await supabase
    .from('teacher_assignment_progress')
    .upsert({
      assignment_id: input.assignmentId,
      student_membership_id: input.studentMembershipId,
      student_profile_id: input.studentProfileId,
      status: input.status,
      completed_at: input.status === 'completed' ? new Date().toISOString() : null,
    }, { onConflict: 'assignment_id,student_membership_id' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as AssignmentProgress;
}

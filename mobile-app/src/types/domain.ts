export type UserRole = 'teacher' | 'student' | 'parent';

export type Profile = {
  id: string;
  role: UserRole;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  city: string;
  district: string;
  school_name: string;
  school_id?: string | null;
  school_missing?: boolean;
  branch: string;
  grade_level: number | null;
  avatar_url: string;
  approval_status?: 'pending' | 'active' | 'rejected';
  verification_status?: 'submitted' | 'approved' | 'rejected' | 'missing';
  verification_file_path?: string;
  verification_file_name?: string;
  verification_file_type?: string;
  verification_submitted_at?: string;
  active: boolean;
  parent_link_code?: string;
};

export type TeacherClass = {
  id: string;
  teacher_id: string;
  name: string;
  grade_level: number;
  branch: string;
  invite_code: string;
  status: string;
};

export type ClassStudent = {
  id: string;
  class_id: string;
  teacher_id: string;
  student_profile_id: string | null;
  display_name: string;
  email: string;
  student_no: string;
  status: string;
  merit_points: number;
};

export type Assignment = {
  id: string;
  teacher_id: string;
  class_id: string;
  title: string;
  content_type: string;
  content_ref: string;
  target_type: string;
  start_at: string;
  due_at: string | null;
  instructions: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

export type AssignmentProgress = {
  id: string;
  assignment_id: string;
  student_membership_id: string;
  student_profile_id: string | null;
  status: string;
  score: number | null;
  completed_at: string | null;
};

export type MeritEvent = {
  id: string;
  student_membership_id: string;
  points: number;
  reason: string;
  created_at: string;
};

export type ParentStudentLink = {
  id: string;
  parent_id: string;
  student_profile_id: string;
  student_membership_id: string | null;
  teacher_id: string | null;
  class_id: string | null;
  relationship: string;
  status: string;
  teacher_review_status: string;
};

export type PanelMessage = {
  id: string;
  sender_id: string;
  sender_role: UserRole;
  recipient_id: string;
  related_student_profile_id: string | null;
  class_id: string | null;
  subject: string;
  body: string;
  status: 'sent' | 'read' | 'archived';
  created_at: string;
  read_at: string | null;
};

export type ContentProgress = {
  id: string;
  user_id: string;
  content_type: string;
  content_id: string;
  title: string;
  status: string;
  score: number | null;
  updated_at: string;
  detail_json?: Record<string, unknown>;
};

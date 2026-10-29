export type Role = "admin" | "coordenador";

export interface Template {
  id: string;
  name: string;
  logo: string | null;
  frontBg: string | null;
  backBg: string | null;
  primaryColor: string;
  textColor: string;
  titleFont: "serif" | "sans";
  nameFont: "script" | "serif" | "sans";
  showBorder: boolean;
  updatedAt: string;
}

export type TemplateInput = Omit<Template, "id" | "updatedAt"> & { id?: string };

export interface Course {
  id: string;
  name: string;
  templateId: string | null;
  department: string;
  completionDate: string; // YYYY-MM-DD
  workload: string;
  syllabus: string; // HTML
  instructorName: string;
  instructorSpecialization: string;
  instructorRegistration: string;
  instructorCpf: string;
  instructorSignature: string | null;
  extraEnabled: boolean;
  extraName: string;
  extraRole: string;
  extraRegistration: string;
  extraCpf: string;
  extraSignature: string | null;
  createdBy: string;
  updatedAt: string;
}

export type CourseInput = Omit<Course, "id" | "createdBy" | "updatedAt">;

export interface CourseSummary {
  id: string;
  name: string;
  department: string;
  completionDate: string;
  templateName: string | null;
  studentCount: number;
  updatedAt: string;
}

export interface Student {
  id: string;
  courseId: string;
  name: string;
  cpf: string; // somente dígitos
}

export interface AppUser {
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

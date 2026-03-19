import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Student {
  id: string;
  email: string;
  name: string;
  student_id: string;
  face_registered: boolean;
  created_at: string;
}

export interface FaceDescriptor {
  id: string;
  student_id: string;
  descriptor: number[];
  created_at: string;
}

export interface AttendanceSession {
  id: string;
  session_name: string;
  created_by: string;
  qr_code: string;
  active: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  face_verified: boolean;
  timestamp: string;
}

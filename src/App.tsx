import { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { FaceRegistration } from './components/FaceRegistration';
import { Dashboard } from './components/Dashboard';
import { supabase, type Student } from './lib/supabase';

function App() {
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [needsFaceRegistration, setNeedsFaceRegistration] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudentId = localStorage.getItem('studentId');
    if (storedStudentId) {
      loadStudent(storedStudentId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadStudent = async (studentId: string) => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (data) {
      setCurrentStudent(data);
      setNeedsFaceRegistration(!data.face_registered);
    }
    setLoading(false);
  };

  const handleAuthSuccess = async (studentId: string, needsRegistration: boolean) => {
    localStorage.setItem('studentId', studentId);
    setNeedsFaceRegistration(needsRegistration);
    await loadStudent(studentId);
  };

  const handleFaceRegistrationSuccess = async () => {
    if (currentStudent) {
      await loadStudent(currentStudent.id);
      setNeedsFaceRegistration(false);
    }
  };

  const handleFaceRegistrationSkip = () => {
    setNeedsFaceRegistration(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('studentId');
    setCurrentStudent(null);
    setNeedsFaceRegistration(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentStudent) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (needsFaceRegistration) {
    return (
      <FaceRegistration
        studentId={currentStudent.id}
        onSuccess={handleFaceRegistrationSuccess}
        onSkip={handleFaceRegistrationSkip}
      />
    );
  }

  return <Dashboard student={currentStudent} onLogout={handleLogout} />;
}

export default App;

import { useState, useEffect } from 'react';
import { QrCode, Users, Clock, Plus, LogOut, Camera } from 'lucide-react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase, type Student, type AttendanceSession } from '../lib/supabase';
import { FaceVerification } from './FaceVerification';

interface DashboardProps {
  student: Student;
  onLogout: () => void;
}

export function Dashboard({ student, onLogout }: DashboardProps) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [scannedSessionId, setScannedSessionId] = useState('');
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const { data } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (data) setSessions(data);
  };

  const createSession = async () => {
    if (!sessionName.trim()) return;

    const sessionId = crypto.randomUUID();
    const qrData = JSON.stringify({ sessionId, type: 'attendance' });

    const { error } = await supabase.from('attendance_sessions').insert({
      id: sessionId,
      session_name: sessionName,
      created_by: student.id,
      qr_code: qrData,
      active: true,
    });

    if (!error) {
      const qrUrl = await QRCode.toDataURL(qrData, { width: 400 });
      setQrCodeUrl(qrUrl);
      setShowCreateSession(false);
      setSessionName('');
      loadSessions();
    }
  };

  const viewQRCode = async (session: AttendanceSession) => {
    const qrUrl = await QRCode.toDataURL(session.qr_code, { width: 400 });
    setQrCodeUrl(qrUrl);
    setSelectedSession(session);
  };

  const startScanning = async () => {
    setShowScanner(true);
    const html5QrCode = new Html5Qrcode('qr-reader');
    setScanner(html5QrCode);

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.type === 'attendance' && data.sessionId) {
              await html5QrCode.stop();
              setShowScanner(false);

              if (!student.face_registered) {
                alert('Please register your face first before marking attendance.');
                return;
              }

              setScannedSessionId(data.sessionId);
              setShowFaceVerification(true);
            }
          } catch {
            // Invalid QR code
          }
        },
        () => {
          // Ignore scan errors
        }
      );
    } catch {
      setShowScanner(false);
    }
  };

  const stopScanning = async () => {
    if (scanner) {
      await scanner.stop();
      setScanner(null);
    }
    setShowScanner(false);
  };

  const handleAttendanceSuccess = () => {
    setShowFaceVerification(false);
    setScannedSessionId('');
    alert('Attendance marked successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{student.name}</h2>
              <p className="text-sm text-gray-600">{student.student_id}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!student.face_registered && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Camera className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">
              Please register your face to mark attendance. Contact administrator.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setShowCreateSession(true)}
            className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Session</h3>
              <p className="text-gray-600">Generate QR code for attendance</p>
            </div>
          </button>

          <button
            onClick={startScanning}
            disabled={!student.face_registered}
            className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <QrCode className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Scan QR Code</h3>
              <p className="text-gray-600">Mark your attendance</p>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Active Sessions</h3>
          </div>

          <div className="space-y-4">
            {sessions.length === 0 ? (
              <p className="text-center text-gray-600 py-8">No active sessions</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h4 className="font-semibold text-gray-900">{session.session_name}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(session.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => viewQRCode(session)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View QR
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showCreateSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Create Session</h3>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Session name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-3">
              <button
                onClick={createSession}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateSession(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {qrCodeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedSession?.session_name || 'QR Code'}
            </h3>
            <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-4" />
            <button
              onClick={() => {
                setQrCodeUrl('');
                setSelectedSession(null);
              }}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Scan QR Code</h3>
            <div id="qr-reader" className="mb-4"></div>
            <button
              onClick={stopScanning}
              className="w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showFaceVerification && (
        <FaceVerification
          studentId={student.id}
          sessionId={scannedSessionId}
          onSuccess={handleAttendanceSuccess}
          onCancel={() => {
            setShowFaceVerification(false);
            setScannedSessionId('');
          }}
        />
      )}
    </div>
  );
}

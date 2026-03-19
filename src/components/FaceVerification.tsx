import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, XCircle } from 'lucide-react';
import { loadFaceDetectionModels, detectFaceAndGetDescriptor, compareFaceDescriptors, isFaceMatch } from '../lib/faceDetection';
import { supabase } from '../lib/supabase';

interface FaceVerificationProps {
  studentId: string;
  sessionId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FaceVerification({ studentId, sessionId, onSuccess, onCancel }: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setStatus('Loading face detection models...');
        await loadFaceDetectionModels();

        if (!mounted) return;

        setStatus('Starting camera...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });

        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        setLoading(false);
        setStatus('Position your face in the camera and click Verify');
      } catch (err) {
        if (!mounted) return;
        setError('Failed to initialize camera. Please check permissions.');
        setLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const verifyFace = async () => {
    if (!videoRef.current) return;

    setVerifying(true);
    setError('');
    setStatus('Detecting face...');

    try {
      const currentDescriptor = await detectFaceAndGetDescriptor(videoRef.current);

      if (!currentDescriptor) {
        setError('No face detected. Please ensure your face is clearly visible.');
        setVerifying(false);
        setStatus('Position your face in the camera and click Verify');
        return;
      }

      setStatus('Verifying identity...');

      const { data: storedDescriptors, error: fetchError } = await supabase
        .from('face_descriptors')
        .select('descriptor')
        .eq('student_id', studentId);

      if (fetchError) throw fetchError;

      if (!storedDescriptors || storedDescriptors.length === 0) {
        setError('No registered face found. Please register your face first.');
        setVerifying(false);
        return;
      }

      let isMatch = false;
      for (const stored of storedDescriptors) {
        const storedDescriptor = new Float32Array(stored.descriptor);
        const distance = compareFaceDescriptors(currentDescriptor, storedDescriptor);

        if (isFaceMatch(distance)) {
          isMatch = true;
          break;
        }
      }

      if (!isMatch) {
        setError('Face verification failed. Please try again.');
        setVerifying(false);
        setStatus('Position your face in the camera and click Verify');
        return;
      }

      setStatus('Recording attendance...');

      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          face_verified: true,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You have already marked attendance for this session.');
        } else {
          throw insertError;
        }
        setVerifying(false);
        return;
      }

      setStatus('Attendance marked successfully!');
      setTimeout(() => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        onSuccess();
      }, 1500);
    } catch (err) {
      setError('Failed to verify face. Please try again.');
      setVerifying(false);
      setStatus('Position your face in the camera and click Verify');
    }
  };

  const handleCancel = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Camera className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Face</h2>
          <p className="text-gray-600">
            Verify your identity to mark attendance
          </p>
        </div>

        <div className="relative mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl bg-gray-900"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {status && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-center">{status}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={verifyFace}
            disabled={loading || verifying}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Verify & Mark Attendance
              </>
            )}
          </button>

          <button
            onClick={handleCancel}
            disabled={verifying}
            className="px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

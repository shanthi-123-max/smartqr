import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, XCircle } from 'lucide-react';
import { loadFaceDetectionModels, detectFaceAndGetDescriptor } from '../lib/faceDetection';
import { supabase } from '../lib/supabase';

interface FaceRegistrationProps {
  studentId: string;
  onSuccess: () => void;
  onSkip?: () => void;
}

export function FaceRegistration({ studentId, onSuccess, onSkip }: FaceRegistrationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
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
        setStatus('Position your face in the camera and click Capture');
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

  const captureFace = async () => {
    if (!videoRef.current) return;

    setCapturing(true);
    setError('');
    setStatus('Detecting face...');

    try {
      const descriptor = await detectFaceAndGetDescriptor(videoRef.current);

      if (!descriptor) {
        setError('No face detected. Please ensure your face is clearly visible.');
        setCapturing(false);
        setStatus('Position your face in the camera and click Capture');
        return;
      }

      setStatus('Saving face data...');

      const { error: saveError } = await supabase.from('face_descriptors').insert({
        student_id: studentId,
        descriptor: Array.from(descriptor),
      });

      if (saveError) throw saveError;

      const { error: updateError } = await supabase
        .from('students')
        .update({ face_registered: true })
        .eq('id', studentId);

      if (updateError) throw updateError;

      setStatus('Face registered successfully!');
      setTimeout(() => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        onSuccess();
      }, 1500);
    } catch (err) {
      setError('Failed to register face. Please try again.');
      setCapturing(false);
      setStatus('Position your face in the camera and click Capture');
    }
  };

  const handleSkip = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    onSkip?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Camera className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Register Your Face</h2>
          <p className="text-gray-600">
            This will be used to verify your identity during attendance marking
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
            onClick={captureFace}
            disabled={loading || capturing}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {capturing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Capture Face
              </>
            )}
          </button>

          {onSkip && (
            <button
              onClick={handleSkip}
              disabled={capturing}
              className="px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Skip for Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

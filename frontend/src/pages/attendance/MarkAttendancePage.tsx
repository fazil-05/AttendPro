// src/pages/attendance/MarkAttendancePage.tsx
// Employee attendance marking with GPS + live camera (photo for field workers, direct GPS for office workers) — Clean Light Theme

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MapPin, Camera, Clock, CheckCircle, Navigation, Loader2
} from 'lucide-react';
import api from '../../services/api';
import { useGeolocation, reverseGeocode } from '../../hooks/useGeolocation';
import { useCamera } from '../../hooks/useCamera';
import { isWithinGeofence } from '../../utils/haversine';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';

const MarkAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { getLocation } = useGeolocation();
  const {
    videoRef, isActive, capturedImage,
    isLoading: camLoading, startCamera, capturePhoto, resetCamera,
  } = useCamera();

  const [step, setStep] = useState<'idle' | 'gps' | 'camera' | 'confirming' | 'done'>('idle');
  const [gpsData, setGpsData] = useState<{
    latitude: number; longitude: number; accuracy?: number;
    address: string; distance?: number; withinGeofence?: boolean;
  } | null>(null);
  const [mode, setMode] = useState<'checkin' | 'checkout'>('checkin');

  const isFieldWorker = user?.role === 'field_employee';

  // Fetch today's attendance
  const { data: todayAttendance, refetch: refetchToday } = useQuery({
    queryKey: ['my-attendance-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get('/attendance', { params: { date: today } });
      return data.data?.[0] || null;
    },
  });

  // Fetch branch info for geofencing
  const { data: branchData } = useQuery({
    queryKey: ['branch-info', user?.branch_id],
    queryFn: async () => {
      if (!user?.branch_id) return null;
      const { data } = await api.get(`/branches/${user.branch_id}`);
      return data.data;
    },
    enabled: !!user?.branch_id,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await api.post('/attendance/checkin', payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Check-in successful!');
      setStep('done');
      refetchToday();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Check-in failed. Please try again.');
      setStep('idle');
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await api.post('/attendance/checkout', payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Check-out successful!');
      setStep('done');
      refetchToday();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Check-out failed.');
      setStep('idle');
    },
  });

  // Handle GPS location capture
  const handleCaptureGPS = async () => {
    setStep('gps');
    try {
      const pos = await getLocation();
      const address = await reverseGeocode(pos.latitude, pos.longitude);

      let distance: number | undefined;
      let withinGeofence = true;

      // Geofence check for office employees
      if (user?.role === 'office_employee' && branchData?.latitude && branchData?.longitude) {
        const branchLat = parseFloat(branchData.latitude);
        const branchLng = parseFloat(branchData.longitude);
        const radius = branchData.radius || 200;

        const check = isWithinGeofence(
          pos.latitude, pos.longitude,
          branchLat, branchLng, radius
        );
        distance = check.distance;
        withinGeofence = check.inside;
      }

      setGpsData({ ...pos, address, distance, withinGeofence });

      // Field workers require photo capture; Office workers mark directly via GPS
      if (isFieldWorker) {
        setStep('camera');
        await startCamera();
      } else {
        setStep('confirming');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to acquire location');
      setStep('idle');
    }
  };

  // Handle Photo Capture & Proceed
  const handleCapturePhoto = () => {
    const photo = capturePhoto();
    if (photo) {
      setStep('confirming');
    } else {
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  // Handle final submit
  const handleSubmit = () => {
    if (!gpsData) {
      toast.error('Missing location coordinates');
      return;
    }
    if (isFieldWorker && !capturedImage) {
      toast.error('Selfie photo is required for field workers');
      return;
    }

    const payload = {
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      accuracy: gpsData.accuracy,
      address: gpsData.address,
      photo_url: capturedImage || undefined,
    };

    if (mode === 'checkin') {
      checkInMutation.mutate(payload);
    } else {
      checkOutMutation.mutate(payload);
    }
  };

  const hasCheckedIn = !!todayAttendance?.check_in;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Mark Attendance</h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          {isFieldWorker
            ? '📍 Field Visit Check-In (GPS & Photo Verified)'
            : '🏢 Office Geofenced Check-In (Instant GPS)'}
        </p>
      </div>

      {/* Today Status Widget */}
      {todayAttendance && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 bg-white border border-slate-200 shadow-xs"
        >
          <h3 className="font-bold text-slate-900 mb-3">Today's Status</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 font-semibold mb-1">Status</p>
              <StatusBadge status={todayAttendance.status} size="sm" />
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 font-semibold mb-1">Check In</p>
              <p className="font-bold text-slate-900 text-sm">
                {todayAttendance.check_in
                  ? new Date(todayAttendance.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 font-semibold mb-1">Check Out</p>
              <p className="font-bold text-slate-900 text-sm">
                {todayAttendance.check_out
                  ? new Date(todayAttendance.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : hasCheckedIn ? <span className="live-pulse text-green-600 text-xs font-bold">Working</span> : '—'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden bg-white border border-slate-200 shadow-xs"
      >
        {/* Mode Selector */}
        <div className="flex border-b border-slate-100">
          <button
            type="button"
            onClick={() => { setMode('checkin'); setStep('idle'); resetCamera(); }}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'checkin'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock size={16} className="inline mr-2" />
            Check In
          </button>
          <button
            type="button"
            onClick={() => { setMode('checkout'); setStep('idle'); resetCamera(); }}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'checkout'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle size={16} className="inline mr-2" />
            Check Out
          </button>
        </div>

        <div className="p-6">
          {/* DONE STATE */}
          {step === 'done' ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                <CheckCircle size={40} />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                  {mode === 'checkin' ? 'Check-In Complete!' : 'Check-Out Complete!'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {mode === 'checkin'
                    ? 'Your check-in time and GPS location have been recorded.'
                    : 'Your check-out time and GPS location have been recorded.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setStep('idle'); resetCamera(); }}
                className="btn btn-secondary text-xs px-5"
              >
                Done
              </button>
            </div>
          ) : (
            /* WORKFLOW STEPS */
            <div className="space-y-6">
              {/* STEP: IDLE */}
              {step === 'idle' && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                    <Navigation size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      Ready to {mode === 'checkin' ? 'Check In' : 'Check Out'}
                    </h3>
                    <p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto">
                      {isFieldWorker
                        ? 'We will verify your GPS location and capture a selfie photo.'
                        : 'We will verify your GPS coordinates against office geofence.'}
                    </p>
                  </div>

                  {!isFieldWorker && branchData && (
                    <div className="p-3 rounded-xl bg-blue-50 text-xs text-blue-800 border border-blue-100 font-medium">
                      📍 Office Branch: <span className="font-bold">{branchData.name}</span> (Geofence Radius: {branchData.radius || 200}m)
                    </div>
                  )}

                  <button
                    onClick={handleCaptureGPS}
                    className={`btn btn-lg w-full justify-center ${mode === 'checkin' ? 'btn-primary' : 'btn-success'}`}
                  >
                    <MapPin size={20} />
                    Start {mode === 'checkin' ? 'Check-In' : 'Check-Out'}
                  </button>
                </div>
              )}

              {/* STEP: GPS LOADING */}
              {step === 'gps' && (
                <div className="text-center py-10 space-y-3">
                  <Loader2 size={36} className="animate-spin text-blue-600 mx-auto" />
                  <p className="text-slate-700 font-semibold text-sm">Acquiring GPS location...</p>
                  <p className="text-xs text-slate-400">Please allow location access when prompted</p>
                </div>
              )}

              {/* STEP: CAMERA (Field Workers Only) */}
              {step === 'camera' && isFieldWorker && (
                <div className="space-y-4">
                  {gpsData && (
                    <div className="p-3 rounded-xl border text-xs bg-blue-50 text-blue-800 border-blue-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <span className="truncate max-w-[280px] font-medium">{gpsData.address}</span>
                      </div>
                    </div>
                  )}

                  {/* Camera View */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-4/3 flex items-center justify-center shadow-inner">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {camLoading && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-white text-xs gap-2">
                        <Loader2 size={20} className="animate-spin" /> Starting camera...
                      </div>
                    )}
                  </div>

                  <button onClick={handleCapturePhoto} disabled={!isActive} className="btn btn-primary w-full justify-center py-3">
                    <Camera size={18} /> Capture Photo & Continue
                  </button>
                </div>
              )}

              {/* STEP: CONFIRMING */}
              {step === 'confirming' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Confirm Attendance Details</h3>

                  {isFieldWorker && capturedImage && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-4/3 relative max-w-xs mx-auto">
                      <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {gpsData && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs">
                      <p className="text-slate-800 font-bold flex items-center gap-1.5">
                        <MapPin size={14} className="text-blue-600" />
                        {gpsData.address}
                      </p>
                      {gpsData.distance !== undefined && (
                        <p className="text-slate-600 font-medium pl-5">
                          Distance to office: <span className="font-bold text-slate-900">{Math.round(gpsData.distance)}m</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    {isFieldWorker && (
                      <button onClick={() => { setStep('camera'); startCamera(); }} className="btn btn-secondary flex-1 text-xs">
                        Retake Photo
                      </button>
                    )}
                    <button onClick={handleSubmit} disabled={checkInMutation.isPending || checkOutMutation.isPending} className="btn btn-primary flex-1 text-xs py-3 font-bold">
                      {checkInMutation.isPending || checkOutMutation.isPending ? 'Submitting...' : 'Confirm & Submit'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MarkAttendancePage;

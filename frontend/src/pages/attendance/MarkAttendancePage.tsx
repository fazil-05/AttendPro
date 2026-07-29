// src/pages/attendance/MarkAttendancePage.tsx
// Employee attendance marking with GPS + live camera

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MapPin, Camera, Clock, CheckCircle, XCircle, Navigation,
  Loader2, RefreshCw, Shield
} from 'lucide-react';
import api from '../../services/api';
import { useGeolocation, reverseGeocode } from '../../hooks/useGeolocation';
import { useCamera } from '../../hooks/useCamera';
import { isWithinGeofence } from '../../utils/haversine';
import { useAuth } from '../../contexts/AuthContext';

const MarkAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { error: gpsError, isLoading: gpsLoading, getLocation } = useGeolocation();
  const {
    videoRef, isActive, capturedImage, error: camError,
    isLoading: camLoading, startCamera, capturePhoto, resetCamera,
  } = useCamera();

  const [step, setStep] = useState<'idle' | 'gps' | 'camera' | 'confirming' | 'done'>('idle');
  const [gpsData, setGpsData] = useState<{
    latitude: number; longitude: number; accuracy?: number;
    address: string; distance?: number; withinGeofence?: boolean;
  } | null>(null);
  const [mode, setMode] = useState<'checkin' | 'checkout'>('checkin');

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

  const handleGetGPS = async () => {
    setStep('gps');
    try {
      const loc = await getLocation();
      const address = await reverseGeocode(loc.latitude, loc.longitude);

      let distance: number | undefined;
      let withinGeofence: boolean | undefined;

      if (user?.role === 'office_employee' && branchData) {
        const geofence = isWithinGeofence(
          branchData.latitude, branchData.longitude,
          loc.latitude, loc.longitude,
          branchData.radius
        );
        distance = geofence.distance;
        withinGeofence = geofence.inside;

        if (!geofence.inside) {
          toast.error(`Outside office premises! You are ${geofence.distance}m away (allowed: ${branchData.radius}m).`);
          setGpsData({ latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, address, distance, withinGeofence: false });
          setStep('idle');
          return;
        }
      }

      setGpsData({ latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, address, distance, withinGeofence });
      setStep('camera');
      await startCamera();
    } catch (error: any) {
      toast.error(error.message || 'Failed to get location.');
      setStep('idle');
    }
  };

  const handleCapture = () => {
    const photo = capturePhoto();
    if (!photo) {
      toast.error('Failed to capture photo. Please try again.');
      return;
    }
    setStep('confirming');
  };

  const handleSubmit = async () => {
    if (!gpsData || !capturedImage) return;

    const deviceInfo = {
      device: navigator.platform,
      browser: navigator.userAgent.split(' ').pop()?.split('/')[0] || 'Unknown',
      network_type: (navigator as any).connection?.effectiveType || 'unknown',
    };

    const payload = {
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      accuracy: gpsData.accuracy,
      address: gpsData.address,
      photo_url: capturedImage, // base64 — backend should upload to Supabase Storage
      ...deviceInfo,
    };

    if (mode === 'checkin') {
      await checkInMutation.mutateAsync(payload);
    } else {
      await checkOutMutation.mutateAsync(payload);
    }
  };

  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;

  const isSubmitting = checkInMutation.isPending || checkOutMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Today's Status Card */}
      {todayAttendance && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 dark:bg-slate-800/50"
        >
          <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Today's Status</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
              <span className={`badge badge-${todayAttendance.status}`}>
                {todayAttendance.status?.replace('_', ' ')}
              </span>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Check In</p>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">
                {todayAttendance.check_in
                  ? new Date(todayAttendance.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Check Out</p>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">
                {todayAttendance.check_out
                  ? new Date(todayAttendance.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : hasCheckedIn ? <span className="live-pulse text-green-500 text-xs">Working</span> : '—'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden dark:bg-slate-800/50"
      >
        {/* Mode Selector */}
        {!hasCheckedOut && (
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => { setMode('checkin'); setStep('idle'); resetCamera(); }}
              disabled={hasCheckedIn}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'checkin'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              } ${hasCheckedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Clock size={16} className="inline mr-2" />
              Check In
            </button>
            <button
              onClick={() => { setMode('checkout'); setStep('idle'); resetCamera(); }}
              disabled={!hasCheckedIn || hasCheckedOut}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'checkout'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              } ${!hasCheckedIn || hasCheckedOut ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Check Out
            </button>
          </div>
        )}

        <div className="p-6">
          {/* Done State */}
          {(step === 'done' || (mode === 'checkin' && hasCheckedIn) || hasCheckedOut) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {hasCheckedOut ? 'All Done for Today!' : 'Check-in Recorded!'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {hasCheckedOut
                  ? `Working hours: ${todayAttendance?.working_hours || 0}h`
                  : 'Have a productive day!'}
              </p>
            </motion.div>
          )}

          {/* Idle State — Start Button */}
          {step === 'idle' && !((mode === 'checkin' && hasCheckedIn) || hasCheckedOut) && (
            <div className="text-center space-y-6">
              {/* Info */}
              <div className="py-4">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                  {mode === 'checkin' ? <Clock size={28} className="text-white" /> : <CheckCircle size={28} className="text-white" />}
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                  {mode === 'checkin' ? 'Mark Check In' : 'Mark Check Out'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                  We'll capture your live location and selfie to verify your attendance.
                  {user?.role === 'office_employee' && ' You must be within the office radius.'}
                </p>
              </div>

              {/* Security Info */}
              <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-500" />
                  <span>GPS Location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Camera size={14} className="text-blue-500" />
                  <span>Live Selfie</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield size={14} className="text-blue-500" />
                  <span>Secure</span>
                </div>
              </div>

              {/* Branch Geofence Info */}
              {branchData && user?.role === 'office_employee' && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-sm text-blue-700 dark:text-blue-300">
                  <MapPin size={14} className="inline mr-1" />
                  Office: {branchData.name} • Radius: {branchData.radius}m
                </div>
              )}

              <button
                onClick={handleGetGPS}
                disabled={gpsLoading}
                className="btn btn-primary btn-lg w-full"
                id="start-attendance-btn"
              >
                {gpsLoading ? (
                  <><Loader2 size={18} className="animate-spin" /> Getting Location...</>
                ) : (
                  <><Navigation size={18} /> Start {mode === 'checkin' ? 'Check In' : 'Check Out'}</>
                )}
              </button>

              {gpsError && (
                <p className="text-red-500 text-sm">{gpsError}</p>
              )}
            </div>
          )}

          {/* GPS Step */}
          {step === 'gps' && (
            <div className="text-center py-8">
              <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">Acquiring GPS location...</p>
              <p className="text-slate-400 text-sm mt-1">Please allow location access if prompted</p>
            </div>
          )}

          {/* Camera Step */}
          {step === 'camera' && (
            <div className="space-y-4">
              {/* GPS Info Bar */}
              {gpsData && (
                <div className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                  gpsData.withinGeofence !== false
                    ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300'
                }`}>
                  <MapPin size={16} />
                  <div>
                    <p className="font-medium truncate">{gpsData.address?.substring(0, 80)}...</p>
                    {gpsData.distance !== undefined && (
                      <p className="text-xs opacity-70">Distance from office: {gpsData.distance}m</p>
                    )}
                  </div>
                </div>
              )}

              {/* Camera Preview */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                {camLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-white" />
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* Corner markers */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-blue-400 rounded-br-lg" />
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs">
                  Look at the camera and smile 😊
                </div>
              </div>

              {camError && <p className="text-red-500 text-sm">{camError}</p>}

              <button
                onClick={handleCapture}
                disabled={!isActive || camLoading}
                className="btn btn-primary w-full"
                id="capture-photo-btn"
              >
                <Camera size={18} />
                Take Selfie
              </button>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirming' && capturedImage && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-1">Confirm Attendance</h3>
                <p className="text-slate-400 text-sm">Review your selfie and location before submitting</p>
              </div>

              {/* Captured Photo */}
              <div className="rounded-2xl overflow-hidden border-2 border-blue-200 dark:border-blue-700 relative">
                <img src={capturedImage} alt="Captured selfie" className="w-full object-cover max-h-64" />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => { resetCamera(); setStep('camera'); startCamera(); }}
                    className="btn btn-sm bg-white/90 text-slate-800 hover:bg-white"
                  >
                    <RefreshCw size={14} />
                    Retake
                  </button>
                </div>
              </div>

              {/* Location Summary */}
              {gpsData && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-600 dark:text-slate-300">{gpsData.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-slate-400" />
                    <p className="text-slate-600 dark:text-slate-300">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { resetCamera(); setStep('idle'); }}
                  className="btn btn-secondary"
                >
                  <XCircle size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn btn-success"
                  id="submit-attendance-btn"
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                  ) : (
                    <><CheckCircle size={16} /> Submit</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MarkAttendancePage;

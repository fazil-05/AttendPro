// src/pages/attendance/MarkAttendancePage.tsx
// Employee attendance marking — strict state-based UI with check-in/check-out validation

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MapPin, Camera, Clock, CheckCircle, Navigation,
  Loader2, XCircle, AlertCircle, Timer,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import { useGeolocation, reverseGeocode } from '../../hooks/useGeolocation';
import { useCamera } from '../../hooks/useCamera';
import { isWithinGeofence } from '../../utils/haversine';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';

// ─── Working hours formatter ──────────────────────────────────
function formatWorkingHours(hours: number): string {
  const totalMins = Math.round(hours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ─── Live elapsed time hook ───────────────────────────────────
function useLiveElapsed(fromISO: string | null | undefined) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!fromISO) { setElapsed(''); return; }
    const tick = () => {
      const diffMs = Date.now() - new Date(fromISO).getTime();
      const totalMins = Math.floor(diffMs / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [fromISO]);

  return elapsed;
}

// ─── Component ────────────────────────────────────────────────
const MarkAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { getLocation } = useGeolocation();
  const {
    videoRef, isActive, capturedImage,
    isLoading: camLoading, startCamera, capturePhoto, resetCamera,
  } = useCamera();

  const [step, setStep] = useState<'idle' | 'gps' | 'camera' | 'confirming'>('idle');
  const [gpsData, setGpsData] = useState<{
    latitude: number; longitude: number; accuracy?: number;
    address: string; distance?: number; withinGeofence?: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout'>('checkin');

  const isFieldWorker = user?.role === 'field_employee';

  // ── Fetch today's attendance (poll every 30s) ─────────────
  const { data: todayAttendance, refetch: refetchToday } = useQuery({
    queryKey: ['my-attendance-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get('/attendance', { params: { date: today } });
      return data.data?.[0] || null;
    },
    refetchInterval: 30_000,
  });

  // ── Fetch branch for geofencing ───────────────────────────
  const { data: branchData } = useQuery({
    queryKey: ['branch-info', user?.branch_id],
    queryFn: async () => {
      if (!user?.branch_id) return null;
      const { data } = await api.get(`/branches/${user.branch_id}`);
      return data.data;
    },
    enabled: !!user?.branch_id,
  });

  const hasCheckedIn  = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;

  // Auto-switch tab: if already checked in but not out → go to checkout tab
  const didAutoSwitch = useRef(false);
  useEffect(() => {
    if (!todayAttendance) return;
    if (!didAutoSwitch.current) {
      if (hasCheckedIn && !hasCheckedOut) {
        setActiveTab('checkout');
      }
      didAutoSwitch.current = true;
    }
  }, [todayAttendance, hasCheckedIn, hasCheckedOut]);

  // Reset step when switching tabs
  const switchTab = (tab: 'checkin' | 'checkout') => {
    setActiveTab(tab);
    setStep('idle');
    setGpsData(null);
    resetCamera();
  };

  // Live elapsed time (for "Still Working" display)
  const liveElapsed = useLiveElapsed(hasCheckedIn && !hasCheckedOut ? todayAttendance?.check_in : null);

  // ── Mutations ─────────────────────────────────────────────
  const checkInMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await api.post('/attendance/checkin', payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Check-in successful!');
      setStep('idle');
      setGpsData(null);
      resetCamera();
      refetchToday();
      // Auto-switch to checkout tab after successful check-in
      setTimeout(() => setActiveTab('checkout'), 800);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Check-in failed. Please try again.');
      setStep('idle');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await api.post('/attendance/checkout', payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Check-out successful!');
      setStep('idle');
      setGpsData(null);
      resetCamera();
      refetchToday();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Check-out failed.');
      setStep('idle');
    },
  });

  // ── GPS capture ───────────────────────────────────────────
  const handleCaptureGPS = async () => {
    setStep('gps');
    try {
      const pos = await getLocation();
      const address = await reverseGeocode(pos.latitude, pos.longitude);

      let distance: number | undefined;
      let withinGeofence = true;

      if (user?.role === 'office_employee' && branchData?.latitude && branchData?.longitude) {
        const check = isWithinGeofence(
          pos.latitude, pos.longitude,
          parseFloat(branchData.latitude), parseFloat(branchData.longitude),
          branchData.radius || 200,
        );
        distance = check.distance;
        withinGeofence = check.inside;
      }

      setGpsData({ ...pos, address, distance, withinGeofence });

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

  // ── Photo capture ─────────────────────────────────────────
  const handleCapturePhoto = () => {
    const photo = capturePhoto();
    if (photo) setStep('confirming');
    else toast.error('Failed to capture photo. Please try again.');
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!gpsData) { toast.error('Missing location coordinates'); return; }
    if (isFieldWorker && !capturedImage) { toast.error('Selfie photo is required for field workers'); return; }

    const payload = {
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      accuracy: gpsData.accuracy,
      address: gpsData.address,
      photo_url: capturedImage || undefined,
    };

    if (activeTab === 'checkin') checkInMutation.mutate(payload);
    else checkOutMutation.mutate(payload);
  };

  // ── Helpers ───────────────────────────────────────────────
  const fmtTime = (iso: string | null | undefined) =>
    iso ? format(new Date(iso), 'hh:mm a') : '—';

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Mark Attendance</h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          {isFieldWorker ? '📍 Field Visit Check-In (GPS & Photo Verified)' : '🏢 Office Geofenced Check-In (Instant GPS)'}
        </p>
      </div>

      {/* ── Today's Status Widget ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 bg-white border border-slate-200 shadow-xs"
      >
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-blue-600" /> Today's Attendance Status
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Status */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-semibold mb-1.5">Status</p>
            {todayAttendance?.status
              ? <StatusBadge status={todayAttendance.status} size="sm" />
              : <span className="text-xs text-slate-400 font-medium">Not Marked</span>}
          </div>

          {/* Check In */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-semibold mb-1">Check In</p>
            {hasCheckedIn ? (
              <div>
                <p className="font-bold text-emerald-700 text-sm">{fmtTime(todayAttendance?.check_in)}</p>
                <CheckCircle size={12} className="text-emerald-500 mx-auto mt-0.5" />
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium">—</p>
            )}
          </div>

          {/* Check Out */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-semibold mb-1">Check Out</p>
            {hasCheckedOut ? (
              <div>
                <p className="font-bold text-emerald-700 text-sm">{fmtTime(todayAttendance?.check_out)}</p>
                <CheckCircle size={12} className="text-emerald-500 mx-auto mt-0.5" />
              </div>
            ) : hasCheckedIn ? (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-green-600 font-bold animate-pulse">● Active</span>
                <span className="text-xs text-green-700 font-bold">{liveElapsed}</span>
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium">—</p>
            )}
          </div>

          {/* Working Hours */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-semibold mb-1">Hours</p>
            {hasCheckedOut && todayAttendance?.working_hours ? (
              <p className="font-bold text-slate-900 text-sm">{formatWorkingHours(todayAttendance.working_hours)}</p>
            ) : hasCheckedIn && !hasCheckedOut ? (
              <p className="text-xs text-green-600 font-bold animate-pulse">Working…</p>
            ) : (
              <p className="text-slate-400 text-sm font-medium">—</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Main Action Card ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden bg-white border border-slate-200 shadow-xs"
      >
        {/* Tab Selector */}
        <div className="flex border-b border-slate-100">
          <button
            type="button"
            onClick={() => switchTab('checkin')}
            className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'checkin'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock size={15} />
            Check In
            {hasCheckedIn && <CheckCircle size={14} className="text-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => switchTab('checkout')}
            className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'checkout'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle size={15} />
            Check Out
            {hasCheckedOut && <CheckCircle size={14} className="text-emerald-500" />}
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* ════════════════ CHECK IN TAB ════════════════ */}
            {activeTab === 'checkin' && (
              <motion.div
                key="checkin"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                {/* Already checked in — locked state */}
                {hasCheckedIn ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                      <CheckCircle size={40} className="text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Already Checked In</h3>
                      <p className="text-slate-500 text-sm mt-1">
                        You checked in at <span className="font-bold text-emerald-700">{fmtTime(todayAttendance?.check_in)}</span>
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold">
                      ✅ Check-in recorded for today
                    </div>
                    <p className="text-xs text-slate-400">You can only check in once per day. New check-in available after midnight.</p>
                  </div>
                ) : (
                  /* Normal check-in flow */
                  <CheckInOutFlow
                    mode="checkin"
                    step={step}
                    gpsData={gpsData}
                    isFieldWorker={isFieldWorker}
                    branchData={branchData}
                    videoRef={videoRef}
                    isActive={isActive}
                    camLoading={camLoading}
                    capturedImage={capturedImage}
                    isPending={checkInMutation.isPending}
                    onStart={handleCaptureGPS}
                    onCapturePhoto={handleCapturePhoto}
                    onSubmit={handleSubmit}
                    onRetake={() => { setStep('camera'); startCamera(); }}
                  />
                )}
              </motion.div>
            )}

            {/* ════════════════ CHECK OUT TAB ════════════════ */}
            {activeTab === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                {/* Not checked in yet */}
                {!hasCheckedIn ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
                      <AlertCircle size={32} className="text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Check-In Required</h3>
                      <p className="text-slate-500 text-sm mt-1">
                        You must check in first before checking out.
                      </p>
                    </div>
                    <button
                      onClick={() => switchTab('checkin')}
                      className="btn btn-primary text-xs px-5"
                    >
                      Go to Check In
                    </button>
                  </div>
                ) : hasCheckedOut ? (
                  /* Already checked out — locked state */
                  <div className="text-center py-6 space-y-3">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                      <CheckCircle size={40} className="text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Already Checked Out</h3>
                      <p className="text-slate-500 text-sm mt-1">
                        You checked out at <span className="font-bold text-emerald-700">{fmtTime(todayAttendance?.check_out)}</span>
                      </p>
                    </div>
                    {todayAttendance?.working_hours && (
                      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900">
                        <Timer size={16} className="text-blue-600" />
                        Total working hours: {formatWorkingHours(todayAttendance.working_hours)}
                      </div>
                    )}
                    <p className="text-xs text-slate-400">You can only check out once per day. See you tomorrow! 👋</p>
                  </div>
                ) : (
                  /* Normal check-out flow */
                  <CheckInOutFlow
                    mode="checkout"
                    step={step}
                    gpsData={gpsData}
                    isFieldWorker={isFieldWorker}
                    branchData={branchData}
                    videoRef={videoRef}
                    isActive={isActive}
                    camLoading={camLoading}
                    capturedImage={capturedImage}
                    isPending={checkOutMutation.isPending}
                    onStart={handleCaptureGPS}
                    onCapturePhoto={handleCapturePhoto}
                    onSubmit={handleSubmit}
                    onRetake={() => { setStep('camera'); startCamera(); }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Reusable GPS/Camera/Confirm flow ─────────────────────────
interface FlowProps {
  mode: 'checkin' | 'checkout';
  step: 'idle' | 'gps' | 'camera' | 'confirming';
  gpsData: any;
  isFieldWorker: boolean;
  branchData: any;
  videoRef: any;
  isActive: boolean;
  camLoading: boolean;
  capturedImage: string | null;
  isPending: boolean;
  onStart: () => void;
  onCapturePhoto: () => void;
  onSubmit: () => void;
  onRetake: () => void;
}

const CheckInOutFlow: React.FC<FlowProps> = ({
  mode, step, gpsData, isFieldWorker, branchData,
  videoRef, isActive, camLoading, capturedImage,
  isPending, onStart, onCapturePhoto, onSubmit, onRetake,
}) => {
  const isCheckIn = mode === 'checkin';
  const accentClass = isCheckIn ? 'btn-primary' : 'btn-success';

  return (
    <div className="space-y-5">
      {/* IDLE */}
      {step === 'idle' && (
        <div className="text-center py-6 space-y-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
            isCheckIn ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'
          }`}>
            <Navigation size={30} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Ready to {isCheckIn ? 'Check In' : 'Check Out'}
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-sm mx-auto">
              {isFieldWorker
                ? 'We will verify your GPS location and capture a selfie photo.'
                : 'We will verify your GPS coordinates against office geofence.'}
            </p>
          </div>

          {!isFieldWorker && branchData && (
            <div className="p-3 rounded-xl bg-blue-50 text-xs text-blue-800 border border-blue-100 font-medium">
              📍 Office Branch: <span className="font-bold">{branchData.name}</span>{' '}
              (Geofence Radius: {branchData.radius || 200}m)
            </div>
          )}

          <button
            onClick={onStart}
            className={`btn btn-lg w-full justify-center ${accentClass}`}
            id={`start-${mode}-btn`}
          >
            <MapPin size={18} />
            Start {isCheckIn ? 'Check-In' : 'Check-Out'}
          </button>
        </div>
      )}

      {/* GPS LOADING */}
      {step === 'gps' && (
        <div className="text-center py-10 space-y-3">
          <Loader2 size={36} className="animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-700 font-semibold text-sm">Acquiring GPS location…</p>
          <p className="text-xs text-slate-400">Please allow location access when prompted</p>
        </div>
      )}

      {/* CAMERA */}
      {step === 'camera' && isFieldWorker && (
        <div className="space-y-4">
          {gpsData && (
            <div className="p-3 rounded-xl border text-xs bg-blue-50 text-blue-800 border-blue-200 flex items-center gap-2">
              <MapPin size={14} />
              <span className="truncate font-medium">{gpsData.address}</span>
            </div>
          )}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center shadow-inner">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {camLoading && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-white text-xs gap-2">
                <Loader2 size={20} className="animate-spin" /> Starting camera…
              </div>
            )}
          </div>
          <button onClick={onCapturePhoto} disabled={!isActive} className={`btn ${accentClass} w-full justify-center py-3`}>
            <Camera size={18} /> Capture Photo & Continue
          </button>
        </div>
      )}

      {/* CONFIRMING */}
      {step === 'confirming' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Confirm Attendance Details</h3>

          {isFieldWorker && capturedImage && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-video relative max-w-xs mx-auto">
              <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover" />
            </div>
          )}

          {gpsData && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs">
              <p className="text-slate-800 font-bold flex items-center gap-1.5">
                <MapPin size={13} className="text-blue-600" /> {gpsData.address}
              </p>
              {gpsData.distance !== undefined && (
                <p className="text-slate-600 font-medium pl-5">
                  Distance to office:{' '}
                  <span className={`font-bold ${gpsData.withinGeofence ? 'text-emerald-700' : 'text-red-600'}`}>
                    {Math.round(gpsData.distance)}m
                  </span>
                  {!gpsData.withinGeofence && (
                    <span className="text-red-500 ml-1 flex items-center gap-1 inline-flex">
                      <XCircle size={12} /> Outside geofence
                    </span>
                  )}
                </p>
              )}
              <p className="text-slate-500 pl-5">
                Time: <span className="font-bold text-slate-800">{format(new Date(), 'hh:mm a')}</span>
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {isFieldWorker && (
              <button onClick={onRetake} className="btn btn-secondary flex-1 text-xs">
                Retake Photo
              </button>
            )}
            <button
              onClick={onSubmit}
              disabled={isPending}
              className={`btn ${accentClass} flex-1 text-xs py-3 font-bold`}
            >
              {isPending ? 'Submitting…' : 'Confirm & Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkAttendancePage;

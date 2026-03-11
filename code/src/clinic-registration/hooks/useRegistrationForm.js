import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_WORKING_HOURS } from '../utils/constants';

const DRAFT_KEY = 'clinic_registration_draft';
const STEP_KEY = 'clinic_registration_step';

const INITIAL_DATA = {
  // Step 1
  nameUz: '', nameRu: '', nameEn: '', clinicType: '',
  foundedYear: '', descriptionUz: '', descriptionRu: '', logo: null,
  // Step 2
  regionId: '', districtId: '', streetAddress: '', addressUz: '',
  addressRu: '', zipCode: '', googleMapsUrl: '', landmark: '', latitude: null, longitude: null,
  // Step 3
  primaryPhone: '', secondaryPhone: '', emergencyPhone: '', email: '',
  website: '', telegram: '', instagram: '', facebook: '', youtube: '',
  // Step 4
  workingHours: DEFAULT_WORKING_HOURS, isAlwaysOpen: false,
  lunchBreakStart: '', lunchBreakEnd: '', holidayNotes: '',
  // Step 5
  selectedServices: [],
  // Step 6 — persons array
  persons: [],
  agreeTerms: false, agreePrivacy: false,
  // Step 7
  licenseFile: null, licenseNumber: '', licenseExpiry: '',
  inn: '', legalName: '', legalAddress: '', legalForm: '', certificates: [],
  // Step 8
  bankName: '', bankAccountNumber: '', mfo: '', oked: '',
  vatNumber: '', paymentMethods: [], invoiceEmail: '',
};

const saveDraft = (data) => {
  try {
    // Exclude File objects from draft
    const serializable = Object.entries(data).reduce((acc, [key, val]) => {
      if (val instanceof File) return acc;
      if (Array.isArray(val) && val.some(v => v instanceof File)) return acc;
      acc[key] = val;
      return acc;
    }, {});
    localStorage.setItem(DRAFT_KEY, JSON.stringify(serializable));
  } catch { }
};

const loadDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch { return null; }
};

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(STEP_KEY);
};

export function useRegistrationForm() {
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem(STEP_KEY);
    return saved ? parseInt(saved, 10) : 1;
  });

  const [formData, setFormData] = useState(() => {
    const draft = loadDraft();
    return draft ? { ...INITIAL_DATA, ...draft } : { ...INITIAL_DATA };
  });

  const [stepErrors, setStepErrors] = useState({});
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Auto-save draft when formData changes
  useEffect(() => {
    saveDraft(formData);
  }, [formData]);

  // Save current step
  useEffect(() => {
    localStorage.setItem(STEP_KEY, currentStep.toString());
  }, [currentStep]);

  const updateFormData = useCallback((stepData) => {
    setFormData(prev => ({ ...prev, ...stepData }));
  }, []);

  const goToStep = useCallback((step) => {
    if (step < 1 || step > 8) return;
    // Allow: current step, or any already-completed step (going back to edit)
    // Prevent: skipping forward to a step that hasn't been completed yet
    const maxReachable = Math.max(currentStep, ...Array.from(completedSteps)) + 1;
    if (step <= maxReachable) {
      setCurrentStep(step);
    }
  }, [currentStep, completedSteps]);

  const markStepComplete = useCallback((step) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const markStepError = useCallback((step, errors) => {
    setStepErrors(prev => ({ ...prev, [step]: errors }));
  }, []);

  const clearStepError = useCallback((step) => {
    setStepErrors(prev => {
      const next = { ...prev };
      delete next[step];
      return next;
    });
  }, []);

  const nextStep = useCallback((stepData) => {
    updateFormData(stepData);
    markStepComplete(currentStep);
    clearStepError(currentStep);
    if (currentStep < 8) setCurrentStep(s => s + 1);
  }, [currentStep, updateFormData, markStepComplete, clearStepError]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  }, [currentStep]);

  const submitForm = useCallback(async (finalStepData) => {
    const allData = { ...formData, ...finalStepData };
    setFormData(allData);
    setIsSubmitting(true);
    setSubmitProgress(0);

    try {
      // Build JSON payload — skip File objects (handled separately via upload)
      const payload = {};
      Object.entries(allData).forEach(([key, val]) => {
        if (val === null || val === undefined) return;
        if (val instanceof File) return; // skip file blobs
        if (Array.isArray(val) && val.length > 0 && val[0] instanceof File) return;
        payload[key] = val;
      });

      // Fix types before sending
      if (payload.foundedYear === '' || payload.foundedYear === undefined) {
        delete payload.foundedYear; // let backend use null
      } else if (payload.foundedYear) {
        payload.foundedYear = parseInt(payload.foundedYear, 10);
      }

      // Remove non-serializable and UI-only fields
      delete payload.agreeTerms;
      delete payload.agreePrivacy;
      delete payload.logo;        // file — handled separately
      delete payload.licenseFile; // file — handled separately

      // Ensure persons have all required fields including password
      if (payload.persons && Array.isArray(payload.persons)) {
        payload.persons = payload.persons.map(p => ({
          firstName: p.firstName,
          lastName: p.lastName,
          middleName: p.middleName || undefined,
          position: p.position,
          phone: p.phone,
          email: p.email || undefined,
          password: p.password,  // ← must be included
        }));
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setSubmitProgress(p => Math.min(p + 10, 90));
      }, 300);

      const res = await fetch('/api/auth/clinic-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);
      setSubmitProgress(100);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.error?.message || 'Xatolik yuz berdi');
      }

      const responseData = await res.json();
      clearDraft();
      setIsSubmitted(true);
      return responseData;
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData]);

  return {
    currentStep,
    formData,
    stepErrors,
    completedSteps,
    isSubmitting,
    submitProgress,
    isSubmitted,
    submittedEmail,
    updateFormData,
    goToStep,
    nextStep,
    prevStep,
    submitForm,
    markStepError,
    clearStepError,
  };
}

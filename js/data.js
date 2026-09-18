/* ============================================================
   data.js — reference metadata and seed database
   ============================================================ */

const RECORD_TYPES = {
  prescription: { label: 'Prescription', icon: 'file', cls: 'prescription' },
  'lab-report': { label: 'Lab Report', icon: 'activity', cls: 'lab' },
  scan: { label: 'Scan', icon: 'eye', cls: 'scan' },
  'discharge-summary': { label: 'Discharge Summary', icon: 'file', cls: 'discharge' },
  vaccination: { label: 'Vaccination', icon: 'shield', cls: 'vaccination' },
  'consultation-note': { label: 'Consultation Note', icon: 'file', cls: 'consultation' }
};

const EMERGENCY_SCOPE = ['prescription', 'lab-report', 'discharge-summary'];

function seedDatabase() {
  const facilities = [
    { id: 'f1', name: 'Apollo Hospitals', type: 'Multi-specialty Hospital', city: 'Chennai', verified: true },
    { id: 'f2', name: 'Fortis Clinic', type: 'Clinic', city: 'Bengaluru', verified: true },
    { id: 'f3', name: 'Dr Lal PathLabs', type: 'Diagnostic Lab', city: 'Pune', verified: true },
    { id: 'f4', name: 'Government General Hospital', type: 'Government Hospital', city: 'Kochi', verified: true },
    { id: 'f5', name: 'Sunrise Pharmacy', type: 'Pharmacy', city: 'Chennai', verified: false }
  ];
  const providers = [
    { id: 'pv1', userId: 'u3', name: 'Dr. Ananya Rao', specialty: 'General Medicine', facilityId: 'f1', regNo: 'TN-MCI-45821' },
    { id: 'pv2', userId: 'u4', name: 'Dr. Vikram Shah', specialty: 'Cardiology', facilityId: 'f2', regNo: 'KA-MCI-30912' },
    { id: 'pv3', userId: null, name: 'Dr. Neha Gupta', specialty: 'Emergency Medicine', facilityId: 'f4', regNo: 'KL-MCI-11204' },
    { id: 'pv4', userId: null, name: 'Dr. Suresh Kumar', specialty: 'Emergency Medicine', facilityId: 'f4', regNo: 'KL-MCI-09871' }
  ];
  const patients = [
    {
      id: 'p1', medvaultId: 'MV-1001', abhaId: '12-3456-7890-1234', name: 'Atulya Verma',
      dob: '2007-05-20', gender: 'Male', phone: '+91 98400 12345', email: 'atulya.verma@example.in',
      bloodGroup: 'B+', address: '14, Kasturi Nagar, Chennai, Tamil Nadu',
      allergies: ['Penicillin', 'Sulfa drugs'], conditions: ['Type 2 Diabetes Mellitus', 'Hypertension', 'Osteoarthritis'],
      medications: ['Metformin 500 mg — twice daily', 'Amlodipine 5 mg — once daily', 'Atorvastatin 10 mg — at night'],
      emergencyContact: { name: 'Sunita Verma', relation: 'Mother', phone: '+91 98400 12346' },
      organDonor: true, caregiverIds: ['u2'], linkedFacilities: ['f1', 'f2', 'f3'],
      notes: 'Young adult patient. Mother assists with record management.'
    },
    {
      id: 'p2', medvaultId: 'MV-1002', abhaId: '98-7654-3210-9876', name: 'Priya Nair',
      dob: '1988-09-23', gender: 'Female', phone: '+91 99010 55221', email: 'priya.nair@example.in',
      bloodGroup: 'O+', address: '22, Marine Drive, Kochi, Kerala',
      allergies: ['None known'], conditions: ['Bronchial Asthma'],
      medications: ['Salbutamol inhaler — as needed'],
      emergencyContact: { name: 'Arjun Nair', relation: 'Husband', phone: '+91 99010 55222' },
      organDonor: false, caregiverIds: [], linkedFacilities: ['f1', 'f4'],
      notes: ''
    },
    {
      id: 'p3', medvaultId: 'MV-1003', abhaId: '77-1122-3344-5566', name: 'Aarav Nair',
      dob: '2016-02-05', gender: 'Male', phone: '+91 99010 55221', email: 'priya.nair@example.in',
      bloodGroup: 'A+', address: '22, Marine Drive, Kochi, Kerala',
      allergies: ['Peanuts'], conditions: ['None recorded'],
      medications: ['None'],
      emergencyContact: { name: 'Priya Nair', relation: 'Mother', phone: '+91 99010 55221' },
      organDonor: false, caregiverIds: ['u2'], linkedFacilities: ['f4'],
      notes: 'Paediatric record. Managed by mother.'
    }
  ];
  const users = [
    { id: 'u1', email: 'admin@medvault.demo', password: 'demo123', name: 'Kavita Menon', role: 'admin', active: true, createdAt: '2024-01-15T09:00:00.000Z' },
    { id: 'u2', email: 'caregiver@medvault.demo', password: 'demo123', name: 'Sunita Verma', role: 'caregiver', patientIds: ['p1', 'p3'], active: true, createdAt: '2024-03-02T09:00:00.000Z' },
    { id: 'u3', email: 'doctor@medvault.demo', password: 'demo123', name: 'Dr. Ananya Rao', role: 'provider', providerId: 'pv1', active: true, createdAt: '2024-02-10T09:00:00.000Z' },
    { id: 'u4', email: 'doctor2@medvault.demo', password: 'demo123', name: 'Dr. Vikram Shah', role: 'provider', providerId: 'pv2', active: true, createdAt: '2024-02-11T09:00:00.000Z' },
    { id: 'u5', email: 'patient@medvault.demo', password: 'demo123', name: 'Atulya Verma', role: 'patient', patientId: 'p1', active: true, createdAt: '2024-01-20T09:00:00.000Z' }
  ];
  const records = [
    { id: 'r1', patientId: 'p1', type: 'discharge-summary', title: 'Discharge Summary — Diabetic Ketoacidosis', date: '2023-11-08', facilityId: 'f1', facilityName: 'Apollo Hospitals, Chennai', doctor: 'Dr. Ananya Rao', source: 'provider-upload', fileName: 'apollo_discharge_2023-11-08.pdf', size: 412000, summary: 'Admitted with DKA. Stabilised on insulin sliding scale, transitioned to oral hypoglycaemics. Advised 4-week review.', extracted: { diagnosis: 'Diabetic Ketoacidosis (E11.10)', medications: ['Insulin Human Regular (in-hospital)', 'Metformin 500 mg — twice daily', 'Amlodipine 5 mg — once daily'], vitals: 'BP 148/92 mmHg · HR 96 bpm · SpO₂ 97%', advice: 'Strict glycaemic control, low-sugar diet, review in 4 weeks.' }, tags: ['diabetes', 'emergency'], createdAt: '2023-11-08T14:20:00.000Z' },
    { id: 'r2', patientId: 'p1', type: 'lab-report', title: 'HbA1c & Lipid Profile', date: '2024-02-14', facilityId: 'f3', facilityName: 'Dr Lal PathLabs, Pune', doctor: 'Dr. Ananya Rao', source: 'provider-upload', fileName: 'lalpath_hba1c_2024-02.pdf', size: 188000, summary: 'HbA1c 7.8% — above target. LDL 118 mg/dL. Creatinine within normal limits.', extracted: { diagnosis: 'Sub-optimal glycaemic control', medications: ['Continue Metformin 500 mg BD'], results: 'HbA1c 7.8% · FBS 146 mg/dL · LDL 118 mg/dL · Creatinine 0.9 mg/dL', advice: 'Intensify diet control; consider dose escalation.' }, tags: ['diabetes', 'labs'], createdAt: '2024-02-15T10:05:00.000Z' },
    { id: 'r3', patientId: 'p1', type: 'prescription', title: 'Prescription — General Medicine Review', date: '2024-06-03', facilityId: 'f1', facilityName: 'Apollo Hospitals, Chennai', doctor: 'Dr. Ananya Rao', source: 'provider-upload', fileName: 'apollo_rx_2024-06-03.pdf', size: 96000, summary: 'Routine review. BP well controlled. Continue current medications.', extracted: { diagnosis: 'Type 2 Diabetes Mellitus, Hypertension — stable', medications: ['Metformin 500 mg — twice daily after meals', 'Amlodipine 5 mg — once daily morning', 'Atorvastatin 10 mg — at night'], vitals: 'BP 128/82 mmHg · Weight 74 kg', advice: '30 minutes brisk walk daily. Review in 3 months.' }, tags: ['routine'], createdAt: '2024-06-03T11:30:00.000Z' },
    { id: 'r4', patientId: 'p1', type: 'scan', title: 'X-Ray — Bilateral Knee (Osteoarthritis)', date: '2024-09-19', facilityId: 'f2', facilityName: 'Fortis Clinic, Bengaluru', doctor: 'Dr. Vikram Shah', source: 'provider-upload', fileName: 'fortis_knee_xray_2024-09.dcm', size: 2450000, summary: 'Moderate medial joint space narrowing bilaterally. Grade II osteoarthritis.', extracted: { diagnosis: 'Bilateral knee osteoarthritis (Grade II)', medications: ['Paracetamol 650 mg — as needed'], results: 'Medial joint space narrowing, osteophyte formation', advice: 'Physiotherapy, weight management, avoid deep squats.' }, tags: ['orthopaedics', 'imaging'], createdAt: '2024-09-19T16:45:00.000Z' },
    { id: 'r5', patientId: 'p1', type: 'vaccination', title: 'Influenza Vaccination (Quadrivalent)', date: '2024-10-22', facilityId: 'f2', facilityName: 'Fortis Clinic, Bengaluru', doctor: 'Dr. Vikram Shah', source: 'provider-upload', fileName: 'fortis_flu_vaccine_2024.pdf', size: 64000, summary: 'Annual influenza vaccination administered. No adverse reaction.', extracted: { diagnosis: 'Immunisation — Influenza', medications: [], results: 'Batch No. FLU24-8891 · Left deltoid, IM', advice: 'Next annual dose due October 2025.' }, tags: ['preventive'], createdAt: '2024-10-22T09:15:00.000Z' },
    { id: 'r6', patientId: 'p1', type: 'lab-report', title: 'Renal Function & Electrolytes', date: '2025-01-30', facilityId: 'f3', facilityName: 'Dr Lal PathLabs, Pune', doctor: 'Dr. Ananya Rao', source: 'provider-upload', fileName: 'lalpath_rft_2025-01.pdf', size: 172000, summary: 'Renal function stable. Mildly reduced eGFR consistent with age.', extracted: { diagnosis: 'Chronic kidney disease stage 2 (age-related)', medications: ['Continue current medications; avoid NSAIDs'], results: 'Urea 32 mg/dL · Creatinine 1.1 mg/dL · eGFR 68 mL/min · Na 139 · K 4.3', advice: 'Maintain hydration. Avoid NSAIDs.' }, tags: ['renal', 'labs'], createdAt: '2025-01-30T13:10:00.000Z' },
    { id: 'r7', patientId: 'p1', type: 'consultation-note', title: 'Consultation — Cardiology Opinion', date: '2025-03-12', facilityId: 'f2', facilityName: 'Fortis Clinic, Bengaluru', doctor: 'Dr. Vikram Shah', source: 'provider-upload', fileName: 'fortis_cardio_note_2025-03.pdf', size: 84000, summary: 'Reviewed for exertional breathlessness. ECG normal sinus rhythm.', extracted: { diagnosis: 'Exertional dyspnoea — non-cardiac', medications: ['Continue Atorvastatin 10 mg'], results: 'ECG: normal sinus rhythm. Echo: LVEF 58%', advice: 'Cardiac rehabilitation exercises. Repeat echo in 12 months.' }, tags: ['cardiology'], createdAt: '2025-03-12T15:00:00.000Z' },
    { id: 'r8', patientId: 'p1', type: 'prescription', title: 'Prescription — Quarterly Diabetes Review', date: '2025-06-18', facilityId: 'f1', facilityName: 'Apollo Hospitals, Chennai', doctor: 'Dr. Ananya Rao', source: 'provider-upload', fileName: 'apollo_rx_2025-06-18.pdf', size: 101000, summary: 'HbA1c improved to 7.1%. Continue same regimen. Retinal screening advised.', extracted: { diagnosis: 'Type 2 Diabetes Mellitus — improved control', medications: ['Metformin 500 mg — twice daily after meals', 'Amlodipine 5 mg — once daily', 'Atorvastatin 10 mg — at night'], vitals: 'BP 124/80 mmHg · Weight 72 kg · BMI 25.1', advice: 'Continue diet and exercise. Retinal screening due.' }, tags: ['routine', 'diabetes'], createdAt: '2025-06-18T10:40:00.000Z' },
    { id: 'r9', patientId: 'p2', type: 'prescription', title: 'Prescription — Asthma Review', date: '2025-04-09', facilityId: 'f1', facilityName: 'Apollo Hospitals, Chennai', doctor: 'Dr. Ananya Rao', source: 'provider-upload', fileName: 'apollo_rx_priya_2025-04.pdf', size: 88000, summary: 'Well-controlled asthma. Continue as-needed reliever. Inhaler technique reviewed.', extracted: { diagnosis: 'Bronchial asthma — well controlled', medications: ['Salbutamol inhaler 100 mcg — 2 puffs as needed'], vitals: 'SpO₂ 98% · PEFR 92% of predicted', advice: 'Avoid known triggers. Review if reliever use exceeds twice weekly.' }, tags: ['respiratory'], createdAt: '2025-04-09T12:00:00.000Z' },
    { id: 'r10', patientId: 'p3', type: 'vaccination', title: 'MMR Booster', date: '2025-02-11', facilityId: 'f4', facilityName: 'Government General Hospital, Kochi', doctor: 'Dr. Neha Gupta', source: 'provider-upload', fileName: 'ggh_mmr_aarav_2025.pdf', size: 58000, summary: 'MMR booster administered as per national immunisation schedule.', extracted: { diagnosis: 'Immunisation — MMR booster', medications: [], results: 'Batch No. MMR25-1123 · Right thigh, IM', advice: 'Next scheduled immunisation at 10 years.' }, tags: ['paediatric', 'preventive'], createdAt: '2025-02-11T11:20:00.000Z' }
  ];
  const consents = [
    { id: 'c1', patientId: 'p1', providerId: 'pv1', providerName: 'Dr. Ananya Rao', facilityId: 'f1', facilityName: 'Apollo Hospitals, Chennai', recordTypes: ['prescription', 'lab-report', 'scan', 'discharge-summary', 'consultation-note', 'vaccination'], purpose: 'Ongoing treatment and quarterly diabetes review', status: 'active', grantedAt: '2024-01-20T09:30:00.000Z', expiresAt: daysFromNow(120), requestedBy: 'patient' },
    { id: 'c2', patientId: 'p1', providerId: 'pv2', providerName: 'Dr. Vikram Shah', facilityId: 'f2', facilityName: 'Fortis Clinic, Bengaluru', recordTypes: ['lab-report', 'prescription', 'consultation-note'], purpose: 'Cardiology opinion and follow-up', status: 'active', grantedAt: '2025-03-05T10:00:00.000Z', expiresAt: daysFromNow(60), requestedBy: 'provider' },
    { id: 'c3', patientId: 'p2', providerId: 'pv1', providerName: 'Dr. Ananya Rao', facilityId: 'f1', facilityName: 'Apollo Hospitals, Chennai', recordTypes: ['prescription', 'lab-report', 'consultation-note'], purpose: 'Asthma management', status: 'active', grantedAt: '2025-04-01T08:00:00.000Z', expiresAt: daysFromNow(200), requestedBy: 'patient' },
    { id: 'c4', patientId: 'p1', providerId: 'pv2', providerName: 'Dr. Vikram Shah', facilityId: 'f2', facilityName: 'Fortis Clinic, Bengaluru', recordTypes: ['scan'], purpose: 'Orthopaedic imaging review', status: 'revoked', grantedAt: '2024-09-10T09:00:00.000Z', expiresAt: '2024-12-10T09:00:00.000Z', revokedAt: '2024-12-15T11:00:00.000Z', requestedBy: 'provider' },
    { id: 'c5', patientId: 'p3', providerId: 'pv3', providerName: 'Dr. Neha Gupta', facilityId: 'f4', facilityName: 'Government General Hospital, Kochi', recordTypes: ['vaccination', 'prescription'], purpose: 'Paediatric immunisation record', status: 'active', grantedAt: '2025-02-11T11:00:00.000Z', expiresAt: daysFromNow(300), requestedBy: 'caregiver' }
  ];
  const audit = [
    { id: 'a1', ts: '2025-06-18T10:40:00.000Z', actor: 'Dr. Ananya Rao', actorRole: 'provider', action: 'RECORD_UPLOADED', patientId: 'p1', detail: 'Prescription uploaded via assisted linking · Apollo Hospitals', severity: 'info' },
    { id: 'a2', ts: '2025-06-18T10:41:00.000Z', actor: 'System', actorRole: 'system', action: 'PATIENT_NOTIFIED', patientId: 'p1', detail: 'Notification sent to patient and linked caregiver', severity: 'info' },
    { id: 'a3', ts: '2025-06-18T18:22:00.000Z', actor: 'Atulya Verma', actorRole: 'patient', action: 'RECORD_VIEWED', patientId: 'p1', detail: 'Viewed Prescription — Quarterly Diabetes Review', severity: 'info' },
    { id: 'a4', ts: '2025-05-02T14:10:00.000Z', actor: 'Dr. Vikram Shah', actorRole: 'provider', action: 'RECORD_VIEWED', patientId: 'p1', detail: 'Viewed records within active consent scope (c2)', severity: 'info' },
    { id: 'a5', ts: '2025-04-28T03:14:00.000Z', actor: 'Dr. Suresh Kumar', actorRole: 'provider', action: 'BREAK_GLASS_ACCESS', patientId: 'p1', detail: 'Emergency access — reason: RTA, patient unconscious', severity: 'critical' },
    { id: 'a6', ts: '2025-04-28T09:00:00.000Z', actor: 'Kavita Menon', actorRole: 'admin', action: 'BREAK_GLASS_REVIEWED', patientId: 'p1', detail: 'Break-glass event reviewed — access deemed clinically justified', severity: 'warning' },
    { id: 'a7', ts: '2025-04-01T08:00:00.000Z', actor: 'Priya Nair', actorRole: 'patient', action: 'CONSENT_GRANTED', patientId: 'p2', detail: 'Consent granted to Dr. Ananya Rao — Asthma management', severity: 'info' },
    { id: 'a8', ts: '2025-03-05T10:00:00.000Z', actor: 'Atulya Verma', actorRole: 'patient', action: 'CONSENT_GRANTED', patientId: 'p1', detail: 'Consent granted to Dr. Vikram Shah — Cardiology opinion', severity: 'info' },
    { id: 'a9', ts: '2024-12-15T11:00:00.000Z', actor: 'Atulya Verma', actorRole: 'patient', action: 'CONSENT_REVOKED', patientId: 'p1', detail: 'Consent revoked for Dr. Vikram Shah (c4)', severity: 'warning' },
    { id: 'a10', ts: '2024-11-02T10:15:00.000Z', actor: 'Sunita Verma', actorRole: 'caregiver', action: 'EMERGENCY_PROFILE_UPDATED', patientId: 'p1', detail: 'Allergies and emergency contact updated', severity: 'info' },
    { id: 'a11', ts: '2024-10-22T09:15:00.000Z', actor: 'Dr. Vikram Shah', actorRole: 'provider', action: 'RECORD_UPLOADED', patientId: 'p1', detail: 'Vaccination record uploaded · Fortis Clinic', severity: 'info' },
    { id: 'a12', ts: '2024-06-03T11:30:00.000Z', actor: 'Dr. Ananya Rao', actorRole: 'provider', action: 'RECORD_UPLOADED', patientId: 'p1', detail: 'Prescription uploaded · Apollo Hospitals', severity: 'info' }
  ];
  const notifications = [
    { id: 'n1', ts: '2025-06-18T10:41:00.000Z', patientId: 'p1', title: 'New record added', body: 'Prescription — Quarterly Diabetes Review uploaded by Apollo Hospitals.', read: false, type: 'record' },
    { id: 'n2', ts: '2025-06-17T09:00:00.000Z', patientId: 'p1', title: 'Consent expiring soon', body: 'Your consent for Dr. Vikram Shah expires in 60 days.', read: false, type: 'consent' },
    { id: 'n3', ts: '2025-05-02T14:10:00.000Z', patientId: 'p1', title: 'Your record was accessed', body: 'Dr. Vikram Shah viewed records within an active consent.', read: true, type: 'access' },
    { id: 'n4', ts: '2025-04-28T03:14:00.000Z', patientId: 'p1', title: 'Emergency access recorded', body: 'A break-glass emergency access was recorded and is pending review.', read: true, type: 'emergency' },
    { id: 'n5', ts: '2025-02-11T11:20:00.000Z', patientId: 'p3', title: 'New record added', body: 'MMR Booster was added by Government General Hospital, Kochi.', read: true, type: 'record' }
  ];
  const breakGlass = [
    { id: 'bg1', ts: '2025-04-28T03:14:00.000Z', patientId: 'p1', responderName: 'Dr. Suresh Kumar', facilityId: 'f4', facilityName: 'Government General Hospital, Kochi', reason: 'Road traffic accident — patient unconscious, unable to provide history', scopesAccessed: ['bloodGroup', 'allergies', 'conditions', 'medications', 'emergencyContact'], status: 'pending', reviewedBy: null, reviewedAt: null, reviewNote: '' },
    { id: 'bg2', ts: '2025-03-30T21:48:00.000Z', patientId: 'p2', responderName: 'Dr. Neha Gupta', facilityId: 'f4', facilityName: 'Government General Hospital, Kochi', reason: 'Acute severe asthma exacerbation — unresponsive at triage', scopesAccessed: ['bloodGroup', 'allergies', 'conditions', 'medications'], status: 'reviewed', reviewedBy: 'Kavita Menon', reviewedAt: '2025-03-31T10:12:00.000Z', reviewNote: 'Access clinically justified and appropriately scoped.' },
    { id: 'bg3', ts: '2025-02-14T05:02:00.000Z', patientId: 'p3', responderName: 'Dr. Suresh Kumar', facilityId: 'f4', facilityName: 'Government General Hospital, Kochi', reason: 'Suspected anaphylaxis after food ingestion', scopesAccessed: ['bloodGroup', 'allergies', 'emergencyContact'], status: 'flagged', reviewedBy: 'Kavita Menon', reviewedAt: '2025-02-14T12:00:00.000Z', reviewNote: 'Scope exceeded — history viewed beyond emergency need.' }
  ];
  const caregiverLinks = [
    { id: 'cg1', patientId: 'p1', userId: 'u2', name: 'Sunita Verma', relation: 'Mother', permissions: ['view', 'upload', 'manage-emergency'], status: 'active', linkedAt: '2024-01-22T09:00:00.000Z' },
    { id: 'cg2', patientId: 'p3', userId: 'u2', name: 'Sunita Verma', relation: 'Grandparent', permissions: ['view', 'upload'], status: 'active', linkedAt: '2024-03-05T09:00:00.000Z' }
  ];
  return { version: 1, facilities, providers, patients, users, records, consents, audit, notifications, breakGlass, caregiverLinks };
}
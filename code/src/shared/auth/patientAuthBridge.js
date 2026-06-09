// Lets non-React code (axios interceptor, etc.) reach the single patient
// auth resolver that lives inside UserAuthContext. The provider registers
// itself on mount; callers invoke `callEnsurePatientAuth()` which awaits
// the same in-flight promise as React components, so there's only ever
// ONE miniapp-login / refresh roundtrip even when both the interceptor
// and a click handler want auth at the same instant.

let resolver = null;

export const setPatientAuthResolver = (fn) => { resolver = fn; };

export const clearPatientAuthResolver = () => { resolver = null; };

export const callEnsurePatientAuth = async () => {
  if (typeof resolver !== 'function') return null;
  try {
    return await resolver();
  } catch {
    return null;
  }
};

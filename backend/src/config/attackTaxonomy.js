/**
 * Social Engineering Attack Taxonomy Allowlist & Validation
 * 
 * Provides centralized definitions of supported attack types and techniques,
 * ensuring model-generated classifications are strictly constrained to valid identifiers.
 */

export const ALLOWED_ATTACK_TYPES = [
  'phishing',
  'spear_phishing',
  'business_email_compromise',
  'smishing',
  'vishing',
  'credential_phishing',
  'pretexting',
  'impersonation',
  'baiting',
  'quid_pro_quo',
  'tailgating',
  'watering_hole',
  'tech_support_scam',
  'romance_scam',
  'urgency_manipulation'
];

export const VALID_ATTACK_TYPES = ALLOWED_ATTACK_TYPES;

export const ATTACK_TAXONOMY = {
  phishing: { name: 'Phishing', description: 'Deceptive mass emails intended to trick recipients.' },
  spear_phishing: { name: 'Spear Phishing', description: 'Targeted phishing attacks customized to specific individuals or organizations.' },
  business_email_compromise: { name: 'Business Email Compromise', description: 'Impersonating executives or trusted partners to initiate fraudulent transfers or reveal data.' },
  smishing: { name: 'Smishing', description: 'SMS-based social engineering soliciting immediate response or clicks.' },
  vishing: { name: 'Vishing', description: 'Voice/phone social engineering extracting information or passcodes.' },
  credential_phishing: { name: 'Credential Phishing', description: 'Attacks specifically structured to harvest authentication credentials or MFA tokens.' },
  pretexting: { name: 'Pretexting', description: 'Fabricated scenario to establish rapport and elicit compliance.' },
  impersonation: { name: 'Impersonation', description: 'Assuming the identity of a known trusted individual, brand, or department.' },
  baiting: { name: 'Baiting', description: 'Enticing victims with promises of goods, downloads, or access.' },
  quid_pro_quo: { name: 'Quid Pro Quo', description: 'Offering a fraudulent benefit or technical assistance in exchange for credentials.' },
  tailgating: { name: 'Tailgating', description: 'Gaining unauthorized physical or logical access through authorized personnel.' },
  watering_hole: { name: 'Watering Hole', description: 'Compromising or spoofing websites frequently visited by target groups.' },
  tech_support_scam: { name: 'Tech Support Scam', description: 'Fraudulent tech assistance claiming nonexistent malware or security problems.' },
  romance_scam: { name: 'Romance Scam', description: 'Manipulating affection and emotional vulnerability for fraud.' },
  urgency_manipulation: { name: 'Urgency Manipulation', description: 'Manufactured time constraints designed to bypass critical thinking.' }
};

/**
 * Normalizes an attack identifier string (lowercases, replaces spaces/hyphens with underscores).
 * 
 * @param {string} rawType
 * @returns {string}
 */
export function normalizeAttackType(rawType) {
  if (!rawType || typeof rawType !== 'string') return '';
  return rawType
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
}

/**
 * Checks whether an attack type is part of the recognized taxonomy.
 * 
 * @param {string} type
 * @returns {boolean}
 */
export function isValidAttackType(type) {
  const normalized = normalizeAttackType(type);
  return ALLOWED_ATTACK_TYPES.includes(normalized);
}

/**
 * Validates and normalizes an attackClassification object.
 * 
 * @param {Object} classification
 * @returns {{ valid: boolean, errors: string[], classification: Object|null }}
 */
export function validateAttackClassification(classification) {
  const errors = [];

  if (!classification || typeof classification !== 'object') {
    return {
      valid: false,
      errors: ['attackClassification must be an object'],
      classification: null
    };
  }

  // 1. Primary Type
  const rawPrimary = classification.primaryType;
  const normalizedPrimary = normalizeAttackType(rawPrimary);

  if (!normalizedPrimary) {
    errors.push('attackClassification.primaryType is required');
  } else if (!ALLOWED_ATTACK_TYPES.includes(normalizedPrimary)) {
    errors.push(
      `Unsupported primaryType "${rawPrimary}". Allowed types: ${ALLOWED_ATTACK_TYPES.join(', ')}`
    );
  }

  // 2. Secondary Techniques
  let normalizedSecondary = [];
  if (classification.secondaryTechniques !== undefined) {
    if (!Array.isArray(classification.secondaryTechniques)) {
      errors.push('attackClassification.secondaryTechniques must be an array of strings');
    } else {
      for (const tech of classification.secondaryTechniques) {
        const normTech = normalizeAttackType(tech);
        if (normTech && ALLOWED_ATTACK_TYPES.includes(normTech) && !normalizedSecondary.includes(normTech)) {
          if (normalizedSecondary.length < 4) {
            normalizedSecondary.push(normTech);
          }
        }
      }
    }
  }

  // 3. Rationale
  let rationale = classification.rationale;
  if (!rationale || typeof rationale !== 'string' || rationale.trim().length === 0) {
    rationale = `Identified as ${normalizedPrimary || 'social engineering'} based on simulated scenario cues.`;
  } else {
    rationale = rationale.trim().slice(0, 500);
  }

  if (errors.length > 0) {
    return { valid: false, errors, classification: null };
  }

  return {
    valid: true,
    errors: [],
    classification: {
      primaryType: normalizedPrimary,
      secondaryTechniques: normalizedSecondary,
      rationale
    }
  };
}

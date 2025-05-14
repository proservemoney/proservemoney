export interface EmailVerificationResult {
  service: string;
  isValid: boolean;
  details?: {
    status?: string;
    reason?: string;
  };
}

// Common disposable email domains
const disposableDomains = [
  'tempmail.com', 'throwawaymail.com', 'mailinator.com', 'temp-mail.org',
  'guerrillamail.com', '10minutemail.com', 'yopmail.com'
];

function isValidEmailFormat(email: string): boolean {
  // RFC 5322 compliant email regex that checks:
  // - Local part length (max 64 characters)
  // - Domain part length (max 255 characters)
  // - Valid characters in local and domain parts
  // - Proper domain format with at least one dot
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }

  // Check length constraints
  const [localPart, domain] = email.split('@');
  if (localPart.length > 64 || domain.length > 255) {
    return false;
  }

  // Must have at least one dot in domain (e.g., example.com)
  if (!domain.includes('.')) {
    return false;
  }

  // Domain cannot start or end with hyphen
  if (domain.startsWith('-') || domain.endsWith('-')) {
    return false;
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    return false;
  }

  return true;
}

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1].toLowerCase();
  return disposableDomains.includes(domain);
}

export async function verifyEmail(email: string): Promise<EmailVerificationResult[]> {
  // Basic format validation
  if (!isValidEmailFormat(email)) {
    return [{
      service: 'Format Check',
      isValid: false,
      details: {
        status: 'invalid',
        reason: 'Invalid email format'
      }
    }];
  }

  // Check for disposable email
  if (isDisposableEmail(email)) {
    return [{
      service: 'Domain Check',
      isValid: false,
      details: {
        status: 'invalid',
        reason: 'Disposable email addresses are not allowed'
      }
    }];
  }

  // All checks passed
  return [{
    service: 'Email Validation',
    isValid: true,
    details: {
      status: 'valid',
      reason: 'Email format is valid'
    }
  }];
}

export function isEmailValid(results: EmailVerificationResult[]): boolean {
  return results.some(result => result.isValid);
}

export function isValidEmail(email: string): boolean {
  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
} 
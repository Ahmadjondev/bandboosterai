/**
 * Form validation utilities
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  return null;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  
  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return 'Password must contain both letters and numbers';
  }
  
  return null;
}

/**
 * Validate name (first name or last name)
 */
export function validateName(name: string, fieldName: string = 'Name'): string | null {
  if (!name) {
    return `${fieldName} is required`;
  }
  
  if (name.length < 2) {
    return `${fieldName} must be at least 2 characters long`;
  }
  
  if (name.length > 50) {
    return `${fieldName} must be less than 50 characters`;
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }
  
  return null;
}

/**
 * Validate username
 */
export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Username is required';
  }
  
  if (username.length < 3) {
    return 'Username must be at least 3 characters long';
  }
  
  if (username.length > 30) {
    return 'Username must be less than 30 characters';
  }
  
  // Check for valid characters (alphanumeric, underscore, hyphen)
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens';
  }
  
  return null;
}

/**
 * Validate login form
 */
export function validateLoginForm(username: string, password: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!username) {
    errors.push({ field: 'username', message: 'Username or email is required' });
  }
  
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate registration form
 */
export function validateRegisterForm(
  email: string,
  password: string,
  confirmPassword: string,
  firstName: string,
  lastName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate email
  const emailError = validateEmail(email);
  if (emailError) {
    errors.push({ field: 'email', message: emailError });
  }
  
  // Validate password
  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.push({ field: 'password', message: passwordError });
  }
  
  // Validate confirm password
  if (!confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Please confirm your password' });
  } else if (password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }
  
  // Validate first name
  const firstNameError = validateName(firstName, 'First name');
  if (firstNameError) {
    errors.push({ field: 'firstName', message: firstNameError });
  }
  
  // Validate last name
  const lastNameError = validateName(lastName, 'Last name');
  if (lastNameError) {
    errors.push({ field: 'lastName', message: lastNameError });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

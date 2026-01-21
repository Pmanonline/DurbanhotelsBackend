interface Validator {
  (value: string): boolean;
}

export const emailValidator: Validator = (value: string): boolean => {
  // Regular expression for validating email addresses
  const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

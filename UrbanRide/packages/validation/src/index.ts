export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: readonly string[];
}

export class APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  statusCode?: number;

  constructor(success: boolean, message: string, data?: T, statusCode?: number) {
    this.success = success;
    this.message = message;
    if (data !== undefined) this.data = data;
    if (statusCode !== undefined) this.statusCode = statusCode;
  }
}

export class APIErrorResponse {
  success: false;
  message: string;
  errors?: any;
  statusCode?: number;

  constructor(message: string, errors?: any, statusCode?: number) {
    this.success = false;
    this.message = message;
    if (errors !== undefined) this.errors = errors;
    if (statusCode !== undefined) this.statusCode = statusCode;
  }
}

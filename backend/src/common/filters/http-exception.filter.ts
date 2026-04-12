import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorPayload {
  message: string;
  details?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    const error: ErrorPayload = {
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        error.message = exceptionResponse;
      }

      if (isRecord(exceptionResponse)) {
        if (typeof exceptionResponse.message === 'string') {
          error.message = exceptionResponse.message;
        } else if (Array.isArray(exceptionResponse.message)) {
          error.message = 'Validation failed';
          error.details = exceptionResponse.message;
        }

        if (exceptionResponse.error !== undefined && error.details === undefined) {
          error.details = exceptionResponse.error;
        }
      }
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code: statusCode,
        ...error,
      },
      meta: {
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

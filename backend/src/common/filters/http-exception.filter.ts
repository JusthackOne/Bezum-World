import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorPayload {
  code?: string;
  message: string;
  details?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

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

        if (typeof exceptionResponse.code === 'string') {
          error.code = exceptionResponse.code;
        }

        if (exceptionResponse.details !== undefined) {
          error.details = exceptionResponse.details;
        }
      }
    } else {
      const errorName = exception instanceof Error ? exception.name : 'UnknownError';
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      const errorCode =
        isRecord(exception) && typeof exception.code === 'string' ? ` [${exception.code}]` : '';
      this.logger.error(
        `${request.method} ${request.url} failed with ${errorName}${errorCode}: ${errorMessage}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code: error.code ?? statusCode,
        ...(error.code ? { statusCode } : {}),
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

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'internal_error';
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = httpCodeFromStatus(status);
      } else if (typeof body === 'object' && body !== null) {
        const b = body as { message?: string | string[]; code?: string };
        message = b.message ?? message;
        code = b.code ?? httpCodeFromStatus(status);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
    }

    res.status(status).json({
      error: {
        code,
        message,
        requestId: (req as any).requestId,
      },
    });
  }
}

function httpCodeFromStatus(s: number): string {
  if (s === 400) return 'bad_request';
  if (s === 401) return 'unauthorized';
  if (s === 403) return 'forbidden';
  if (s === 404) return 'not_found';
  if (s === 409) return 'conflict';
  if (s === 422) return 'unprocessable';
  if (s === 429) return 'rate_limited';
  return 'internal_error';
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const header = (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).requestId = header;
    _res.setHeader('x-request-id', header);
    next();
  }
}

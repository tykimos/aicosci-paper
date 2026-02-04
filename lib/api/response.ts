import { NextResponse } from 'next/server';
import type { ApiResponse, ErrorCode, ErrorCodes } from '@/types/api';

export function successResponse<T>(
  data: T,
  meta?: ApiResponse<T>['meta'],
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta }),
    },
    { status }
  );
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

export function notFoundResponse(message = 'Resource not found') {
  return errorResponse('NOT_FOUND', message, 404);
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse('UNAUTHORIZED', message, 401);
}

export function forbiddenResponse(message = 'Forbidden') {
  return errorResponse('FORBIDDEN', message, 403);
}

export function badRequestResponse(message = 'Bad request') {
  return errorResponse('BAD_REQUEST', message, 400);
}

export function internalErrorResponse(message = 'Internal server error') {
  return errorResponse('INTERNAL_ERROR', message, 500);
}

// Helper to parse pagination params
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

// Helper to create pagination meta
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): ApiResponse['meta'] {
  return {
    page,
    limit,
    total,
    has_more: page * limit < total,
  };
}

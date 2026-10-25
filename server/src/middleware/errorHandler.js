import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProd = env.isProd;

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  if (err.name === 'DuplicateFinanceRecordError') {
    return res.status(409).json({
      error: err.message,
      code: 'DUPLICATE_FINANCE_RECORD',
      vendor: err.vendor,
      invoiceNumber: err.invoiceNumber,
    });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues || err.errors,
    });
  }

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    ...(isProd ? {} : { stack: err.stack }),
  });
}

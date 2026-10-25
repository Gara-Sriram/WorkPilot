import express from 'express';
import { listFinanceRecords, getFinanceRecordById } from '../services/financeService.js';

const router = express.Router();

// List finance records
router.get('/finance-records', async (req, res, next) => {
  try {
    const { limit = 50, skip = 0, isVerified } = req.query;
    const filterVerified = isVerified === 'true' ? true : isVerified === 'false' ? false : undefined;

    const result = await listFinanceRecords({
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
      isVerified: filterVerified,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get finance record by ID
router.get('/finance-records/:recordId', async (req, res, next) => {
  try {
    const record = await getFinanceRecordById(req.params.recordId);
    if (!record) {
      return res.status(404).json({ error: `Finance record "${req.params.recordId}" not found.` });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;

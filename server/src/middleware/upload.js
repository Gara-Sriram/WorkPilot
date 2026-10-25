import multer from 'multer';

// Use memory storage so we can validate magic bytes and content before committing
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check extension and mime type
    const isPdfExt = file.originalname.toLowerCase().endsWith('.pdf');
    const isPdfMime = file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf';

    if (isPdfExt || isPdfMime) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents (.pdf) are supported. Unsupported file type rejected.'));
    }
  },
});

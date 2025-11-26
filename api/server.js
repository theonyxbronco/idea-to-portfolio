require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const {
  rateLimit,
  requestLogger,
  securityHeaders,
  errorHandler
} = require('./middleware/portfolioMiddleware');
const {
  UPLOAD_CONFIG,
  CORS_CONFIG
} = require('./config/constants');
const { Logger } = require('./utils/logger');

const utilityRoutes = require('./routes/utility');
const userRoutes = require('./routes/users');
const draftRoutes = require('./routes/drafts');
const deploymentRoutes = require('./routes/deployments');
const createProjectRoutes = require('./routes/projects');
const createPortfolioRoutes = require('./routes/portfolios');

const app = express();
const PORT = process.env.PORT || 3001;
const logger = new Logger('Server');

const tempDir = process.env.NODE_ENV === 'production' || process.env.VERCEL
  ? '/tmp'
  : path.join(__dirname, 'temp');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
    files: UPLOAD_CONFIG.MAX_FILES
  },
  fileFilter: (req, file, cb) => {
    cb(null, UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype));
  }
});

const allowedOrigins = [
  ...CORS_CONFIG.ALLOWED_ORIGINS,
  ...(process.env.NODE_ENV === 'development' ? CORS_CONFIG.DEVELOPMENT_ORIGINS : [])
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') ||
      (process.env.NODE_ENV === 'development' && origin.includes('localhost'))
    ) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: CORS_CONFIG.METHODS,
  allowedHeaders: CORS_CONFIG.ALLOWED_HEADERS
};

const createUploadDirs = () => {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    const tmpDirs = ['/tmp', '/tmp/projects', '/tmp/temp_analysis'];
    tmpDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (error) {
          logger.warn(`Could not create directory ${dir}`, error);
        }
      }
    });
  } else {
    const uploadDirs = [
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'uploads', 'processed'),
      path.join(__dirname, 'uploads', 'temp'),
      tempDir
    ];

    uploadDirs.forEach(dir => {
      try {
        fs.ensureDirSync(dir);
      } catch (error) {
        logger.warn(`Could not create directory ${dir}`, error);
      }
    });
  }
};

createUploadDirs();

app.use(compression());
app.use(securityHeaders);
app.use(requestLogger);
app.use(rateLimit);
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/temp', express.static(tempDir));

app.use('/api', utilityRoutes);
app.use('/api', userRoutes);
app.use('/api', draftRoutes);
app.use('/api', deploymentRoutes);
app.use('/api', createProjectRoutes(upload));
app.use('/api', createPortfolioRoutes({ upload }));

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    details: `Route ${req.method} ${req.originalUrl} not found`
  });
});

app.use(errorHandler);

if (require.main === module && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    logger.success(`Portfolio Generator API running on port ${PORT}`);
    logger.info(`Temp directory: ${tempDir}`);
  });
}

module.exports = app;

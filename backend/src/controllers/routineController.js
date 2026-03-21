const multer = require('multer');
const RoutineModel = require('../models/routineModel.js');
const cloudinary = require('../utils/cloudinary.js');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

class RoutineController {
    constructor() {
        this.routineModel = new RoutineModel();
    }

    uploadMiddleware = upload.single('file');

    isAdmin = (user) => {
        if (process.env.BYPASS === 'true') return true;
        const normalizedRole = String(user?.role || '').toLowerCase();
        return normalizedRole === 'admin' || normalizedRole === 'system';
    }

    uploadRoutine = async (req, res) => {
        try {
            if (!this.isAdmin(req.user)) {
                return res.status(403).json({ error: 'Only system/admin users can upload routines.' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'PDF file is required.' });
            }

            const isPdf = req.file.mimetype === 'application/pdf';
            if (!isPdf) {
                return res.status(400).json({ error: 'Only PDF files are allowed.' });
            }

            const hasCloudinaryConfig =
                Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
                Boolean(process.env.CLOUDINARY_API_KEY) &&
                Boolean(process.env.CLOUDINARY_API_SECRET);

            if (!hasCloudinaryConfig) {
                return res.status(500).json({
                    error: 'Cloudinary is not configured in backend .env.',
                });
            }

            const uploaded = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'university/routines',
                        resource_type: 'auto',
                        overwrite: true,
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );

                uploadStream.end(req.file.buffer);
            });

            if (!uploaded?.secure_url) {
                return res.status(500).json({ error: 'Cloudinary upload did not return a URL.' });
            }

            const saved = await this.routineModel.replaceRoutine(uploaded.secure_url);

            return res.status(200).json({
                message: 'Routine uploaded successfully.',
                routine: saved,
            });
        } catch (error) {
            console.error('Upload routine error:', error);
            if (error?.code === '42P01') {
                return res.status(500).json({
                    error: 'Database table routine does not exist. Run table creation first.',
                });
            }

            if (error?.http_code) {
                return res.status(502).json({
                    error: `Cloudinary upload failed: ${error.message || 'Unknown error'}`,
                });
            }

            return res.status(500).json({ error: error?.message || 'Failed to upload routine.' });
        }
    }

    getCurrentRoutine = async (req, res) => {
        try {
            const currentRoutine = await this.routineModel.getCurrentRoutine();
            return res.status(200).json({ routine: currentRoutine });
        } catch (error) {
            console.error('Get current routine error:', error);
            return res.status(500).json({ error: 'Failed to fetch routine.' });
        }
    }
}

module.exports = RoutineController;

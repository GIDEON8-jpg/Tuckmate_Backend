const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

module.exports = {
    /**
     * Generate a random string of specified length
     * @param {number} length - Length of the string to generate
     * @returns {string} Random string
     */
    generateRandomString(length = 32) {
        return crypto
            .randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    },

    /**
     * Create a SHA-256 hash of data with optional salt
     * @param {string} data - Data to hash
     * @param {string} [salt] - Optional salt
     * @returns {string} Hashed string
     */
    createHash(data, salt = '') {
        const hash = crypto.createHash('sha256');
        hash.update(data + salt);
        return hash.digest('hex');
    },

    /**
     * Generate JWT token
     * @param {object} payload - Data to include in token
     * @param {string} [expiresIn] - Token expiration time
     * @returns {string} JWT token
     */
    generateJWT(payload, expiresIn = config.jwt.expiresIn) {
        return jwt.sign(payload, config.jwt.secret, { expiresIn });
    },

    /**
     * Verify JWT token
     * @param {string} token - JWT token to verify
     * @returns {object} Decoded token payload
     */
    verifyJWT(token) {
        return jwt.verify(token, config.jwt.secret);
    },

    /**
     * Format currency amount
     * @param {number} amount - Amount to format
     * @param {string} [currency='USD'] - Currency code
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2
        }).format(amount);
    },

    /**
     * Format date to readable string
     * @param {Date|string} date - Date to format
     * @param {string} [locale='en-US'] - Locale string
     * @returns {string} Formatted date
     */
    formatDate(date, locale = 'en-US') {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(date).toLocaleDateString(locale, options);
    },

    /**
     * Generate a unique filename with extension
     * @param {string} originalName - Original filename
     * @param {string} [prefix='file'] - Prefix for the filename
     * @returns {string} Unique filename
     */
    generateUniqueFilename(originalName, prefix = 'file') {
        const ext = path.extname(originalName);
        const timestamp = Date.now();
        const randomStr = this.generateRandomString(8);
        return `${prefix}_${timestamp}_${randomStr}${ext}`;
    },

    /**
     * Paginate database query results
     * @param {object} query - Sequelize query options
     * @param {number} [page=1] - Current page number
     * @param {number} [limit=10] - Items per page
     * @returns {object} Modified query with pagination
     */
    paginate(query, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        return {
            ...query,
            limit,
            offset,
            meta: {
                currentPage: page,
                perPage: limit,
                previousPage: page > 1 ? page - 1 : null,
                nextPage: null // Will be set after query execution
            }
        };
    },

    /**
     * Build pagination metadata
     * @param {object} result - Sequelize query result
     * @param {object} query - Query options with meta
     * @param {number} totalCount - Total items count
     * @returns {object} Pagination metadata
     */
    buildPaginationMeta(result, query, totalCount) {
        const meta = query.meta || {};
        const totalPages = Math.ceil(totalCount / query.limit);

        return {
            ...meta,
            totalItems: totalCount,
            totalPages,
            nextPage: meta.currentPage < totalPages ? meta.currentPage + 1 : null,
            hasMore: meta.currentPage < totalPages
        };
    },

    /**
     * Validate Zimbabwean phone number (EcoCash compatible)
     * @param {string} phone - Phone number to validate
     * @returns {boolean} True if valid
     */
    isValidZimPhone(phone) {
        return /^(?:\+263|0)(77|78|71|73)\d{7}$/.test(phone);
    },

    /**
     * Normalize phone number to +263 format
     * @param {string} phone - Phone number to normalize
     * @returns {string} Normalized phone number
     */
    normalizeZimPhone(phone) {
        if (!phone) return '';
        // Remove all non-digit characters
        const cleaned = phone.replace(/\D/g, '');

        if (cleaned.startsWith('0') && cleaned.length === 10) {
            return `+263${cleaned.substring(1)}`;
        }
        if (cleaned.startsWith('263') && cleaned.length === 12) {
            return `+${cleaned}`;
        }
        return phone; // Return original if format not recognized
    },

    /**
     * Async sleep/delay function
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Remove sensitive fields from object
     * @param {object} obj - Source object
     * @param {string[]} fields - Fields to remove
     * @returns {object} Sanitized object
     */
    sanitizeObject(obj, fields = ['password', 'token', 'refreshToken']) {
        if (!obj) return obj;
        const result = { ...obj };
        fields.forEach(field => {
            delete result[field];
        });
        return result;
    },

    /**
     * Generate order reference number
     * @returns {string} Unique order reference
     */
    generateOrderReference() {
        const date = new Date();
        const timestamp = date.getTime();
        const random = Math.floor(Math.random() * 1000);
        return `TUCK-${date.getFullYear()}${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}${timestamp.toString().slice(-6)}${random
            .toString()
            .padStart(3, '0')}`;
    },

    /**
     * Calculate order total from items
     * @param {array} items - Array of order items
     * @returns {number} Calculated total
     */
    calculateOrderTotal(items) {
        return items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    },

    /**
     * Read JSON file (async)
     * @param {string} filePath - Path to JSON file
     * @returns {Promise<object>} Parsed JSON content
     */
    async readJsonFile(filePath) {
        const data = await readFileAsync(filePath, 'utf8');
        return JSON.parse(data);
    },

    /**
     * Write JSON file (async)
     * @param {string} filePath - Path to JSON file
     * @param {object} data - Data to write
     * @returns {Promise<void>}
     */
    async writeJsonFile(filePath, data) {
        const json = JSON.stringify(data, null, 2);
        await writeFileAsync(filePath, json, 'utf8');
    },

    /**
     * Convert object to query string
     * @param {object} params - Object to convert
     * @returns {string} Query string
     */
    objectToQueryString(params) {
        return Object.entries(params)
            .map(([key, value]) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
            )
            .join('&');
    },

    /**
     * Generate a verification code (e.g., for email verification)
     * @param {number} [length=6] - Code length
     * @returns {string} Numeric verification code
     */
    generateVerificationCode(length = 6) {
        const digits = '0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += digits[Math.floor(Math.random() * digits.length)];
        }
        return code;
    },

    /**
     * Create a slug from string
     * @param {string} str - String to slugify
     * @returns {string} Slugified string
     */
    slugify(str) {
        return str
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    /**
     * Truncate text with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncate(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return `${text.substring(0, maxLength - 3)}...`;
    },

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Get current timestamp in ISO format
     * @returns {string} ISO timestamp
     */
    getCurrentTimestamp() {
        return new Date().toISOString();
    },

    /**
     * Generate a UUID v4
     * @returns {string} UUID
     */
    generateUUID() {
        return crypto.randomUUID();
    }
};
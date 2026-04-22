const crypto = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(crypto.scrypt);

const TOKEN_ALGORITHM = "sha256";
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_LENGTH = 16;
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const toBase64Url = (input) => {
    const value = Buffer.isBuffer(input) ? input.toString("base64") : Buffer.from(input).toString("base64");
    return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (input) => {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    return Buffer.from(base64 + padding, "base64");
};

const signValue = (secret, value) => {
    return toBase64Url(
        crypto.createHmac(TOKEN_ALGORITHM, secret).update(value).digest()
    );
};

const safeCompare = (left, right) => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const hashPassword = async (plainPassword) => {
    const salt = crypto.randomBytes(PASSWORD_SALT_LENGTH).toString("hex");
    const derivedKey = await scryptAsync(plainPassword, salt, PASSWORD_KEY_LENGTH);
    return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
};

const verifyPassword = async (plainPassword, storedPassword) => {
    const [salt, originalHash] = (storedPassword || "").split(":");
    if (!salt || !originalHash) {
        return false;
    }

    const derivedKey = await scryptAsync(plainPassword, salt, PASSWORD_KEY_LENGTH);
    return safeCompare(Buffer.from(derivedKey).toString("hex"), originalHash);
};

const signToken = (payload, secret, expiresInSeconds = DEFAULT_TOKEN_TTL_SECONDS) => {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const encodedHeader = toBase64Url(JSON.stringify(header));
    const encodedPayload = toBase64Url(JSON.stringify(tokenPayload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const signature = signValue(secret, unsignedToken);

    return `${unsignedToken}.${signature}`;
};

const verifyToken = (token, secret) => {
    if (!token || !secret) {
        return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
        return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = signValue(secret, unsignedToken);

    if (!safeCompare(signature, expectedSignature)) {
        return null;
    }

    try {
        const header = JSON.parse(fromBase64Url(encodedHeader).toString("utf-8"));
        if (header.alg !== "HS256") {
            return null;
        }

        const payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf-8"));
        if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return payload;
    } catch (error) {
        return null;
    }
};

module.exports = {
    DEFAULT_TOKEN_TTL_SECONDS,
    hashPassword,
    verifyPassword,
    signToken,
    verifyToken
};

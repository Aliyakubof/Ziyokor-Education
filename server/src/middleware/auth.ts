import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'ziyokor_fallback_secret';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        name: string;
        phone: string;
        role: string;
    };
}

export function generateToken(payload: any) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies.ziyokor_token;
    if (!token) return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan (No token)' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Sessiya muddati tugagan yoki noto\'g\'ri token' });
    }
};

export function requireRole(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const token = req.cookies.ziyokor_token;

        if (!token) {
            return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan (No token)' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            req.user = decoded;

            if (roles.length > 0 && !roles.includes(decoded.role)) {
                console.warn(`[Auth] 403 Forbidden: User role '${decoded.role}' not in allowed roles [${roles.join(', ')}] for path ${req.path}`);
                return res.status(403).json({ error: 'Ruxsat yo\'q (Forbidden)' });
            }

            next();
        } catch (err) {
            return res.status(401).json({ error: 'Sessiya muddati tugagan yoki noto\'g\'ri token' });
        }
    };
}

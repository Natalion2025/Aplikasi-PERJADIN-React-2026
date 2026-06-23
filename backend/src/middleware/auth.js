// Middleware untuk proteksi rute API di backend

const isApiAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ message: 'Akses ditolak. Sesi tidak valid atau telah berakhir.' });
    }
};

const isApiAdminOrSuperAdmin = (req, res, next) => {
    if (req.session && req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        next();
    } else {
        res.status(403).json({ message: 'Akses Ditolak: Hanya untuk Administrator.' });
    }
};

const isSuperAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Akses Ditolak: Hanya untuk Super Admin.' });
    }
};

module.exports = {
    isApiAuthenticated,
    isApiAdminOrSuperAdmin,
    isSuperAdmin
};

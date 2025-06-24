"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.post('/login', authController_1.login);
router.use(auth_1.protect);
router.get('/me', authController_1.getMe);
router.put('/profile', authController_1.updateProfile);
router.put('/change-password', authController_1.changePassword);
router.post('/logout', authController_1.logout);
router.post('/register', (0, auth_1.restrictTo)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), authController_1.register);
exports.default = router;
//# sourceMappingURL=auth.js.map
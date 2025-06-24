"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.use((0, auth_1.checkModuleAccess)('user_management'));
router.get('/stats', (0, auth_1.restrictTo)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), userController_1.getUserStats);
router.route('/')
    .get((0, auth_1.checkPermission)('read'), userController_1.getUsers)
    .post((0, auth_1.restrictTo)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, auth_1.checkPermission)('write'), userController_1.createUser);
router.route('/:id')
    .get((0, auth_1.checkPermission)('read'), userController_1.getUser)
    .put((0, auth_1.restrictTo)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, auth_1.checkPermission)('write'), userController_1.updateUser)
    .delete((0, auth_1.restrictTo)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, auth_1.checkPermission)('delete'), userController_1.deleteUser);
router.put('/:id/reset-password', (0, auth_1.restrictTo)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.ADMIN), (0, auth_1.checkPermission)('write'), userController_1.resetPassword);
exports.default = router;
//# sourceMappingURL=users.js.map
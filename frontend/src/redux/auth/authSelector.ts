// import { createSelector } from '@reduxjs/toolkit';
// import type { RootState } from '../store';

// export const selectAuth = (state: RootState) => state.auth;

// export const selectUser = createSelector(
//   [selectAuth],
//   (auth) => auth.user
// );

// export const selectIsAuthenticated = createSelector(
//   [selectUser],
//   (user) => user !== null
// );

// export const selectToken = createSelector(
//   [selectUser],
//   (user) => user?.token || null
// );

// export const selectUsername = createSelector(
//   [selectUser],
//   (user) => user?.username || null
// );

// export const selectUserRole = createSelector(
//   [selectUser],
//   (user) => user?.role || null
// );

// export const selectHasRole = (role: string) =>
//   createSelector(
//     [selectUserRole],
//     (userRole) => userRole === role
//   );

// export const selectIsAdmin = createSelector(
//   [selectUserRole],
//   (userRole) => userRole === 'admin'
// );

// export const selectIsManager = createSelector(
//   [selectUserRole],
//   (userRole) => userRole === 'manager'
// );

// export const selectIsEmployee = createSelector(
//   [selectUserRole],
//   (userRole) => userRole === 'employee'
// );

// export const selectHasAnyRole = (roles: string[]) =>
//   createSelector(
//     [selectUserRole],
//     (userRole) => userRole && roles.includes(userRole)
//   );

// export const selectUserForAPI = createSelector(
//   [selectUser],
//   (user) => {
//     if (!user) return null;
//     return {
//       username: user.username,
//       role: user.role,
//       token: user.token,
//     };
//   }
// );

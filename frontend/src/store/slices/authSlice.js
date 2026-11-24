import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { clearCsrfToken, fetchCurrentUser, login, logout } from '../../services/api';

const SIGN_IN_ERROR = 'Sign in failed. Check your credentials and try again.';

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  try {
    return await fetchCurrentUser();
  } catch {
    return rejectWithValue(null);
  }
});

export const loginUser = createAsyncThunk('auth/loginUser', async (credentials, { rejectWithValue }) => {
  try {
    return await login(credentials);
  } catch {
    return rejectWithValue(SIGN_IN_ERROR);
  }
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  try {
    await logout();
  } catch {
    // Clear the local session even if the server call fails.
  } finally {
    clearCsrfToken();
  }
});

const initialState = { user: null, status: 'idle', error: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => { state.error = null; },
    sessionExpired: (state) => {
      state.user = null;
      state.status = 'unauthenticated';
      state.error = 'Your session expired. Please sign in again.';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => { state.status = 'checking'; state.error = null; })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload ?? null;
        state.status = state.user ? 'authenticated' : 'unauthenticated';
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      })
      .addCase(loginUser.pending, (state) => { state.status = 'pending'; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload ?? null;
        state.status = state.user ? 'authenticated' : 'unauthenticated';
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.user = null;
        state.status = 'unauthenticated';
        state.error = action.payload || SIGN_IN_ERROR;
      })
      .addCase(logoutUser.pending, (state) => { state.status = 'pending'; })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
        state.error = null;
      });
  },
});

export const { clearAuthError, sessionExpired } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.error;
export const selectRole = (state) => state.auth.user?.role ?? null;
export const selectIsViewer = (state) => selectRole(state) === 'viewer';

export default authSlice.reducer;

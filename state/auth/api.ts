import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import * as authAPI from '@/api/auth'
import { setCredentials, setVerifyId, updateTokens, logout } from './slice'
import { cartApi } from '@/state/cart/api'
import { listingApi } from '@/state/listing/api'
import type {
  SignInInput,
  SignUpInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  SetPasswordInput,
  ResendOtpInput,
  SocialSignInInput,
  SignInResponse,
  SignUpResponse,
  VerifyOtpResponse,
  ForgotPasswordResponse,
  ResendOtpResponse,
  UserTokens,
} from '@/types/auth.types'

// Minimal local type — avoids circular dependency with store.ts
interface LocalState {
  auth: { authKey: string; refreshKey: string; tokenSetAt: number | null }
  app: { currency: string; language: string }
}

const ONE_HOUR_MS = 60 * 60 * 1000

const getLocale = (state: LocalState) => ({
  currency: state.app.currency,
  language: state.app.language,
})

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as LocalState).auth.authKey
      if (token) headers.set('x-auth-key', token)
      return headers
    },
  }),
  endpoints: (builder) => ({

    // result.data → { user: User }
    signIn: builder.mutation<SignInResponse, SignInInput>({
      queryFn: async (input, { dispatch, getState }) => {
        const { currency, language } = getLocale(getState() as LocalState)
        try {
          const res = await authAPI.signIn(input, currency, language)
          if (res?.error)
            return { error: { status: 'CUSTOM_ERROR', error: res.error.message ?? 'Sign in failed' } }
          const user = res.data!.user
          dispatch(setCredentials(user))
          // Invalidate guest cache — authKey changed, need fresh user-specific data
          dispatch(cartApi.util.invalidateTags(['Cart']))
          dispatch(listingApi.util.invalidateTags(['Listing']))
          return { data: { user } }
        } catch (err) {
          return { error: { status: 'CUSTOM_ERROR', error: (err as Error).message } }
        }
      },
    }),

    // result.data → { verify_id: string }
    signUp: builder.mutation<SignUpResponse, SignUpInput>({
      queryFn: async (input, { dispatch, getState }) => {
        const { currency, language } = getLocale(getState() as LocalState)
        try {
          const res = await authAPI.signUp(input, currency, language)
          if (res?.error)
            return { error: { status: 'CUSTOM_ERROR', error: res.error.message ?? 'Sign up failed' } }
          const { verify_id } = res.data!
          dispatch(setVerifyId(verify_id))
          return { data: { verify_id } }
        } catch (err) {
          return { error: { status: 'CUSTOM_ERROR', error: (err as Error).message } }
        }
      },
    }),

    // result.data → { user: User }
    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpInput>({
      queryFn: async (input, { dispatch, getState }) => {
        const { currency, language } = getLocale(getState() as LocalState)
        try {
          const res = await authAPI.verifyOtp(input, currency, language)
          if (res?.error)
            return { error: { status: 'CUSTOM_ERROR', error: res.error.message ?? 'Verification failed' } }
          const user = res.data!.user
          dispatch(setCredentials(user))
          // Invalidate guest cache — authKey changed, need fresh user-specific data
          dispatch(cartApi.util.invalidateTags(['Cart']))
          dispatch(listingApi.util.invalidateTags(['Listing']))
          return { data: { user } }
        } catch (err) {
          return { error: { status: 'CUSTOM_ERROR', error: (err as Error).message } }
        }
      },
    }),

    // result.data → { verify_id: string }
    forgotPassword: builder.mutation<ForgotPasswordResponse, ForgotPasswordInput>({
      queryFn: async (input, { getState }) => {
        const { currency, language } = getLocale(getState() as LocalState)
        try {
          const res = await authAPI.forgotPassword(input, currency, language)
          if (res?.error)
            return { error: { status: 'CUSTOM_ERROR', error: res.error.message ?? 'Request failed' } }
          return { data: { verify_id: res.data!.verify_id } }
        } catch (err) {
          return { error: { status: 'CUSTOM_ERROR', error: (err as Error).message } }
        }
      },
    }),

    // result.data → void
    setPassword: builder.mutation<void, SetPasswordInput>({
      queryFn: async (input, { getState }) => {
        const { currency, language } = getLocale(getState() as LocalState)
        try {
          const res = await authAPI.setPassword(input, currency, language)
          if (res?.error)
            return { error: { status: 'CUSTOM_ERROR', error: res.error.message ?? 'Password reset failed' } }
          return { data: undefined }
        } catch (err) {
          return { error: { status: 'CUSTOM_ERROR', error: (err as Error).message } }
        }
      },
    }),

    // result.data → { verify_id: string }
    resendOtp: builder.mutation<ResendOtpResponse, ResendOtpInput>({
      queryFn: async (input, { dispatch, getState }) => {
        const { currency, language } = getLocale(getState() as LocalState)
        try {
          const res = await authAPI.resendOtp(input, currency, language)
          if (res?.error)
            return { error: { status: 'CUSTOM_ERROR', error: res.error.message ?? 'Resend failed' } }
          const { verify_id } = res.data!
          dispatch(setVerifyId(verify_id))
          return { data: { verify_id } }
        } catch (err) {
          return { error: { status: 'CUSTOM_ERROR', error: (err as Error).message } }
        }
      },
    }),

    // result.data → { user: User }
    socialSignIn: builder.mutation<SignInResponse, SocialSignInInput>({
      queryFn: async (input, { dispatch, getState }) => {
        const { currency, language } = getLocale(getState() as LocalState)
        try {
          const res = await authAPI.socialSignIn(input, currency, language)
          if (res?.error)
            return { error: { status: 'CUSTOM_ERROR', error: res.error.message ?? 'Social sign in failed' } }
          const user = res.data!.user
          dispatch(setCredentials(user))
          // Invalidate guest cache — authKey changed, need fresh user-specific data
          dispatch(cartApi.util.invalidateTags(['Cart']))
          dispatch(listingApi.util.invalidateTags(['Listing']))
          return { data: { user } }
        } catch (err) {
          return { error: { status: 'CUSTOM_ERROR', error: (err as Error).message } }
        }
      },
    }),

    refreshAuth: builder.mutation<UserTokens, void>({
      queryFn: async (_arg, { dispatch, getState }) => {
        const state = getState() as LocalState
        const { authKey, refreshKey, tokenSetAt } = state.auth

        // tokenSetAt is null on first load (forced refresh) — explicit null check avoids NaN
        if (authKey && tokenSetAt !== null && Date.now() - tokenSetAt < ONE_HOUR_MS)
          return { data: { auth_key: authKey, refresh_key: refreshKey } }

        if (!refreshKey) {
          dispatch(logout())
          dispatch(cartApi.util.resetApiState())
          dispatch(listingApi.util.resetApiState())
          return { error: { status: 'CUSTOM_ERROR', error: 'No refresh key' } }
        }

        try {
          const res = await authAPI.refreshAuth(refreshKey)
          // SDK returns { status: true, data: { auth_key, refresh_key } } on success
          // or { error: { code, message } } / falsy status on failure
          if (!res?.status || res?.error) {
            dispatch(logout())
            dispatch(cartApi.util.resetApiState())
            dispatch(listingApi.util.resetApiState())
            return { error: { status: 'CUSTOM_ERROR', error: (res as any)?.error?.message ?? 'Token refresh failed' } }
          }
          const tokens: UserTokens = {
            auth_key: res.data?.auth_key ?? '',
            refresh_key: res.data?.refresh_key ?? '',
            ...(res.data?.firebase_token ? { firebase_token: res.data.firebase_token } : {}),
          }
          dispatch(updateTokens(tokens))
          return { data: tokens }
        } catch (err) {
          dispatch(logout())
          dispatch(cartApi.util.resetApiState())
          dispatch(listingApi.util.resetApiState())
          return { error: { status: 'CUSTOM_ERROR', error: (err as Error).message } }
        }
      },
    }),

  }),
})

export const {
  useSignInMutation,
  useSignUpMutation,
  useVerifyOtpMutation,
  useForgotPasswordMutation,
  useSetPasswordMutation,
  useResendOtpMutation,
  useSocialSignInMutation,
  useRefreshAuthMutation,
} = authApi

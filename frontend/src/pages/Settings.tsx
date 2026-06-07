import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { googleAuth, syncAll, userPrefs } from '../api/client'
import type { UserPreference } from '../types/health'

export default function SettingsPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const justConnected = searchParams.get('google_connected') === '1'
  const googleError   = searchParams.get('google_error')

  const { data: prefs } = useQuery({ queryKey: ['user-prefs'], queryFn: userPrefs.get, retry: false })
  const prefsMutation = useMutation({
    mutationFn: userPrefs.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-prefs'] })
      qc.invalidateQueries({ queryKey: ['lab-types'] })
    },
  })


  const { data: cred, isLoading } = useQuery({
    queryKey: ['google-status'],
    queryFn: googleAuth.status,
    retry: false,
  })

  const disconnectMutation = useMutation({
    mutationFn: googleAuth.disconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['google-status'] }),
  })

  const syncMutation = useMutation({
    mutationFn: syncAll,
    onSuccess: () => qc.invalidateQueries(),
  })

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold">Profile</h2>
        <div>
          <label className="label">
            Biological Sex <span className="text-gray-400 font-normal">(used for lab reference ranges)</span>
          </label>
          <div className="flex gap-2 mt-1">
            {(['unset', 'male', 'female'] as UserPreference['gender'][]).map((g) => (
              <button
                key={g}
                onClick={() => prefsMutation.mutate({ ...prefs!, gender: g })}
                disabled={prefsMutation.isPending || !prefs}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  prefs?.gender === g
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {g === 'unset' ? 'Not set' : g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
          {prefsMutation.isSuccess && (
            <p className="text-xs text-green-600 mt-1">Saved</p>
          )}
        </div>
      </div>

      {/* Display Units */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold">Display Units</h2>

        <div>
          <label className="label">
            Lab Results <span className="text-gray-400 font-normal">(cholesterol, glucose, uric acid)</span>
          </label>
          <div className="flex gap-2 mt-1">
            {(['mg_dl', 'mmol'] as UserPreference['lab_unit'][]).map((u) => (
              <button
                key={u}
                onClick={() => prefsMutation.mutate({ ...prefs!, lab_unit: u })}
                disabled={prefsMutation.isPending || !prefs}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  prefs?.lab_unit === u
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {u === 'mg_dl' ? 'mg/dL' : 'mmol/L'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Weight</label>
          <div className="flex gap-2 mt-1">
            {(['kg', 'lb'] as UserPreference['weight_unit'][]).map((u) => (
              <button
                key={u}
                onClick={() => prefsMutation.mutate({ ...prefs!, weight_unit: u })}
                disabled={prefsMutation.isPending || !prefs}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  prefs?.weight_unit === u
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
          {prefsMutation.isSuccess && <p className="text-xs text-green-600 mt-1">Saved</p>}
        </div>
      </div>

      {/* Google connection */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google Account
        </h2>

        {justConnected && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm">
            ✅ Successfully connected to Google!
          </div>
        )}

        {googleError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
            ❌ Connection error: {googleError}
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-400 text-sm">Checking connection…</p>
        ) : cred ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-sm">
                {cred.user_name?.[0] ?? cred.user_email[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{cred.user_name ?? cred.user_email}</p>
                <p className="text-xs text-gray-500">{cred.user_email}</p>
              </div>
              <span className="ml-auto badge-success">Connected</span>
            </div>

            {cred.sheets_spreadsheet_id && (
              <p className="text-sm text-gray-600">
                📊 Spreadsheet:{' '}
                <a
                  href={`https://docs.google.com/spreadsheets/d/${cred.sheets_spreadsheet_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open in Google Sheets
                </a>
              </p>
            )}

            <div className="flex gap-3">
              <button
                className="btn-primary"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? '⏳ Syncing…' : '↑ Sync All Data Now'}
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (confirm('Disconnect Google account? Your local data will be kept.')) {
                    disconnectMutation.mutate()
                  }
                }}
                disabled={disconnectMutation.isPending}
              >
                Disconnect
              </button>
            </div>

            {syncMutation.isSuccess && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">
                <p className="font-medium">Sync complete!</p>
                <p className="text-xs mt-1">
                  Health — Weight: {syncMutation.data?.google_health.body_metrics},
                  Vitals: {syncMutation.data?.google_health.vital_signs},
                  Labs: {syncMutation.data?.google_health.lab_results},
                  Errors: {syncMutation.data?.google_health.errors}
                </p>
                <p className="text-xs">
                  Sheets — Weight: {syncMutation.data?.google_sheets.body_metrics},
                  Vitals: {syncMutation.data?.google_sheets.vital_signs},
                  Labs: {syncMutation.data?.google_sheets.lab_results},
                  Errors: {syncMutation.data?.google_sheets.errors}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Connect your Google account to sync health data to Google Health and Google Sheets.
            </p>
            <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
              <li><strong>Google Health</strong> — weight, heart rate, blood glucose</li>
              <li><strong>Google Sheets</strong> — all metrics including cholesterol, blood pressure, uric acid, HbA1c</li>
            </ul>
            <a
              href="/api/auth/google/login"
              className="btn-primary inline-flex"
            >
              Connect Google Account
            </a>
          </div>
        )}
      </div>

      {/* Setup instructions */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold">Setup Instructions</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p className="font-medium">To enable Google sync:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
            <li>Create a project and enable the <strong>Google Health API</strong> and <strong>Google Sheets API</strong></li>
            <li>Create OAuth 2.0 credentials (Web application type)</li>
            <li>Add <code className="bg-gray-100 px-1 rounded">http://localhost:8000/auth/google/callback</code> as an authorized redirect URI</li>
            <li>Set <code className="bg-gray-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-gray-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> in backend <code className="bg-gray-100 px-1 rounded">.env</code></li>
            <li>Restart the backend, then click "Connect Google Account" above</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

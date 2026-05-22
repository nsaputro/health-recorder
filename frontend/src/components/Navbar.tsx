import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { googleAuth } from '../api/client'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard' },
  { to: '/body-metrics', label: 'Weight' },
  { to: '/lab-results',  label: 'Lab Results' },
  { to: '/vital-signs',  label: 'Vitals' },
  { to: '/settings',     label: 'Settings' },
]

export default function Navbar() {
  const { data: gCred } = useQuery({
    queryKey: ['google-status'],
    queryFn: googleAuth.status,
    retry: false,
  })

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <span className="font-bold text-blue-600 text-lg flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Health Recorder
          </span>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Google status */}
          <div className="text-xs text-gray-500">
            {gCred ? (
              <span className="flex items-center gap-1 text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {gCred.user_email}
              </span>
            ) : (
              <span className="text-gray-400">Google not connected</span>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

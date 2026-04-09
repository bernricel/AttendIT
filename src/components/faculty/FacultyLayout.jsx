import { NavLink, useNavigate } from 'react-router-dom'
// 1. ADDED: Import the icons
import { FiPieChart, FiClock } from 'react-icons/fi'
import { ROUTES } from '../../constants/routes'
import { clearAuthSession, getStoredAuth } from '../../services/authStorage'
import { useResponsiveSidebar } from '../../hooks/useResponsiveSidebar'
import { getDisplayName } from '../../utils/userName'

// 2. ADDED: Icons and color classes to your existing array
const facultyNav = [
  { to: ROUTES.FACULTY_DASHBOARD, label: 'Dashboard', icon: <FiPieChart />, colorClass: 'icon-orange' },
  { to: ROUTES.FACULTY_HISTORY, label: 'Attendance History', icon: <FiClock />, colorClass: 'icon-red' },
]

export default function FacultyLayout({ title, subtitle, actions, children }) {
  const navigate = useNavigate()
  const { user } = getStoredAuth()
  const { isSidebarOpen, closeSidebar, toggleSidebar } = useResponsiveSidebar()

  const handleLogout = () => {
    clearAuthSession()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="faculty-shell">
      <div
        className={`layout-backdrop ${isSidebarOpen ? 'show' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        id="faculty-sidebar-nav"
        className={`faculty-sidebar ${isSidebarOpen ? 'is-open' : ''}`}
      >
        <div className="faculty-brand">Faculty Portal</div>
        <nav className="faculty-nav">
          {facultyNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `faculty-nav-item${isActive ? ' active' : ''}`}
              onClick={closeSidebar}
            >
              {/* 3. ADDED: The icon span right before the text */}
              <span className={`nav-icon ${item.colorClass}`}>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="faculty-main">
        <header className="faculty-topbar">
          <div className="topbar-title-wrap">
            <div className="topbar-title-row">
              <button
                type="button"
                className="sidebar-toggle"
                onClick={toggleSidebar}
                aria-label="Toggle navigation menu"
                aria-expanded={isSidebarOpen}
                aria-controls="faculty-sidebar-nav"
              >
                &#9776;
              </button>
              <h1>{title}</h1>
            </div>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="faculty-topbar-right">
            <div className="faculty-user-badge">
              <strong>{getDisplayName(user, 'Faculty')}</strong>
              <span>{user?.department || '-'}</span>
            </div>
            <button type="button" className="ghost-btn compact" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        {actions ? <div className="faculty-actions">{actions}</div> : null}
        <div className="faculty-content">{children}</div>
      </section>
    </div>
  )
}
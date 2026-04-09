import { NavLink, useNavigate } from 'react-router-dom'
// 1. ADDED: Import the icons
import { FiPieChart, FiEdit3, FiMaximize, FiGrid, FiCalendar } from 'react-icons/fi'
import { ROUTES } from '../../constants/routes'
import { clearAuthSession, getStoredAuth } from '../../services/authStorage'
import { useResponsiveSidebar } from '../../hooks/useResponsiveSidebar'
import { getDisplayName } from '../../utils/userName'

// 2. ADDED: Icons and color classes to your existing array
const navItems = [
  { to: ROUTES.ADMIN_DASHBOARD, label: 'Dashboard', icon: <FiPieChart />, colorClass: 'icon-orange' },
  { to: ROUTES.ADMIN_CREATE_SESSION, label: 'Create Session', icon: <FiEdit3 />, colorClass: 'icon-yellow' },
  { to: ROUTES.ADMIN_QR_DISPLAY, label: 'QR Display', icon: <FiMaximize />, colorClass: 'icon-cyan' },
  { to: ROUTES.ADMIN_LOGS, label: 'Attendance Logs', icon: <FiGrid />, colorClass: 'icon-magenta' },
  { to: ROUTES.ADMIN_CALENDAR, label: 'Calendar', icon: <FiCalendar />, colorClass: 'icon-purple' },
]

export default function AdminLayout({ title, subtitle, actions, children }) {
  const navigate = useNavigate()
  const { user } = getStoredAuth()
  const { isSidebarOpen, closeSidebar, toggleSidebar } = useResponsiveSidebar()

  const handleLogout = () => {
    clearAuthSession()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="admin-shell">
      <div
        className={`layout-backdrop ${isSidebarOpen ? 'show' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside id="admin-sidebar-nav" className={`admin-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-brand">Faculty Attendance</div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
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

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-title-wrap">
            <div className="topbar-title-row">
              <button
                type="button"
                className="sidebar-toggle"
                onClick={toggleSidebar}
                aria-label="Toggle navigation menu"
                aria-expanded={isSidebarOpen}
                aria-controls="admin-sidebar-nav"
              >
                &#9776;
              </button>
              <h1>{title}</h1>
            </div>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="admin-topbar-right">
            <div className="admin-user-badge">
              <strong>{getDisplayName(user, 'Administrator')}</strong>
              <span>{user?.email}</span>
            </div>
            <button type="button" className="ghost-btn compact" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {actions ? <div className="admin-actions">{actions}</div> : null}
        <div className="admin-content">{children}</div>
      </section>
    </div>
  )
}
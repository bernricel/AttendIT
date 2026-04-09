import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import { clearAuthSession, getStoredAuth } from "../../services/authStorage";
import { useResponsiveSidebar } from "../../hooks/useResponsiveSidebar";
import { getDisplayName } from "../../utils/userName";
import { ROUTES } from "../../constants/routes";

// Branding asset path. If missing, place your logo at `public/citcls-logo.png`.
const citclsLogo = "/citcls-logo.png";

export default function DashboardLayout({
  variant,
  sidebarId,
  brandSubtitle,
  defaultMeta,
  navItems,
  fallbackUserLabel,
  userSubtitleResolver,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = getStoredAuth();
  const [pageMeta, setPageMeta] = useState(defaultMeta);
  const { isMobileViewport, isSidebarOpen, closeSidebar, toggleSidebar } =
    useResponsiveSidebar();

  const shellClassName = `${variant}-shell`;
  const sidebarClassName = `${variant}-sidebar`;
  const brandClassName = `${variant}-brand`;
  const navClassName = `${variant}-nav`;
  const navItemClassName = `${variant}-nav-item`;
  const mainClassName = `${variant}-main`;
  const topbarClassName = `${variant}-topbar`;
  const topbarRightClassName = `${variant}-topbar-right`;
  const userBadgeClassName = `${variant}-user-badge`;

  const userSubtitle = useMemo(
    () => userSubtitleResolver(user),
    [user, userSubtitleResolver],
  );

  const handleLogout = useCallback(() => {
    clearAuthSession();
    navigate(ROUTES.LOGIN, { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (isMobileViewport) {
      closeSidebar();
    }
  }, [closeSidebar, isMobileViewport, location.pathname, location.search]);

  const outletContext = useMemo(
    () => ({
      setPageMeta,
    }),
    [],
  );

  return (
    <div className={shellClassName}>
      <div
        className={`layout-backdrop ${isSidebarOpen ? "show" : ""}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        id={sidebarId}
        className={`${sidebarClassName} ${isSidebarOpen ? "is-open" : ""}`}
      >
        <div className={brandClassName}>
          <img src={citclsLogo} alt="CITCLS logo" className="brand-logo" />
          <div className="brand-copy">
            <strong>CIT Faculty Attendance</strong>
            <span>{brandSubtitle}</span>
          </div>
        </div>
        <nav className={navClassName}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${navItemClassName}${isActive ? " active" : ""}`
              }
              onClick={closeSidebar}
            >
              <span className={`nav-icon ${item.colorClass}`}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className={mainClassName}>
        <header className={topbarClassName}>
          <div className="topbar-title-wrap">
            <div className="topbar-title-row">
              <button
                type="button"
                className="sidebar-toggle"
                onClick={toggleSidebar}
                aria-label="Toggle navigation menu"
                aria-expanded={isSidebarOpen}
                aria-controls={sidebarId}
              >
                <FiMenu />
              </button>
              <div className="topbar-branding">
                <span>CIT Faculty Attendance</span>
              </div>
            </div>
            <h1>{pageMeta.title}</h1>
            {pageMeta.subtitle ? <p>{pageMeta.subtitle}</p> : null}
          </div>

          <div className={topbarRightClassName}>
            <div className={userBadgeClassName}>
              <strong>{getDisplayName(user, fallbackUserLabel)}</strong>
              <span>{userSubtitle}</span>
            </div>
            <button
              type="button"
              className="ghost-btn compact"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {pageMeta.actions ? (
          <div className={`${variant}-actions`}>{pageMeta.actions}</div>
        ) : null}
        <div className={`${variant}-content`}>
          <div
            className="page-transition"
            key={`${location.pathname}${location.search}`}
          >
            {/*
              The shared layout stays mounted while route content swaps inside Outlet.
              This keeps sidebar/navbar persistent and only re-renders page content.
            */}
            <Outlet context={outletContext} />
          </div>
        </div>
      </section>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import { clearAuthSession, getStoredAuth } from "../../services/authStorage";
import { useResponsiveSidebar } from "../../hooks/useResponsiveSidebar";
import { getDisplayName } from "../../utils/userName";
import { ROUTES } from "../../constants/routes";
import styles from "./DashboardLayout.module.css";
import common from "../../styles/common.module.css";

// Branding asset path served from `public`.
const citLogo = "/CIT.png";

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

  const shellClassName = variant === "admin" ? styles.adminShell : styles.facultyShell;
  const sidebarClassName = variant === "admin" ? styles.adminSidebar : styles.facultySidebar;
  const brandClassName = variant === "admin" ? styles.adminBrand : styles.facultyBrand;
  const navClassName = variant === "admin" ? styles.adminNav : styles.facultyNav;
  const navItemClassName = variant === "admin" ? styles.adminNavItem : styles.facultyNavItem;
  const mainClassName = variant === "admin" ? styles.adminMain : styles.facultyMain;
  const topbarClassName = variant === "admin" ? styles.adminTopbar : styles.facultyTopbar;
  const topbarRightClassName = variant === "admin" ? styles.adminTopbarRight : styles.facultyTopbarRight;
  const userBadgeClassName = variant === "admin" ? styles.adminUserBadge : styles.facultyUserBadge;
  const actionClassName = variant === "admin" ? styles.adminActions : styles.facultyActions;
  const contentClassName = variant === "admin" ? styles.adminContent : styles.facultyContent;

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
        className={`${styles.layoutBackdrop} ${isSidebarOpen ? styles.show : ""}`.trim()}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        id={sidebarId}
        className={`${sidebarClassName} ${isSidebarOpen ? styles.isOpen : ""}`}
      >
        <div className={brandClassName}>
          <img src={citLogo} alt="CIT logo" className={styles.brandLogo} />
          <div className={styles.brandCopy}>
            <strong>AttendIT</strong>
            <span>{brandSubtitle}</span>
          </div>
        </div>
        <nav className={navClassName}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${navItemClassName} ${isActive ? styles.active : ""}`
              }
              onClick={closeSidebar}
            >
              <span className={`${styles.navIcon} ${styles[item.colorClass] || ""}`}>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className={mainClassName}>
        <header className={topbarClassName}>
          <div className={styles.topbarTitleWrap}>
            <div className={styles.topbarTitleRow}>
              <button
                type="button"
                className={styles.sidebarToggle}
                onClick={toggleSidebar}
                aria-label="Toggle navigation menu"
                aria-expanded={isSidebarOpen}
                aria-controls={sidebarId}
              >
                <FiMenu />
              </button>
              <div className={styles.topbarBranding}>
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
              className={`${common.ghostBtn} ${common.compact}`.trim()}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {pageMeta.actions ? (
          <div className={actionClassName}>{pageMeta.actions}</div>
        ) : null}
        <div className={contentClassName}>
          <div
            className={styles.pageTransition}
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

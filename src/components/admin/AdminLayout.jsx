import {
  // FiCalendar,
  FiEdit3,
  FiGrid,
  FiMaximize,
  FiPieChart,
} from "react-icons/fi";
import DashboardLayout from "../layout/DashboardLayout";
import { ROUTES } from "../../constants/routes";

const adminNavItems = [
  {
    to: ROUTES.ADMIN_DASHBOARD,
    label: "Dashboard",
    icon: <FiPieChart />,
    colorClass: "iconOrange",
  },
  {
    to: ROUTES.ADMIN_CREATE_SESSION,
    label: "Create Session",
    icon: <FiEdit3 />,
    colorClass: "iconYellow",
  },
  {
    to: ROUTES.ADMIN_QR_DISPLAY,
    label: "QR Display",
    icon: <FiMaximize />,
    colorClass: "iconCyan",
  },
  {
    to: ROUTES.ADMIN_LOGS,
    label: "Attendance Logs",
    icon: <FiGrid />,
    colorClass: "iconMagenta",
  },
  // { to: ROUTES.ADMIN_CALENDAR, label: 'Calendar', icon: <FiCalendar />, colorClass: 'iconPurple' },
];

export default function AdminLayout() {
  return (
    <DashboardLayout
      variant="admin"
      sidebarId="admin-sidebar-nav"
      brandSubtitle="Administrator Portal"
      navItems={adminNavItems}
      fallbackUserLabel="Administrator"
      userSubtitleResolver={(user) => user?.email || "CIT Administrator"}
      defaultMeta={{
        title: "Admin Dashboard",
        subtitle: "Overview of attendance sessions and activity today.",
      }}
    />
  );
}

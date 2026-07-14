import { FiClock, FiPieChart, FiUser } from "react-icons/fi";
import DashboardLayout from "../layout/DashboardLayout";
import { ROUTES } from "../../constants/routes";

const facultyNavItems = [
  {
    to: ROUTES.FACULTY_DASHBOARD,
    label: "Dashboard",
    icon: <FiPieChart />,
    colorClass: "iconOrange",
  },
  {
    to: ROUTES.FACULTY_PROFILE,
    label: "Profile",
    icon: <FiUser />,
    colorClass: "iconBlue",
  },
  {
    to: ROUTES.FACULTY_HISTORY,
    label: "Attendance History",
    icon: <FiClock />,
    colorClass: "iconRed",
  },
];

export default function FacultyLayout() {
  return (
    <DashboardLayout
      variant="faculty"
      sidebarId="faculty-sidebar-nav"
      brandSubtitle="Faculty Portal"
      navItems={facultyNavItems}
      fallbackUserLabel="Faculty"
      userSubtitleResolver={(user) => user?.role === "student" ? "Student" : "Faculty"}
      defaultMeta={{
        title: "Attendance Dashboard",
        subtitle: "Access your attendance actions and personal logs.",
      }}
    />
  );
}

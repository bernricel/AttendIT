import { FiClock, FiPieChart } from 'react-icons/fi'
import DashboardLayout from '../layout/DashboardLayout'
import { ROUTES } from '../../constants/routes'

const facultyNavItems = [
  { to: ROUTES.FACULTY_DASHBOARD, label: 'Dashboard', icon: <FiPieChart />, colorClass: 'iconOrange' },
  { to: ROUTES.FACULTY_HISTORY, label: 'Attendance History', icon: <FiClock />, colorClass: 'iconRed' },
]

export default function FacultyLayout() {
  return (
    <DashboardLayout
      variant="faculty"
      sidebarId="faculty-sidebar-nav"
      brandSubtitle="Faculty Portal"
      navItems={facultyNavItems}
      fallbackUserLabel="Faculty"
      userSubtitleResolver={() => 'CIT Faculty'}
      defaultMeta={{
        title: 'Faculty Dashboard',
        subtitle: 'Access your attendance actions and personal logs.',
      }}
    />
  )
}

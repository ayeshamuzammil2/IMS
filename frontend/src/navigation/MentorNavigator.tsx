import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { LayoutDashboard, GraduationCap, CalendarCheck, ShieldAlert, History, FileCheck2, Award, IdCard, GitBranch, ClipboardList, MessageCircle } from 'lucide-react-native';
import { useTheme } from '../providers/ThemeProvider';
import { DrawerContent } from './DrawerContent';
import { SharedModalStack } from './stacks/SharedModalStack';
import { makeSectionStack } from './stacks/makeSectionStack';
import { InternsScreen } from '../screens/shared/InternsScreen';
import { TeamAttendanceScreen } from '../screens/shared/TeamAttendanceScreen';
import { AttendanceReviewScreen } from '../screens/shared/AttendanceReviewScreen';
import { AttendanceHistoryScreen } from '../screens/shared/AttendanceHistoryScreen';
import { DocumentReviewScreen } from '../screens/shared/DocumentReviewScreen';
import { GithubReviewScreen } from '../screens/shared/GithubReviewScreen';
import { AssignProjectScreen } from '../screens/shared/AssignProjectScreen';
import { CertificateManagementScreen } from '../screens/shared/CertificateManagementScreen';
import { IdCardManagementScreen } from '../screens/shared/IdCardManagementScreen';
import { DashboardScreen } from '../screens/shared/DashboardScreen';
import { ChatScreen } from '../screens/shared/ChatScreen';
import type { MentorDrawerParamList } from './types';

const Drawer = createDrawerNavigator<MentorDrawerParamList & { Shared: undefined }>();

const DashboardStack = makeSectionStack('Dashboard', 'Dashboard', DashboardScreen);
const InternsStack = makeSectionStack('Interns', 'Interns', InternsScreen);
const AttendanceStack = makeSectionStack('Attendance', 'Attendance', TeamAttendanceScreen);
const AttendanceReviewStack = makeSectionStack('AttendanceReview', 'Attendance Review', AttendanceReviewScreen);
const AttendanceHistoryStack = makeSectionStack('AttendanceHistory', 'Attendance History', AttendanceHistoryScreen);
const DocumentsStack = makeSectionStack('Documents', 'Document Review', DocumentReviewScreen);
const CertificateStack = makeSectionStack('Certificate', 'Certificate', CertificateManagementScreen);
const IdCardStack = makeSectionStack('IdCard', 'ID Card', IdCardManagementScreen);
const GithubStack = makeSectionStack('GithubRepo', 'GitHub Repo Link', GithubReviewScreen);
const AssignProjectStack = makeSectionStack('AssignProject', 'Assign Project', AssignProjectScreen);
const ContactAdminStack = makeSectionStack('ContactAdmin', 'Contact Admin', ChatScreen);

export function MentorNavigator() {
  const theme = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: theme.colors.onPrimaryContainer,
        drawerInactiveTintColor: theme.colors.textSecondary,
        drawerActiveBackgroundColor: theme.colors.primaryContainer,
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardStack} options={{ drawerIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }} />
      <Drawer.Screen name="Interns" component={InternsStack} options={{ drawerIcon: ({ color, size }) => <GraduationCap color={color} size={size} /> }} />
      <Drawer.Screen name="Attendance" component={AttendanceStack} options={{ drawerIcon: ({ color, size }) => <CalendarCheck color={color} size={size} /> }} />
      <Drawer.Screen name="AttendanceReview" component={AttendanceReviewStack} options={{ title: 'Attendance Review', drawerIcon: ({ color, size }) => <ShieldAlert color={color} size={size} /> }} />
      <Drawer.Screen name="AttendanceHistory" component={AttendanceHistoryStack} options={{ title: 'Attendance History', drawerIcon: ({ color, size }) => <History color={color} size={size} /> }} />
      <Drawer.Screen name="Documents" component={DocumentsStack} options={{ title: 'Document Review', drawerIcon: ({ color, size }) => <FileCheck2 color={color} size={size} /> }} />
      <Drawer.Screen name="Certificate" component={CertificateStack} options={{ drawerIcon: ({ color, size }) => <Award color={color} size={size} /> }} />
      <Drawer.Screen name="IdCard" component={IdCardStack} options={{ title: 'ID Card', drawerIcon: ({ color, size }) => <IdCard color={color} size={size} /> }} />
      <Drawer.Screen name="GithubRepo" component={GithubStack} options={{ title: 'GitHub Repo Link', drawerIcon: ({ color, size }) => <GitBranch color={color} size={size} /> }} />
      <Drawer.Screen name="AssignProject" component={AssignProjectStack} options={{ title: 'Assign Project', drawerIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }} />
      <Drawer.Screen name="ContactAdmin" component={ContactAdminStack} options={{ title: 'Contact Admin', drawerIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} />
      <Drawer.Screen name="Shared" component={SharedModalStack} options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer.Navigator>
  );
}

import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { LayoutDashboard, Users, GraduationCap, CalendarCheck, ShieldAlert, History, FileCheck2, Building2, IdCard, Award, MessageCircle } from 'lucide-react-native';
import { useTheme } from '../providers/ThemeProvider';
import { DrawerContent } from './DrawerContent';
import { SharedModalStack } from './stacks/SharedModalStack';
import { makeSectionStack } from './stacks/makeSectionStack';
import { DepartmentsScreen } from '../screens/admin/DepartmentsScreen';
import { MentorsScreen } from '../screens/admin/MentorsScreen';
import { CertificateOversightScreen } from '../screens/admin/CertificateOversightScreen';
import { IdCardOversightScreen } from '../screens/admin/IdCardOversightScreen';
import { InternsScreen } from '../screens/shared/InternsScreen';
import { TeamAttendanceScreen } from '../screens/shared/TeamAttendanceScreen';
import { AttendanceReviewScreen } from '../screens/shared/AttendanceReviewScreen';
import { AttendanceHistoryScreen } from '../screens/shared/AttendanceHistoryScreen';
import { DocumentReviewScreen } from '../screens/shared/DocumentReviewScreen';
import { DashboardScreen } from '../screens/shared/DashboardScreen';
import { ChatScreen } from '../screens/shared/ChatScreen';
import type { AdminDrawerParamList } from './types';

const Drawer = createDrawerNavigator<AdminDrawerParamList & { Shared: undefined }>();

const DashboardStack = makeSectionStack('Dashboard', 'Dashboard', DashboardScreen);
const MentorsStack = makeSectionStack('Mentors', 'Mentors', MentorsScreen);
const InternsStack = makeSectionStack('Interns', 'Interns', InternsScreen);
const AttendanceStack = makeSectionStack('Attendance', 'Attendance', TeamAttendanceScreen);
const AttendanceReviewStack = makeSectionStack('AttendanceReview', 'Attendance Review', AttendanceReviewScreen);
const AttendanceHistoryStack = makeSectionStack('AttendanceHistory', 'Attendance History', AttendanceHistoryScreen);
const DocumentsStack = makeSectionStack('Documents', 'Document Review', DocumentReviewScreen);
const DepartmentsStack = makeSectionStack('Departments', 'Departments', DepartmentsScreen);
const IdCardsStack = makeSectionStack('IdCards', 'ID Cards', IdCardOversightScreen);
const CertificatesStack = makeSectionStack('Certificates', 'Internship Certificates', CertificateOversightScreen);
const MessagesStack = makeSectionStack('Messages', 'Messages', ChatScreen);

export function AdminNavigator() {
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
      <Drawer.Screen name="Mentors" component={MentorsStack} options={{ drawerIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Drawer.Screen name="Interns" component={InternsStack} options={{ drawerIcon: ({ color, size }) => <GraduationCap color={color} size={size} /> }} />
      <Drawer.Screen name="Attendance" component={AttendanceStack} options={{ drawerIcon: ({ color, size }) => <CalendarCheck color={color} size={size} /> }} />
      <Drawer.Screen name="AttendanceReview" component={AttendanceReviewStack} options={{ title: 'Attendance Review', drawerIcon: ({ color, size }) => <ShieldAlert color={color} size={size} /> }} />
      <Drawer.Screen name="AttendanceHistory" component={AttendanceHistoryStack} options={{ title: 'Attendance History', drawerIcon: ({ color, size }) => <History color={color} size={size} /> }} />
      <Drawer.Screen name="Documents" component={DocumentsStack} options={{ title: 'Document Review', drawerIcon: ({ color, size }) => <FileCheck2 color={color} size={size} /> }} />
      <Drawer.Screen name="Departments" component={DepartmentsStack} options={{ drawerIcon: ({ color, size }) => <Building2 color={color} size={size} /> }} />
      <Drawer.Screen name="IdCards" component={IdCardsStack} options={{ title: 'ID Cards', drawerIcon: ({ color, size }) => <IdCard color={color} size={size} /> }} />
      <Drawer.Screen name="Certificates" component={CertificatesStack} options={{ title: 'Internship Certificates', drawerIcon: ({ color, size }) => <Award color={color} size={size} /> }} />
      <Drawer.Screen name="Messages" component={MessagesStack} options={{ drawerIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} />
      <Drawer.Screen name="Shared" component={SharedModalStack} options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer.Navigator>
  );
}

import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { LayoutDashboard, Camera, FileText, IdCard, Award, GitBranch, ClipboardList } from 'lucide-react-native';
import { useTheme } from '../providers/ThemeProvider';
import { DrawerContent } from './DrawerContent';
import { SharedModalStack } from './stacks/SharedModalStack';
import { makeSectionStack } from './stacks/makeSectionStack';
import { AttendanceScreen } from '../screens/intern/AttendanceScreen';
import { DashboardScreen } from '../screens/intern/DashboardScreen';
import { DocumentsScreen } from '../screens/intern/DocumentsScreen';
import { IdCardScreen } from '../screens/intern/IdCardScreen';
import { CertificateScreen } from '../screens/intern/CertificateScreen';
import { GithubRepoScreen } from '../screens/intern/GithubRepoScreen';
import { InternshipTaskScreen } from '../screens/intern/InternshipTaskScreen';
import type { InternDrawerParamList } from './types';

const Drawer = createDrawerNavigator<InternDrawerParamList & { Shared: undefined }>();

const DashboardStack = makeSectionStack('Dashboard', 'Dashboard', DashboardScreen);
const AttendanceStack = makeSectionStack('Attendance', 'Attendance', AttendanceScreen);
const DocumentsStack = makeSectionStack('Documents', 'Documents', DocumentsScreen);
const IdCardStack = makeSectionStack('IdCard', 'ID Card', IdCardScreen);
const CertificateStack = makeSectionStack('Certificate', 'Certificate', CertificateScreen);
const GithubStack = makeSectionStack('GithubRepo', 'GitHub Repo', GithubRepoScreen);
const TaskStack = makeSectionStack('InternshipTask', 'Internship Task', InternshipTaskScreen);

export function InternNavigator() {
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
      <Drawer.Screen name="Attendance" component={AttendanceStack} options={{ drawerIcon: ({ color, size }) => <Camera color={color} size={size} /> }} />
      <Drawer.Screen name="Documents" component={DocumentsStack} options={{ drawerIcon: ({ color, size }) => <FileText color={color} size={size} /> }} />
      <Drawer.Screen name="IdCard" component={IdCardStack} options={{ title: 'ID Card', drawerIcon: ({ color, size }) => <IdCard color={color} size={size} /> }} />
      <Drawer.Screen name="Certificate" component={CertificateStack} options={{ drawerIcon: ({ color, size }) => <Award color={color} size={size} /> }} />
      <Drawer.Screen name="GithubRepo" component={GithubStack} options={{ title: 'GitHub Repo', drawerIcon: ({ color, size }) => <GitBranch color={color} size={size} /> }} />
      <Drawer.Screen name="InternshipTask" component={TaskStack} options={{ title: 'Internship Task', drawerIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }} />
      <Drawer.Screen name="Shared" component={SharedModalStack} options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer.Navigator>
  );
}

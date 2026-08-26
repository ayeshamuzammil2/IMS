// // import React, { forwardRef } from 'react';
// import { Image, View } from 'react-native';
// import ViewShot from 'react-native-view-shot';
// import { AuthImage } from './AuthImage';
// import { Text } from '../primitives/Text';
// import { useThemedStyles } from '../../theme/useThemedStyles';
// import type { AppTheme } from '../../theme/types';

// interface Props {
//   fullName: string;
//   designation: string;
//   email: string | null;
//   departmentName: string | null;
//   cardNumber: string | null;
//   emergencyContactPhone: string | null;
//   photoFileId: string | null;
// }

// export const IdCardPreview = forwardRef<ViewShot, Props>(function IdCardPreview(
//   { fullName, designation, email, departmentName, cardNumber, emergencyContactPhone, photoFileId },
//   ref,
// ) {
//   const s = useThemedStyles(makeStyles);

//   return (
//     <ViewShot ref={ref} options={{ format: 'png', quality: 1 }}>
//       <View style={s.card}>
//         <Image source={require('../../../assets/pia-logo.png')} style={s.logo} resizeMode="contain" />
//         <Text variant="overline" tone="brand" style={s.brand} numberOfLines={1}>
//           PIA Wings
//         </Text>
//         <Text variant="caption" tone="secondary" style={s.subBrand}>
//           Internee ID Card
//         </Text>

//         {photoFileId ? (
//           <AuthImage fileId={photoFileId} style={s.photo} />
//         ) : (
//           <View style={[s.photo, s.photoPlaceholder]} />
//         )}

//         <Text variant="bodyStrong" style={s.name} numberOfLines={1}>
//           {fullName}
//         </Text>
//         {designation ? (
//           <Text variant="caption" tone="secondary" numberOfLines={1}>
//             {designation}
//           </Text>
//         ) : null}
//         {email ? (
//           <Text variant="caption" style={s.email}>
//             {email}
//           </Text>
//         ) : null}
//         {departmentName ? <Text variant="caption">{departmentName}</Text> : null}
//         {cardNumber ? <Text variant="caption">ID: {cardNumber}</Text> : null}
//         {emergencyContactPhone ? <Text variant="caption">Emergency: {emergencyContactPhone}</Text> : null}
//       </View>
//     </ViewShot>
//   );
// });

// const makeStyles = (t: AppTheme) => ({
//   card: {
//     alignSelf: 'center' as const,
//     width: 260,
//     alignItems: 'center' as const,
//     backgroundColor: t.colors.successBg,
//     borderRadius: t.radii.lg,
//     borderWidth: 1,
//     borderColor: t.colors.border,
//     padding: t.spacing.lg,
//     gap: 2,
//     ...t.shadows.sm,
//   },
//   logo: { width: 64, height: 64, marginBottom: -6 },
//   brand: {
//     color: t.colors.primary,
//     fontWeight: '800' as const,
//     fontSize: 16,
//     lineHeight: 22,
//     letterSpacing: 0.3,
//   },
//   subBrand: { marginBottom: t.spacing.sm },
//   photo: {
//     width: 100,
//     height: 128,
//     borderRadius: t.radii.md,
//     borderWidth: 2,
//     borderColor: t.colors.primary,
//     marginBottom: t.spacing.sm,
//     overflow: 'hidden' as const,
//   },
//   photoPlaceholder: { width: 100, height: 128, backgroundColor: t.colors.skeleton },
//   name: { marginTop: 2 },
//   email: {
//     textAlign: 'center' as const,
//     flexShrink: 1,
//   },
// });
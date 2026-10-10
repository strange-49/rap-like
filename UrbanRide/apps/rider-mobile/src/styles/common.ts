import {
  StyleSheet,
} from 'react-native';

import { colors } from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

export const commonStyles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      padding: spacing.xl,
    },

    card: {
      backgroundColor:
        colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },

    title: {
      ...typography.title,
      color: colors.text,
    },

    body: {
      ...typography.body,
      color: colors.textSecondary,
    },

    label: {
      ...typography.label,
      color: colors.textMuted,
    },

    primaryButton: {
      minHeight: 54,
      borderRadius: radius.lg,
      backgroundColor:
        colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal:
        spacing.xl,
    },

    primaryButtonText: {
      ...typography.button,
      color: colors.primaryText,
    },

    divider: {
      height: 1,
      backgroundColor:
        colors.divider,
    },
  });
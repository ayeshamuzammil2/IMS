import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Input } from '../primitives/Input';
import { SelectField, type SelectOption } from '../forms/SelectField';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

/**
 * Reusable filter row used on every screen that lists interns/queues (Document Review,
 * GitHub Repo Review, ID Card management, Assign Project, ID Card oversight, etc.) so the
 * search + department + intern filtering UI looks and behaves identically everywhere.
 *
 * Department and Intern selects are optional - only pass the props for the filters a given
 * screen needs. Each renders with a synthetic "All ..." option so the filter can be cleared.
 */
export interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  /** Omit to hide the department filter entirely (e.g. for a Mentor, who is already scoped to one department). */
  departmentOptions?: SelectOption<number>[];
  departmentValue?: number | null;
  onDepartmentChange?: (value: number | null) => void;

  /** Omit to hide the intern filter entirely. */
  internOptions?: SelectOption<number>[];
  internValue?: number | null;
  onInternChange?: (value: number | null) => void;
}

const ALL_SENTINEL = 0;

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search by name or intern code',
  departmentOptions,
  departmentValue = null,
  onDepartmentChange,
  internOptions,
  internValue = null,
  onInternChange,
}: FilterBarProps) {
  const s = useThemedStyles(makeStyles);

  const departmentSelectOptions = useMemo<SelectOption<number>[]>(
    () => [{ value: ALL_SENTINEL, label: 'All Departments' }, ...(departmentOptions ?? [])],
    [departmentOptions],
  );
  const internSelectOptions = useMemo<SelectOption<number>[]>(
    () => [{ value: ALL_SENTINEL, label: 'All Interns' }, ...(internOptions ?? [])],
    [internOptions],
  );

  return (
    <View style={s.container}>
      <Input label="Search" placeholder={searchPlaceholder} value={search} onChangeText={onSearchChange} autoCapitalize="none" />

      {departmentOptions && onDepartmentChange ? (
        <View style={s.filterRow}>
          <SelectField
            label="Department"
            placeholder="All Departments"
            value={departmentValue ?? ALL_SENTINEL}
            options={departmentSelectOptions}
            onChange={(v) => onDepartmentChange(v === ALL_SENTINEL ? null : v)}
          />
        </View>
      ) : null}

      {internOptions && onInternChange ? (
        <View style={s.filterRow}>
          <SelectField
            label="Intern"
            placeholder="All Interns"
            value={internValue ?? ALL_SENTINEL}
            options={internSelectOptions}
            onChange={(v) => onInternChange(v === ALL_SENTINEL ? null : v)}
          />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: { marginBottom: t.spacing.sm },
  filterRow: { marginTop: t.spacing.sm },
});

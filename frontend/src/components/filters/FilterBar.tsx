import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Input } from '../primitives/Input';
import { SelectField, type SelectOption } from '../forms/SelectField';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

export interface FilterBarProps {
  /** Optional: Search text filter */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Omit to hide the department filter entirely */
  departmentOptions?: SelectOption<number>[];
  departmentValue?: number | null;
  onDepartmentChange?: (value: number | null) => void;

  /** Omit to hide the intern filter entirely */
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
      {/* Search Input will only render if both search and onSearchChange are provided */}
      {search !== undefined && onSearchChange ? (
        <Input label="Search" placeholder={searchPlaceholder} value={search} onChangeText={onSearchChange} autoCapitalize="none" />
      ) : null}

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